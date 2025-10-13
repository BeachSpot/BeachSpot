import { supabase } from './supabaseClient.js';

// --- LÓGICA DE LOGIN COM GOOGLE (SUPABASE) ---
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
                console.log('[DEBUG] Erro na busca:', fetchError);

                // 2. Se não existe perfil OU se tipo_conta está null/vazio
                if (fetchError?.code === 'PGRST116' || !profile || !profile.tipo_conta) {
                    console.log('[DEBUG] Criando/atualizando perfil...');
                    
                    // Atualizar tipo_conta na tabela usuarios
                    const { error: updateError } = await supabase
                        .from('usuarios')
                        .update({ tipo_conta: pendingType })
                        .eq('id_usuario', session.user.id);

                    if (updateError) {
                        console.error('[ERRO] Ao atualizar usuarios:', updateError);
                        showAlert('Erro', 'Não foi possível completar o cadastro.', 'error');
                        return;
                    }

                    // Nome do usuário (prioriza full_name, depois name, depois email)
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
                        .insert(profileData);

                    if (insertError) {
                        console.error(`[ERRO] Ao inserir em ${pendingType}:`, insertError);
                        // Se o erro for de duplicação, não é crítico
                        if (insertError.code !== '23505') {
                            showAlert('Erro', 'Não foi possível criar o perfil completo.', 'error');
                            return;
                        }
                    }

                    console.log('[DEBUG] Perfil criado com sucesso!');
                }

                // 3. Limpar localStorage e redirecionar
                localStorage.removeItem('pending_account_type');
                console.log('[DEBUG] Redirecionando para a página inicial...');
                window.location.href = '/Telas Clientes/inicio.html';

            } catch (error) {
                console.error('[ERRO GERAL]', error);
                showAlert('Erro', 'Ocorreu um erro ao processar seu login.', 'error');
            }
        } else {
            // Se não há tipo pendente, mas usuário está logado, só redireciona
            console.log('[DEBUG] Sem tipo pendente, redirecionando...');
            window.location.href = '/Telas Clientes/inicio.html';
        }
    }
});

// Função para mostrar alertas
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

// Toggle de senha no escopo global
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

// Código da página
document.addEventListener('DOMContentLoaded', () => {
    const featureCards = document.querySelectorAll('.feature-card');
    const tipoContaInput = document.getElementById('tipo-conta'); 
    const registrationForm = document.getElementById('registration-form');
    const googleBtn = document.getElementById('google-btn');
    const facebookBtn = document.getElementById('facebook-btn');
    
    const alertModal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertCloseBtn = document.getElementById('alert-close'); 
    const alertBox = alertModal?.querySelector('.alert-box');

    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            featureCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const tipoConta = card.getAttribute('data-tipo-conta');
            tipoContaInput.value = tipoConta;
            
            console.log('[SELEÇÃO] Tipo de conta:', tipoConta);

            if (googleBtn) googleBtn.disabled = false;
            if (facebookBtn) facebookBtn.disabled = true;
        });
    });

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

    if (facebookBtn) {
        facebookBtn.addEventListener('click', () => {
            showAlert('Indisponível', 'O login com Facebook não está habilitado no momento.', 'error');
        });
    }

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

            const userData = {
                nome: nameInput.value,
                email: emailInput.value,
                senha: passwordInput.value,
                tipo_conta: tipoContaInput.value
            };

            showAlert('Processando...', 'Estamos registrando sua conta...', 'success');

            try {
                const response = await fetch('http://localhost:3001/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const result = await response.json();
                
                if (response.ok) {
                    showAlert('Sucesso!', 'Usuário registrado com sucesso!', 'success');
                    registrationForm.reset();
                    setTimeout(() => {
                        window.location.href = '/Telas Clientes/inicio.html';
                    }, 1500);
                } else {
                    showAlert('Erro', `Erro: ${result.error || 'Ocorreu um erro desconhecido.'}`, 'error');
                }
            } catch (error) {
                console.error('[ERRO CADASTRO]', error);
                showAlert('Erro de Conexão', 'Falha na conexão. O servidor está offline?', 'error');
            }
        });
    }

    function hideAlert() {
        if (alertModal) alertModal.classList.remove('visible');
    }

    if (alertCloseBtn) {
        alertCloseBtn.addEventListener('click', hideAlert);
    }
});