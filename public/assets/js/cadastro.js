import { supabase } from './supabaseClient.js';

// A função togglePassword precisa estar no escopo global para o 'onclick' funcionar
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
    // CORREÇÃO FINAL: O ID foi ajustado para 'tipo-conta' (com hífen) para corresponder ao HTML.
    const tipoContaInput = document.getElementById('tipo-conta'); 
    const registrationForm = document.getElementById('registration-form');
    const googleBtn = document.getElementById('google-btn');
    const facebookBtn = document.getElementById('facebook-btn');
    
    const alertModal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertCloseBtn = document.getElementById('alert-close'); 
    const alertBox = alertModal.querySelector('.alert-box');

    // --- LÓGICA DE LOGIN COM GOOGLE (SUPABASE) ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            const pendingType = localStorage.getItem('pending_account_type');
            console.log('[TESTE 3] Recuperado do localStorage ao voltar:', pendingType);

            if (pendingType && session?.user) {
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('tipo_conta')
                    .eq('id_usuario', session.user.id)
                    .single();

                if (profile && !profile.tipo_conta) {
                    console.log(`[TESTE 4] Atualizando perfil ${session.user.id} com tipo_conta: ${pendingType}`);
                    await supabase
                        .from('usuarios')
                        .update({ tipo_conta: pendingType })
                        .eq('id_usuario', session.user.id);

                    const profileData = {
                        [`id_${pendingType}`]: session.user.id,
                        nome: session.user.user_metadata.full_name || 'Nome não fornecido'
                    };
                    await supabase.from(pendingType).insert(profileData);

                    localStorage.removeItem('pending_account_type');
                    window.location.href = '/perfil-pessoal/inicio.html';
                } else {
                    localStorage.removeItem('pending_account_type');
                }
            }
        }
    });

    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            featureCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const tipoConta = card.getAttribute('data-tipo-conta');
            
            // Esta linha agora funcionará, pois 'tipoContaInput' não será mais nulo.
            tipoContaInput.value = tipoConta;
            
            console.log('[TESTE 1] Tipo de conta selecionado:', tipoContaInput.value);

            if (googleBtn) {
                googleBtn.disabled = false;
            }
            if(facebookBtn) {
                facebookBtn.disabled = true;
            }
        });
    });

    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const tipoConta = tipoContaInput.value;
            if (!tipoConta) {
                showAlert('Atenção', 'Por favor, selecione um tipo de perfil (Cliente ou Gestor) antes de continuar.', 'error');
                return;
            }
            console.log('[TESTE 2] Guardando no localStorage antes de redirecionar:', tipoConta);
            localStorage.setItem('pending_account_type', tipoConta);

            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) {
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
                        window.location.href = '/perfil-pessoal/inicio.html';
                    }, 1500);
                } else {
                    showAlert('Erro', `Erro: ${result.error || 'Ocorreu um erro desconhecido.'}`, 'error');
                }
            } catch (error) {
                showAlert('Erro de Conexão', 'Falha na conexão. O servidor está offline?', 'error');
            }
        });
    }

    function showAlert(title, message, type) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertBox.className = 'alert-box';
        alertBox.classList.add(type);
        alertModal.classList.add('visible');
    }

    function hideAlert() {
        alertModal.classList.remove('visible');
    }

    if (alertCloseBtn) {
        alertCloseBtn.addEventListener('click', hideAlert);
    }
});

