import { supabase } from './supabaseClient.js';

console.log('[getUserProfile] Módulo carregado');

/**
 * Busca o perfil completo do usuário autenticado
 * Faz JOIN com a tabela gestor ou cliente conforme o tipo_conta
 */
export async function getUserProfile() {
    try {
        // Buscar usuário autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        if (!user) {
            console.warn('[getUserProfile] Nenhum usuário autenticado');
            return null;
        }

        console.log('[getUserProfile] User ID:', user.id);

        // Buscar dados básicos do usuário na tabela usuarios
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id_usuario', user.id)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            console.error('[getUserProfile] Usuário não encontrado na tabela usuarios');
            return null;
        }

        console.log('[getUserProfile] Tipo de conta:', usuario.tipo_conta);

        let perfilCompleto = { ...usuario };

        // Buscar dados adicionais conforme o tipo de conta
        if (usuario.tipo_conta === 'gestor') {
            const { data: gestor, error: gestorError } = await supabase
                .from('gestor')
                .select('*')
                .eq('id_gestor', user.id)
                .single();

            if (gestorError) {
                console.error('[getUserProfile] Erro ao buscar dados do gestor:', gestorError);
            } else if (gestor) {
                perfilCompleto = {
                    ...perfilCompleto,
                    nome: gestor.nome,
                    bio: gestor.bio,
                    foto_perfil: gestor.foto_perfil,
                    avatar_url: gestor.avatar_url
                };
                console.log('[getUserProfile] Dados do gestor carregados:', gestor.nome);
            }
        } else if (usuario.tipo_conta === 'cliente') {
            const { data: cliente, error: clienteError } = await supabase
                .from('cliente')
                .select('*')
                .eq('id_cliente', user.id)
                .single();

            if (clienteError) {
                console.error('[getUserProfile] Erro ao buscar dados do cliente:', clienteError);
            } else if (cliente) {
                perfilCompleto = {
                    ...perfilCompleto,
                    nome: cliente.nome,
                    bio: cliente.bio,
                    foto_perfil: cliente.foto_perfil,
                    avatar_url: cliente.avatar_url
                };
                console.log('[getUserProfile] Dados do cliente carregados:', cliente.nome);
            }
        }

        return perfilCompleto;

    } catch (error) {
        console.error('[getUserProfile] Erro ao buscar perfil:', error);
        return null;
    }
}

/**
 * Verifica se o usuário está autenticado
 * Redireciona para a página de login se não estiver
 */
export async function checkAuthentication(redirectUrl = '../entrar.html') {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            console.warn('[checkAuthentication] Usuário não autenticado');
            window.location.href = redirectUrl;
            return false;
        }

        console.log('[checkAuthentication] Usuário autenticado:', user.id);
        return true;

    } catch (error) {
        console.error('[checkAuthentication] Erro na verificação:', error);
        window.location.href = redirectUrl;
        return false;
    }
}



/**
 * Atualiza os dados do perfil do usuário
 * Atualiza tanto na tabela usuarios quanto na tabela gestor/cliente
 */
export async function updateUserProfile(updates) {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            throw new Error('Usuário não autenticado');
        }

        // Buscar tipo de conta
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuarios')
            .select('tipo_conta')
            .eq('id_usuario', user.id)
            .single();

        if (usuarioError) throw usuarioError;

        // Separar campos que vão para cada tabela
        const usuariosUpdates = {};
        const perfilUpdates = {};

        // Campos da tabela usuarios
        if (updates.email !== undefined) usuariosUpdates.email = updates.email;
        if (updates.senha !== undefined) usuariosUpdates.senha = updates.senha;

        // Campos da tabela gestor/cliente
        if (updates.nome !== undefined) perfilUpdates.nome = updates.nome;
        if (updates.bio !== undefined) perfilUpdates.bio = updates.bio;
        if (updates.foto_perfil !== undefined) perfilUpdates.foto_perfil = updates.foto_perfil;
        if (updates.avatar_url !== undefined) perfilUpdates.avatar_url = updates.avatar_url;

        // Atualizar tabela usuarios se houver updates
        if (Object.keys(usuariosUpdates).length > 0) {
            const { error } = await supabase
                .from('usuarios')
                .update(usuariosUpdates)
                .eq('id_usuario', user.id);

            if (error) throw error;
        }

        // Atualizar tabela gestor/cliente se houver updates
        if (Object.keys(perfilUpdates).length > 0) {
            const tabela = usuario.tipo_conta === 'gestor' ? 'gestor' : 'cliente';
            const idField = usuario.tipo_conta === 'gestor' ? 'id_gestor' : 'id_cliente';

            const { error } = await supabase
                .from(tabela)
                .update(perfilUpdates)
                .eq(idField, user.id);

            if (error) throw error;
        }

        console.log('[updateUserProfile] Perfil atualizado com sucesso');
        return true;

    } catch (error) {
        console.error('[updateUserProfile] Erro ao atualizar perfil:', error);
        throw error;
    }
}