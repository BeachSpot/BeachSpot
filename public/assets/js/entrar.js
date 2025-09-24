        // Função para alternar visibilidade da senha
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

        // Funções do Modal de Alerta
        function showAlert(title, message, type) {
            const modal = document.getElementById('alert-modal');
            const box = modal.querySelector('.alert-box');
            document.getElementById('alert-title').textContent = title;
            document.getElementById('alert-message').textContent = message;
            box.className = 'alert-box'; // Limpa classes anteriores
            box.classList.add(type); // Adiciona success ou error
            modal.classList.add('visible');
        }

        function hideAlert() {
            document.getElementById('alert-modal').classList.remove('visible');
        }

        document.addEventListener('DOMContentLoaded', () => {
            const loginForm = document.getElementById('login-form');
            const alertCloseBtn = document.getElementById('alert-close-btn');

            alertCloseBtn.addEventListener('click', hideAlert);

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
                        // CORREÇÃO: O servidor não envia um 'token' ou um objeto 'user'.
                        // Os dados do usuário estão diretamente no objeto 'result'.
                        // Armazenamos a resposta inteira em 'userData'.
                        sessionStorage.setItem('userData', JSON.stringify(result));

                        showAlert('Sucesso!', `Bem-vindo(a) de volta, ${result.nome}!`, 'success');
                        
                        // Redireciona após um pequeno delay
                        setTimeout(() => {
                            // Idealmente, redirecionar com base no tipo de conta
                            window.location.href = '/perfil-pessoal/inicio.html';
                            hideAlert(); // Esconde o modal antes de sair da página
                        }, 1500);

                    } else {
                        showAlert('Erro no Login', result.error || 'Ocorreu um erro.', 'error');
                    }
                } catch (error) {
                    showAlert('Erro de Conexão', 'Não foi possível conectar ao servidor. Tente novamente mais tarde.', 'error');
                    console.error('Erro de rede:', error);
                }
            });
        });

            // Adicionando um script para redirecionar se o arquivo for aberto localmente. -->
        if (window.location.protocol === 'file:') {
            // Se o arquivo for aberto localmente, redireciona para o endereço do servidor
            window.location.href = 'http://localhost:3001/entrar.html';
        }