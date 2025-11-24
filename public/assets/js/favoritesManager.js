/**
 * Gerenciador centralizado de favoritos
 * Usa localStorage para persistir favoritos entre sessões
 */

const STORAGE_KEY = 'beachspotFavorites';

export class FavoritesManager {
    constructor() {
        this.favorites = this.loadFavorites();
    }

    /**
     * Carregar favoritos do localStorage
     */
    loadFavorites() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('[FavoritesManager] Erro ao carregar favoritos:', error);
            return [];
        }
    }

    /**
     * Salvar favoritos no localStorage
     */
    saveFavorites() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favorites));
        } catch (error) {
            console.error('[FavoritesManager] Erro ao salvar favoritos:', error);
        }
    }

    /**
     * Verificar se uma barraca está favoritada
     * @param {string|number} barracaId - ID da barraca
     * @returns {boolean}
     */
    isFavorited(barracaId) {
        return this.favorites.some(fav => fav.barracaId == barracaId);
    }

    /**
     * Adicionar barraca aos favoritos
     * @param {Object} barracaData - Dados da barraca
     * @returns {boolean} - true se adicionado com sucesso
     */
    addFavorite(barracaData) {
        const barracaId = barracaData.id_barraca || barracaData.barracaId;
        
        if (this.isFavorited(barracaId)) {
            console.log('[FavoritesManager] Barraca já está nos favoritos');
            return false;
        }

        const favoriteItem = {
            id: `barraca-${barracaId}`,
            barracaId: barracaId,
            title: barracaData.nome_barraca || barracaData.title || 'Barraca',
            description: barracaData.descricao_barraca || barracaData.description || '',
            location: barracaData.localizacao || barracaData.location || '',
            image: barracaData.foto_destaque || barracaData.image || ''
        };

        this.favorites.push(favoriteItem);
        this.saveFavorites();
        console.log('[FavoritesManager] Favorito adicionado:', favoriteItem);
        return true;
    }

    /**
     * Remover barraca dos favoritos
     * @param {string|number} barracaId - ID da barraca
     * @returns {boolean} - true se removido com sucesso
     */
    removeFavorite(barracaId) {
        const initialLength = this.favorites.length;
        this.favorites = this.favorites.filter(fav => fav.barracaId != barracaId);
        
        if (this.favorites.length < initialLength) {
            this.saveFavorites();
            console.log('[FavoritesManager] Favorito removido:', barracaId);
            return true;
        }
        
        return false;
    }

    /**
     * Alternar favorito (adicionar ou remover)
     * @param {Object} barracaData - Dados da barraca
     * @returns {boolean} - true se agora está favoritado, false se não está
     */
    toggleFavorite(barracaData) {
        const barracaId = barracaData.id_barraca || barracaData.barracaId;
        
        if (this.isFavorited(barracaId)) {
            this.removeFavorite(barracaId);
            return false;
        } else {
            this.addFavorite(barracaData);
            return true;
        }
    }

    /**
     * Obter todos os favoritos
     * @returns {Array}
     */
    getAllFavorites() {
        return [...this.favorites];
    }

    /**
     * Obter um favorito específico
     * @param {string|number} barracaId
     * @returns {Object|null}
     */
    getFavorite(barracaId) {
        return this.favorites.find(fav => fav.barracaId == barracaId) || null;
    }

    /**
     * Atualizar ícones de favorito na página
     * @param {string} containerSelector - Seletor do container (opcional)
     */
    updateFavoriteIcons(containerSelector = '') {
        const selector = containerSelector 
            ? `${containerSelector} .btn-favorite, ${containerSelector} .favorite-btn`
            : '.btn-favorite, .favorite-btn';
        
        const buttons = document.querySelectorAll(selector);

        buttons.forEach(button => {
            const card = button.closest('[data-barraca-id]');
            if (!card) return;

            const barracaId = card.dataset.barracaId;
            const isFavorited = this.isFavorited(barracaId);

            // Atualizar classes
            if (isFavorited) {
                button.classList.add('favorited');
                const heartIcon = button.querySelector('[data-lucide="heart"]');
                if (heartIcon) {
                    heartIcon.setAttribute('fill', 'currentColor');
                }
            } else {
                button.classList.remove('favorited');
                const heartIcon = button.querySelector('[data-lucide="heart"]');
                if (heartIcon) {
                    heartIcon.setAttribute('fill', 'none');
                }
            }
        });

        // Reinicializar ícones do Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Inicializar event listeners para botões de favorito
     * @param {string} containerSelector - Seletor do container (opcional)
     * @param {Function} onToggle - Callback após alternar favorito
     */
    initFavoriteButtons(containerSelector = '', onToggle = null) {
        const container = containerSelector 
            ? document.querySelector(containerSelector)
            : document;

        if (!container) return;

        // Usar delegação de eventos para capturar cliques em botões
        container.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-favorite, .favorite-btn');
            if (!button) return;

            e.preventDefault();
            e.stopPropagation();

            const card = button.closest('[data-barraca-id]');
            if (!card) return;

            const barracaId = card.dataset.barracaId;

            // Coletar dados da barraca
            const barracaData = {
                id_barraca: barracaId,
                barracaId: barracaId,
                nome_barraca: card.querySelector('.barraca-title, .reserva-title')?.textContent.trim() || 'Barraca',
                descricao_barraca: card.querySelector('.barraca-desc')?.textContent.trim() || '',
                localizacao: card.dataset.location || '',
                foto_destaque: card.querySelector('img')?.src || ''
            };

            const isFavorited = this.toggleFavorite(barracaData);

            // Atualizar UI
            this.updateFavoriteIcons(containerSelector);

            // Callback
            if (onToggle) {
                onToggle(barracaId, isFavorited);
            }

            // Mostrar feedback visual
            this.showToast(
                isFavorited 
                    ? '❤️ Adicionado aos favoritos!' 
                    : '💔 Removido dos favoritos'
            );
        });

        // Atualizar ícones inicialmente
        this.updateFavoriteIcons(containerSelector);
    }

    /**
     * Mostrar toast de notificação
     * @param {string} message - Mensagem a exibir
     */
    showToast(message) {
        // Procurar elemento toast existente na página
        let toast = document.getElementById('toast') || document.getElementById('favorites-toast');

        if (!toast) {
            // Criar toast se não existir
            toast = document.createElement('div');
            toast.id = 'favorites-toast';
            toast.className = 'fixed bottom-5 right-5 bg-gray-800 text-white py-3 px-5 rounded-lg shadow-lg opacity-0 translate-y-3 transition-all duration-300 z-[9999]';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.remove('opacity-0', 'translate-y-3');
        
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-3');
        }, 3000);
    }

    /**
     * Limpar todos os favoritos
     */
    clearAllFavorites() {
        this.favorites = [];
        this.saveFavorites();
    }

    /**
     * Contar número de favoritos
     * @returns {number}
     */
    count() {
        return this.favorites.length;
    }
}

// Exportar instância singleton
export const favoritesManager = new FavoritesManager();