import { supabase } from './supabaseClient.js';
import { checkAuthentication } from './getUserProfile.js';

console.log('[gestaoBarraca] Script Unificado Carregado');

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
        this.userId = null;
        this.mesasOcupadas = 0; // NOVO
        
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
        
        // Modal de confirmação de exclusão de promoção
        this.confirmDeleteModal = document.getElementById('confirm-delete-modal');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        this.closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
        
        // Modal de exclusão de barraca
        this.deleteBarracaModal = document.getElementById('delete-barraca-modal');
        this.deleteBarracaBtn = document.getElementById('delete-barraca-btn');
        this.confirmDeleteBarracaBtn = document.getElementById('confirm-delete-barraca-btn');
        this.cancelDeleteBarracaBtn = document.getElementById('cancel-delete-barraca-btn');
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
        
        if (this.closeDeleteModalBtn) {
            this.closeDeleteModalBtn.addEventListener('click', () => this.closeDeleteModal());
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

            if (e.target.closest('.btn-delete-promo')) {
                const btn = e.target.closest('.btn-delete-promo');
                const id = btn.dataset.id;
                this.deletePromotion(id);
            }
        });

        // Botão de excluir barraca
        if (this.deleteBarracaBtn) {
            this.deleteBarracaBtn.addEventListener('click', () => this.openDeleteBarracaModal());
        }
        
        if (this.cancelDeleteBarracaBtn) {
            this.cancelDeleteBarracaBtn.addEventListener('click', () => this.closeDeleteBarracaModal());
        }
        
        if (this.confirmDeleteBarracaBtn) {
            this.confirmDeleteBarracaBtn.addEventListener('click', () => this.confirmDeleteBarraca());
        }
    }

    async init() {
        try {
            console.log('[GestaoBarraca] Inicializando...');

            // Verificar autenticação
            const isAuthenticated = await checkAuthentication('../entrar.html');
            if (!isAuthenticated) return;

            // Obter sessão atual do Supabase
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error('[GestaoBarraca] Erro ao obter sessão:', sessionError);
                window.location.href = '../entrar.html';
                return;
            }

            if (!session || !session.user) {
                console.warn('[GestaoBarraca] Usuário não autenticado');
                window.location.href = '../entrar.html';
                return;
            }

            this.userId = session.user.id;
            console.log('[GestaoBarraca] Usuário autenticado:', this.userId);

            // Pegar ID da barraca da URL
            const urlParams = new URLSearchParams(window.location.search);
            const barracaIdUrl = urlParams.get('id');

            if (!barracaIdUrl) {
                console.warn('[GestaoBarraca] ID da barraca não especificado. Redirecionando...');
                alert('ID da barraca não especificado. Redirecionando...');
                window.location.href = './inicioGestor.html';
                return;
            }

            this.idBarraca = barracaIdUrl;
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
                .eq('id_gestor', this.userId)
                .single();

            if (error) throw error;

            if (!barraca) {
                throw new Error('Barraca não encontrada ou você não tem permissão para acessá-la.');
            }

            this.barracaData = barraca;
            console.log('[GestaoBarraca] Dados carregados:', barraca);

            // Atualizar UI com dados da barraca
            this.updateBarracaInfo();
            this.updateDashboardUI(barraca);
            this.atualizarLinksComIdBarraca();

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
    }

    updateDashboardUI(data) {
        // Atualiza o título com o nome da barraca
        const tituloBarraca = document.querySelector('section p.text-gray-500');
        if (tituloBarraca) {
            tituloBarraca.textContent = `Administre sua barraca ${data.nome_barraca}`;
        }
        
        // Atualiza estatísticas (exemplo com dados fictícios ou reais)
        const viewsElement = document.getElementById('views-count');
        const ratingElement = document.getElementById('rating-value');
        
        if (viewsElement) viewsElement.textContent = Math.floor(Math.random() * 1000);
        if (ratingElement) ratingElement.textContent = '4.8';
        
        // Sistema de ocupação de mesas
        this.initOccupancySystem();
    }

    // === SISTEMA DE OCUPAÇÃO DE MESAS ===

    initOccupancySystem() {
        const ocupacaoCard = document.querySelector('.bg-green-100');
        
        if (!ocupacaoCard || !this.barracaData.capacidade_mesas) {
            // Se não tiver capacidade definida, mostrar mensagem
            if (ocupacaoCard) {
                ocupacaoCard.className = 'bg-yellow-100 text-yellow-600 p-6 rounded-xl border border-gray-200 flex items-center gap-4';
                ocupacaoCard.innerHTML = `
                    <div class="bg-yellow-100 text-yellow-600 p-3 rounded-full">
                        <i data-lucide="alert-circle"></i>
                    </div>
                    <div>
                        <p class="text-gray-500 text-sm">Capacidade</p>
                        <p class="text-sm text-yellow-600 font-semibold">Configure no cadastro</p>
                    </div>
                `;
                lucide.createIcons();
            }
            return;
        }
        
        // Carregar ocupação do localStorage
        const storageKey = `ocupacao-barraca-${this.idBarraca}`;
        this.mesasOcupadas = parseInt(localStorage.getItem(storageKey)) || 0;
        
        // Garantir que não ultrapasse a capacidade
        if (this.mesasOcupadas > this.barracaData.capacidade_mesas) {
            this.mesasOcupadas = this.barracaData.capacidade_mesas;
        }
        
        this.renderOccupancy();
        
        // Tornar o gerenciador acessível globalmente para os botões
        window.gestaoManager = this;
    }

    renderOccupancy() {
        const ocupacaoCard = document.querySelector('.bg-green-100, .bg-yellow-100, .bg-red-100');
        if (!ocupacaoCard) return;
        
        const capacidade = this.barracaData.capacidade_mesas;
        const ocupadas = this.mesasOcupadas;
        const percentual = Math.round((ocupadas / capacidade) * 100);
        
        // Determinar cor baseada na ocupação
        let bgColor = 'bg-green-100';
        let textColor = 'text-green-600';
        let iconBg = 'bg-green-100';
        
        if (percentual >= 90) {
            bgColor = 'bg-red-100';
            textColor = 'text-red-600';
            iconBg = 'bg-red-100';
        } else if (percentual >= 70) {
            bgColor = 'bg-yellow-100';
            textColor = 'text-yellow-600';
            iconBg = 'bg-yellow-100';
        }
        
        ocupacaoCard.className = `${bgColor} p-6 rounded-xl border border-gray-200 flex items-center gap-4`;
        
        ocupacaoCard.innerHTML = `
            <div class="${iconBg} ${textColor} p-3 rounded-full">
                <i data-lucide="users"></i>
            </div>
            <div class="flex-1">
                <p class="text-gray-500 text-sm">Ocupação Atual</p>
                <p class="text-2xl font-bold ${textColor}">${percentual}%</p>
                <p class="text-sm mt-1 text-gray-600">${ocupadas} de ${capacidade} mesas</p>
            </div>
            <div class="flex flex-col gap-1">
                <button onclick="window.gestaoManager.incrementOccupancy()" 
                        class="bg-white hover:bg-gray-50 text-gray-700 font-bold py-1 px-3 rounded transition ${ocupadas >= capacidade ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${ocupadas >= capacidade ? 'disabled' : ''}>
                    +
                </button>
                <button onclick="window.gestaoManager.decrementOccupancy()" 
                        class="bg-white hover:bg-gray-50 text-gray-700 font-bold py-1 px-3 rounded transition ${ocupadas <= 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${ocupadas <= 0 ? 'disabled' : ''}>
                    -
                </button>
            </div>
        `;
        
        lucide.createIcons();
    }

    incrementOccupancy() {
        if (this.mesasOcupadas < this.barracaData.capacidade_mesas) {
            this.mesasOcupadas++;
            this.saveOccupancy();
            this.renderOccupancy();
            this.showToast('Mesa ocupada! 🪑');
        }
    }

    decrementOccupancy() {
        if (this.mesasOcupadas > 0) {
            this.mesasOcupadas--;
            this.saveOccupancy();
            this.renderOccupancy();
            this.showToast('Mesa liberada! ✅');
        }
    }

    saveOccupancy() {
        const storageKey = `ocupacao-barraca-${this.idBarraca}`;
        localStorage.setItem(storageKey, this.mesasOcupadas.toString());
        
        // Opcional: Salvar no banco de dados
        // this.saveOccupancyToDatabase();
    }

    // OPCIONAL: Salvar no banco (se quiser persistir no Supabase)
    async saveOccupancyToDatabase() {
        try {
            const { error } = await supabase
                .from('barracas')
                .update({ 
                    ocupacao_atual: this.mesasOcupadas,
                    ultima_atualizacao_ocupacao: new Date().toISOString()
                })
                .eq('id_barraca', this.idBarraca);
            
            if (error) console.error('Erro ao salvar ocupação:', error);
        } catch (error) {
            console.error('Erro ao salvar ocupação:', error);
        }
    }

    showToast(message) {
        // Criar toast se não existir
        let toast = document.getElementById('toast-ocupacao');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-ocupacao';
            toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 opacity-0 z-50';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.classList.remove('opacity-0');
        
        setTimeout(() => {
            toast.classList.add('opacity-0');
        }, 2000);
    }

    // === FIM DO SISTEMA DE OCUPAÇÃO ===

    atualizarLinksComIdBarraca() {
        if (!this.idBarraca) {
            console.warn('[GestaoBarraca] ID da barraca não disponível para atualizar links.');
            return;
        }

        console.log('[GestaoBarraca] Atualizando links com ID da barraca:', this.idBarraca);

        // 1. Link de "Editar Barraca"
        const linkEditarBarraca = document.querySelector('a[href*="infoBarraca.html"]') || 
                                  document.querySelector('a[href*="cadastroBarraca.html"]') ||
                                  document.getElementById('link-editar-barraca');
        
        if (linkEditarBarraca) {
            linkEditarBarraca.href = `cadastroBarraca.html?id=${this.idBarraca}&origem=gestao`;
            
            const textElement = linkEditarBarraca.querySelector('span');
            if (textElement) {
                if (textElement.textContent.includes('Ver Página') || textElement.textContent.includes('Ver página')) {
                    textElement.textContent = 'Editar Barraca';
                }
            }
            
            if (linkEditarBarraca.textContent.includes('Ver Página') || linkEditarBarraca.textContent.includes('Ver página')) {
                linkEditarBarraca.innerHTML = linkEditarBarraca.innerHTML.replace(/Ver [Pp]ágina da Barraca/g, 'Editar Barraca');
            }
            
            console.log('[GestaoBarraca] ✅ Link "Editar Barraca" atualizado:', linkEditarBarraca.href);
        } else {
            console.warn('[GestaoBarraca] Link "Editar Barraca" não encontrado no DOM');
        }

        // 2. Link de "Gerenciar Cardápio"
        const linkCardapio = document.querySelector('a[href*="cadastrocardapio.html"]');
        if (linkCardapio) {
            linkCardapio.href = `cadastrocardapio.html?id=${this.idBarraca}`;
            console.log('[GestaoBarraca] Link "Gerenciar Cardápio" atualizado com ID:', this.idBarraca);
        }

        // 3. Atualiza links do menu de navegação
        document.querySelectorAll('a[href="gestaoBarraca.html"]').forEach(link => {
            link.href = `gestaoBarraca.html?id=${this.idBarraca}`;
        });

        // 4. Atualiza todos os links para cadastroBarraca.html
        document.querySelectorAll('a[href="cadastroBarraca.html"]').forEach(link => {
            link.href = `cadastroBarraca.html?id=${this.idBarraca}&origem=gestao`;
        });

        console.log('[GestaoBarraca] ✅ Todos os links atualizados com ID da barraca:', this.idBarraca);
    }

    loadDashboardStats() {
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
        const container = document.getElementById('promotions-list') || document.getElementById('promocoes-list');
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
                    ${promo.preco_promocional ? `<p class="text-blue-600 font-bold mt-2 text-lg">R$ ${promo.preco_promocional}</p>` : ''}
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

        this.tabButtons.forEach(button => {
            if (button.dataset.tab === tabName) {
                button.classList.add('active', 'border-blue-600', 'text-blue-600');
            } else {
                button.classList.remove('active', 'border-blue-600', 'text-blue-600');
            }
        });

        this.tabContents.forEach(content => {
            if (content.id === tabName) {
                content.classList.add('active');
                content.classList.remove('hidden');
                content.style.display = 'block';
            } else {
                content.classList.remove('active');
                content.classList.add('hidden');
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
            modalTitle.textContent = 'Editar Promoção';
            promotionId.value = promocao.id_promocao;
            promotionTitle.value = promocao.titulo;
            promotionDescription.value = promocao.descricao;
        } else {
            modalTitle.textContent = 'Adicionar Nova Promoção';
            this.promotionForm.reset();
            if (promotionId) promotionId.value = '';
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

        const promotionId = document.getElementById('promotion-id')?.value;
        const titulo = document.getElementById('promotion-title')?.value;
        const descricao = document.getElementById('promotion-description')?.value;
        const preco = document.getElementById('promotion-price')?.value;

        try {
            const promocaoData = {
                id_barraca: parseInt(this.idBarraca),
                titulo,
                descricao
            };

            if (preco) {
                promocaoData.preco_promocional = parseFloat(preco);
            }

            if (promotionId) {
                const { error } = await supabase
                    .from('promocoes')
                    .update(promocaoData)
                    .eq('id_promocao', promotionId);

                if (error) throw error;

                alert('Promoção atualizada com sucesso!');
            } else {
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

    openDeleteBarracaModal() {
        if (this.deleteBarracaModal) {
            this.deleteBarracaModal.classList.remove('hidden');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } else {
            if (confirm(`⚠️ ATENÇÃO: Tem certeza que deseja EXCLUIR permanentemente a barraca "${this.barracaData?.nome_barraca}"?\n\nEsta ação não pode ser desfeita e todos os dados serão perdidos.`)) {
                const confirmacao = prompt('Digite "EXCLUIR" para confirmar:');
                if (confirmacao === 'EXCLUIR') {
                    this.confirmDeleteBarraca();
                }
            }
        }
    }

    closeDeleteBarracaModal() {
        if (this.deleteBarracaModal) {
            this.deleteBarracaModal.classList.add('hidden');
        }
    }

    async confirmDeleteBarraca() {
        if (!this.idBarraca) {
            alert('Erro: ID da barraca não encontrado.');
            return;
        }

        try {
            console.log('[GestaoBarraca] Iniciando exclusão da barraca:', this.idBarraca);

            if (this.confirmDeleteBarracaBtn) {
                this.confirmDeleteBarracaBtn.disabled = true;
                this.confirmDeleteBarracaBtn.textContent = 'Excluindo...';
            }

            const { error: errorProdutos } = await supabase
                .from('produtos')
                .delete()
                .eq('id_barraca', this.idBarraca);

            if (errorProdutos) {
                console.warn('[GestaoBarraca] Erro ao excluir produtos:', errorProdutos);
            }

            const { error: errorPromocoes } = await supabase
                .from('promocoes')
                .delete()
                .eq('id_barraca', this.idBarraca);

            if (errorPromocoes) {
                console.warn('[GestaoBarraca] Erro ao excluir promoções:', errorPromocoes);
            }

            const { error: errorBarraca } = await supabase
                .from('barracas')
                .delete()
                .eq('id_barraca', this.idBarraca)
                .eq('id_gestor', this.userId);

            if (errorBarraca) {
                throw new Error(`Erro ao excluir barraca: ${errorBarraca.message}`);
            }

            console.log('[GestaoBarraca] ✅ Barraca excluída com sucesso!');
            
            alert('Barraca excluída com sucesso!');
            
            this.closeDeleteBarracaModal();

            setTimeout(() => {
                window.location.href = './inicioGestor.html';
            }, 500);

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao excluir barraca:', error);
            alert(`Erro ao excluir barraca: ${error.message}`);
            
            if (this.confirmDeleteBarracaBtn) {
                this.confirmDeleteBarracaBtn.disabled = false;
                this.confirmDeleteBarracaBtn.textContent = 'Sim, Excluir Permanentemente';
            }
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[gestaoBarraca] DOM carregado');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Inicializar gerenciador
    const manager = new GestaoBarracaManager();
    await manager.init();
});