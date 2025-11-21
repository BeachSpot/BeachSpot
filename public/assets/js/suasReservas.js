import { supabase } from './supabaseClient.js';

console.log('[SuasReservas] Script carregado');

class ReservasManager {
    constructor() {
        this.userId = null;
        this.reservas = [];
        this.favorites = [];
        this.currentDeleteCard = null;
    }

    async init() {
        try {
            console.log('[SuasReservas] Inicializando...');

            // Verificar autenticação
            await this.checkAuth();

            // Inicializar componentes
            this.initMobileMenu();
            this.initTabs();
            this.initDeleteModal();

            // Carregar dados
            await this.loadReservas();
            this.loadFavorites();

        } catch (error) {
            console.error('[SuasReservas] Erro na inicialização:', error);
        }
    }

    async checkAuth() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                console.warn('[SuasReservas] Usuário não autenticado');
                window.location.href = 'login.html';
                return;
            }

            this.userId = user.id;
            console.log('[SuasReservas] Usuário autenticado:', this.userId);

        } catch (error) {
            console.error('[SuasReservas] Erro na autenticação:', error);
        }
    }

    async loadReservas() {
        try {
            console.log('[SuasReservas] Carregando reservas...');

            const { data: reservas, error } = await supabase
                .from('reservas')
                .select(`
                    *,
                    barracas (
                        id_barraca,
                        nome_barraca,
                        localizacao,
                        foto_destaque
                    )
                `)
                .eq('id_cliente', this.userId)
                .order('data_reserva', { ascending: false });

            if (error) throw error;

            this.reservas = reservas || [];
            console.log(`[SuasReservas] ${this.reservas.length} reservas carregadas`);

            this.renderReservas();

        } catch (error) {
            console.error('[SuasReservas] Erro ao carregar reservas:', error);
            this.renderEmptyReservas();
        }
    }

    renderReservas() {
        const container = document.querySelector('#reservas .grid');
        if (!container) return;

        if (this.reservas.length === 0) {
            this.renderEmptyReservas();
            return;
        }

        container.innerHTML = this.reservas.map(reserva => this.createReservaCard(reserva)).join('');
        
        // Reinicializar ícones e listeners
        lucide.createIcons();
        this.addFavoriteListeners();
        this.addDeleteListeners();
    }

    renderEmptyReservas() {
        const container = document.querySelector('#reservas .grid');
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-lucide="calendar-x" class="w-16 h-16 mx-auto text-blue-200 mb-4"></i>
                <p class="text-white text-lg font-semibold mb-2">Nenhuma reserva encontrada</p>
                <p class="text-blue-200 mb-6">Comece a explorar e reserve sua barraca ideal!</p>
                <a href="inicio.html" class="inline-flex items-center gap-2 bg-white text-blue-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 transition-all">
                    <i data-lucide="search" class="w-5 h-5"></i>
                    <span>Explorar Barracas</span>
                </a>
            </div>
        `;
        lucide.createIcons();
    }

    createReservaCard(reserva) {
        const barraca = reserva.barracas;
        if (!barraca) {
            console.warn('[SuasReservas] Barraca não encontrada para reserva:', reserva.id_reserva);
            return '';
        }

        // Formatar data e hora
        const dataReserva = this.formatDate(reserva.data_reserva);
        const horaInicio = this.formatTime(reserva.data_inicio);
        
        // Status da reserva
        const statusConfig = this.getStatusConfig(reserva.status);
        
        // Imagem da barraca
        const imageUrl = barraca.foto_destaque || `https://placehold.co/400x200/0138b4/FFFFFF?text=${encodeURIComponent(barraca.nome_barraca)}`;

        // ID único para o card
        const cardId = `reserva-${reserva.id_reserva}`;

        return `
            <div class="reserva-card bg-white rounded-xl shadow-lg overflow-hidden flex flex-col w-full" 
                 data-id="${cardId}" 
                 data-reserva-id="${reserva.id_reserva}"
                 data-barraca-id="${barraca.id_barraca}"
                 data-location="${barraca.localizacao || ''}">
                <img class="w-full h-48 object-cover" 
                     src="${imageUrl}" 
                     alt="${barraca.nome_barraca}"
                     onerror="this.src='https://placehold.co/400x200/0138b4/FFFFFF?text=Barraca'">
                <div class="p-5 flex flex-col flex-grow">
                    <div class="flex-grow">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-xl font-bold text-gray-900 reserva-title">${barraca.nome_barraca}</h3>
                            <p class="text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor} inline-block px-2 py-1 rounded-full whitespace-nowrap">
                                ${statusConfig.label}
                            </p>
                        </div>
                        <div class="text-sm text-gray-600 space-y-1">
                            <p><strong class="font-semibold">Dia:</strong> ${dataReserva}</p>
                            <p><strong class="font-semibold">Horário de chegada:</strong> ${horaInicio}</p>
                            ${reserva.num_pessoas ? `<p><strong class="font-semibold">Pessoas:</strong> ${reserva.num_pessoas}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
                        <div class="flex space-x-2">
                            <a href="infoBarraca.html?id=${barraca.id_barraca}" 
                               class="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors">
                                Ver Barraca
                            </a>
                            ${reserva.status === 'pendente' || reserva.status === 'confirmada' ? `
                                <a href="editarReserva.html?id=${reserva.id_reserva}" 
                                   title="Editar Reserva" 
                                   class="text-sm font-medium text-gray-800 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-md transition-colors">
                                    Editar
                                </a>
                            ` : ''}
                        </div>
                        
                        <div class="flex space-x-1">
                            <button title="Adicionar aos Favoritos" 
                                    class="favorite-btn text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <i data-lucide="heart" class="w-5 h-5"></i>
                            </button>
                            ${reserva.status === 'pendente' || reserva.status === 'confirmada' ? `
                                <button title="Excluir Reserva" 
                                        class="delete-reserva-btn text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusConfig(status) {
        const configs = {
            'pendente': {
                label: 'Pendente',
                bgColor: 'bg-yellow-100',
                textColor: 'text-yellow-800'
            },
            'confirmada': {
                label: 'Confirmada',
                bgColor: 'bg-green-100',
                textColor: 'text-green-800'
            },
            'cancelada': {
                label: 'Cancelada',
                bgColor: 'bg-red-100',
                textColor: 'text-red-800'
            },
            'concluida': {
                label: 'Concluída',
                bgColor: 'bg-gray-100',
                textColor: 'text-gray-800'
            }
        };

        return configs[status] || configs['pendente'];
    }

    formatDate(dateString) {
        if (!dateString) return '--/--/----';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatTime(dateTimeString) {
        if (!dateTimeString) return '--:--';
        
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // === SISTEMA DE FAVORITOS ===

    loadFavorites() {
        this.favorites = JSON.parse(localStorage.getItem('beachspotFavorites')) || [];
        this.renderFavorites();
        this.updateFavoriteButtons();
    }

    renderFavorites() {
        const container = document.getElementById('favorites-list');
        if (!container) return;

        if (this.favorites.length === 0) {
            container.innerHTML = `
                <p class="text-blue-200 text-center py-8 col-span-full">
                    Você ainda não tem locais favoritos. Clique no coração para adicioná-los!
                </p>
            `;
            return;
        }

        container.innerHTML = this.favorites.map(fav => `
            <div class="reserva-card bg-white rounded-xl shadow-lg overflow-hidden flex flex-col w-full" data-id="${fav.id}">
                <img class="w-full h-48 object-cover" src="${fav.image}" alt="${fav.title}">
                <div class="p-5 flex flex-col flex-grow">
                    <div class="flex-grow">
                        <h3 class="text-xl font-bold text-gray-900">${fav.title}</h3>
                        <p class="text-sm text-gray-600 mt-1">
                            ${fav.description || fav.location || ''}
                        </p>
                    </div>
                    <div class="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
                        <div class="flex space-x-2">
                            <a href="infoBarraca.html?id=${fav.barracaId}" 
                               class="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors">
                                Ver Barraca
                            </a>
                        </div>
                        
                        <div class="flex space-x-1">
                            <button title="Remover dos Favoritos" 
                                    class="remove-favorite-btn text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-gray-100 transition-colors" 
                                    data-id="${fav.id}">
                                <i data-lucide="heart" class="w-5 h-5 fill-current"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        lucide.createIcons();
        this.addRemoveFavoriteListeners();
    }

    addFavoriteListeners() {
        document.querySelectorAll('#reservas .favorite-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.currentTarget.closest('.reserva-card');
                if (!card) return;

                const cardId = card.dataset.id;
                const barracaId = card.dataset.barracaId;
                const title = card.querySelector('.reserva-title').textContent.trim();
                const location = card.dataset.location;
                const image = card.querySelector('img').src;

                const favoriteIndex = this.favorites.findIndex(fav => fav.id === cardId);

                if (favoriteIndex > -1) {
                    this.favorites.splice(favoriteIndex, 1);
                } else {
                    this.favorites.push({
                        id: cardId,
                        barracaId: barracaId,
                        title: title,
                        description: location,
                        location: location,
                        image: image
                    });
                }

                this.saveFavorites();
                this.updateFavoriteButtons();
                this.renderFavorites();
            });
        });
    }

    addRemoveFavoriteListeners() {
        document.querySelectorAll('#favoritos .remove-favorite-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const idToRemove = e.currentTarget.dataset.id;
                this.favorites = this.favorites.filter(fav => fav.id !== idToRemove);
                this.saveFavorites();
                this.renderFavorites();
                this.updateFavoriteButtons();
            });
        });
    }

    updateFavoriteButtons() {
        document.querySelectorAll('#reservas .favorite-btn').forEach(button => {
            const card = button.closest('.reserva-card');
            if (!card) return;

            const cardId = card.dataset.id;
            const isFavorited = this.favorites.some(fav => fav.id === cardId);

            if (isFavorited) {
                button.classList.add('text-red-500');
                button.innerHTML = '<i data-lucide="heart" class="w-5 h-5 fill-current"></i>';
            } else {
                button.classList.remove('text-red-500');
                button.innerHTML = '<i data-lucide="heart" class="w-5 h-5"></i>';
            }
        });
        lucide.createIcons();
    }

    saveFavorites() {
        localStorage.setItem('beachspotFavorites', JSON.stringify(this.favorites));
    }

    // === MODAL DE EXCLUSÃO ===

    initDeleteModal() {
        const modalOverlay = document.getElementById('delete-modal-overlay');
        const modal = document.getElementById('delete-modal');
        const modalCancel = document.getElementById('modal-cancel-delete');
        const modalConfirm = document.getElementById('modal-confirm-delete');

        if (!modalOverlay || !modal) return;

        modalCancel?.addEventListener('click', () => this.hideDeleteModal());
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) this.hideDeleteModal();
        });

        modalConfirm?.addEventListener('click', () => this.confirmDelete());
    }

    addDeleteListeners() {
        document.querySelectorAll('#reservas .delete-reserva-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.currentDeleteCard = e.currentTarget.closest('.reserva-card');
                if (this.currentDeleteCard) {
                    this.showDeleteModal();
                }
            });
        });
    }

    showDeleteModal() {
        const modalOverlay = document.getElementById('delete-modal-overlay');
        const modal = document.getElementById('delete-modal');
        
        modalOverlay.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0', 'scale-95');
            modal.classList.add('opacity-100', 'scale-100');
        }, 10);
    }

    hideDeleteModal() {
        const modalOverlay = document.getElementById('delete-modal-overlay');
        const modal = document.getElementById('delete-modal');
        
        modal.classList.add('opacity-0', 'scale-95');
        modal.classList.remove('opacity-100', 'scale-100');
        
        setTimeout(() => {
            modalOverlay.classList.add('hidden');
            this.currentDeleteCard = null;
        }, 200);
    }

    async confirmDelete() {
        if (!this.currentDeleteCard) return;

        const reservaId = this.currentDeleteCard.dataset.reservaId;

        try {
            // Atualizar status para "cancelada" ao invés de deletar
            const { error } = await supabase
                .from('reservas')
                .update({ status: 'cancelada' })
                .eq('id_reserva', reservaId);

            if (error) throw error;

            console.log('[SuasReservas] Reserva cancelada:', reservaId);

            // Animação de saída
            this.currentDeleteCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            this.currentDeleteCard.style.opacity = '0';
            this.currentDeleteCard.style.transform = 'scale(0.95)';

            setTimeout(() => {
                this.currentDeleteCard.remove();
                
                // Verificar se ainda há reservas
                const remainingCards = document.querySelectorAll('#reservas .reserva-card');
                if (remainingCards.length === 0) {
                    this.renderEmptyReservas();
                }
            }, 300);

        } catch (error) {
            console.error('[SuasReservas] Erro ao cancelar reserva:', error);
            alert('Erro ao cancelar reserva. Tente novamente.');
        }

        this.hideDeleteModal();
    }

    // === SISTEMA DE ABAS ===

    initTabs() {
        const tabs = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        // Ativar primeira aba
        const firstTab = tabs[0];
        if (firstTab) {
            firstTab.classList.add('active');
            const firstContent = document.getElementById(firstTab.dataset.tab);
            if (firstContent) firstContent.style.display = 'block';
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Desativar todas as abas
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.style.display = 'none');

                // Ativar aba clicada
                tab.classList.add('active');
                const activeContent = document.getElementById(tab.dataset.tab);
                if (activeContent) activeContent.style.display = 'block';

                // Recarregar favoritos ao mudar para a aba
                if (tab.dataset.tab === 'favoritos') {
                    this.renderFavorites();
                }
            });
        });
    }

    // === MENU MOBILE ===

    initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!mobileMenu.classList.contains('hidden') &&
                    !mobileMenu.contains(e.target) &&
                    !mobileMenuBtn.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[SuasReservas] DOM carregado');
    
    // Inicializar ícones
    lucide.createIcons();

    // Inicializar gerenciador
    const manager = new ReservasManager();
    await manager.init();
});