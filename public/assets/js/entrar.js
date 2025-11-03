import { supabase } from './supabaseClient.js';

// --- AUTENTICAÇÃO UNIFICADA COM SUPABASE ---
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[DEBUG LOGIN] Evento de autenticação:', event);
    
    if (event === 'SIGNED_IN' && session?.user) {
        console.log('[DEBUG LOGIN] Usuário autenticado:', session.user.email);
        
        try {
            // Buscar informações do usuário no banco
            const { data: usuario, error: fetchError } = await supabase
                .from('usuarios')
                .select('id_usuario, email, tipo_conta')
                .eq('id_usuario', session.user.id)
                .maybeSingle();

            console.log('[DEBUG LOGIN] Dados do usuário:', usuario);

            // SE NÃO ENCONTROU = CONTA FANTASMA
            if (!usuario || !usuario.tipo_conta) {
                console.error('[ERRO] Conta fantasma detectada! Deletando...');
                
                // Fazer signOut para encerrar a sessão
                await supabase.auth.signOut();
                
                // Tentar deletar a conta fantasma via API
                try {
                    // Como não temos acesso admin no client, vamos apenas fazer signOut
                    // A conta ficará órfã no auth.users, mas não terá sessão ativa
                    console.log('[INFO] Conta fantasma detectada. Sessão encerrada.');
                } catch (deleteError) {
                    console.log('[INFO] Não foi possível deletar automaticamente.');
                }
                
                hideAlert();
                setTimeout(() => {
                    showAlert('Conta Inválida', 'Esta conta não está registrada no BeachSpot. Por favor, faça o cadastro primeiro.', 'error');
                }, 100);
                
                setTimeout(() => {
                    window.location.href = '/cadastro.html';
                }, 2500);
                return;
            }

            // Buscar o nome do usuário na tabela específica
            let nomeUsuario = null;
            if (usuario.tipo_conta === 'cliente') {
                const { data: cliente } = await supabase
                    .from('cliente')
                    .select('nome')
                    .eq('id_cliente', usuario.id_usuario)
                    .single();
                nomeUsuario = cliente?.nome;
            } else if (usuario.tipo_conta === 'gestor') {
                const { data: gestor } = await supabase
                    .from('gestor')
                    .select('nome')
                    .eq('id_gestor', usuario.id_usuario)
                    .single();
                nomeUsuario = gestor?.nome;
            }

            // Salvar dados na sessão
            const userData = {
                id_usuario: usuario.id_usuario,
                email: usuario.email,
                nome: nomeUsuario || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
                tipo_conta: usuario.tipo_conta
            };

            sessionStorage.setItem('userData', JSON.stringify(userData));
            
            console.log('[DEBUG LOGIN] Dados salvos na sessão:', userData);
            
            showAlert('Sucesso!', `Bem-vindo(a) de volta, ${userData.nome}!`, 'success');
            
            setTimeout(() => {
                if (userData.tipo_conta === 'gestor') {
                    window.location.href = '/Telas Gestor/inicioGestor.html';
                } else {
                    window.location.href = '/Telas Clientes/inicio.html';
                }
            }, 1500);

        } catch (error) {
            console.error('[ERRO GERAL LOGIN]', error);
            showAlert('Erro', 'Ocorreu um erro ao processar seu login.', 'error');
            await supabase.auth.signOut();
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
    const loginForm = document.getElementById('login-form');
    const googleBtn = document.getElementById('google-btn');
    const alertCloseBtn = document.getElementById('alert-close-btn');

    if (alertCloseBtn) {
        alertCloseBtn.addEventListener('click', hideAlert);
    }

    // --- LOGIN COM GOOGLE ---
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            console.log('[GOOGLE] Iniciando login com Google...');
            
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/entrar.html'
                }
            });
            
            if (error) {
                console.error('[ERRO GOOGLE]', error);
                showAlert('Erro no Login', `Erro ao tentar logar com o Google: ${error.message}`, 'error');
            }
        });
    }

    // --- LOGIN COM EMAIL E SENHA (SUPABASE AUTH) ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            showAlert('Processando...', 'Verificando credenciais...', 'success');

            try {
                // PASSO 1: VERIFICAR SE O EMAIL EXISTE NA TABELA USUARIOS
                const { data: usuarioData, error: checkError } = await supabase
                    .from('usuarios')
                    .select('id_usuario, email, tipo_conta')
                    .eq('email', email)
                    .maybeSingle();

                console.log('[DEBUG] Verificação de usuário:', usuarioData);

                // Se não encontrou o usuário no banco, BLOQUEAR LOGIN
                if (!usuarioData) {
                    hideAlert();
                    setTimeout(() => {
                        showAlert('Conta não encontrada', 'Este email não está cadastrado no BeachSpot. Por favor, faça o cadastro primeiro.', 'error');
                    }, 100);
                    return;
                }

                // PASSO 2: VERIFICAR SE USUÁRIO JÁ EXISTE NO SUPABASE AUTH
                // Isso evita criar duplicatas
                let authUserExists = false;
                try {
                    const { data: sessionCheck } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (sessionCheck?.user) {
                        authUserExists = true;
                        console.log('[DEBUG] Login bem-sucedido:', sessionCheck.user.email);
                        // O onAuthStateChange vai cuidar do resto
                    }
                } catch (authError) {
                    console.error('[ERRO AUTH]', authError);
                    hideAlert();
                    
                    setTimeout(() => {
                        showAlert('Erro no Login', 'Email ou senha incorretos.', 'error');
                    }, 100);
                    return;
                }

            } catch (error) {
                hideAlert();
                setTimeout(() => {
                    showAlert('Erro de Conexão', 'Não foi possível conectar. Tente novamente.', 'error');
                }, 100);
                console.error('Erro de rede:', error);
            }
        });
    }

    if (window.location.protocol === 'file:') {
        window.location.href = 'http://localhost:3001/entrar.html';
    }
});