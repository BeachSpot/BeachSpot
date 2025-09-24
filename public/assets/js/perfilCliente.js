        // Ativa os ícones do Lucide
        lucide.createIcons();

        // Lógica para o menu mobile (Mantido)
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Lógica para preview da foto de perfil na carteirinha
        const avatarInput = document.getElementById('foto-perfil-input');
        const avatarImage = document.getElementById('carteirinha-avatar');

        avatarInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarImage.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });

        // --- NOVA LÓGICA PARA EDITAR PERFIL ---
        const editProfileButton = document.getElementById('edit-profile-button');
        const userName = document.getElementById('user-name');
        const userBio = document.getElementById('user-bio');

        let isEditing = false;

        editProfileButton.addEventListener('click', (e) => {
            e.preventDefault(); // Impede comportamento padrão do botão
            isEditing = !isEditing;
            const iconContainer = editProfileButton.querySelector('i');

            if (isEditing) {
                // Entrar no modo de edição
                userName.contentEditable = true;
                userBio.contentEditable = true;
                
                userName.classList.add('bg-blue-50', 'p-2', 'rounded-md', 'outline-blue-300');
                userBio.classList.add('bg-blue-50', 'p-2', 'rounded-md', 'outline-blue-300');
                userBio.classList.remove('italic');

                // Troca o ícone para 'save' (check)
                editProfileButton.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i>';
                lucide.createIcons({
                    nodes: [editProfileButton.querySelector('i')]
                });
                
                editProfileButton.title = 'Salvar Alterações';
                userName.focus();

            } else {
                // Sair do modo de edição e salvar
                userName.contentEditable = false;
                userBio.contentEditable = false;

                userName.classList.remove('bg-blue-50', 'p-2', 'rounded-md', 'outline-blue-300');
                userBio.classList.remove('bg-blue-50', 'p-2', 'rounded-md', 'outline-blue-300');
                userBio.classList.add('italic');
                
                // Troca o ícone de volta para 'pencil'
                editProfileButton.innerHTML = '<i data-lucide="pencil" class="w-5 h-5"></i>';
                lucide.createIcons({
                    nodes: [editProfileButton.querySelector('i')]
                });

                editProfileButton.title = 'Editar Perfil';
                
                // Simulação de salvamento
                console.log('Dados salvos:', {
                    nome: userName.textContent.trim(),
                    bio: userBio.textContent.trim()
                });
            }
        });