import { supabase } from './supabaseClient.js';

console.log('[infoBarraca] Script carregado');

class InfoBarracaManager {
    constructor() {
        this.idBarraca = null;
        this.barracaData = null;
        this.promocoes = [];
        this.produtos = [];
        this.map = null;
        this.currentRating = 0;
    }

    async init() {
        try {
            console.log('[InfoBarraca] Inicializando...');

            // Pegar ID da barraca da URL
            const urlParams = new URLSearchParams(window.location.search);
            this.idBarraca = urlParams.get('id');

            if (!this.idBarraca) {
                alert('Barraca não encontrada. Redirecionando...');
                window.location.href = './inicio.html';
                return;
            }

            console.log('[InfoBarraca] ID da barraca:', this.idBarraca);

            // Carregar dados
            await this.loadBarracaData();
            await this.loadPromocoes();
            await this.loadProdutos();

            // Inicializar funcionalidades
            this.initFavorites();
            this.initTabs();
            this.initGalleryModal();
            this.initReviewSystem();
            this.initMapModal();
            this.initWeatherAPI();

        } catch (error) {
            console.error('[InfoBarraca] Erro na inicialização:', error);
            alert('Erro ao carregar informações da barraca.');
        }
    }

    async loadBarracaData() {
        try {
            console.log('[InfoBarraca] Carregando dados da barraca...');

            const { data: barraca, error } = await supabase
                .from('barracas')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .single();

            if (error) throw error;
            if (!barraca) throw new Error('Barraca não encontrada');

            this.barracaData = barraca;
            console.log('[InfoBarraca] Dados carregados:', barraca);

            // Atualizar UI
            this.updateBarracaInfo();

        } catch (error) {
            console.error('[InfoBarraca] Erro ao carregar barraca:', error);
            alert('Barraca não encontrada.');
            window.location.href = './inicio.html';
        }
    }

    updateBarracaInfo() {
        const barraca = this.barracaData;

        // Nome da barraca
        const titleElement = document.querySelector('h1');
        if (titleElement) titleElement.textContent = barraca.nome_barraca;

        // Foto de destaque
        const mainImage = document.querySelector('section img[alt*="Barraca"]');
        if (mainImage && barraca.foto_destaque) {
            mainImage.src = barraca.foto_destaque;
            mainImage.alt = barraca.nome_barraca;
            mainImage.onerror = () => {
                mainImage.src = `https://placehold.co/400x300/0138b4/FFFFFF?text=${encodeURIComponent(barraca.nome_barraca)}`;
            };
        }

        // Localização
        const locationText = document.getElementById('location-text');
        if (locationText && barraca.localizacao) {
            locationText.textContent = barraca.localizacao;
        }

        // Descrição
        const descriptionContainer = document.querySelector('#tab-content-geral .space-y-4');
        if (descriptionContainer && barraca.descricao_barraca) {
            descriptionContainer.innerHTML = `<p>${barraca.descricao_barraca}</p>`;
        }

        // Categorias/Características
        if (barraca.caracteristicas && Array.isArray(barraca.caracteristicas)) {
            this.updateCategorias(barraca.caracteristicas);
        }

        // Galeria de fotos
        if (barraca.galeria_urls && Array.isArray(barraca.galeria_urls)) {
            this.updateGallery(barraca.galeria_urls);
        }

        // Atualizar links
        const reservarBtn = document.getElementById('reserve-btn');
        if (reservarBtn) {
            reservarBtn.href = `reservar.html?id=${this.idBarraca}`;
        }

        const cardapioLink = document.querySelector('a[href="cardapio.html"]');
        if (cardapioLink) {
            cardapioLink.href = `cardapio.html?id=${this.idBarraca}`;
        }
    }

    updateCategorias(caracteristicas) {
        const container = document.querySelector('#tab-content-geral .flex-wrap');
        if (!container) return;

        const iconMap = {
            'musica': 'music',
            'agitado': 'zap',
            'familia': 'users',
            'pet-friendly': 'dog',
            'esportes': 'volleyball',
            'relax': 'wind'
        };

        container.innerHTML = caracteristicas.map(cat => {
            const icon = iconMap[cat] || 'check';
            const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ');
            return `
                <span class="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1.5 rounded-full">
                    <i data-lucide="${icon}" class="w-4 h-4 mr-1.5"></i>${label}
                </span>
            `;
        }).join('');

        lucide.createIcons();
    }

    updateGallery(urls) {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;

        gallery.innerHTML = urls.map(url => `
            <div class="gallery-item rounded-lg shadow-md cursor-pointer overflow-hidden">
                <img src="${url}" 
                     alt="Foto da barraca" 
                     class="hover:scale-105 transition-transform duration-300"
                     onerror="this.src='https://placehold.co/600x400/0138b4/FFFFFF?text=Foto'">
            </div>
        `).join('');
    }

    async loadPromocoes() {
        try {
            console.log('[InfoBarraca] Carregando promoções...');

            const { data: promocoes, error } = await supabase
                .from('promocoes')
                .select('*')
                .eq('id_barraca', this.idBarraca);

            if (error) throw error;

            this.promocoes = promocoes || [];
            console.log(`[InfoBarraca] ${this.promocoes.length} promoções carregadas`);

            this.renderPromocoes();

        } catch (error) {
            console.error('[InfoBarraca] Erro ao carregar promoções:', error);
        }
    }

    renderPromocoes() {
        const container = document.querySelector('section h2:has-text("Promoções")').closest('section').querySelector('.grid');
        
        if (!container) return;

        if (this.promocoes.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <p>Nenhuma promoção disponível no momento.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.promocoes.map(promo => `
            <div class="bg-blue-800 p-3 rounded-xl shadow-lg">
                <div>
                    <h3 class="font-bold text-lg text-white">${promo.titulo}</h3>
                    <p class="text-blue-100">${promo.descricao}</p>
                </div>
            </div>
        `).join('');
    }

    async loadProdutos() {
        try {
            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .limit(5);

            if (error) throw error;

            this.produtos = produtos || [];
            console.log(`[InfoBarraca] ${this.produtos.length} produtos carregados`);

        } catch (error) {
            console.error('[InfoBarraca] Erro ao carregar produtos:', error);
        }
    }

    // === SISTEMA DE FAVORITOS ===
    
    initFavorites() {
        const favoriteBtn = document.getElementById('favorite-btn');
        const storageKey = 'beachspotFavorites';

        // Verificar se já está favoritado
        const favorites = JSON.parse(localStorage.getItem(storageKey)) || [];
        const isFavorited = favorites.some(fav => fav.barracaId == this.idBarraca);
        
        if (isFavorited) {
            favoriteBtn.classList.add('is-favorited');
        }

        favoriteBtn.addEventListener('click', () => {
            const favorites = JSON.parse(localStorage.getItem(storageKey)) || [];
            const index = favorites.findIndex(fav => fav.barracaId == this.idBarraca);

            if (index > -1) {
                favorites.splice(index, 1);
                favoriteBtn.classList.remove('is-favorited');
                this.showToast('Removido dos favoritos.');
            } else {
                favorites.push({
                    id: `barraca-${this.idBarraca}`,
                    barracaId: this.idBarraca,
                    title: this.barracaData.nome_barraca,
                    description: this.barracaData.descricao_barraca,
                    image: this.barracaData.foto_destaque
                });
                favoriteBtn.classList.add('is-favorited');
                this.showToast('Adicionado aos favoritos!');
            }

            localStorage.setItem(storageKey, JSON.stringify(favorites));
        });
    }

    // === SISTEMA DE ABAS ===
    
    initTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tabTarget;

                tabs.forEach(t => {
                    t.classList.remove('border-blue-600', 'text-blue-600');
                    t.classList.add('border-transparent', 'text-gray-500');
                });
                tab.classList.add('border-blue-600', 'text-blue-600');
                tab.classList.remove('border-transparent', 'text-gray-500');

                tabContents.forEach(content => {
                    content.classList.toggle('hidden', content.id !== `tab-content-${target}`);
                });
            });
        });
    }

    // === MODAL DA GALERIA ===
    
    initGalleryModal() {
        const galleryModal = document.getElementById('gallery-modal');
        const modalImage = document.getElementById('modal-image');
        const modalClose = document.getElementById('modal-close');

        document.addEventListener('click', (e) => {
            if (e.target.closest('#gallery img')) {
                const img = e.target.closest('img');
                modalImage.src = img.src;
                galleryModal.classList.remove('hidden');
            }
        });

        const closeModal = () => galleryModal.classList.add('hidden');
        
        modalClose.addEventListener('click', closeModal);
        galleryModal.addEventListener('click', (e) => {
            if (e.target === galleryModal) closeModal();
        });
    }

    // === SISTEMA DE AVALIAÇÕES ===
    
    initReviewSystem() {
        const ratingStarsContainer = document.getElementById('rating-stars');
        const ratingStars = [...ratingStarsContainer.children];
        const submitReviewBtn = document.getElementById('submit-review-btn');
        const reviewTextarea = document.getElementById('review-textarea');

        const updateStars = (rating) => {
            ratingStars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.remove('text-gray-300');
                    star.classList.add('text-yellow-400', 'fill-current');
                } else {
                    star.classList.remove('text-yellow-400', 'fill-current');
                    star.classList.add('text-gray-300');
                }
            });
        };

        ratingStarsContainer.addEventListener('mouseover', (e) => {
            const starValue = e.target.dataset.value;
            if (starValue) updateStars(starValue);
        });

        ratingStarsContainer.addEventListener('mouseout', () => {
            updateStars(this.currentRating);
        });

        ratingStarsContainer.addEventListener('click', (e) => {
            const starValue = e.target.dataset.value;
            if (starValue) {
                this.currentRating = parseInt(starValue);
                updateStars(this.currentRating);
            }
        });

        submitReviewBtn.addEventListener('click', async () => {
            if (this.currentRating === 0) {
                this.showToast('Por favor, selecione uma nota.');
                return;
            }
            if (reviewTextarea.value.trim() === '') {
                this.showToast('Por favor, escreva um comentário.');
                return;
            }

            // TODO: Salvar avaliação no banco
            this.showToast('Avaliação enviada com sucesso!');
            this.currentRating = 0;
            updateStars(0);
            reviewTextarea.value = '';
        });

        // Filtros de avaliações
        const filterAllBtn = document.getElementById('filter-all');
        const filterMediaBtn = document.getElementById('filter-media');
        const allReviews = document.querySelectorAll('#reviews-list .review-card');

        filterAllBtn?.addEventListener('click', () => {
            allReviews.forEach(review => review.style.display = 'block');
            filterAllBtn.classList.add('bg-blue-500', 'text-white');
            filterMediaBtn.classList.remove('bg-blue-500', 'text-white');
        });

        filterMediaBtn?.addEventListener('click', () => {
            allReviews.forEach(review => {
                review.style.display = review.classList.contains('has-media') ? 'block' : 'none';
            });
            filterMediaBtn.classList.add('bg-blue-500', 'text-white');
            filterAllBtn.classList.remove('bg-blue-500', 'text-white');
        });
    }

    // === MODAL DO MAPA ===
    
    initMapModal() {
        if (!this.barracaData.localizacao) return;

        const locationBtn = document.getElementById('location-btn');
        const mapModal = document.getElementById('map-modal');
        const mapModalClose = document.getElementById('map-modal-close');

        locationBtn.addEventListener('click', () => {
            mapModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            document.getElementById('info-nome').textContent = this.barracaData.nome_barraca;
            document.getElementById('info-endereco').textContent = this.barracaData.localizacao;

            if (!this.map) {
                this.initMap();
            }
        });

        const closeModal = () => {
            mapModal.classList.add('hidden');
            document.body.style.overflow = '';
        };

        mapModalClose.addEventListener('click', closeModal);
        mapModal.addEventListener('click', (e) => {
            if (e.target === mapModal) closeModal();
        });
    }

    initMap() {
        // Coordenadas padrão (Salvador, BA)
        const coords = { lng: -38.5230, lat: -12.9985 };

        const apiKey = 'fQkLRhuKNXOuJ7C7hE32';

        this.map = new maplibregl.Map({
            container: 'map',
            style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
            center: [coords.lng, coords.lat],
            zoom: 15
        });

        this.map.on('load', () => {
            new maplibregl.Marker({ color: "#0138b4", scale: 1.2 })
                .setLngLat([coords.lng, coords.lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25 }).setHTML(`
                        <div class="text-center">
                            <strong>${this.barracaData.nome_barraca}</strong><br>
                            <a href="https://maps.google.com/?q=${coords.lat},${coords.lng}" 
                               target="_blank" 
                               class="map-directions-link">Ver Rotas</a>
                        </div>
                    `)
                )
                .addTo(this.map);
        });
    }

    // === API DO TEMPO ===
    
    async initWeatherAPI() {
        const apiKey = ' ee1c7addcc374cafbd0194317250610';
        const coords = { lat: -12.9985, lng: -38.5230 }; // Salvador, BA
        const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${coords.lat},${coords.lng}&days=3&lang=pt`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha na API do tempo');
            
            const data = await response.json();
            const current = data.current;

            document.getElementById('weather-temp').textContent = `${Math.round(current.temp_c)}°C`;
            document.getElementById('weather-condition').textContent = current.condition.text;
            document.getElementById('weather-icon').src = `https:${current.condition.icon}`;

            const forecastContainer = document.getElementById('forecast-container');
            forecastContainer.innerHTML = data.forecast.forecastday.map(day => {
                const date = new Date(day.date + 'T00:00:00');
                const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
                
                return `
                    <div class="flex flex-col items-center space-y-1">
                        <p class="font-semibold text-sm">${dayName.charAt(0).toUpperCase() + dayName.slice(1)}</p>
                        <img src="https:${day.day.condition.icon}" class="w-8 h-8">
                        <p class="text-sm">
                            <span class="font-bold">${Math.round(day.day.maxtemp_c)}°</span>
                            <span>${Math.round(day.day.mintemp_c)}°</span>
                        </p>
                    </div>
                `;
            }).join('');

            // Expandir/recolher previsão
            const weatherSection = document.getElementById('weather-section');
            const weatherChevron = document.getElementById('weather-chevron');
            
            weatherSection.addEventListener('click', () => {
                forecastContainer.classList.toggle('hidden');
                weatherChevron.classList.toggle('rotate-180');
            });

        } catch (error) {
            console.error('[WeatherAPI] Erro:', error);
            document.getElementById('weather-condition').textContent = 'Erro ao carregar';
        }
    }

    // === UTILITÁRIOS ===
    
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('opacity-0', 'translate-y-3');
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-3');
        }, 3000);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[infoBarraca] DOM carregado');

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
    const manager = new InfoBarracaManager();
    await manager.init();
});