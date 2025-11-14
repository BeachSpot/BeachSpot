import { supabase } from './supabaseClient.js';

// Funções auxiliares de formatação
function formatDate(dateString) {
    if (!dateString) return 'Não informado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatPhone(phone) {
    if (!phone) return 'Não informado';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

function formatCPF(cpf) {
    if (!cpf) return 'Não informado';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
}

// Função para carregar dados do perfil do gestor
async function loadProfileData() {
    try {
        // 1. Verificar sessão ativa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.log('[INFO] Usuário não autenticado, redirecionando...');
            window.location.href = '../entrar.html';
            return null;
        }

        console.log('[DEBUG] Carregando perfil do gestor...');

        const userId = session.user.id;

        // 2. Buscar dados na tabela usuarios
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuarios')
            .select('id_usuario, email, tipo_conta, data_criacao')
            .eq('id_usuario', userId)
            .single();

        if (usuarioError || !usuario) {
            console.error('[ERRO] Usuário não encontrado:', usuarioError);
            window.location.href = '../entrar.html';
            return null;
        }

        // 3. Verificar se é gestor
        if (usuario.tipo_conta !== 'gestor') {
            console.log('[INFO] Usuário não é gestor, redirecionando...');
            window.location.href = '../Telas Clientes/perfilCliente.html';
            return null;
        }

        // 4. Buscar dados específicos do gestor
        const { data: gestor, error: gestorError } = await supabase
            .from('gestor')
            .select('nome, bio, telefone, cpf, data_nascimento, foto_perfil')
            .eq('id_gestor', userId)
            .single();

        if (gestorError) {
            console.warn('[AVISO] Dados do gestor não encontrados:', gestorError);
        }

        const profileData = {
            id_usuario: userId,
            email: usuario.email,
            nome: gestor?.nome || session.user.user_metadata?.full_name || 'Gestor',
            bio: gestor?.bio || '"Responsável pela gestão e coordenação das atividades da praia. Sempre buscando proporcionar a melhor experiência aos nossos clientes!"',
            telefone: gestor?.telefone,
            cpf: gestor?.cpf,
            data_nascimento: gestor?.data_nascimento,
            data_criacao: usuario.data_criacao || session.user.created_at,
            foto_perfil: gestor?.foto_perfil,
            tipo_conta: usuario.tipo_conta
        };

        console.log('[DEBUG] Perfil do gestor carregado:', profileData);
        return profileData;

    } catch (error) {
        console.error('[ERRO] Falha ao carregar perfil:', error);
        return null;
    }
}

// Função para carregar estatísticas do gestor
async function loadStatistics(gestorId) {
    console.log('[DEBUG] Carregando estatísticas do gestor:', gestorId);
    
    try {
        let barracasCount = 0;
        let avaliacaoMedia = 0;

        // Tentar contar barracas
        try {
            const { count, error } = await supabase
                .from('barracas')
                .select('*', { count: 'exact', head: true })
                .eq('id_gestor', gestorId);

            if (!error) {
                barracasCount = count || 0;
                console.log('[DEBUG] ✓ Barracas encontradas:', barracasCount);

                // Se tem barracas, calcular avaliação média
                if (barracasCount > 0) {
                    const { data: barracas, error: barracasError } = await supabase
                        .from('barracas')
                        .select('avaliacao_media')
                        .eq('id_gestor', gestorId);

                    if (!barracasError && barracas && barracas.length > 0) {
                        const somaAvaliacoes = barracas.reduce((acc, b) => acc + (b.avaliacao_media || 0), 0);
                        avaliacaoMedia = barracasCount > 0 ? (somaAvaliacoes / barracasCount).toFixed(1) : 0;
                        console.log('[DEBUG] ✓ Avaliação média calculada:', avaliacaoMedia);
                    }
                }
            } else {
                console.warn('[DEBUG] ✗ Tabela barraca não existe ainda');
            }
        } catch (err) {
            console.warn('[DEBUG] Erro ao buscar barracas:', err.message);
        }

        return { barracasCount, avaliacaoMedia };

    } catch (error) {
        console.error('[ERRO] Falha ao carregar estatísticas:', error);
        return { barracasCount: 0, avaliacaoMedia: 0 };
    }
}

// Função para exibir dados do perfil
function displayProfileData(profileData) {
    if (!profileData) return;

    // Nome
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = profileData.nome || 'Gestor';
    }

    // Bio
    const userBio = document.getElementById('user-bio');
    if (userBio) {
        userBio.textContent = profileData.bio;
    }

    // Data "Gestor desde"
    const gestorDesde = document.querySelector('main p.text-sm.text-gray-500');
    if (gestorDesde && profileData.data_criacao) {
        gestorDesde.textContent = `Gestor desde: ${formatDate(profileData.data_criacao)}`;
    }

    // Foto de perfil
    const avatarElement = document.getElementById('carteirinha-avatar');
    if (avatarElement) {
        if (profileData.foto_perfil) {
            const { data } = supabase
                .storage
                .from('fotos_perfil')
                .getPublicUrl(profileData.foto_perfil);
            
            if (data && data.publicUrl) {
                avatarElement.src = data.publicUrl;
            } else {
                const initials = (profileData.nome || 'G')
                    .split(' ')
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                avatarElement.src = `https://placehold.co/160x224/0138b4/FFFFFF?text=${initials}`;
            }
        } else {
            const initials = (profileData.nome || 'G')
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            avatarElement.src = `https://placehold.co/160x224/0138b4/FFFFFF?text=${initials}`;
        }
    }

    // Avatar no header
    const headerAvatar = document.querySelector('header img[alt="Avatar do Gestor"]');
    if (headerAvatar) {
        if (profileData.foto_perfil) {
            const { data } = supabase
                .storage
                .from('fotos_perfil')
                .getPublicUrl(profileData.foto_perfil);
            
            if (data && data.publicUrl) {
                headerAvatar.src = data.publicUrl;
            } else {
                const initials = (profileData.nome || 'G').substring(0, 1).toUpperCase();
                headerAvatar.src = `https://placehold.co/40x40/0138b4/FFFFFF?text=${initials}`;
            }
        } else {
            const initials = (profileData.nome || 'G').substring(0, 1).toUpperCase();
            headerAvatar.src = `https://placehold.co/40x40/0138b4/FFFFFF?text=${initials}`;
        }
    }

    console.log('[DEBUG] Perfil do gestor exibido na página');
}

// Função para exibir estatísticas
function displayStatistics(stats) {
    if (!stats) return;

    const statsElements = document.querySelectorAll('.font-bold.text-3xl');
    if (statsElements.length >= 2) {
        statsElements[0].textContent = `${stats.avaliacaoMedia || '0.0'} ★`;
        statsElements[1].textContent = stats.barracasCount || 0;
    }

    console.log('[DEBUG] Estatísticas exibidas');
}

// Função para configurar upload de foto
function setupImageUpload(profileData) {
    const fotoInput = document.getElementById('foto-perfil-input');
    const avatarElement = document.getElementById('carteirinha-avatar');

    if (fotoInput && avatarElement) {
        fotoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione uma imagem válida.');
                return;
            }

            // Preview imediato
            const reader = new FileReader();
            reader.onload = (event) => {
                avatarElement.src = event.target.result;
            };
            reader.readAsDataURL(file);

            try {
                // Upload para Supabase Storage
                const fileName = `avatar_${profileData.id_usuario}_${Date.now()}.${file.name.split('.').pop()}`;
                
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('fotos_perfil')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error('[ERRO] Upload falhou:', uploadError);
                    alert('Erro ao salvar a foto. Tente novamente.');
                    displayProfileData(profileData);
                    return;
                }

                // Atualizar no banco
                const { error: dbError } = await supabase
                    .from('gestor')
                    .update({ foto_perfil: fileName })
                    .eq('id_gestor', profileData.id_usuario);

                if (dbError) {
                    console.error('[ERRO] Ao salvar no banco:', dbError);
                    alert('Erro ao atualizar perfil.');
                    return;
                }

                console.log('[DEBUG] Foto atualizada com sucesso!');
                alert('Foto atualizada!');
            } catch (error) {
                console.error('[ERRO] Erro no upload:', error);
                alert('Erro ao processar a foto.');
            }
        });
    }
}

// Função de logout
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('[ERRO] Logout:', error);
            alert('Não foi possível sair.');
            return;
        }
        window.location.href = '../entrar.html';
    } catch (error) {
        console.error('[ERRO] Logout:', error);
    }
}

// Inicialização principal
async function initializeProfile() {
    console.log('[DEBUG] Inicializando perfil do gestor...');
    
    // 1. Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../entrar.html';
        return;
    }

    // 2. Carregar dados
    const profileData = await loadProfileData();
    if (!profileData) {
        console.error('[ERRO] Falha ao carregar perfil.');
        return;
    }
    
    // 3. Exibir dados
    displayProfileData(profileData);

    // 4. Carregar estatísticas
    const stats = await loadStatistics(profileData.id_usuario);
    displayStatistics(stats);

    // 5. Configurar upload de foto
    setupImageUpload(profileData);

    // 6. Configurar ícones Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 7. Configurar botão de logout
    const logoutBtn = document.querySelector('a[title="Sair"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Deseja realmente sair?')) {
                handleLogout();
            }
        });
    }
}

// Iniciar ao carregar DOM
document.addEventListener('DOMContentLoaded', initializeProfile);