        // Função para alternar a visibilidade da senha
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
        
        // Função para mostrar o modal de alerta
        function showAlert(title, message, type) {
            const modal = document.getElementById('alert-modal');
            const box = modal.querySelector('.alert-box');
            const titleElement = document.getElementById('alert-title');
            const messageElement = document.getElementById('alert-message');
            
            titleElement.textContent = title;
            messageElement.textContent = message;

            // Define o tipo de alerta para estilização
            box.classList.remove('success', 'error');
            box.classList.add(type);
            
            modal.classList.add('visible');
        }

        // Função para esconder o modal de alerta
        function hideAlert() {
            const modal = document.getElementById('alert-modal');
            modal.classList.remove('visible');
        }

        document.addEventListener('DOMContentLoaded', () => {
            const featureCards = document.querySelectorAll('.feature-card');
            const registrationForm = document.getElementById('registration-form');
            const tipoContaInput = document.getElementById('tipo-conta');
            const alertCloseBtn = document.getElementById('alert-close-btn');

            featureCards.forEach(card => {
                card.addEventListener('click', () => {
                    featureCards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    const accountType = card.getAttribute('data-tipo-conta');
                    tipoContaInput.value = accountType;
                });
            });

            // Adiciona o listener para o botão de fechar do modal
            alertCloseBtn.addEventListener('click', hideAlert);

            // Adiciona o listener para o envio do formulário
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
                    const response = await fetch('http://localhost:3001/api/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(userData)
                    });

                    const result = await response.json();
                    
                    if (response.ok) {
                        showAlert('Sucesso!', 'Usuário registrado com sucesso!', 'success');
                        registrationForm.reset();
                        console.log('Sucesso:', result);
                        setTimeout(() => {
                            window.location.href = '/perfil-pessoal/inicio.html';
                        }, 1500);
                    } else {
                        showAlert('Erro', `Erro: ${result.error || 'Ocorreu um erro desconhecido.'}`, 'error');
                        console.error('Erro:', result);
                    }
                } catch (error) {
                    showAlert('Erro de Conexão', 'Falha na conexão. O servidor está offline?', 'error');
                    console.error('Erro de rede:', error);
                }
            });
        });