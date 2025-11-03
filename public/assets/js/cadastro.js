import { supabase } from './supabaseClient.js';

// --- AUTENTICAÇÃO UNIFICADA COM SUPABASE ---
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[DEBUG] Evento de autenticação:', event);
    
    if (event === 'SIGNED_IN' && session?.user) {
        const pendingType = localStorage.getItem('pending_account_type');
        console.log('[DEBUG] Tipo pendente recuperado:', pendingType);

        if (pendingType) {
            try {
                // 1. Buscar o perfil atual
                const { data: profile, error: fetchError } = await supabase
                    .from('usuarios')
                    .select('tipo_conta')
                    .eq('id_usuario', session.user.id)
                    .single();

                console.log('[DEBUG] Perfil encontrado:', profile);

                // 2. Se não existe perfil OU se tipo_conta está null/vazio
                if (fetchError?.code === 'PGRST116' || !profile || !profile.tipo_conta) {
                    console.log('[DEBUG] Criando/atualizando perfil...');
                    
                    // Atualizar tipo_conta na tabela usuarios (UPSERT)
                    const { error: upsertError } = await supabase
                        .from('usuarios')
                        .upsert({ 
                            id_usuario: session.user.id,
                            email: session.user.email,
                            tipo_conta: pendingType 
                        }, { 
                            onConflict: 'id_usuario' 
                        });

                    if (upsertError) {
                        console.error('[ERRO] Ao atualizar usuarios:', upsertError);
                        showAlert('Erro', 'Não foi possível completar o cadastro.', 'error');
                        return;
                    }

                    // Nome do usuário
                    const nomeUsuario = session.user.user_metadata.full_name || 
                                       session.user.user_metadata.name || 
                                       session.user.email?.split('@')[0] || 
                                       'Usuário';

                    // Inserir na tabela específica (cliente ou gestor)
                    const profileData = {
                        [`id_${pendingType}`]: session.user.id,
                        nome: nomeUsuario
                    };

                    const { error: insertError } = await supabase
                        .from(pendingType)
                        .upsert(profileData, { onConflict: `id_${pendingType}` });

                    if (insertError && insertError.code !== '23505') {
                        console.error(`[ERRO] Ao inserir em ${pendingType}:`, insertError);
                        showAlert('Erro', 'Não foi possível criar o perfil completo.', 'error');
                        return;
                    }

                    console.log('[DEBUG] Perfil criado com sucesso!');
                }

                // 3. Limpar localStorage e redirecionar
                localStorage.removeItem('pending_account_type');
                showAlert('Sucesso!', 'Cadastro realizado com sucesso!', 'success');
                
                setTimeout(() => {
                    if (pendingType === 'gestor') {
                        window.location.href = '/Telas Gestor/inicioGestor.html';
                    } else {
                        window.location.href = '/Telas Clientes/inicio.html';
                    }
                }, 1500);

            } catch (error) {
                console.error('[ERRO GERAL]', error);
                showAlert('Erro', 'Ocorreu um erro ao processar seu cadastro.', 'error');
            }
        } else {
            // Se não há tipo pendente, mas usuário está logado
            console.log('[DEBUG] Sem tipo pendente, redirecionando...');
            window.location.href = '/Telas Clientes/inicio.html';
        }
    }
});

function showAlert(title, message, type) {
    const alertModal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertBox = alertModal?.querySelector('.alert-box');
    
    if (alertTitle) alertTitle.textContent = title;
    if (alertMessage) alertMessage.textContent = message;
    if (alertBox) {
        alertBox.className = 'alert-box';
        alertBox.classList.add(type);
    }
    if (alertModal) alertModal.classList.add('visible');
}

function hideAlert() {
    const alertModal = document.getElementById('alert-modal');
    if (alertModal) alertModal.classList.remove('visible');
}

window.togglePassword = function() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.style.display = 'none';
        eyeOffIcon.style.display = 'block';
    } else {
        passwordInput.type = 'password';
        eyeIcon.style.display = 'block';
        eyeOffIcon.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const featureCards = document.querySelectorAll('.feature-card');
    const tipoContaInput = document.getElementById('tipo-conta'); 
    const registrationForm = document.getElementById('registration-form');
    const googleBtn = document.getElementById('google-btn');
    const alertCloseBtn = document.getElementById('alert-close'); 

    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            featureCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const tipoConta = card.getAttribute('data-tipo-conta');
            tipoContaInput.value = tipoConta;
            
            console.log('[SELEÇÃO] Tipo de conta:', tipoConta);
            if (googleBtn) googleBtn.disabled = false;
        });
    });

    // --- LOGIN COM GOOGLE (SUPABASE) ---
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const tipoConta = tipoContaInput.value;
            if (!tipoConta) {
                showAlert('Atenção', 'Por favor, selecione um tipo de perfil (Cliente ou Gestor) antes de continuar.', 'error');
                return;
            }
            
            console.log('[GOOGLE] Salvando tipo no localStorage:', tipoConta);
            localStorage.setItem('pending_account_type', tipoConta);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/cadastro.html'
                }
            });
            
            if (error) {
                console.error('[ERRO GOOGLE]', error);
                showAlert('Erro no Login', `Erro ao tentar logar com o Google: ${error.message}`, 'error');
                localStorage.removeItem('pending_account_type');
            }
        });
    }

    // --- CADASTRO COM EMAIL/SENHA (AGORA USA SUPABASE AUTH) ---
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!tipoContaInput.value) {
                showAlert('Atenção', 'Por favor, selecione um tipo de perfil (Cliente ou Gestor).', 'error');
                return;
            }
            
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            showAlert('Processando...', 'Criando sua conta...', 'success');

            try {
                // 1. CRIAR CONTA NO SUPABASE AUTH
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email: emailInput.value,
                    password: passwordInput.value,
                    options: {
                        data: {
                            full_name: nameInput.value,
                            tipo_conta: tipoContaInput.value // IMPORTANTE: Salva o tipo no metadata
                        }
                    }
                });

                if (signUpError) {
                    console.error('[ERRO SIGNUP]', signUpError);
                    hideAlert();
                    setTimeout(() => {
                        if (signUpError.message.includes('already registered')) {
                            showAlert('Erro', 'Este email já está cadastrado. Tente fazer login.', 'error');
                        } else {
                            showAlert('Erro', signUpError.message, 'error');
                        }
                    }, 100);
                    return;
                }

                console.log('[DEBUG] Usuário criado no Supabase Auth:', authData.user?.id);

                // 2. CRIAR REGISTRO NA TABELA USUARIOS
                const { error: insertUsuarioError } = await supabase
                    .from('usuarios')
                    .upsert({
                        id_usuario: authData.user.id,
                        email: emailInput.value,
                        tipo_conta: tipoContaInput.value
                    }, { onConflict: 'id_usuario' });

                if (insertUsuarioError) {
                    console.error('[ERRO] Ao inserir em usuarios:', insertUsuarioError);
                    hideAlert();
                    setTimeout(() => {
                        showAlert('Erro', 'Não foi possível completar o cadastro.', 'error');
                    }, 100);
                    return;
                }

                // 3. CRIAR REGISTRO NA TABELA ESPECÍFICA (CLIENTE OU GESTOR)
                const profileData = {
                    [`id_${tipoContaInput.value}`]: authData.user.id,
                    nome: nameInput.value
                };

                const { error: insertProfileError } = await supabase
                    .from(tipoContaInput.value)
                    .upsert(profileData, { onConflict: `id_${tipoContaInput.value}` });

                if (insertProfileError) {
                    console.error(`[ERRO] Ao inserir em ${tipoContaInput.value}:`, insertProfileError);
                    hideAlert();
                    setTimeout(() => {
                        showAlert('Erro', 'Não foi possível criar o perfil completo.', 'error');
                    }, 100);
                    return;
                }

                hideAlert();
                setTimeout(() => {
                    showAlert('Sucesso!', 'Cadastro realizado! Redirecionando...', 'success');
                }, 100);
                
                registrationForm.reset();
                
                // Aguardar um pouco antes de redirecionar
                setTimeout(() => {
                    if (tipoContaInput.value === 'gestor') {
                        window.location.href = '/Telas Gestor/inicioGestor.html';
                    } else {
                        window.location.href = '/Telas Clientes/inicio.html';
                    }
                }, 1500);

            } catch (error) {
                console.error('[ERRO GERAL CADASTRO]', error);
                hideAlert();
                setTimeout(() => {
                    showAlert('Erro', 'Ocorreu um erro ao criar sua conta.', 'error');
                }, 100);
            }
        });
    }

    if (alertCloseBtn) {
        alertCloseBtn.addEventListener('click', hideAlert);
    }
});