import { supabase } from './supabaseClient.js';

console.log('[cadastroCardapio] Script Unificado Carregado');

/**
 * Função para fazer upload da imagem do produto
 */
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
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Formulário
        this.itemForm = document.getElementById('item-form');
        this.formTitle = document.getElementById('form-title');
        this.submitButton = document.getElementById('submit-button');
        this.editingItemIdInput = document.getElementById('editing-item-id');
        
        // Inputs do formulário (suporte a múltiplos IDs)
        this.nomeInput = document.getElementById('nome-produto') || document.querySelector('[name="name"]');
        this.valorInput = document.getElementById('valor-produto') || document.querySelector('[name="price"]');
        this.categoriaInput = document.getElementById('categoria-produto') || document.getElementById('item-category');
        this.descricaoInput = document.querySelector('[name="description"]');
        this.imagemInput = document.getElementById('imagem-produto') || document.getElementById('item-image');
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
        if (!this.itemForm) return;

        // Submissão do formulário
        this.itemForm.addEventListener('submit', (e) => this.handleSubmit(e));

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
            // Botão Editar
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                this.handleEdit(editBtn);
            }

            // Botão Deletar (múltiplas classes)
            const deleteBtn = e.target.closest('.delete-btn') || e.target.closest('.btn-delete');
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
                alert('Você precisa estar logado para gerenciar o cardápio.');
                window.location.href = '../entrar.html';
                return;
            }

            this.idGestor = user.id;
            console.log('[CardapioManager] Gestor ID:', this.idGestor);

            // Buscar ID da barraca
            const achouBarraca = await this.buscarBarracaDoGestor();
            
            if (!achouBarraca) {
                alert('Nenhuma barraca encontrada. Cadastre sua barraca primeiro.');
                window.location.href = 'cadastroBarraca.html';
                return;
            }

            console.log('[CardapioManager] Barraca ID:', this.idBarraca);

            // Carregar produtos existentes
            await this.loadProdutos();

        } catch (error) {
            console.error('[CardapioManager] Erro na inicialização:', error);
            alert('Erro ao inicializar. Tente novamente.');
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
                .select('id_barraca, nome_barraca')
                .eq('id_gestor', this.idGestor);

            if (idUrl) {
                query = query.eq('id_barraca', idUrl);
                console.log('[CardapioManager] Buscando barraca específica com ID:', idUrl);
            }

            // .limit(1).maybeSingle() previne o erro se houver múltiplas barracas
            const { data, error } = await query.limit(1).maybeSingle();

            if (error) throw error;
            if (!data) return false;

            this.idBarraca = data.id_barraca;
            console.log(`[CardapioManager] Cardápio da barraca: ${data.nome_barraca} (ID: ${this.idBarraca})`);
            
            // Atualizar título da página se existir
            this.atualizarTituloPagina(data.nome_barraca);
            
            return true;

        } catch (err) {
            console.error('[buscarBarraca] Erro:', err);
            return false;
        }
    }

    atualizarTituloPagina(nomeBarraca) {
        const pageTitle = document.querySelector('section h1');
        const pageSubtitle = document.querySelector('section p');
        
        if (pageTitle) {
            pageTitle.textContent = `Cardápio - ${nomeBarraca}`;
        }
        
        if (pageSubtitle) {
            pageSubtitle.textContent = `Gerencie os produtos da sua barraca`;
        }
    }

    async loadProdutos() {
        try {
            console.log('[CardapioManager] Carregando produtos...');

            // Limpar listas
            ['comidas-list', 'bebidas-list', 'sobremesas-list', 'outros-list'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });

            // Buscar produtos (sem ordenação por created_at para evitar erro 400)
            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id_barraca', this.idBarraca);

            if (error) {
                console.error('Erro ao carregar produtos:', error);
                alert(`Erro ao buscar produtos: ${error.message}`);
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
        ['comidas', 'bebidas', 'sobremesas', 'outros'].forEach(categoria => {
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
        ['comidas', 'bebidas', 'sobremesas', 'outros'].forEach(categoria => {
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
            // Fallback para lista de outros
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
        const img = produto.imagem_url || '../assets/images/placeholder-food.png' || 'https://placehold.co/80x80/cccccc/444444?text=P';
        
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
            alert('Barraca não identificada. Recarregue a página.');
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

            // Adicionar descrição se existir
            if (this.descricaoInput && this.descricaoInput.value) {
                produtoData.descricao_pro = this.descricaoInput.value;
            }

            // Upload da imagem (se houver nova imagem)
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
                // Se está editando e não selecionou nova imagem, manter a imagem antiga
                const produtoAtual = this.produtos.find(p => p.id_produto == this.editingItemIdInput.value);
                if (produtoAtual && produtoAtual.imagem_url) {
                    produtoData.imagem_url = produtoAtual.imagem_url;
                }
            }

            if (this.editingItemIdInput && this.editingItemIdInput.value) {
                // Editar produto existente
                await this.updateProduto(this.editingItemIdInput.value, produtoData);
            } else {
                // Criar novo produto
                await this.createProduto(produtoData);
            }

            this.resetForm();
            await this.loadProdutos();

        } catch (error) {
            console.error('[handleSubmit] Erro:', error);
            alert(`Erro ao salvar produto: ${error.message}`);
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
        alert('Produto adicionado com sucesso!');
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
        alert('Produto atualizado com sucesso!');
    }

    handleEdit(editBtn) {
        const itemElement = editBtn.closest('[data-id]');
        if (!itemElement) return;
        
        const itemId = itemElement.dataset.id;
        const produto = this.produtos.find(p => p.id_produto == itemId);
        
        if (!produto) return;

        // Preencher formulário
        if (this.nomeInput) this.nomeInput.value = produto.nome_produto;
        if (this.valorInput) this.valorInput.value = produto.preco.toFixed(2);
        if (this.categoriaInput) this.categoriaInput.value = produto.categoria || 'comidas';
        if (this.descricaoInput && produto.descricao_pro) this.descricaoInput.value = produto.descricao_pro;
        if (this.editingItemIdInput) this.editingItemIdInput.value = itemId;

        // Atualizar UI do formulário
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
        
        // Scroll suave até o formulário
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
        } else {
            // Fallback se não houver modal
            this.confirmDelete();
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

        // Se não houver modal, confirmar via confirm()
        if (!this.deleteModal) {
            if (!confirm('Tem certeza que deseja excluir este item?')) {
                this.itemToDelete = null;
                return;
            }
        }

        this.showLoading(true);

        try {
            console.log('[confirmDelete] Deletando produto:', itemId);

            const { error } = await supabase
                .from('produtos')
                .delete()
                .eq('id_produto', itemId);

            if (error) throw error;

            console.log('[confirmDelete] Produto deletado');
            alert('Produto removido com sucesso!');

            await this.loadProdutos();

        } catch (error) {
            console.error('[confirmDelete] Erro:', error);
            alert(`Erro ao deletar produto: ${error.message}`);
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

        // Atualizar mensagens de itens vazios
        ['comidas', 'bebidas', 'sobremesas', 'outros'].forEach(categoria => {
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

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[cadastroCardapio] DOM carregado');

    // Inicializar ícones
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Inicializar gerenciador
    const manager = new CardapioManager();
    await manager.init();
});