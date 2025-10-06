// Importa o cliente Supabase que acabamos de configurar.
import { supabase } from './supabaseClient.js';

// Função para alternar a visibilidade da senha (seu código original)
function togglePassword() {
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

// Função para mostrar o modal de alerta (seu código original)
function showAlert(title, message, type) {
    const modal = document.getElementById('alert-modal');
    const box = modal.querySelector('.alert-box');
    const titleElement = document.getElementById('alert-title');
    const messageElement = document.getElementById('alert-message');
    
    titleElement.textContent = title;
    messageElement.textContent = message;

    box.classList.remove('success', 'error');
    box.classList.add(type);
    
    modal.classList.add('visible');
}

// Função para esconder o modal de alerta (seu código original)
function hideAlert() {
    const modal = document.getElementById('alert-modal');
    modal.classList.remove('visible');
}

// --- NOVA FUNÇÃO PARA LOGIN SOCIAL ---
async function signInWithProvider(provider) {
    
    // Pede ao Supabase para iniciar o login com Google ou Facebook.
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider, // 'google' ou 'facebook'
        options: {
            // Importante: para onde o usuário deve ser redirecionado APÓS o login.
            // Troque para a URL da sua página de perfil ou dashboard.
            redirectTo: window.location.origin + '/perfil-pessoal/inicio.html', 
        },
    });

    if (error) {
        console.error('Erro ao fazer login social:', error);
        showAlert('Erro de Login', 'Não foi possível autenticar com o provedor. Tente novamente.', 'error');
    }
}

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const featureCards = document.querySelectorAll('.feature-card');
    const registrationForm = document.getElementById('registration-form');
    const tipoContaInput = document.getElementById('tipo-conta');
    const alertCloseBtn = document.getElementById('alert-close-btn');
    
    // Adiciona os eventos aos botões sociais
    const googleButton = document.getElementById('google-btn');
    const facebookButton = document.getElementById('facebook-btn');

    googleButton.addEventListener('click', () => signInWithProvider('google'));
    facebookButton.addEventListener('click', () => signInWithProvider('facebook'));

    // --- SEU CÓDIGO ORIGINAL PARA CADASTRO COM E-MAIL ---
    // (Pode ser mantido ou adaptado para usar supabase.auth.signUp())
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            featureCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const accountType = card.getAttribute('data-tipo-conta');
            tipoContaInput.value = accountType;
        });
    });

    alertCloseBtn.addEventListener('click', hideAlert);

    registrationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!tipoContaInput.value) {
            showAlert('Erro', 'Por favor, selecione um tipo de perfil para continuar.', 'error');
            return;
        }

        const userData = {
            email: document.getElementById('email').value,
            senha: document.getElementById('password').value,
            nome: document.getElementById('name').value,
            tipo_conta: tipoContaInput.value
        };

        showAlert('Processando...', 'Estamos registrando sua conta...', 'success');

        try {
            // AINDA USA SUA API ANTIGA! O ideal seria migrar para o Supabase também.
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

    // Disponibiliza a função togglePassword globalmente para o onclick no HTML
    window.togglePassword = togglePassword;
});