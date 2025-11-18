import { supabase } from './supabaseClient.js';

console.log('[inicio] Script carregado');

// Variáveis globais dos Swipers
let barracasSwiper = null;
let praiasSwiper = null;
let maisBarracasSwiper = null;

/**
 * Classe para gerenciar a página inicial do cliente
 */
class InicioClienteManager {
    constructor() {
        this.barracas = [];
        this.favoritos = [];
        this.storageKey = 'beachspotFavorites';
    }

    async init() {
        try {
            console.log('[InicioCliente] Inicializando...');

            // Carregar favoritos do localStorage
            this.loadFavorites();

            // Carregar barracas do banco
            await this.loadBarracas();

            // Inicializar Swipers após carregar as barracas
            this.initSwipers();

            // Inicializar funcionalidades
            this.initFavorites();
            this.initSearch();

        } catch (error) {
            console.error('[InicioCliente] Erro na inicialização:', error);
        }
    }

    async loadBarracas() {
        try {
            console.log('[InicioCliente] Carregando barracas...');

            const { data: barracas, error } = await supabase
                .from('barracas')
                .select('*')
                .order('data_cadastro', { ascending: false });

            if (error) throw error;

            this.barracas = barracas || [];
            console.log(`[InicioCliente] ${this.barracas.length} barracas carregadas`);

            // Renderizar barracas nas seções
            this.renderBarracasPopulares();
            this.renderMaisBarracas();

        } catch (error) {
            console.error('[InicioCliente] Erro ao carregar barracas:', error);
        }
    }

    renderBarracasPopulares() {
        const container = document.querySelector('.barracas-swiper .swiper-wrapper');
        if (!container) return;

        // Limpar container
        container.innerHTML = '';

        // Pegar as primeiras 5 barracas
        const barracasPopulares = this.barracas.slice(0, 5);

        if (barracasPopulares.length === 0) {
            container.innerHTML = `
                <div class="swiper-slide">
                    <div class="bg-white text-gray-800 rounded-xl p-8 text-center">
                        <i data-lucide="package-x" class="w-16 h-16 mx-auto mb-4 text-gray-400"></i>
                        <p class="text-gray-600">Nenhuma barraca disponível no momento.</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Renderizar cada barraca
        barracasPopulares.forEach(barraca => {
            const slide = this.createBarracaSlide(barraca);
            container.insertAdjacentHTML('beforeend', slide);
        });

        lucide.createIcons();
    }

    renderMaisBarracas() {
        const container = document.querySelector('.mais-barracas-swiper .swiper-wrapper');
        if (!container) return;

        // Limpar container
        container.innerHTML = '';

        // Pegar as próximas 5 barracas (ou todas se forem menos)
        const maisBarracas = this.barracas.slice(5, 10);

        if (maisBarracas.length === 0 && this.barracas.length > 0) {
            // Se não houver mais barracas, repetir as primeiras
            maisBarracas.push(...this.barracas.slice(0, Math.min(5, this.barracas.length)));
        }

        // Renderizar cada barraca
        maisBarracas.forEach(barraca => {
            const slide = this.createBarracaSlide(barraca);
            container.insertAdjacentHTML('beforeend', slide);
        });

        lucide.createIcons();
    }

    createBarracaSlide(barraca) {
        const foto = barraca.foto_destaque || 'https://placehold.co/600x400/0138b4/FFFFFF?text=' + encodeURIComponent(barraca.nome_barraca);
        const descricao = barraca.descricao_barraca || 'Sem descrição disponível.';
        const preco = 'R$ 50'; // TODO: Adicionar campo de preço na tabela barracas
        
        // Limitar descrição
        const descricaoCurta = descricao.length > 50 
            ? descricao.substring(0, 50) + '...' 
            : descricao;

        const isFavorited = this.favoritos.some(fav => fav.id === `barraca-${barraca.id_barraca}`);
        const favClass = isFavorited ? 'favorited' : '';

        return `
            <div class="swiper-slide barraca-card" data-id="barraca-${barraca.id_barraca}" data-barraca-id="${barraca.id_barraca}">
                <div class="relative bg-white text-gray-800 rounded-xl overflow-hidden group w-full h-full">
                    <button class="btn-favorite ${favClass} absolute top-3 right-3 bg-black/30 p-2 rounded-full text-white hover:text-red-500 transition-colors z-10" title="Favoritar">
                        <i data-lucide="heart" class="w-5 h-5"></i>
                    </button>
                    <img src="${foto}" 
                         alt="Imagem da barraca ${barraca.nome_barraca}" 
                         class="barraca-img w-full h-40 object-cover"
                         onerror="this.src='https://placehold.co/600x400/0138b4/FFFFFF?text=${encodeURIComponent(barraca.nome_barraca)}'">
                    <div class="p-4 flex flex-col" style="height: 10rem;">
                        <h3 class="barraca-title text-xl font-bold text-center">${barraca.nome_barraca}</h3>
                        <p class="barraca-desc text-sm text-gray-600 my-2 truncate">${descricaoCurta}</p>
                        <div class="flex-grow"></div>
                        <div class="flex justify-between items-center">
                            <p class="text-lg font-semibold">${preco}</p>
                            <a href="infoBarraca.html?id=${barraca.id_barraca}" 
                               title="Mais informações" 
                               class="bg-[#1985d4]/90 hover:bg-[#1985d4] text-white p-2 rounded-full transition-colors">
                                <i data-lucide="info" class="w-5 h-5"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initSwipers() {
        console.log('[InicioCliente] Inicializando Swipers...');

        // Inicializar Swiper de Praias (mantém o original)
        praiasSwiper = new Swiper(".praias-swiper", {
            effect: "slide",
            grabCursor: true,
            centeredSlides: true,
            loop: true,
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                320: { slidesPerView: 1 },
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
            },
            navigation: {
                nextEl: ".praias-swiper-container .swiper-button-next",
                prevEl: ".praias-swiper-container .swiper-button-prev",
            },
        });

        // Inicializar Swiper de Barracas Populares
        barracasSwiper = new Swiper(".barracas-swiper", {
            effect: "slide",
            grabCursor: true,
            centeredSlides: true,
            loop: this.barracas.length > 3, // Loop apenas se houver mais de 3
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                320: { slidesPerView: 1 },
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
            },
            navigation: {
                nextEl: ".barracas-swiper-container .swiper-button-next",
                prevEl: ".barracas-swiper-container .swiper-button-prev",
            },
        });

        // Inicializar Swiper de Mais Barracas
        maisBarracasSwiper = new Swiper(".mais-barracas-swiper", {
            effect: "slide",
            grabCursor: true,
            centeredSlides: true,
            loop: this.barracas.length > 3,
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                320: { slidesPerView: 1 },
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
            },
            navigation: {
                nextEl: ".mais-barracas-swiper-container .swiper-button-next",
                prevEl: ".mais-barracas-swiper-container .swiper-button-prev",
            },
        });

        console.log('[InicioCliente] Swipers inicializados');
    }

    // === SISTEMA DE FAVORITOS ===
    
    loadFavorites() {
        this.favoritos = JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    saveFavorites() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.favoritos));
    }

    initFavorites() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-favorite');
            if (!button) return;

            this.handleFavoriteClick(button);
        });

        this.updateFavoriteButtons();
    }

    handleFavoriteClick(button) {
        const card = button.closest('.barraca-card');
        if (!card) return;

        const cardId = card.dataset.id;
        const barracaId = card.dataset.barracaId;
        const favoriteIndex = this.favoritos.findIndex(fav => fav.id === cardId);

        if (favoriteIndex > -1) {
            // Remover dos favoritos
            this.favoritos.splice(favoriteIndex, 1);
            button.classList.remove('favorited');
        } else {
            // Adicionar aos favoritos
            const favoriteData = {
                id: cardId,
                barracaId: barracaId,
                title: card.querySelector('.barraca-title').textContent.trim(),
                description: card.querySelector('.barraca-desc').textContent.trim(),
                image: card.querySelector('.barraca-img').src
            };
            this.favoritos.push(favoriteData);
            button.classList.add('favorited');
        }

        this.saveFavorites();
        console.log('[Favoritos] Atualizado:', this.favoritos.length, 'favoritos');
    }

    updateFavoriteButtons() {
        const favoriteButtons = document.querySelectorAll('.btn-favorite');
        
        favoriteButtons.forEach(button => {
            const card = button.closest('.barraca-card');
            if (!card) return;

            const cardId = card.dataset.id;
            const isFavorited = this.favoritos.some(fav => fav.id === cardId);

            if (isFavorited) {
                button.classList.add('favorited');
            } else {
                button.classList.remove('favorited');
            }
        });
    }

    // === SISTEMA DE BUSCA ===

    initSearch() {
        const searchInput = document.getElementById('search-input');
        const searchForm = document.querySelector('form.relative');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterItems(e.target.value);
            });
        }

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (searchInput) {
                    this.filterItems(searchInput.value);
                }
            });
        }
    }

    filterItems(searchTerm) {
        const filter = searchTerm.toLowerCase().trim();

        // Filtrar praias (mantém original)
        const beachCards = document.querySelectorAll('.praias-swiper-container .swiper-slide');
        beachCards.forEach(card => {
            const textToSearch = card.textContent.toLowerCase();
            card.style.display = textToSearch.includes(filter) ? 'block' : 'none';
        });

        // Filtrar barracas
        const shackCards = document.querySelectorAll('.barraca-card');
        shackCards.forEach(card => {
            const slide = card.closest('.swiper-slide');
            const textToSearch = card.textContent.toLowerCase();
            slide.style.display = textToSearch.includes(filter) ? 'block' : 'none';
        });

        // Atualizar Swipers
        if (praiasSwiper) praiasSwiper.update();
        if (barracasSwiper) barracasSwiper.update();
        if (maisBarracasSwiper) maisBarracasSwiper.update();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[inicio] DOM carregado');

    // Inicializar ícones
    lucide.createIcons();

    // Menu mobile
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

    // Inicializar gerenciador
    const manager = new InicioClienteManager();
    await manager.init();
});