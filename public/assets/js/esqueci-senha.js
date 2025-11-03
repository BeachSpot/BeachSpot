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

document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('reset-form');
    const alertCloseBtn = document.getElementById('alert-close-btn');

    if (alertCloseBtn) {
        alertCloseBtn.addEventListener('click', hideAlert);
    }

    if (resetForm) {
        resetForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;

            showAlert('Processando...', 'Enviando email de recuperação...', 'success');

            try {
                // Verificar se o email existe na tabela usuarios
                const { data: usuario, error: checkError } = await supabase
                    .from('usuarios')
                    .select('email')
                    .eq('email', email)
                    .maybeSingle();

                if (!usuario) {
                    hideAlert();
                    setTimeout(() => {
                        showAlert(
                            'Email não encontrado', 
                            'Este email não está cadastrado no BeachSpot. Verifique o email digitado ou faça o cadastro.',
                            'error'
                        );
                    }, 100);
                    return;
                }

                // Enviar email de recuperação
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/redefinir-senha.html'
                });

                if (error) {
                    console.error('[ERRO RESET]', error);
                    hideAlert();
                    setTimeout(() => {
                        showAlert('Erro', `Não foi possível enviar o email: ${error.message}`, 'error');
                    }, 100);
                    return;
                }

                hideAlert();
                setTimeout(() => {
                    showAlert(
                        'Email Enviado!', 
                        'Enviamos um link de recuperação para seu email. Verifique sua caixa de entrada (e spam também).',
                        'success'
                    );
                }, 100);

                resetForm.reset();

                // Redirecionar após 5 segundos
                setTimeout(() => {
                    window.location.href = '/entrar.html';
                }, 5000);

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
        window.location.href = 'http://localhost:3001/esqueci-senha.html';
    }
});