import { supabase } from './supabaseClient.js';

console.log('[getUserProfile] Módulo carregado');

/**
 * Busca os dados completos do usuário autenticado
 * @returns {Object} Dados do usuário ou null se não autenticado
 */
export async function getUserProfile() {
    try {
        // 1. Verificar se há sessão ativa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('[ERRO SESSION]', sessionError);
            return null;
        }

        if (!session) {
            console.warn('[AVISO] Nenhuma sessão ativa');
            return null;
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        // 2. Buscar dados na tabela usuarios
        // CORREÇÃO: Usar 'id_usuario' ao invés de 'id' no filtro
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id_usuario', userId) // <-- CORRIGIDO AQUI
            .single();

        if (userError) {
            console.error('[ERRO USUARIO]', userError);
            return null;
        }

        if (!usuario) {
            console.warn('[AVISO] Usuário não encontrado no banco');
            return null;
        }

        // 3. Retornar dados completos
        // CORREÇÃO: Mapear 'id_usuario' corretamente
        return {
            id: usuario.id_usuario, // <-- CORRIGIDO AQUI (mapeando id_usuario para id)
            nome: usuario.nome || 'Usuário',
            email: usuario.email || userEmail,
            bio: usuario.bio,
            cpf: usuario.cpf,
            telefone: usuario.telefone,
            data_nascimento: usuario.data_nascimento,
            tipo_conta: usuario.tipo_conta,
            id_usuario: usuario.id_usuario // Deixa este também para consistência
        };

    } catch (error) {
        console.error('[ERRO GERAL getUserProfile]', error);
        return null;
    }
}

/**
 * Verifica se o usuário está autenticado
 * @param {string} loginPage - Página de login para redirecionar
 * @returns {boolean} True se autenticado, false se não
 */
export async function checkAuthentication(loginPage = '../entrar.html') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.warn('[AVISO] Usuário não autenticado. Redirecionando...');
        window.location.href = loginPage;
        return false;
    }
    return true;
}

/**
 * Formata data para exibição
 * @param {string} dateString - Data em formato ISO
 * @returns {string} Data formatada
 */
export function formatDate(dateString) {
    if (!dateString) return 'Não informado';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Formata telefone para exibição
 * @param {string} phone - Telefone
 * @returns {string} Telefone formatado
 */
export function formatPhone(phone) {
    if (!phone) return 'Não informado';
    
    // Remove tudo que não é número
    const cleaned = phone.replace(/\D/g, '');
    
    // Formata (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    
    return phone;
}

/**
 * Formata CPF para exibição
 * @param {string} cpf - CPF
 * @returns {string} CPF formatado
 */
export function formatCPF(cpf) {
    if (!cpf) return 'Não informado';
    
    // Remove tudo que não é número
    const cleaned = cpf.replace(/\D/g, '');
    
    // Formata XXX.XXX.XXX-XX
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    
    return cpf;
}