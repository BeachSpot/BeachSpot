import { supabase } from './supabaseClient.js';

console.log('[cadastroCardapio] Script carregado');

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
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.itemForm = document.getElementById('item-form');
        this.formTitle = document.getElementById('form-title');
        this.submitButton = document.getElementById('submit-button');
        this.editingItemIdInput = document.getElementById('editing-item-id');
        this.nomeInput = document.getElementById('nome-produto');
        this.valorInput = document.getElementById('valor-produto');
        this.categoriaInput = document.getElementById('categoria-produto');
        this.imagemInput = document.getElementById('imagem-produto');
        this.fileNameSpan = document.getElementById('file-name');
        this.deleteModal = document.getElementById('delete-modal');
        this.cancelDeleteBtn = document.getElementById('cancel-delete');
        this.confirmDeleteBtn = document.getElementById('confirm-delete');
    }

    initEventListeners() {
        // Submissão do formulário
        this.itemForm.addEventListener('submit', (e) => this.handleSubmit(e));

        // Abas
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });

        // Delegação de eventos para editar e deletar
        document.querySelector('main').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');

            if (editBtn) this.handleEdit(editBtn);
            if (deleteBtn) this.handleDelete(deleteBtn);
        });

        // Modal
        this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());

        // Input de arquivo
        this.imagemInput.addEventListener('change', () => {
            this.fileNameSpan.textContent = this.imagemInput.files[0]?.name || '';
        });
    }

    async init() {
        try {
            console.log('[CardapioManager] Inicializando...');

            // Verificar autenticação
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                alert('Você precisa estar logado para gerenciar o cardápio.');
                window.location.href = '../entrar.html';
                return;
            }

            this.idGestor = user.id;
            console.log('[CardapioManager] Gestor ID:', this.idGestor);

            // Buscar ID da barraca do gestor
            // IMPORTANTE: Você precisa implementar uma forma de selecionar qual barraca
            // Por enquanto, vou pegar a primeira barraca do gestor
            await this.getBarracaId();

            if (!this.idBarraca) {
                alert('Você precisa ter uma barraca cadastrada para gerenciar o cardápio.');
                window.location.href = './cadastroBarraca.html';
                return;
            }

            // Carregar produtos existentes
            await this.loadProdutos();

        } catch (error) {
            console.error('[CardapioManager] Erro na inicialização:', error);
            alert('Erro ao inicializar. Tente novamente.');
        }
    }

    async getBarracaId() {
        try {
            // Buscar a primeira barraca do gestor
            // TODO: Implementar seleção de barraca se o gestor tiver múltiplas
            const { data: barracas, error } = await supabase
                .from('barracas')
                .select('id_barraca')
                .eq('id_gestor', this.idGestor)
                .limit(1);

            if (error) throw error;

            if (barracas && barracas.length > 0) {
                this.idBarraca = barracas[0].id_barraca;
                console.log('[CardapioManager] Barraca ID:', this.idBarraca);
            }
        } catch (error) {
            console.error('[CardapioManager] Erro ao buscar barraca:', error);
        }
    }

    async loadProdutos() {
        try {
            console.log('[CardapioManager] Carregando produtos...');

            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id_barraca', this.idBarraca);

            if (error) throw error;

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
            list.innerHTML = '';
        });

        // Renderizar produtos
        this.produtos.forEach(produto => {
            this.addProdutoToDOM(produto);
        });

        // Atualizar mensagens "Nenhum item"
        ['comidas', 'bebidas', 'outros'].forEach(categoria => {
            this.updateNoItemsMessage(categoria);
        });

        // Recriar ícones
        lucide.createIcons();
    }

    addProdutoToDOM(produto) {
        const categoria = produto.categoria || 'outros';
        const list = document.getElementById(`${categoria}-list`);
        
        const itemHTML = `
            <div class="flex items-center bg-gray-50 p-3 rounded-lg border" data-id="${produto.id_produto}">
                <img src="${produto.imagem_url || 'https://placehold.co/80x80/cccccc/444444?text=P'}" 
                     alt="${produto.nome_produto}" 
                     class="w-20 h-20 rounded-md object-cover">
                <div class="flex-grow ml-4">
                    <p class="font-bold text-gray-800 item-name">${produto.nome_produto}</p>
                    <p class="text-green-600 font-semibold item-price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="edit-btn text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-200">
                        <i data-lucide="pencil" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                    <button class="delete-btn text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-gray-200">
                        <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                </div>
            </div>
        `;

        list.insertAdjacentHTML('beforeend', itemHTML);
        this.updateNoItemsMessage(categoria);
    }

    async handleSubmit(e) {
        e.preventDefault();

        const submitBtn = this.submitButton;
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Salvando...</span>';

        try {
            const produtoData = {
                id_barraca: this.idBarraca,
                nome_produto: this.nomeInput.value,
                preco: parseFloat(this.valorInput.value),
                categoria: this.categoriaInput.value,
            };

            // Upload da imagem (se houver)
            if (this.imagemInput.files[0]) {
                const imagemUrl = await uploadImagemProduto(
                    this.imagemInput.files[0],
                    this.idGestor,
                    this.idBarraca
                );
                produtoData.imagem_url = imagemUrl;
            } else if (this.editingItemIdInput.value) {
                // Se está editando e não selecionou nova imagem, manter a imagem antiga
                const produtoAtual = this.produtos.find(p => p.id_produto == this.editingItemIdInput.value);
                if (produtoAtual && produtoAtual.imagem_url) {
                    produtoData.imagem_url = produtoAtual.imagem_url;
                }
            }

            if (this.editingItemIdInput.value) {
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
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
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
        const itemId = itemElement.dataset.id;
        
        const produto = this.produtos.find(p => p.id_produto == itemId);
        if (!produto) return;

        this.nomeInput.value = produto.nome_produto;
        this.valorInput.value = produto.preco.toFixed(2);
        this.categoriaInput.value = produto.categoria || 'comidas';
        this.editingItemIdInput.value = itemId;

        this.formTitle.textContent = 'Editar Item';
        this.submitButton.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i><span>Salvar Alteração</span>';
        this.submitButton.classList.remove('bg-green-600', 'hover:bg-green-700');
        this.submitButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        
        lucide.createIcons();
        this.itemForm.scrollIntoView({ behavior: 'smooth' });
    }

    handleDelete(deleteBtn) {
        this.itemToDelete = deleteBtn.closest('[data-id]');
        this.deleteModal.classList.remove('hidden');
    }

    closeDeleteModal() {
        this.deleteModal.classList.add('hidden');
        this.itemToDelete = null;
    }

    async confirmDelete() {
        if (!this.itemToDelete) return;

        const itemId = this.itemToDelete.dataset.id;

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
            this.closeDeleteModal();
        }
    }

    resetForm() {
        this.itemForm.reset();
        this.editingItemIdInput.value = '';
        this.fileNameSpan.textContent = '';
        this.formTitle.textContent = 'Adicionar Novo Item';
        this.submitButton.innerHTML = '<i data-lucide="plus-circle" class="w-5 h-5"></i><span>Adicionar Item</span>';
        this.submitButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        this.submitButton.classList.add('bg-green-600', 'hover:bg-green-700');
        lucide.createIcons();
    }

    switchTab(tab) {
        const tabs = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        
        tabContents.forEach(content => content.style.display = 'none');
        document.getElementById(tab.dataset.tab).style.display = 'block';
    }

    updateNoItemsMessage(category) {
        const list = document.getElementById(`${category}-list`);
        const message = list.parentElement.querySelector('.no-items-message');
        
        if (list.children.length > 0) {
            message.style.display = 'none';
        } else {
            message.style.display = 'block';
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[cadastroCardapio] DOM carregado');

    const manager = new CardapioManager();
    await manager.init();
});