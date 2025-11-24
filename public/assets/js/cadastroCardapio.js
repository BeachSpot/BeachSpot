import { supabase } from './supabaseClient.js';

console.log('[cadastroCardapio] Script Unificado Carregado');

/**
 * Função para fazer upload da imagem do produto
 */

function showNotification(message, type = 'default') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    // Remove classes anteriores
    notification.classList.remove('error', 'success');
    
    // Adiciona classe se for erro ou sucesso
    if (type === 'error') {
        notification.classList.add('error');
    } else if (type === 'success') {
        notification.classList.add('success');
    }

    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

async function uploadImagemProduto(file, id_gestor, id_barraca) {
    if (!file) return null;

    console.log(`[uploadImagemProduto] Iniciando upload: ${file.name}`);

    const nomeArquivoLimpo = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = `produtos/${id_gestor}/${id_barraca}/${Date.now()}_${nomeArquivoLimpo}`;

    const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

    if (uploadError) {
        console.error('[uploadImagemProduto] Erro ao enviar imagem:', uploadError);
        throw new Error(`Falha no upload da imagem: ${file.name}`);
    }

    const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
        console.error('[uploadImagemProduto] Não foi possível obter URL pública');
        return null;
    }

    console.log(`[uploadImagemProduto] Upload concluído: ${urlData.publicUrl}`);
    return urlData.publicUrl;
}

/**
 * Classe para gerenciar o cardápio
 */
class CardapioManager {
    constructor() {
        this.idGestor = null;
        this.idBarraca = null;
        this.produtos = [];
        this.editingItemId = null;
        this.itemToDelete = null;
        this.cardapioType = null; // 'custom' ou 'link'

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Seções de escolha
        this.cardapioTypeSection = document.getElementById('cardapio-type-section');
        this.optionCustom = document.getElementById('option-custom');
        this.optionLink = document.getElementById('option-link');
        this.linkSection = document.getElementById('link-section');
        this.customCardapioSection = document.getElementById('custom-cardapio-section');

        // Formulário de link
        this.linkForm = document.getElementById('link-form');
        this.linkCardapioInput = document.getElementById('link-cardapio');
        this.cancelLinkBtn = document.getElementById('cancel-link-btn');
        this.changeTypeBtn = document.getElementById('change-type-btn');

        // Formulário de produtos
        this.itemForm = document.getElementById('item-form');
        this.formTitle = document.getElementById('form-title');
        this.submitButton = document.getElementById('submit-button');
        this.editingItemIdInput = document.getElementById('editing-item-id');

        // Inputs do formulário
        this.nomeInput = document.getElementById('nome-produto');
        this.valorInput = document.getElementById('valor-produto');
        this.categoriaInput = document.getElementById('categoria-produto');
        this.imagemInput = document.getElementById('imagem-produto');
        this.fileNameSpan = document.getElementById('file-name');

        // Listas de produtos
        this.itemsList = document.getElementById('items-list');

        // Modal de exclusão
        this.deleteModal = document.getElementById('delete-modal');
        this.cancelDeleteBtn = document.getElementById('cancel-delete');
        this.confirmDeleteBtn = document.getElementById('confirm-delete');

        // Loading
        this.loadingOverlay = document.getElementById('loading-overlay');
    }

    initEventListeners() {
        // Escolha do tipo de cardápio
        if (this.optionCustom) {
            this.optionCustom.addEventListener('click', () => this.selectCardapioType('custom'));
        }

        if (this.optionLink) {
            this.optionLink.addEventListener('click', () => this.selectCardapioType('link'));
        }

        // Formulário de link
        if (this.linkForm) {
            this.linkForm.addEventListener('submit', (e) => this.handleLinkSubmit(e));
        }

        if (this.cancelLinkBtn) {
            this.cancelLinkBtn.addEventListener('click', () => this.cancelLinkSelection());
        }

        // Botão para trocar tipo
        if (this.changeTypeBtn) {
            this.changeTypeBtn.addEventListener('click', () => this.confirmChangeType());
        }

        // Submissão do formulário de produtos
        if (this.itemForm) {
            this.itemForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Abas
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });

        // Input de arquivo
        if (this.imagemInput) {
            this.imagemInput.addEventListener('change', (e) => {
                if (this.fileNameSpan) {
                    this.fileNameSpan.textContent = e.target.files[0] ? e.target.files[0].name : '';
                }
            });
        }

        // Delegação de eventos para botões dinâmicos
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                this.handleEdit(editBtn);
            }

            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                this.handleDelete(deleteBtn);
            }
        });

        // Modal de exclusão
        if (this.cancelDeleteBtn) {
            this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        }

        if (this.confirmDeleteBtn) {
            this.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        }
    }

    async init() {
        try {
            console.log('[CardapioManager] Inicializando...');
            this.showLoading(true);

            // Verificar autenticação
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                showNotification('Você precisa estar logado para gerenciar o cardápio.');
                window.location.href = '../entrar.html';
                return;
            }

            this.idGestor = user.id;
            console.log('[CardapioManager] Gestor ID:', this.idGestor);

            // Dentro do método init() da classe, após definir this.idGestor
            const { data: gestor } = await supabase
                .from('gestor')
                .select('nome, foto_perfil, avatar_url')
                .eq('id_gestor', this.idGestor)
                .single();

            if (gestor) {
                updateHeaderAvatar(gestor);
            }

            // Buscar ID da barraca
            const achouBarraca = await this.buscarBarracaDoGestor();

            if (!achouBarraca) {
                showNotification('Nenhuma barraca encontrada. Cadastre sua barraca primeiro.');
                window.location.href = 'cadastroBarraca.html';
                return;
            }

            console.log('[CardapioManager] Barraca ID:', this.idBarraca);

            // Verificar se já existe configuração de cardápio
            await this.checkExistingCardapioType();

        } catch (error) {
            console.error('[CardapioManager] Erro na inicialização:', error);
            showNotification('Erro ao inicializar. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    async buscarBarracaDoGestor() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const idUrl = urlParams.get('id');

            let query = supabase
                .from('barracas')
                .select('id_barraca, nome_barraca, link_cardapio')
                .eq('id_gestor', this.idGestor);

            if (idUrl) {
                query = query.eq('id_barraca', idUrl);
            }

            const { data, error } = await query.limit(1).maybeSingle();

            if (error) throw error;
            if (!data) return false;

            this.idBarraca = data.id_barraca;
            console.log(`[CardapioManager] Cardápio da barraca: ${data.nome_barraca} (ID: ${this.idBarraca})`);

            // Guardar link se existir
            if (data.link_cardapio) {
                this.existingLink = data.link_cardapio;
            }

            this.atualizarTituloPagina(data.nome_barraca);

            return true;

        } catch (err) {
            console.error('[buscarBarraca] Erro:', err);
            return false;
        }
    }

    atualizarTituloPagina(nomeBarraca) {
        const pageTitle = document.querySelector('main h1');

        if (pageTitle) {
            pageTitle.textContent = `Cardápio - ${nomeBarraca}`;
        }
    }

    async checkExistingCardapioType() {
        try {
            // Verificar se tem link salvo
            if (this.existingLink) {
                this.cardapioType = 'link';
                this.showLinkSection(true);
                if (this.linkCardapioInput) {
                    this.linkCardapioInput.value = this.existingLink;
                }
                return;
            }

            // Verificar se tem produtos cadastrados
            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('id_produto')
                .eq('id_barraca', this.idBarraca)
                .limit(1);

            if (error) throw error;

            if (produtos && produtos.length > 0) {
                this.cardapioType = 'custom';
                this.showCustomSection();
                await this.loadProdutos();
            } else {
                // Mostrar opções de escolha
                this.showCardapioTypeSection();
            }

        } catch (error) {
            console.error('[checkExistingCardapioType] Erro:', error);
            this.showCardapioTypeSection();
        }
    }

    showCardapioTypeSection() {
        if (this.cardapioTypeSection) {
            this.cardapioTypeSection.style.display = 'block';
        }
        if (this.linkSection) {
            this.linkSection.style.display = 'none';
        }
        if (this.customCardapioSection) {
            this.customCardapioSection.style.display = 'none';
        }
    }

    selectCardapioType(type) {
        this.cardapioType = type;

        // Atualizar UI dos cards
        if (this.optionCustom && this.optionLink) {
            this.optionCustom.classList.toggle('selected', type === 'custom');
            this.optionLink.classList.toggle('selected', type === 'link');
        }

        // Mostrar seção apropriada
        if (type === 'link') {
            this.showLinkSection();
        } else {
            this.showCustomSection();
        }
    }

    showLinkSection(skipHideTypeSection = false) {
        if (!skipHideTypeSection && this.cardapioTypeSection) {
            this.cardapioTypeSection.style.display = 'none';
        }
        if (this.linkSection) {
            this.linkSection.style.display = 'block';
        }
        if (this.customCardapioSection) {
            this.customCardapioSection.style.display = 'none';
        }
    }

    showCustomSection() {
        if (this.cardapioTypeSection) {
            this.cardapioTypeSection.style.display = 'none';
        }
        if (this.linkSection) {
            this.linkSection.style.display = 'none';
        }
        if (this.customCardapioSection) {
            this.customCardapioSection.style.display = 'block';
        }
    }

    cancelLinkSelection() {
        this.cardapioType = null;
        if (this.linkCardapioInput) {
            this.linkCardapioInput.value = '';
        }
        this.showCardapioTypeSection();
    }

    async handleLinkSubmit(e) {
        e.preventDefault();

        const link = this.linkCardapioInput?.value;

        if (!link) {
            showNotification('Por favor, insira um link válido.');
            return;
        }

        this.showLoading(true);

        try {
            // Salvar link no banco
            const { error } = await supabase
                .from('barracas')
                .update({ link_cardapio: link })
                .eq('id_barraca', this.idBarraca);

            if (error) throw error;

            console.log('[handleLinkSubmit] Link salvo com sucesso');
            showNotification('Link do cardápio salvo com sucesso!');

            this.existingLink = link;

        } catch (error) {
            console.error('[handleLinkSubmit] Erro:', error);
            showNotification(`Erro ao salvar link: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async confirmChangeType() {
        const hasProducts = this.produtos && this.produtos.length > 0;
        const hasLink = this.existingLink;

        let confirmMessage = '';

        if (hasProducts) {
            confirmMessage = 'Você tem produtos cadastrados. Se trocar para link externo, eles serão removidos. Deseja continuar?';
        } else if (hasLink) {
            confirmMessage = 'Você já tem um link cadastrado. Se trocar para cardápio personalizado, o link será removido. Deseja continuar?';
        }

        if (!confirm(confirmMessage)) {
            return;
        }

        this.showLoading(true);

        try {
            if (this.cardapioType === 'custom') {
                // Trocar de custom para link - deletar produtos
                const { error: deleteError } = await supabase
                    .from('produtos')
                    .delete()
                    .eq('id_barraca', this.idBarraca);

                if (deleteError) throw deleteError;

                this.produtos = [];
                this.cardapioType = 'link';
                this.showLinkSection();

            } else if (this.cardapioType === 'link') {
                // Trocar de link para custom - remover link
                const { error: updateError } = await supabase
                    .from('barracas')
                    .update({ link_cardapio: null })
                    .eq('id_barraca', this.idBarraca);

                if (updateError) throw updateError;

                this.existingLink = null;
                if (this.linkCardapioInput) {
                    this.linkCardapioInput.value = '';
                }

                this.cardapioType = 'custom';
                this.showCustomSection();
                await this.loadProdutos();
            }

            showNotification('Tipo de cardápio alterado com sucesso!');

        } catch (error) {
            console.error('[confirmChangeType] Erro:', error);
            showNotification(`Erro ao trocar tipo de cardápio: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadProdutos() {
        try {
            console.log('[CardapioManager] Carregando produtos...');

            // Limpar listas
            ['comidas-list', 'bebidas-list', 'outros-list'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });

            // Buscar produtos
            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id_barraca', this.idBarraca);

            if (error) {
                console.error('Erro ao carregar produtos:', error);
                return;
            }

            this.produtos = produtos || [];
            console.log(`[CardapioManager] ${this.produtos.length} produtos carregados`);

            this.renderProdutos();

        } catch (error) {
            console.error('[CardapioManager] Erro ao carregar produtos:', error);
        }
    }

    renderProdutos() {
        // Limpar listas
        ['comidas', 'bebidas', 'outros'].forEach(categoria => {
            const list = document.getElementById(`${categoria}-list`);
            if (list) list.innerHTML = '';
        });

        // Renderizar cada produto
        if (this.produtos && this.produtos.length > 0) {
            this.produtos.forEach(produto => {
                this.addProdutoToDOM(produto);
            });
        }

        // Atualizar mensagens "Nenhum item"
        ['comidas', 'bebidas', 'outros'].forEach(categoria => {
            this.updateNoItemsMessage(categoria);
        });

        // Recriar ícones
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    addProdutoToDOM(produto) {
        const categoria = (produto.categoria || 'outros').toLowerCase();
        const list = document.getElementById(`${categoria}-list`);

        if (!list) {
            const otherList = document.getElementById('outros-list');
            if (otherList) {
                this.renderItemInList(otherList, produto);
            }
            return;
        }

        this.renderItemInList(list, produto);
        this.updateNoItemsMessage(categoria);
    }

    renderItemInList(list, produto) {
        const img = produto.imagem_url || 'https://placehold.co/80x80/cccccc/444444?text=P';

        const div = document.createElement('div');
        div.className = 'flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3';
        div.setAttribute('data-id', produto.id_produto);

        div.innerHTML = `
            <img src="${img}" 
                 alt="${produto.nome_produto}" 
                 class="w-20 h-20 rounded-md object-cover bg-gray-200">
            <div class="flex-grow ml-4">
                <h3 class="font-bold text-gray-800 item-name">${produto.nome_produto}</h3>
                ${produto.descricao_pro ? `<p class="text-sm text-gray-500">${produto.descricao_pro}</p>` : ''}
                <p class="text-green-600 font-semibold item-price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="flex items-center space-x-2">
                <button class="edit-btn text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-200" data-id="${produto.id_produto}">
                    <i data-lucide="pencil" class="w-5 h-5 pointer-events-none"></i>
                </button>
                <button class="delete-btn text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-gray-200" data-id="${produto.id_produto}">
                    <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </div>
        `;

        list.appendChild(div);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.idBarraca) {
            showNotification('Barraca não identificada. Recarregue a página.');
            return;
        }

        const submitBtn = this.submitButton;
        const originalText = submitBtn ? submitBtn.innerHTML : '';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Salvando...</span>';
        }

        this.showLoading(true);

        try {
            const produtoData = {
                id_barraca: this.idBarraca,
                nome_produto: this.nomeInput?.value || '',
                preco: parseFloat(this.valorInput?.value || 0),
                categoria: this.categoriaInput?.value || 'comidas',
            };

            // Upload da imagem
            if (this.imagemInput && this.imagemInput.files[0]) {
                const imagemUrl = await uploadImagemProduto(
                    this.imagemInput.files[0],
                    this.idGestor,
                    this.idBarraca
                );
                if (imagemUrl) {
                    produtoData.imagem_url = imagemUrl;
                }
            } else if (this.editingItemIdInput && this.editingItemIdInput.value) {
                const produtoAtual = this.produtos.find(p => p.id_produto == this.editingItemIdInput.value);
                if (produtoAtual && produtoAtual.imagem_url) {
                    produtoData.imagem_url = produtoAtual.imagem_url;
                }
            }

            if (this.editingItemIdInput && this.editingItemIdInput.value) {
                await this.updateProduto(this.editingItemIdInput.value, produtoData);
            } else {
                await this.createProduto(produtoData);
            }

            this.resetForm();
            await this.loadProdutos();

        } catch (error) {
            console.error('[handleSubmit] Erro:', error);
            showNotification(`Erro ao salvar produto: ${error.message}`);
        } finally {
            this.showLoading(false);

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async createProduto(produtoData) {
        console.log('[createProduto] Criando produto:', produtoData);

        const { data, error } = await supabase
            .from('produtos')
            .insert(produtoData)
            .select()
            .single();

        if (error) throw error;

        console.log('[createProduto] Produto criado:', data);
        showNotification('Produto adicionado com sucesso!');
    }

    async updateProduto(id, produtoData) {
        console.log('[updateProduto] Atualizando produto:', id, produtoData);

        const { data, error } = await supabase
            .from('produtos')
            .update(produtoData)
            .eq('id_produto', id)
            .select()
            .single();

        if (error) throw error;

        console.log('[updateProduto] Produto atualizado:', data);
        showNotification('Produto atualizado com sucesso!');
    }

    handleEdit(editBtn) {
        const itemElement = editBtn.closest('[data-id]');
        if (!itemElement) return;

        const itemId = itemElement.dataset.id;
        const produto = this.produtos.find(p => p.id_produto == itemId);

        if (!produto) return;

        if (this.nomeInput) this.nomeInput.value = produto.nome_produto;
        if (this.valorInput) this.valorInput.value = produto.preco.toFixed(2);
        if (this.categoriaInput) this.categoriaInput.value = produto.categoria || 'comidas';
        if (this.editingItemIdInput) this.editingItemIdInput.value = itemId;

        if (this.formTitle) {
            this.formTitle.textContent = 'Editar Item';
        }

        if (this.submitButton) {
            this.submitButton.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i><span>Salvar Alteração</span>';
            this.submitButton.classList.remove('bg-green-600', 'hover:bg-green-700');
            this.submitButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        if (this.itemForm) {
            this.itemForm.scrollIntoView({ behavior: 'smooth' });
        }
    }

    handleDelete(deleteBtn) {
        const itemElement = deleteBtn.closest('[data-id]');
        if (!itemElement) return;

        this.itemToDelete = itemElement;

        if (this.deleteModal) {
            this.deleteModal.classList.remove('hidden');
        }
    }

    closeDeleteModal() {
        if (this.deleteModal) {
            this.deleteModal.classList.add('hidden');
        }
        this.itemToDelete = null;
    }

    async confirmDelete() {
        if (!this.itemToDelete) return;

        const itemId = this.itemToDelete.dataset.id;

        this.showLoading(true);

        try {
            console.log('[confirmDelete] Deletando produto:', itemId);

            const { error } = await supabase
                .from('produtos')
                .delete()
                .eq('id_produto', itemId);

            if (error) throw error;

            console.log('[confirmDelete] Produto deletado');
            showNotification('Produto removido com sucesso!');

            await this.loadProdutos();

        } catch (error) {
            console.error('[confirmDelete] Erro:', error);
            showNotification(`Erro ao deletar produto: ${error.message}`);
        } finally {
            this.showLoading(false);
            this.closeDeleteModal();
        }
    }

    resetForm() {
        if (this.itemForm) {
            this.itemForm.reset();
        }

        if (this.editingItemIdInput) {
            this.editingItemIdInput.value = '';
        }

        if (this.fileNameSpan) {
            this.fileNameSpan.textContent = '';
        }

        if (this.formTitle) {
            this.formTitle.textContent = 'Adicionar Novo Item';
        }

        if (this.submitButton) {
            this.submitButton.innerHTML = '<i data-lucide="plus-circle" class="w-5 h-5"></i><span>Adicionar Item</span>';
            this.submitButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            this.submitButton.classList.add('bg-green-600', 'hover:bg-green-700');
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    switchTab(tab) {
        const tabs = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(item => {
            item.classList.remove('active');
        });

        if (tab) {
            tab.classList.add('active');
        }

        tabContents.forEach(content => {
            content.style.display = 'none';
        });

        const targetTabId = tab?.dataset?.tab;
        if (targetTabId) {
            const targetContent = document.getElementById(targetTabId);
            if (targetContent) {
                targetContent.style.display = 'block';
            }
        }

        ['comidas', 'bebidas', 'outros'].forEach(categoria => {
            this.updateNoItemsMessage(categoria);
        });
    }

    updateNoItemsMessage(category) {
        const list = document.getElementById(`${category}-list`);
        if (!list) return;

        const tabContent = document.getElementById(category);
        if (!tabContent) return;

        let message = tabContent.querySelector('.no-items-message');

        if (list.children.length === 0) {
            if (message) {
                message.style.display = 'block';
            }
        } else {
            if (message) {
                message.style.display = 'none';
            }
        }
    }

    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
}

function updateHeaderAvatar(profileData) {
    const headerAvatar = document.getElementById('header-avatar');

    if (!headerAvatar || !profileData) return;

    let fotoUrl = profileData.foto_perfil || profileData.avatar_url;

    if (fotoUrl && !fotoUrl.startsWith('http')) {
        const { data } = supabase
            .storage
            .from('media')
            .getPublicUrl(fotoUrl);
        fotoUrl = data?.publicUrl;
    }

    if (!fotoUrl) {
        const iniciais = profileData.nome
            .split(' ')
            .filter(w => w.length > 0)
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        fotoUrl = `https://placehold.co/40x40/0138b4/FFFFFF?text=${iniciais}`;
    }

    headerAvatar.src = fotoUrl;
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[cadastroCardapio] DOM carregado');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const manager = new CardapioManager();
    await manager.init();
});