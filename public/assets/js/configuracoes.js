import { supabase } from './supabaseClient.js';

console.log('[CONFIGURAÇÕES] Módulo carregado');

let currentUser = null;
let currentProfileData = null;

// Função para carregar dados do usuário
async function loadUserData() {
    try {
        console.log('[CONFIG] Carregando dados do usuário...');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.log('[CONFIG] Usuário não autenticado');
            return null;
        }

        currentUser = session.user;
        console.log('[CONFIG] Usuário autenticado:', currentUser.id);

        // Buscar dados do perfil do cliente
        const { data: cliente, error: clienteError } = await supabase
            .from('cliente')
            .select('nome, bio, foto_perfil, avatar_url')
            .eq('id_cliente', currentUser.id)
            .maybeSingle();

        if (clienteError) {
            console.warn('[CONFIG] Erro ao buscar perfil:', clienteError);
        }

        currentProfileData = {
            email: currentUser.email,
            nome: cliente?.nome || currentUser.user_metadata?.full_name || 'Usuário',
            ...cliente
        };

        console.log('[CONFIG] ✅ Dados carregados:', currentProfileData);
        return currentProfileData;

    } catch (error) {
        console.error('[CONFIG] Erro ao carregar dados:', error);
        return null;
    }
}

// Função para exibir dados do usuário na página
function displayUserData(userData) {
    if (!userData) return;

    // Atualizar email na página
    const emailElement = document.getElementById('current-email');
    if (emailElement) {
        emailElement.textContent = userData.email;
    }

    console.log('[CONFIG] ✅ Dados exibidos na página');
}

// Função para atualizar email
async function updateEmail(newEmail, currentPassword) {
    try {
        console.log('[CONFIG] Atualizando email...');

        // Verificar senha atual fazendo login
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword
        });

        if (signInError) {
            throw new Error('Senha atual incorreta');
        }

        // Atualizar email
        const { error: updateError } = await supabase.auth.updateUser({
            email: newEmail
        });

        if (updateError) throw updateError;

        console.log('[CONFIG] ✅ Email atualizado');
        
        // Atualizar dados locais
        currentUser.email = newEmail;
        currentProfileData.email = newEmail;
        displayUserData(currentProfileData);

        return { success: true, message: 'Email atualizado! Verifique seu novo email para confirmar.' };

    } catch (error) {
        console.error('[CONFIG] Erro ao atualizar email:', error);
        return { success: false, message: error.message || 'Erro ao atualizar email' };
    }
}

// Função para atualizar senha
async function updatePassword(currentPassword, newPassword) {
    try {
        console.log('[CONFIG] Atualizando senha...');

        // Verificar senha atual
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword
        });

        if (signInError) {
            throw new Error('Senha atual incorreta');
        }

        // Atualizar senha
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) throw updateError;

        console.log('[CONFIG] ✅ Senha atualizada');
        return { success: true, message: 'Senha atualizada com sucesso!' };

    } catch (error) {
        console.error('[CONFIG] Erro ao atualizar senha:', error);
        return { success: false, message: error.message || 'Erro ao atualizar senha' };
    }
}

// Função para enviar email de recuperação
async function sendPasswordRecovery() {
    try {
        console.log('[CONFIG] Enviando email de recuperação...');

        const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
            redirectTo: `${window.location.origin}/resetarSenha.html`
        });

        if (error) throw error;

        console.log('[CONFIG] ✅ Email de recuperação enviado');
        return { success: true, message: 'Instruções enviadas para seu email!' };

    } catch (error) {
        console.error('[CONFIG] Erro ao enviar recuperação:', error);
        return { success: false, message: 'Erro ao enviar email de recuperação' };
    }
}

// Função para desconectar
async function disconnect() {
    try {
        console.log('[CONFIG] Desconectando usuário...');

        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;

        console.log('[CONFIG] ✅ Usuário desconectado');
        window.location.href = '../entrar.html';

    } catch (error) {
        console.error('[CONFIG] Erro ao desconectar:', error);
        alert('Erro ao desconectar. Tente novamente.');
    }
}

// Função para deletar conta
async function deleteAccount(password) {
    try {
        console.log('[CONFIG] Deletando conta...');

        // Verificar senha
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: password
        });

        if (signInError) {
            throw new Error('Senha incorreta');
        }

        // Deletar dados do cliente
        const { error: deleteClienteError } = await supabase
            .from('cliente')
            .delete()
            .eq('id_cliente', currentUser.id);

        if (deleteClienteError) {
            console.warn('[CONFIG] Erro ao deletar dados do cliente:', deleteClienteError);
        }

        // Deletar conta do Auth (isso também deleta da tabela usuarios devido ao trigger)
        const { error: deleteAuthError } = await supabase.rpc('delete_user');

        if (deleteAuthError) {
            console.error('[CONFIG] Erro ao deletar conta:', deleteAuthError);
            throw new Error('Erro ao deletar conta');
        }

        console.log('[CONFIG] ✅ Conta deletada');
        
        // Deslogar e redirecionar
        await supabase.auth.signOut();
        window.location.href = '../index.html';

    } catch (error) {
        console.error('[CONFIG] Erro ao deletar conta:', error);
        throw error;
    }
}

// Configurar event listeners dos modais
function setupEventListeners() {
    const toast = document.getElementById('toast');
    const modalContainer = document.getElementById('modal');

    function showToast(message, success = true) {
        toast.textContent = message;
        toast.style.backgroundColor = success ? '#2f3640' : '#c0392b';
        toast.classList.remove('opacity-0', 'translate-y-3');
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-3');
        }, 3000);
    }

    function showModal({ title, contentHtml, confirmText, cancelText, onConfirm, confirmColor = 'bg-blue-600', confirmHoverColor = 'hover:bg-blue-700', onDisplay }) {
        modalContainer.innerHTML = `
            <div class="bg-white text-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-auto transform transition-transform duration-300 scale-95" id="modal-content">
                <h2 class="text-2xl font-bold text-left mb-4">${title}</h2>
                ${contentHtml}
                <div class="flex justify-center gap-3 mt-6">
                    <button id="modal-cancel" class="py-2 px-5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-full">${cancelText}</button>
                    <button id="modal-confirm" class="py-2 px-5 ${confirmColor} ${confirmHoverColor} text-white font-bold rounded-full">${confirmText}</button>
                </div>
            </div>
        `;
        modalContainer.classList.remove('opacity-0', 'pointer-events-none');
        setTimeout(() => {
            modalContainer.querySelector('#modal-content').classList.remove('scale-95');
            if (onDisplay) onDisplay();
        }, 10);

        const closeModal = () => {
            modalContainer.querySelector('#modal-content').classList.add('scale-95');
            modalContainer.classList.add('opacity-0');
            setTimeout(() => modalContainer.classList.add('pointer-events-none'), 300);
        };

        document.getElementById('modal-confirm').onclick = async () => {
            const result = await onConfirm();
            if (result !== false) closeModal();
        };
        document.getElementById('modal-cancel').onclick = closeModal;
    }

    // Botão alterar email
    const changeEmailBtn = document.getElementById('change-email-btn');
    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', () => {
            const modalContent = `
                <div class="space-y-4 text-left">
                    <div>
                        <label for="current-password-email" class="block text-sm font-medium text-gray-700">Senha Atual</label>
                        <input type="password" id="current-password-email" placeholder="************" class="w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label for="new-email" class="block text-sm font-medium text-gray-700">Novo E-mail</label>
                        <input type="email" id="new-email" value="${currentProfileData?.email || ''}" class="w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500">
                    </div>
                </div>`;
            
            showModal({
                title: 'Alterar E-mail',
                contentHtml: modalContent,
                confirmText: 'Salvar',
                cancelText: 'Cancelar',
                onConfirm: async () => {
                    const password = document.getElementById('current-password-email').value;
                    const newEmail = document.getElementById('new-email').value;

                    if (!password || !newEmail) {
                        showToast('Preencha todos os campos', false);
                        return false;
                    }

                    const result = await updateEmail(newEmail, password);
                    showToast(result.message, result.success);
                    return result.success;
                }
            });
        });
    }

    // Botão alterar senha
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            const modalContent = `
                <div class="space-y-4 text-left">
                    <div>
                        <label for="current-password" class="block text-sm font-medium text-gray-700">Senha Atual</label>
                        <input type="password" id="current-password" placeholder="************" class="w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label for="new-password" class="block text-sm font-medium text-gray-700">Nova Senha</label>
                        <input type="password" id="new-password" placeholder="Mínimo 6 caracteres" class="w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label for="confirm-password" class="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                        <input type="password" id="confirm-password" placeholder="Mínimo 6 caracteres" class="w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500">
                    </div>
                </div>
                <div class="text-center mt-4">
                    <button id="forgot-password-btn" class="text-sm font-medium text-blue-600 hover:underline">Esqueceu a senha?</button>
                </div>`;
            
            showModal({
                title: 'Alterar Senha',
                contentHtml: modalContent,
                confirmText: 'Salvar',
                cancelText: 'Cancelar',
                onConfirm: async () => {
                    const currentPassword = document.getElementById('current-password').value;
                    const newPassword = document.getElementById('new-password').value;
                    const confirmPassword = document.getElementById('confirm-password').value;

                    if (!currentPassword || !newPassword || !confirmPassword) {
                        showToast('Preencha todos os campos', false);
                        return false;
                    }

                    if (newPassword.length < 6) {
                        showToast('A senha deve ter no mínimo 6 caracteres', false);
                        return false;
                    }

                    if (newPassword !== confirmPassword) {
                        showToast('As senhas não coincidem', false);
                        return false;
                    }

                    const result = await updatePassword(currentPassword, newPassword);
                    showToast(result.message, result.success);
                    return result.success;
                },
                onDisplay: () => {
                    document.getElementById('forgot-password-btn').addEventListener('click', async (e) => {
                        e.preventDefault();
                        const result = await sendPasswordRecovery();
                        showToast(result.message, result.success);
                    });
                }
            });
        });
    }

    // Botão desconectar
    const disconnectBtn = document.getElementById('disconnect-btn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            showModal({
                title: 'Desconectar Conta',
                contentHtml: '<p class="text-left text-gray-600 mb-6">Você tem certeza que quer encerrar a sessão?</p>',
                confirmText: 'Desconectar',
                cancelText: 'Cancelar',
                confirmColor: 'bg-amber-500',
                confirmHoverColor: 'hover:bg-amber-600',
                onConfirm: async () => {
                    await disconnect();
                }
            });
        });
    }

    // Botão deletar conta
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            const modalContent = `
                <p class="text-left text-gray-600 mb-4">Esta ação é permanente e todos os seus dados serão perdidos. Tem certeza absoluta?</p>
                <div class="mt-4">
                    <label for="delete-password" class="block text-sm font-medium text-gray-700 mb-2">Digite sua senha para confirmar</label>
                    <input type="password" id="delete-password" placeholder="Sua senha" class="w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:border-red-500">
                </div>`;
            
            showModal({
                title: 'Excluir Conta',
                contentHtml: modalContent,
                confirmText: 'Excluir',
                cancelText: 'Cancelar',
                confirmColor: 'bg-red-500',
                confirmHoverColor: 'hover:bg-red-600',
                onConfirm: async () => {
                    const password = document.getElementById('delete-password').value;
                    
                    if (!password) {
                        showToast('Digite sua senha para confirmar', false);
                        return false;
                    }

                    try {
                        await deleteAccount(password);
                        showToast('Conta excluída com sucesso', false);
                        return true;
                    } catch (error) {
                        showToast(error.message || 'Erro ao excluir conta', false);
                        return false;
                    }
                }
            });
        });
    }

    // Esconder seção "Adicionar Conta" se usuário estiver logado
    const addAccountSection = document.querySelector('[data-translate="add_account_title"]')?.closest('div');
    if (addAccountSection && currentUser) {
        addAccountSection.style.display = 'none';
    }
}

// Inicialização
async function initializeConfig() {
    console.log('[CONFIG] Inicializando configurações...');

    const userData = await loadUserData();
    
    if (!userData) {
        console.log('[CONFIG] Usuário não autenticado, mantendo página pública');
        return;
    }

    displayUserData(userData);
    setupEventListeners();

    console.log('[CONFIG] ✅ Inicialização concluída');
}

document.addEventListener('DOMContentLoaded', initializeConfig);

export { initializeConfig };