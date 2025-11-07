import { supabase } from './supabaseClient.js';

// Função para carregar dados do perfil
async function loadProfileData() {
    try {
        // 1. Verificar se há sessão ativa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.log('[INFO] Usuário não autenticado, redirecionando...');
            window.location.href = '/entrar.html';
            return null;
        }

        console.log('[DEBUG] Carregando perfil do cliente...');

        // 2. Buscar dados do usuário (tabela auth)
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuarios')
            .select('id_usuario, email, tipo_conta, data_criacao')
            .eq('id_usuario', session.user.id)
            .single();

        if (usuarioError || !usuario) {
            console.error('[ERRO] Usuário não encontrado na tabela "usuarios":', usuarioError);
            window.location.href = '/entrar.html';
            return null;
        }

        // 3. Verificar se é realmente um cliente
        if (usuario.tipo_conta !== 'cliente') {
            console.log('[INFO] Usuário não é cliente, redirecionando...');
            window.location.href = usuario.tipo_conta === 'gestor' ? '/Telas Gestor/perfilGestor.html' : '/entrar.html';
            return null;
        }

        // 4. Buscar dados do perfil (tabela cliente)
        const { data: cliente, error: clienteError } = await supabase
            .from('cliente')
            .select('*')
            .eq('id_cliente', usuario.id_usuario)
            .single();

        if (clienteError) {
            console.warn('[AVISO] Perfil "cliente" não encontrado. O usuário precisa completar o cadastro?', clienteError);
        }

        // 5. Mesclar os dados (auth + perfil)
        const profileData = { ...usuario, ...cliente };

        console.log('[DEBUG] Perfil carregado:', profileData);
        return profileData;

    } catch (error) {
        console.error('[ERRO] Falha crítica ao carregar perfil:', error);
        return null;
    }
}

// Função para carregar estatísticas
async function loadStatistics(userId) {
    console.log('[DEBUG] Carregando estatísticas para:', userId);
    try {
        let reservasCount = 0;
        
        // Tentar contar reservas - testando diferentes nomes de colunas
        // Tentativa 1: usando id_cliente
        const { count: count1, error: error1 } = await supabase
            .from('reservas')
            .select('*', { count: 'exact', head: true })
            .eq('id_cliente', userId);

        if (!error1) {
            reservasCount = count1 || 0;
            console.log('[DEBUG] ✓ Reservas encontradas (coluna: id_cliente):', reservasCount);
        } else {
            console.log('[DEBUG] ✗ Coluna id_cliente não existe, tentando cliente_id...');
            
            // Tentativa 2: usando cliente_id
            const { count: count2, error: error2 } = await supabase
                .from('reservas')
                .select('*', { count: 'exact', head: true })
                .eq('cliente_id', userId);

            if (!error2) {
                reservasCount = count2 || 0;
                console.log('[DEBUG] ✓ Reservas encontradas (coluna: cliente_id):', reservasCount);
            } else {
                console.log('[DEBUG] ✗ Coluna cliente_id também não existe, tentando id_usuario...');
                
                // Tentativa 3: usando id_usuario
                const { count: count3, error: error3 } = await supabase
                    .from('reservas')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_usuario', userId);

                if (!error3) {
                    reservasCount = count3 || 0;
                    console.log('[DEBUG] ✓ Reservas encontradas (coluna: id_usuario):', reservasCount);
                } else {
                    console.error('[ERRO] Nenhuma coluna FK válida encontrada na tabela reservas');
                    console.error('[ERRO] Detalhes:', error3);
                }
            }
        }

        // Contar Avaliações (desabilitado - tabela não existe)
        const avaliacoesCount = 0;

        console.log('[DEBUG] ✓ Estatísticas carregadas:', { reservasCount, avaliacoesCount });
        return { reservasCount, avaliacoesCount };

    } catch (error) {
        console.error('[ERRO] Falha ao carregar estatísticas:', error);
        return { reservasCount: 0, avaliacoesCount: 0 };
    }
}

// Função para exibir dados na página
function displayProfileData(profileData) {
    if (!profileData) return;

    // Preencher Carteirinha ID
    const carteirinhaIdEl = document.getElementById('carteirinha-id');
    if (carteirinhaIdEl) {
        carteirinhaIdEl.textContent = (profileData.id_usuario || '00000000').substring(0, 8).toUpperCase();
    }

    // Preencher Nome
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        userNameEl.textContent = profileData.nome || 'Usuário';
    }

    // Preencher Email
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) {
        userEmailEl.textContent = profileData.email || 'Sem email';
    }

    // Preencher Bio
    const userBioEl = document.getElementById('user-bio');
    if (userBioEl) {
        userBioEl.textContent = profileData.bio || 'Adicione uma bio.';
    }

    // Preencher "Membro desde"
    const memberSinceEl = document.getElementById('member-since');
    if (memberSinceEl && profileData.data_criacao) {
        const dataFormatada = new Date(profileData.data_criacao).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        memberSinceEl.textContent = `Membro desde: ${dataFormatada}`;
    }

    // FOTO PERFIL - CORRIGIDO
    const avatarElement = document.getElementById('carteirinha-avatar');
    if (avatarElement) {
        if (profileData.foto_perfil) {
            // Tentar buscar do Storage
            const { data } = supabase
                .storage
                .from('fotos_perfil')
                .getPublicUrl(profileData.foto_perfil);
            
            if (data && data.publicUrl) {
                avatarElement.src = data.publicUrl;
                console.log('[DEBUG] URL pública da foto:', data.publicUrl);
            } else {
                // Usar placeholder com iniciais
                const initials = (profileData.nome || 'U')
                    .split(' ')
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                avatarElement.src = `https://placehold.co/160x224/0138b4/FFFFFF?text=${initials}`;
            }
        } else {
            // Usar placeholder com iniciais do nome
            const initials = (profileData.nome || 'U')
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            avatarElement.src = `https://placehold.co/160x224/0138b4/FFFFFF?text=${initials}`;
        }
    }

    // Preencher detalhes (CPF, Fone, etc.)
    const userCpfEl = document.getElementById('user-cpf');
    if (userCpfEl) {
        userCpfEl.textContent = profileData.cpf || 'Não informado';
    }

    const userPhoneEl = document.getElementById('user-phone');
    if (userPhoneEl) {
        userPhoneEl.textContent = profileData.telefone || 'Não informado';
    }

    const userDobEl = document.getElementById('user-dob');
    if (userDobEl) {
        userDobEl.textContent = profileData.data_nascimento 
            ? new Date(profileData.data_nascimento).toLocaleDateString('pt-BR') 
            : 'Não informado';
    }

    console.log('[DEBUG] Perfil exibido na página');
}

// Função para exibir estatísticas na página
function displayStatistics(stats) {
    if (!stats) return;

    // Preencher Reservas
    const statsReservasEl = document.querySelector('.grid.grid-cols-2 div:nth-child(2) p.font-bold');
    if (statsReservasEl) {
        statsReservasEl.textContent = stats.reservasCount || 0;
    }

    // Preencher Avaliações
    const statsAvaliacoesEl = document.querySelector('.grid.grid-cols-2 div:nth-child(1) p.font-bold');
    if (statsAvaliacoesEl) {
        statsAvaliacoesEl.textContent = stats.avaliacoesCount || 0;
    }

    console.log('[DEBUG] Estatísticas exibidas');
}


// ============================================
// INICIALIZAÇÃO
// ============================================

// Função principal para iniciar
async function initializeProfile() {
    console.log('[DEBUG] Inicializando perfil do cliente...');
    
    // 1. Carregar dados
    const profileData = await loadProfileData();
    if (!profileData) {
        console.error('[ERRO] Falha ao carregar dados do perfil. Abortando.');
        return;
    }
    
    // 2. Exibir dados na página
    displayProfileData(profileData);

    // 3. Carregar estatísticas
    const stats = await loadStatistics(profileData.id_usuario);

    // 4. Exibir estatísticas
    displayStatistics(stats);

    // Configurar ícones do Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Configurar outros event listeners (como upload de foto)
    setupEventListeners(profileData);
}

// Função para configurar event listeners
function setupEventListeners(profileData) {
    // Configurar upload de foto
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

            // Mostrar preview imediato
            const reader = new FileReader();
            reader.onload = (event) => {
                avatarElement.src = event.target.result;
            };
            reader.readAsDataURL(file);

            try {
                // Fazer upload para o Supabase Storage
                const fileName = `avatar_${profileData.id_usuario}_${Date.now()}.${file.name.split('.').pop()}`;
                
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('fotos_perfil')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error('[ERRO] Upload da foto falhou:', uploadError);
                    alert('Erro ao salvar a foto. Tente novamente.');
                    displayProfileData(profileData);
                    return;
                }

                // Atualizar o nome do arquivo no banco (tabela 'cliente')
                const { error: dbError } = await supabase
                    .from('cliente')
                    .update({ foto_perfil: fileName })
                    .eq('id_cliente', profileData.id_usuario);

                if (dbError) {
                    console.error('[ERRO] Ao salvar foto no banco:', dbError);
                    alert('Erro ao salvar a foto no perfil.');
                    return;
                }

                console.log('[DEBUG] Foto de perfil atualizada com sucesso!');
                alert('Foto atualizada com sucesso!');
            } catch (error) {
                console.error('[ERRO] Erro geral no upload:', error);
                alert('Erro ao processar a foto.');
            }
        });
    }
}


// Iniciar ao carregar o DOM
document.addEventListener('DOMContentLoaded', initializeProfile);