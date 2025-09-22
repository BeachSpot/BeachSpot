// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Ativa os ícones do Lucide
    lucide.createIcons();
    
    // Inicializa todas as funcionalidades
    initializeMobileMenu();
    initializeProfilePhotoUpload();
    initializeProfileEditing();
    initializeAnimations();
});

/**
 * Lógica para o menu mobile
 */
function initializeMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            
            // Adiciona animação ao ícone
            const icon = mobileMenuButton.querySelector('i');
            if (icon) {
                icon.style.transform = mobileMenu.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
            }
        });

        // Fecha o menu ao clicar fora dele
        document.addEventListener('click', (event) => {
            if (!mobileMenuButton.contains(event.target) && !mobileMenu.contains(event.target)) {
                mobileMenu.classList.add('hidden');
                const icon = mobileMenuButton.querySelector('i');
                if (icon) {
                    icon.style.transform = 'rotate(0deg)';
                }
            }
        });
    }
}

/**
 * Lógica para upload e preview da foto de perfil
 */
function initializeProfilePhotoUpload() {
    const avatarInput = document.getElementById('foto-perfil-input');
    const avatarImage = document.getElementById('carteirinha-avatar');

    if (avatarInput && avatarImage) {
        avatarInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            
            if (file) {
                // Validação do tipo de arquivo
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                
                if (!allowedTypes.includes(file.type)) {
                    showNotification('Por favor, selecione um arquivo de imagem válido (JPG, PNG, GIF ou WebP).', 'error');
                    return;
                }
                
                // Validação do tamanho do arquivo (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('O arquivo deve ter no máximo 5MB.', 'error');
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    avatarImage.src = e.target.result;
                    avatarImage.classList.add('fade-in');
                    showNotification('Foto atualizada com sucesso!', 'success');
                };
                
                reader.onerror = () => {
                    showNotification('Erro ao carregar a imagem. Tente novamente.', 'error');
                };
                
                reader.readAsDataURL(file);
            }
        });

        // Adiciona drag and drop
        const photoContainer = avatarImage.parentElement;
        
        photoContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoContainer.classList.add('ring-2', 'ring-blue-500');
        });
        
        photoContainer.addEventListener('dragleave', () => {
            photoContainer.classList.remove('ring-2', 'ring-blue-500');
        });
        
        photoContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            photoContainer.classList.remove('ring-2', 'ring-blue-500');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                avatarInput.files = e.dataTransfer.files;
                avatarInput.dispatchEvent(new Event('change'));
            }
        });
    }
}

/**
 * Lógica para edição de perfil
 */
function initializeProfileEditing() {
    const editProfileButton = document.getElementById('edit-profile-button');
    const userName = document.getElementById('user-name');
    const userBio = document.getElementById('user-bio');

    if (!editProfileButton || !userName || !userBio) return;

    let isEditing = false;
    let originalData = {
        name: userName.textContent.trim(),
        bio: userBio.textContent.trim()
    };

    editProfileButton.addEventListener('click', (e) => {
        e.preventDefault();
        isEditing = !isEditing;
        const iconContainer = editProfileButton.querySelector('i');

        if (isEditing) {
            enterEditMode();
        } else {
            exitEditMode();
        }
    });

    function enterEditMode() {
        // Salva os dados originais
        originalData = {
            name: userName.textContent.trim(),
            bio: userBio.textContent.trim()
        };

        // Habilita edição
        userName.contentEditable = true;
        userBio.contentEditable = true;
        
        // Adiciona classes de estilo para modo de edição
        userName.classList.add('bg-blue-50', 'p-2', 'rounded-md', 'outline-blue-300', 'editing-mode');
        userBio.classList.add('bg-blue-50', 'p-2', 'rounded-md', 'outline-blue-300', 'editing-mode');
        userBio.classList.remove('italic');

        // Troca o ícone para 'save' (check)
        editProfileButton.innerHTML = '<i data-lucide="check" class="w-6 h-6"></i>';
        editProfileButton.classList.remove('hover:bg-gray-200');
        editProfileButton.classList.add('hover:bg-green-100', 'bg-green-50');
        
        lucide.createIcons({
            nodes: [editProfileButton.querySelector('i')]
        });
        
        editProfileButton.title = 'Salvar Alterações';
        userName.focus();

        // Adiciona botão de cancelar
        addCancelButton();
        
        // Adiciona eventos de teclado
        addKeyboardEvents();
        
        showNotification('Modo de edição ativado. Pressione Esc para cancelar.', 'info');
    }

    function exitEditMode(save = true) {
        if (save) {
            saveProfile();
        } else {
            // Restaura dados originais
            userName.textContent = originalData.name;
            userBio.textContent = originalData.bio;
        }

        // Desabilita edição
        userName.contentEditable = false;
        userBio.contentEditable = false;

        // Remove classes de estilo
        userName.classList.remove('bg-blue-50', 'p-2', 'rounded-md', 'outline-blue-300', 'editing-mode');
        userBio.classList.remove('bg-blue-50', 'p-2', 'rounded-md', 'outline-blue-300', 'editing-mode');
        userBio.classList.add('italic');
        
        // Troca o ícone de volta para 'pencil'
        editProfileButton.innerHTML = '<i data-lucide="pencil" class="w-6 h-6"></i>';
        editProfileButton.classList.remove('hover:bg-green-100', 'bg-green-50');
        editProfileButton.classList.add('hover:bg-gray-200');
        
        lucide.createIcons({
            nodes: [editProfileButton.querySelector('i')]
        });

        editProfileButton.title = 'Editar Perfil';
        
        // Remove botão de cancelar se existir
        removeCancelButton();
        
        // Remove eventos de teclado
        removeKeyboardEvents();
    }

    function addCancelButton() {
        const cancelButton = document.createElement('button');
        cancelButton.id = 'cancel-edit-button';
        cancelButton.className = 'p-4 rounded-full bg-white text-red-600 shadow-lg hover:bg-red-50 transition-colors';
        cancelButton.title = 'Cancelar Edição';
        cancelButton.innerHTML = '<i data-lucide="x" class="w-6 h-6"></i>';
        
        const actionsContainer = editProfileButton.parentElement;
        actionsContainer.appendChild(cancelButton);
        
        lucide.createIcons({
            nodes: [cancelButton.querySelector('i')]
        });
        
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault();
            isEditing = false;
            exitEditMode(false);
            showNotification('Edição cancelada.', 'info');
        });
    }

    function removeCancelButton() {
        const cancelButton = document.getElementById('cancel-edit-button');
        if (cancelButton) {
            cancelButton.remove();
        }
    }

    function addKeyboardEvents() {
        document.addEventListener('keydown', handleKeyboardEvents);
    }

    function removeKeyboardEvents() {
        document.removeEventListener('keydown', handleKeyboardEvents);
    }

    function handleKeyboardEvents(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            isEditing = false;
            exitEditMode(false);
            showNotification('Edição cancelada.', 'info');
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            isEditing = false;
            exitEditMode(true);
        }
    }

    function saveProfile() {
        const newData = {
            name: userName.textContent.trim(),
            bio: userBio.textContent.trim()
        };

        // Validações
        if (!newData.name || newData.name.length < 2) {
            showNotification('O nome deve ter pelo menos 2 caracteres.', 'error');
            userName.focus();
            return false;
        }

        if (newData.bio && newData.bio.length > 200) {
            showNotification('A biografia deve ter no máximo 200 caracteres.', 'error');
            userBio.focus();
            return false;
        }

        // Simulação de salvamento (aqui você faria a requisição para o servidor)
        console.log('Dados salvos:', newData);
        
        // Simula delay de salvamento
        editProfileButton.classList.add('loading');
        
        setTimeout(() => {
            editProfileButton.classList.remove('loading');
            showNotification('Perfil atualizado com sucesso!', 'success');
        }, 1000);

        return true;
    }
}

/**
 * Inicializa animações e efeitos visuais
 */
function initializeAnimations() {
    // Adiciona animação de entrada aos cards
    const cards = document.querySelectorAll('.rounded-2xl');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in');
        }, index * 200);
    });

    // Adiciona efeito de hover aos botões
    const buttons = document.querySelectorAll('button, a');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

/**
 * Sistema de notificações
 */
function showNotification(message, type = 'info') {
    // Remove notificação existente se houver
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
    
    // Estilos baseados no tipo
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500', 'text-white');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        case 'info':
        default:
            notification.classList.add('bg-blue-500', 'text-white');
            break;
    }

    notification.innerHTML = `
        <div class="flex items-center">
            <span class="flex-1">${message}</span>
            <button class="ml-2 hover:opacity-75" onclick="this.parentElement.parentElement.remove()">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;

    document.body.appendChild(notification);
    
    // Cria ícones do Lucide na notificação
    lucide.createIcons({
        nodes: notification.querySelectorAll('i')
    });

    // Anima a entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Remove automaticamente após 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

/**
 * Utilitários gerais
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Reativa ícones do Lucide após mudanças dinâmicas
function refreshIcons() {
    lucide.createIcons();
}