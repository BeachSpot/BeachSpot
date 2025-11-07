import { getUserProfile, checkAuthentication, formatDate, formatPhone, formatCPF } from './getUserProfile.js';
import { supabase } from './supabaseClient.js';

console.log('[perfilGestor] Script iniciado');

let globalProfileData = null; // Para armazenar os dados do perfil para reverter em caso de erro

/**
 * Carrega os dados do perfil do gestor.
 * @returns {Object} Dados do perfil do gestor ou null
 */
async function loadGestorProfile() {
    try {
        console.log('[perfilGestor] Carregando perfil...');

        // 1. Buscar dados do usuário (já mescla dados do gestor)
        const userData = await getUserProfile();

        if (!userData) {
            console.error('[perfilGestor] Dados do usuário não encontrados');
            window.location.href = '../entrar.html'; // Redireciona se não achar
            return null;
        }

        // 2. Verificar se é gestor
        if (userData.tipo_conta !== 'gestor') {
            console.warn('[perfilGestor] Usuário não é gestor, redirecionando...');
            window.location.href = '../Telas Clientes/perfilCliente.html';
            return null;
        }

        console.log('[perfilGestor] Dados carregados:', userData);
        globalProfileData = userData; // Armazena globalmente
        return userData;

    } catch (error) {
        console.error('[perfilGestor] Erro ao carregar perfil:', error);
        showNotification('Erro ao carregar seu perfil. Tente novamente.', 'error');
        return null;
    }
}

/**
 * Exibe os dados do perfil do gestor na página.
 * @param {Object} profileData - Os dados do perfil
 */
async function displayGestorData(profileData) {
    if (!profileData) {
        console.warn('[perfilGestor] Nenhum dado de perfil para exibir.');
        return;
    }

    try {
        // Preencher NOME
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = profileData.nome || 'Gestor';
        }

        // Preencher EMAIL
        const userEmail = document.getElementById('user-email');
        if (userEmail) {
            userEmail.textContent = profileData.email || 'Email não informado';
        }

        // Preencher CPF
        const userCpf = document.getElementById('user-cpf');
        if (userCpf) {
            userCpf.textContent = formatCPF(profileData.cpf) || 'Não informado';
        }

        // Preencher TELEFONE
        const userPhone = document.getElementById('user-phone');
        if (userPhone) {
            userPhone.textContent = formatPhone(profileData.telefone) || 'Não informado';
        }

        // Preencher DATA DE NASCIMENTO
        const userDob = document.getElementById('user-dob');
        if (userDob) {
            userDob.textContent = formatDate(profileData.data_nascimento) || 'Não informado';
        }

        // Preencher MEMBRO DESDE
        const userMemberSince = document.getElementById('user-member-since');
        if (userMemberSince) {
            userMemberSince.textContent = `Membro desde ${formatDate(profileData.data_criacao)}`;
        }

        // Preencher FOTO DE PERFIL
        const profileImage = document.getElementById('profile-image');
        if (profileImage) {
            if (profileData.foto_perfil) {
                console.log('[perfilGestor] Baixando foto:', profileData.foto_perfil);
                // Usar getPublicUrl para obter a URL da imagem
                const { data, error } = await supabase
                    .storage
                    .from('fotos_perfil')
                    .getPublicUrl(profileData.foto_perfil);

                if (error) {
                    console.error('[ERRO] Ao buscar URL da foto:', error);
                    profileImage.src = 'https://placehold.co/150x150/E2E8F0/64748B?text=Gestor'; // Fallback
                } else {
                    console.log('[DEBUG] URL da foto:', data.publicUrl);
                    profileImage.src = data.publicUrl;
                }
            } else {
                console.log('[DEBUG] Sem foto de perfil no banco.');
                profileImage.src = 'https://placehold.co/150x150/E2E8F0/64748B?text=Gestor'; // Fallback
            }
        }

        // Configurar o upload de imagem (agora é chamado aqui)
        setupImageUpload(profileData);

    } catch (error) {
        console.error('[perfilGestor] Erro ao exibir dados:', error);
        showNotification('Erro ao exibir dados do perfil.', 'error');
    }
}

/**
 * Configura o upload da foto de perfil.
 * @param {Object} userData - Dados do usuário (necessário para o ID)
 */
function setupImageUpload(userData) {
    const profileImage = document.getElementById('profile-image');
    const editIcon = document.getElementById('edit-icon');
    const fileInput = document.getElementById('file-input');

    if (!profileImage || !editIcon || !fileInput) {
        console.warn('[setupImageUpload] Elementos de upload não encontrados.');
        return;
    }

    const openFileDialog = () => fileInput.click();

    // Evita adicionar múltiplos listeners se a função for chamada novamente
    profileImage.removeEventListener('click', openFileDialog);
    editIcon.removeEventListener('click', openFileDialog);
    
    profileImage.addEventListener('click', openFileDialog);
    editIcon.addEventListener('click', openFileDialog);

    // Limpa listeners antigos do fileInput para evitar disparos múltiplos
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);

    newFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        console.log('[DEBUG] Arquivo selecionado:', file.name);

        // 1. Mostrar preview imediato
        const reader = new FileReader();
        reader.onload = (e) => {
            profileImage.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // 2. Preparar e fazer upload
        const fileExt = file.name.split('.').pop();
        const fileName = `${userData.id_usuario}-${uuidv4()}.${fileExt}`;
        const filePath = `${fileName}`; // Caminho no bucket

        try {
            showNotification('Salvando sua nova foto...', 'info');

            const { error: uploadError } = await supabase
                .storage
                .from('fotos_perfil')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true // Sobrescreve se já existir
                });

            if (uploadError) {
                console.error('[ERRO] Upload da foto falhou:', uploadError);
                showNotification('Erro ao salvar a foto. Tente novamente.', 'error');
                // Reverter a imagem para a original
                await displayGestorData(globalProfileData); 
                return;
            }

            console.log('[DEBUG] Upload da foto OK:', filePath);

            // 3. Atualizar o nome do arquivo no banco (tabela 'gestor')
            const { error: dbError } = await supabase
                .from('gestor')
                .update({ foto_perfil: filePath })
                .eq('id_gestor', userData.id_usuario);

            if (dbError) {
                console.error('[ERRO] Ao salvar foto no banco (gestor):', dbError);
                showNotification('Erro ao atualizar seu perfil.', 'error');
                await displayGestorData(globalProfileData); 
                return;
            }

            console.log('[DEBUG] Foto de perfil (gestor) atualizada no banco!');
            showNotification('Foto atualizada com sucesso!', 'success');
            
            // Atualiza globalProfileData com o novo nome da foto
            globalProfileData.foto_perfil = filePath;

        } catch (error) {
            console.error('[ERRO] Erro geral no upload:', error);
            showNotification('Erro inesperado ao processar a foto.', 'error');
            await displayGestorData(globalProfileData);
        }
    });
}

/**
 * Gera um UUID v4.
 * @returns {string} UUID
 */
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

/**
 * Exibe uma notificação flutuante.
 * @param {string} message - Mensagem
 * @param {'success' | 'error' | 'info'} type - Tipo da notificação
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    // Classes de base para a notificação
    notification.className = `fixed top-20 right-5 p-4 rounded-lg shadow-lg text-white text-sm z-[100] transition-transform transform translate-x-full`;
    
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500');
            break;
        case 'error':
            notification.classList.add('bg-red-500');
            break;
        case 'info':
        default:
            notification.classList.add('bg-blue-500');
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
    
    // Recria ícones do Lucide na notificação
    lucide.createIcons({
        nodes: notification.querySelectorAll('i')
    });

    // Animação de entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Animação de saída
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300); // Tempo para a transição de saída
        }
    }, 5000); // Tempo que a notificação fica visível
}

/**
 * Função de inicialização do perfil.
 */
async function initializeProfile() {
    // 1. Verificar autenticação
    await checkAuthentication();

    // 2. Carregar dados do perfil
    const profileData = await loadGestorProfile();

    // 3. Exibir dados do perfil
    if (profileData) {
        await displayGestorData(profileData);
    }
}

// Iniciar ao carregar o DOM
document.addEventListener('DOMContentLoaded', initializeProfile);