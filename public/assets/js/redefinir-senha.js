import { supabase } from './supabaseClient.js';

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

window.togglePassword = function(inputId, eyeIconId, eyeOffIconId) {
    const passwordInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(eyeIconId);
    const eyeOffIcon = document.getElementById(eyeOffIconId);

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
    const updatePasswordForm = document.getElementById('update-password-form');
    const alertCloseBtn = document.getElementById('alert-close-btn');

    if (alertCloseBtn) {
        alertCloseBtn.addEventListener('click', hideAlert);
    }

    // Verificar se usuário veio do link de recuperação
    const checkRecoverySession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            showAlert(
                'Link Inválido', 
                'Este link expirou ou é inválido. Solicite um novo link de recuperação.',
                'error'
            );
            
            setTimeout(() => {
                window.location.href = '/esqueci-senha.html';
            }, 3000);
        }
    };

    checkRecoverySession();

    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validar se as senhas coincidem
            if (newPassword !== confirmPassword) {
                showAlert('Erro', 'As senhas não coincidem. Por favor, digite novamente.', 'error');
                return;
            }

            // Validar tamanho mínimo
            if (newPassword.length < 6) {
                showAlert('Erro', 'A senha deve ter no mínimo 6 caracteres.', 'error');
                return;
            }

            showAlert('Processando...', 'Atualizando sua senha...', 'success');

            try {
                // Atualizar senha no Supabase
                const { error } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (error) {
                    console.error('[ERRO UPDATE]', error);
                    hideAlert();
                    setTimeout(() => {
                        showAlert('Erro', `Não foi possível atualizar a senha: ${error.message}`, 'error');
                    }, 100);
                    return;
                }

                hideAlert();
                setTimeout(() => {
                    showAlert(
                        'Senha Redefinida!', 
                        'Sua senha foi atualizada com sucesso. Redirecionando para o login...',
                        'success'
                    );
                }, 100);

                updatePasswordForm.reset();

                // Fazer logout e redirecionar
                setTimeout(async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/entrar.html';
                }, 3000);

            } catch (error) {
                hideAlert();
                setTimeout(() => {
                    showAlert('Erro de Conexão', 'Não foi possível conectar ao servidor. Tente novamente.', 'error');
                }, 100);
                console.error('Erro:', error);
            }
        });
    }

    if (window.location.protocol === 'file:') {
        window.location.href = 'http://localhost:3001/redefinir-senha.html';
    }
});