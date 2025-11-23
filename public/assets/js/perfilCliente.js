import { supabase } from './supabaseClient.js';

console.log('[PERFIL CLIENTE] Módulo carregado');

let isEditMode = false;

// Função para carregar dados do perfil
async function loadProfileData() {
    try {
        console.log('[PERFIL] Carregando dados...');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.log('[PERFIL] Usuário não autenticado');
            window.location.href = '../entrar.html';
            return null;
        }

        const userId = session.user.id;
        console.log('[PERFIL] User ID:', userId);

        const { data: usuario, error: usuarioError } = await supabase
            .from('usuarios')
            .select('id_usuario, email, tipo_conta, data_criacao')
            .eq('id_usuario', userId)
            .maybeSingle();

        if (usuarioError || !usuario) {
            console.error('[ERRO] Usuário não encontrado:', usuarioError);
            window.location.href = '../entrar.html';
            return null;
        }

        if (usuario.tipo_conta !== 'cliente') {
            console.log('[PERFIL] Usuário não é cliente, redirecionando...');
            window.location.href = usuario.tipo_conta === 'gestor' 
                ? '../Telas Gestor/perfilGestor.html' 
                : '../entrar.html';
            return null;
        }

        const { data: cliente, error: clienteError } = await supabase
            .from('cliente')
            .select('nome, bio, foto_perfil, avatar_url')
            .eq('id_cliente', userId)
            .maybeSingle();

        if (clienteError) {
            console.warn('[AVISO] Perfil cliente não encontrado:', clienteError);
        }

        const profileData = {
            id_usuario: usuario.id_usuario,
            email: usuario.email,
            tipo_conta: usuario.tipo_conta,
            data_criacao: usuario.data_criacao,
            nome: cliente?.nome || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Cliente',
            bio: cliente?.bio || '',
            foto_perfil: cliente?.foto_perfil || cliente?.avatar_url || null
        };

        console.log('[PERFIL] ✅ Dados carregados:', profileData);
        return profileData;

    } catch (error) {
        console.error('[ERRO] Carregar perfil:', error);
        return null;
    }
}

// Função para carregar estatísticas
async function loadStatistics(userId) {
    try {
        console.log('[STATS] Carregando estatísticas...');

        const { count: reservasCount, error: reservasError } = await supabase
            .from('reservas')
            .select('*', { count: 'exact', head: true })
            .eq('id_cliente', userId);

        if (reservasError) {
            console.warn('[STATS] Erro ao contar reservas:', reservasError);
        }

        let avaliacoesCount = 0;
        try {
            const { count, error } = await supabase
                .from('avaliacoes')
                .select('*', { count: 'exact', head: true })
                .eq('id_usuario', userId);

            if (!error) {
                avaliacoesCount = count || 0;
            }
        } catch (err) {
            console.warn('[STATS] Tabela avaliacoes não existe');
        }

        const stats = {
            reservasCount: reservasCount || 0,
            avaliacoesCount: avaliacoesCount
        };

        console.log('[STATS] ✅ Estatísticas:', stats);
        return stats;

    } catch (error) {
        console.error('[ERRO] Carregar estatísticas:', error);
        return { reservasCount: 0, avaliacoesCount: 0 };
    }
}

// Função para exibir dados na página
function displayProfileData(profileData) {
    if (!profileData) return;

    console.log('[DISPLAY] Exibindo dados...');

    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = profileData.nome;
    }

    const userBio = document.getElementById('user-bio');
    if (userBio) {
        if (profileData.bio && profileData.bio.trim() !== '') {
            userBio.textContent = profileData.bio;
            userBio.classList.remove('text-gray-400', 'italic');
            userBio.classList.add('text-gray-600');
        } else {
            userBio.textContent = 'Adicione uma bio...';
            userBio.classList.add('text-gray-400', 'italic');
            userBio.classList.remove('text-gray-600');
        }
    }

    const memberSince = document.getElementById('member-since');
    if (memberSince && profileData.data_criacao) {
        const data = new Date(profileData.data_criacao);
        const dataFormatada = data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        memberSince.textContent = `Membro desde: ${dataFormatada}`;
    }

    const avatar = document.getElementById('carteirinha-avatar');
    const headerAvatar = document.getElementById('header-avatar');
    
    let fotoUrl = null;
    
    if (profileData.foto_perfil) {
        if (profileData.foto_perfil.startsWith('http')) {
            fotoUrl = profileData.foto_perfil;
        } else {
            const { data } = supabase
                .storage
                .from('media')
                .getPublicUrl(profileData.foto_perfil);
            
            fotoUrl = data?.publicUrl;
        }
    }
    
    if (!fotoUrl) {
        const iniciais = profileData.nome
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        fotoUrl = `https://placehold.co/160x224/0138b4/FFFFFF?text=${iniciais}`;
    }
    
    if (avatar) avatar.src = fotoUrl;
    if (headerAvatar) {
        const headerUrl = fotoUrl.includes('placehold.co') 
            ? fotoUrl.replace('160x224', '40x40')
            : fotoUrl;
        headerAvatar.src = headerUrl;
    }

    console.log('[DISPLAY] ✅ Dados exibidos');
}

// Função para exibir estatísticas
function displayStatistics(stats) {
    if (!stats) return;

    const statsReservas = document.getElementById('stats-reservas');
    if (statsReservas) {
        statsReservas.textContent = stats.reservasCount;
    }

    const statsAvaliacoes = document.getElementById('stats-avaliacoes');
    if (statsAvaliacoes) {
        statsAvaliacoes.textContent = stats.avaliacoesCount;
    }

    console.log('[DISPLAY] ✅ Estatísticas exibidas');
}

// Função para alternar modo de edição
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const editButton = document.getElementById('edit-profile-button');
    const fotoLabel = document.querySelector('label[for="foto-perfil-input"]');
    const userName = document.getElementById('user-name');
    const userBio = document.getElementById('user-bio');
    const photoOverlay = document.querySelector('.photo-edit-overlay');
    const photoContainer = document.querySelector('.photo-container');
    
    if (isEditMode) {
        // Entrar em modo de edição
        editButton.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i>';
        editButton.title = 'Salvar Perfil';
        editButton.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600');
        editButton.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-100', 'border', 'border-gray-200');
        
        // Habilitar edição de foto
        if (fotoLabel) {
            fotoLabel.classList.remove('pointer-events-none');
        }
        
        // Mostrar overlay de edição da foto
        if (photoOverlay) {
            photoOverlay.classList.remove('hidden');
        }
        
        // Adicionar borda na foto
        if (photoContainer) {
            photoContainer.classList.add('ring-4', 'ring-blue-400', 'ring-offset-2');
        }
        
        // Adicionar indicadores visuais com bordas
        if (userName) {
            userName.classList.add('cursor-pointer', 'hover:bg-blue-50', 'rounded', 'px-2', 'py-1', 'border-2', 'border-dashed', 'border-blue-400');
        }
        if (userBio) {
            userBio.classList.add('cursor-pointer', 'hover:bg-blue-50', 'rounded', 'px-2', 'py-1', 'border-2', 'border-dashed', 'border-blue-400', 'min-h-[60px]');
        }
        
    } else {
        // Sair do modo de edição
        editButton.innerHTML = '<i data-lucide="pencil" class="w-5 h-5"></i>';
        editButton.title = 'Editar Perfil';
        editButton.classList.remove('bg-green-500', 'text-white', 'hover:bg-green-600');
        editButton.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-100', 'border', 'border-gray-200');
        
        // Desabilitar edição de foto
        if (fotoLabel) {
            fotoLabel.classList.add('pointer-events-none');
        }
        
        // Esconder overlay de edição da foto
        if (photoOverlay) {
            photoOverlay.classList.add('hidden');
        }
        
        // Remover borda da foto
        if (photoContainer) {
            photoContainer.classList.remove('ring-4', 'ring-blue-400', 'ring-offset-2');
        }
        
        // Remover indicadores visuais
        if (userName) {
            userName.classList.remove('cursor-pointer', 'hover:bg-blue-50', 'rounded', 'px-2', 'py-1', 'border-2', 'border-dashed', 'border-blue-400');
            userName.contentEditable = 'false';
        }
        if (userBio) {
            userBio.classList.remove('cursor-pointer', 'hover:bg-blue-50', 'rounded', 'px-2', 'py-1', 'border-2', 'border-dashed', 'border-blue-400', 'min-h-[60px]');
            userBio.contentEditable = 'false';
        }
    }
    
    // Reinicializar ícones
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Função para configurar upload de foto
function setupImageUpload(profileData) {
    const fotoInput = document.getElementById('foto-perfil-input');
    const fotoLabel = document.querySelector('label[for="foto-perfil-input"]');
    const avatar = document.getElementById('carteirinha-avatar');
    const headerAvatar = document.getElementById('header-avatar');

    if (!fotoInput || !avatar || !fotoLabel) return;
    
    // Desabilitar por padrão
    fotoLabel.classList.add('pointer-events-none');

    fotoInput.addEventListener('change', async (e) => {
        if (!isEditMode) return;
        
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione uma imagem válida.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        console.log('[UPLOAD] Iniciando upload da foto...');

        // Preview imediato
        const reader = new FileReader();
        reader.onload = (event) => {
            avatar.src = event.target.result;
            if (headerAvatar) headerAvatar.src = event.target.result;
        };
        reader.readAsDataURL(file);

        try {
            // Nome do arquivo limpo e único
            const nomeArquivoLimpo = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
            const fileName = `clientes/${profileData.id_usuario}/perfil/${Date.now()}_${nomeArquivoLimpo}`;
            
            const BUCKET_NAME = 'media';

            // Upload para o Supabase Storage
            const { error: uploadError } = await supabase
                .storage
                .from(BUCKET_NAME)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error('[ERRO] Upload falhou:', uploadError);
                
                if (uploadError.message.includes('Bucket not found')) {
                    alert(`O bucket "${BUCKET_NAME}" não existe no Supabase Storage. Por favor, verifique a configuração.`);
                } else {
                    alert('Erro ao salvar a foto. Tente novamente.');
                }
                
                displayProfileData(profileData);
                return;
            }

            // Obter URL pública
            const { data: urlData } = supabase
                .storage
                .from(BUCKET_NAME)
                .getPublicUrl(fileName);

            if (!urlData || !urlData.publicUrl) {
                console.error('[ERRO] Não foi possível obter URL pública');
                alert('Erro ao processar a foto.');
                return;
            }

            const publicUrl = urlData.publicUrl;
            console.log('[UPLOAD] URL pública obtida:', publicUrl);

            // Atualizar banco de dados
            const { error: dbError } = await supabase
                .from('cliente')
                .update({ 
                    foto_perfil: fileName,
                    avatar_url: publicUrl
                })
                .eq('id_cliente', profileData.id_usuario);

            if (dbError) {
                console.error('[ERRO] Atualizar banco:', dbError);
                alert('Erro ao atualizar perfil.');
                return;
            }

            console.log('[UPLOAD] ✅ Foto atualizada com sucesso!');
            profileData.foto_perfil = fileName;
            profileData.avatar_url = publicUrl;
            alert('Foto atualizada com sucesso!');

        } catch (error) {
            console.error('[ERRO] Upload geral:', error);
            alert('Erro ao processar a foto.');
            displayProfileData(profileData);
        }
    });
}

// Função para configurar edição de nome
function setupNameEdit(profileData) {
    const userName = document.getElementById('user-name');
    if (!userName) return;

    let originalName = userName.textContent.trim();

    const startEditing = () => {
        if (!isEditMode) return;
        if (userName.contentEditable === 'true') return;

        originalName = userName.textContent.trim();
        userName.contentEditable = 'true';
        userName.focus();
        userName.classList.add('outline-none', 'bg-blue-50');
        
        const range = document.createRange();
        range.selectNodeContents(userName);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    };

    const saveName = async () => {
        if (userName.contentEditable === 'false') return;

        userName.contentEditable = 'false';
        userName.classList.remove('outline-none', 'bg-blue-50');

        const newName = userName.textContent.trim();

        if (newName === '') {
            userName.textContent = originalName;
            alert('O nome não pode estar vazio.');
            return;
        }

        if (newName.length < 2) {
            userName.textContent = originalName;
            alert('O nome deve ter pelo menos 2 caracteres.');
            return;
        }

        if (newName === originalName) {
            return;
        }

        try {
            const { error } = await supabase
                .from('cliente')
                .update({ nome: newName })
                .eq('id_cliente', profileData.id_usuario);

            if (error) throw error;

            console.log('[NOME] ✅ Nome atualizado');
            profileData.nome = newName;
            
            const avatar = document.getElementById('carteirinha-avatar');
            if (avatar && avatar.src.includes('placehold.co')) {
                const iniciais = newName
                    .split(' ')
                    .filter(word => word.length > 0)
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                avatar.src = `https://placehold.co/160x224/0138b4/FFFFFF?text=${iniciais}`;
            }

            alert('Nome atualizado com sucesso!');

        } catch (error) {
            console.error('[NOME] Erro ao salvar:', error);
            userName.textContent = originalName;
            alert('Erro ao salvar nome.');
        }
    };

    const cancelEdit = () => {
        userName.contentEditable = 'false';
        userName.classList.remove('outline-none', 'bg-blue-50');
        userName.textContent = originalName;
    };

    userName.addEventListener('click', startEditing);
    userName.addEventListener('blur', saveName);
    
    userName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            userName.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
}

// Função para configurar edição de bio
function setupBioEdit(profileData) {
    const userBio = document.getElementById('user-bio');
    if (!userBio) return;

    let originalBio = userBio.textContent.trim();

    const startEditing = () => {
        if (!isEditMode) return;
        if (userBio.contentEditable === 'true') return;

        originalBio = userBio.textContent.trim();
        
        // Limpar o placeholder se estiver vazio
        if (userBio.textContent.includes('Adicione uma bio...')) {
            userBio.textContent = '';
        }
        
        userBio.contentEditable = 'true';
        userBio.focus();
        userBio.classList.add('outline-none', 'bg-blue-50');
        userBio.classList.remove('text-gray-400', 'italic');
        userBio.classList.add('text-gray-600');
        
        const range = document.createRange();
        range.selectNodeContents(userBio);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    };

    const saveBio = async () => {
        if (userBio.contentEditable === 'false') return;

        userBio.contentEditable = 'false';
        userBio.classList.remove('outline-none', 'bg-blue-50');

        const newBio = userBio.textContent.trim();

        try {
            const { error } = await supabase
                .from('cliente')
                .update({ bio: newBio })
                .eq('id_cliente', profileData.id_usuario);

            if (error) throw error;

            console.log('[BIO] ✅ Bio atualizada');
            profileData.bio = newBio;
            
            if (newBio === '') {
                userBio.textContent = 'Adicione uma bio...';
                userBio.classList.add('text-gray-400', 'italic');
                userBio.classList.remove('text-gray-600');
            } else {
                userBio.classList.remove('text-gray-400', 'italic');
                userBio.classList.add('text-gray-600');
            }

            alert('Bio atualizada com sucesso!');

        } catch (error) {
            console.error('[BIO] Erro ao salvar:', error);
            userBio.textContent = originalBio || 'Adicione uma bio...';
            if (!originalBio) {
                userBio.classList.add('text-gray-400', 'italic');
                userBio.classList.remove('text-gray-600');
            }
            alert('Erro ao salvar bio.');
        }
    };

    const cancelEdit = () => {
        userBio.contentEditable = 'false';
        userBio.classList.remove('outline-none', 'bg-blue-50');
        userBio.textContent = originalBio || 'Adicione uma bio...';
        
        if (!originalBio) {
            userBio.classList.add('text-gray-400', 'italic');
            userBio.classList.remove('text-gray-600');
        }
    };

    userBio.addEventListener('click', startEditing);
    userBio.addEventListener('blur', saveBio);
    
    userBio.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            userBio.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
}

// Função principal de inicialização
async function initializeProfile() {
    console.log('[INIT] Inicializando perfil do cliente...');
    
    const profileData = await loadProfileData();
    if (!profileData) {
        console.error('[INIT] Falha ao carregar dados');
        return;
    }
    
    displayProfileData(profileData);

    const stats = await loadStatistics(profileData.id_usuario);
    displayStatistics(stats);

    setupImageUpload(profileData);
    setupNameEdit(profileData);
    setupBioEdit(profileData);
    
    // Configurar botão de edição
    const editButton = document.getElementById('edit-profile-button');
    if (editButton) {
        editButton.addEventListener('click', toggleEditMode);
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('[INIT] ✅ Inicialização concluída');
}

document.addEventListener('DOMContentLoaded', initializeProfile);

export { initializeProfile };