import { supabase } from './supabaseClient.js';
import { checkAuthentication } from './getUserProfile.js';

console.log('[gestaoBarraca] Script carregado');

/**
 * Classe para gerenciar a página de gestão da barraca
 */
class GestaoBarracaManager {
    constructor() {
        this.idBarraca = null;
        this.barracaData = null;
        this.promocoes = [];
        this.reservas = [];
        this.currentTab = 'dashboard';
        this.promotionToDelete = null;
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Elementos das abas
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Modal de promoção
        this.promotionModal = document.getElementById('promotion-modal');
        this.promotionForm = document.getElementById('promotion-form');
        this.addPromotionBtn = document.getElementById('add-promotion-btn');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.cancelModalBtn = document.getElementById('cancel-modal-btn');
        
        // Modal de confirmação de exclusão
        this.confirmDeleteModal = document.getElementById('confirm-delete-modal');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    }

    initEventListeners() {
        // Abas
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Modal de promoção
        if (this.addPromotionBtn) {
            this.addPromotionBtn.addEventListener('click', () => this.openPromotionModal());
        }
        
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closePromotionModal());
        }
        
        if (this.cancelModalBtn) {
            this.cancelModalBtn.addEventListener('click', () => this.closePromotionModal());
        }

        if (this.promotionForm) {
            this.promotionForm.addEventListener('submit', (e) => this.handlePromotionSubmit(e));
        }

        // Modal de exclusão
        if (this.cancelDeleteBtn) {
            this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        }
        
        if (this.confirmDeleteBtn) {
            this.confirmDeleteBtn.addEventListener('click', () => this.confirmDeletePromotion());
        }

        // Delegação de eventos para editar e deletar promoções
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-promotion-btn')) {
                const btn = e.target.closest('.edit-promotion-btn');
                const id = btn.dataset.id;
                this.editPromotion(id);
            }
            
            if (e.target.closest('.delete-promotion-btn')) {
                const btn = e.target.closest('.delete-promotion-btn');
                const id = btn.dataset.id;
                this.deletePromotion(id);
            }
        });
    }

    async init() {
        try {
            console.log('[GestaoBarraca] Inicializando...');

            // Verificar autenticação
            const isAuthenticated = await checkAuthentication('../entrar.html');
            if (!isAuthenticated) return;

            // Pegar ID da barraca da URL
            const urlParams = new URLSearchParams(window.location.search);
            this.idBarraca = urlParams.get('id');

            if (!this.idBarraca) {
                alert('ID da barraca não especificado. Redirecionando...');
                window.location.href = './inicioGestor.html';
                return;
            }

            console.log('[GestaoBarraca] ID da barraca:', this.idBarraca);

            // Carregar dados da barraca
            await this.loadBarracaData();
            
            // Carregar promoções
            await this.loadPromocoes();

            // Carregar estatísticas (simuladas por enquanto)
            this.loadDashboardStats();

        } catch (error) {
            console.error('[GestaoBarraca] Erro na inicialização:', error);
            alert('Erro ao carregar dados da barraca.');
        }
    }

    async loadBarracaData() {
        try {
            console.log('[GestaoBarraca] Carregando dados da barraca...');

            const { data: barraca, error } = await supabase
                .from('barracas')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .single();

            if (error) throw error;

            if (!barraca) {
                throw new Error('Barraca não encontrada');
            }

            this.barracaData = barraca;
            console.log('[GestaoBarraca] Dados carregados:', barraca);

            // Atualizar UI com dados da barraca
            this.updateBarracaInfo();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao carregar barraca:', error);
            alert('Erro ao carregar informações da barraca.');
            window.location.href = './inicioGestor.html';
        }
    }

    updateBarracaInfo() {
        // Atualizar título e subtítulo
        const titleElement = document.querySelector('section h1');
        const subtitleElement = document.querySelector('section p');
        
        if (titleElement) {
            titleElement.textContent = 'Painel de Gestão';
        }
        
        if (subtitleElement) {
            subtitleElement.textContent = `Administre sua barraca ${this.barracaData.nome_barraca}`;
        }

        // Atualizar link "Ver Página da Barraca"
        const verPaginaLink = document.querySelector('a[href="infoBarraca.html"]');
        if (verPaginaLink) {
            verPaginaLink.href = `infoBarraca.html?id=${this.idBarraca}`;
        }

        // Atualizar link "Gerenciar Cardápio"
        const gerenciarCardapioLink = document.querySelector('a[href="cadastrocardapio.html"]');
        if (gerenciarCardapioLink) {
            gerenciarCardapioLink.href = `cadastrocardapio.html?id=${this.idBarraca}`;
        }
    }

    loadDashboardStats() {
        // TODO: Buscar dados reais de reservas do banco
        // Por enquanto, mantém os dados simulados do HTML
        console.log('[GestaoBarraca] Estatísticas carregadas (simuladas)');
    }

    async loadPromocoes() {
        try {
            console.log('[GestaoBarraca] Carregando promoções...');

            const { data: promocoes, error } = await supabase
                .from('promocoes')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .order('data_criacao', { ascending: false });

            if (error) throw error;

            this.promocoes = promocoes || [];
            console.log(`[GestaoBarraca] ${this.promocoes.length} promoções carregadas`);

            this.renderPromocoes();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao carregar promoções:', error);
        }
    }

    renderPromocoes() {
        const container = document.getElementById('promotions-list');
        if (!container) return;

        if (this.promocoes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i data-lucide="ticket-percent" class="w-16 h-16 mx-auto mb-4 text-gray-300"></i>
                    <p class="text-lg font-semibold">Nenhuma promoção cadastrada</p>
                    <p class="text-sm">Clique em "Adicionar Promoção" para criar sua primeira oferta.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = this.promocoes.map(promo => `
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-200 flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-1">${promo.titulo}</h3>
                    <p class="text-gray-600 text-sm">${promo.descricao}</p>
                </div>
                <div class="flex gap-2 ml-4">
                    <button data-id="${promo.id_promocao}" class="edit-promotion-btn text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition">
                        <i data-lucide="pencil" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                    <button data-id="${promo.id_promocao}" class="delete-promotion-btn text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition">
                        <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                </div>
            </div>
        `).join('');

        lucide.createIcons();
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Atualizar botões
        this.tabButtons.forEach(button => {
            if (button.dataset.tab === tabName) {
                button.classList.add('active', 'border-blue-600', 'text-blue-600');
            } else {
                button.classList.remove('active', 'border-blue-600', 'text-blue-600');
            }
        });

        // Atualizar conteúdo
        this.tabContents.forEach(content => {
            if (content.id === tabName) {
                content.classList.add('active');
                content.style.display = 'block';
            } else {
                content.classList.remove('active');
                content.style.display = 'none';
            }
        });

        lucide.createIcons();
    }

    openPromotionModal(promocao = null) {
        const modalTitle = document.getElementById('modal-title');
        const promotionId = document.getElementById('promotion-id');
        const promotionTitle = document.getElementById('promotion-title');
        const promotionDescription = document.getElementById('promotion-description');

        if (promocao) {
            // Editar promoção existente
            modalTitle.textContent = 'Editar Promoção';
            promotionId.value = promocao.id_promocao;
            promotionTitle.value = promocao.titulo;
            promotionDescription.value = promocao.descricao;
        } else {
            // Nova promoção
            modalTitle.textContent = 'Adicionar Nova Promoção';
            this.promotionForm.reset();
            promotionId.value = '';
        }

        this.promotionModal.classList.remove('hidden');
        lucide.createIcons();
    }

    closePromotionModal() {
        this.promotionModal.classList.add('hidden');
        this.promotionForm.reset();
    }

    async handlePromotionSubmit(e) {
        e.preventDefault();

        const promotionId = document.getElementById('promotion-id').value;
        const titulo = document.getElementById('promotion-title').value;
        const descricao = document.getElementById('promotion-description').value;

        try {
            const promocaoData = {
                id_barraca: parseInt(this.idBarraca),
                titulo,
                descricao
            };

            if (promotionId) {
                // Atualizar promoção existente
                const { error } = await supabase
                    .from('promocoes')
                    .update(promocaoData)
                    .eq('id_promocao', promotionId);

                if (error) throw error;

                alert('Promoção atualizada com sucesso!');
            } else {
                // Criar nova promoção
                const { error } = await supabase
                    .from('promocoes')
                    .insert(promocaoData);

                if (error) throw error;

                alert('Promoção criada com sucesso!');
            }

            this.closePromotionModal();
            await this.loadPromocoes();

        } catch (error) {
            console.error('[handlePromotionSubmit] Erro:', error);
            alert(`Erro ao salvar promoção: ${error.message}`);
        }
    }

    editPromotion(id) {
        const promocao = this.promocoes.find(p => p.id_promocao == id);
        if (promocao) {
            this.openPromotionModal(promocao);
        }
    }

    deletePromotion(id) {
        this.promotionToDelete = id;
        this.confirmDeleteModal.classList.remove('hidden');
        lucide.createIcons();
    }

    closeDeleteModal() {
        this.confirmDeleteModal.classList.add('hidden');
        this.promotionToDelete = null;
    }

    async confirmDeletePromotion() {
        if (!this.promotionToDelete) return;

        try {
            const { error } = await supabase
                .from('promocoes')
                .delete()
                .eq('id_promocao', this.promotionToDelete);

            if (error) throw error;

            alert('Promoção excluída com sucesso!');
            this.closeDeleteModal();
            await this.loadPromocoes();

        } catch (error) {
            console.error('[confirmDeletePromotion] Erro:', error);
            alert(`Erro ao excluir promoção: ${error.message}`);
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[gestaoBarraca] DOM carregado');

    // Inicializar ícones
    lucide.createIcons();

    // Inicializar gerenciador
    const manager = new GestaoBarracaManager();
    await manager.init();
});