import { supabase } from './supabaseClient.js';

// --- AUTENTICAÇÃO COM GOOGLE (SUPABASE) ---
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
                .single();

            console.log('[DEBUG LOGIN] Dados do usuário:', usuario);

            if (fetchError) {
                console.error('[ERRO] Ao buscar usuário:', fetchError);
                showAlert('Erro', 'Não foi possível carregar seus dados. Tente novamente.', 'error');
                await supabase.auth.signOut();
                return;
            }

            // Verificar se o usuário tem tipo_conta definido
            if (!usuario || !usuario.tipo_conta) {
                showAlert('Erro', 'Sua conta não está completamente configurada. Por favor, faça o cadastro novamente.', 'error');
                await supabase.auth.signOut();
                setTimeout(() => {
                    window.location.href = '/cadastro.html';
                }, 2000);
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
                nome: nomeUsuario || session.user.email?.split('@')[0] || 'Usuário',
                tipo_conta: usuario.tipo_conta
            };

            sessionStorage.setItem('userData', JSON.stringify(userData));
            
            console.log('[DEBUG LOGIN] Dados salvos na sessão:', userData);
            
            showAlert('Sucesso!', `Bem-vindo(a) de volta, ${userData.nome}!`, 'success');
            
            // Redirecionar após delay
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

// --- FUNÇÕES AUXILIARES ---
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

// --- CÓDIGO PRINCIPAL DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const googleBtn = document.getElementById('google-btn');
    const alertCloseBtn = document.getElementById('alert-close-btn');

    // Fechar modal de alerta
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

    // --- LOGIN COM EMAIL E SENHA (via API) ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const loginData = {
                email: document.getElementById('email').value,
                senha: document.getElementById('password').value,
            };

            try {
                const response = await fetch('http://localhost:3001/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();

                if (response.ok) {
                    // Armazenar dados do usuário na sessão
                    sessionStorage.setItem('userData', JSON.stringify(result));

                    showAlert('Sucesso!', `Bem-vindo(a) de volta, ${result.nome}!`, 'success');
                    
                    // Redirecionar após delay
                    setTimeout(() => {
                        if (result.tipo_conta === 'gestor') {
                            window.location.href = '/Telas Gestor/inicioGestor.html';
                        } else {
                            window.location.href = '/Telas Clientes/inicio.html';
                        }
                        hideAlert();
                    }, 1500);

                } else {
                    showAlert('Erro no Login', result.error || 'Ocorreu um erro.', 'error');
                }
            } catch (error) {
                showAlert('Erro de Conexão', 'Não foi possível conectar ao servidor. Tente novamente mais tarde.', 'error');
                console.error('Erro de rede:', error);
            }
        });
    }

    // Redirecionar se aberto localmente
    if (window.location.protocol === 'file:') {
        window.location.href = 'http://localhost:3001/entrar.html';
    }
});
