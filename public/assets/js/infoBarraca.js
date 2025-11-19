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
        this.userReview = null;
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
            await this.loadAvaliacoes();

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
        if (mainImage) {
            if (barraca.foto_destaque) {
                mainImage.src = barraca.foto_destaque;
                mainImage.alt = barraca.nome_barraca;
            }
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

        // Características
        if (barraca.caracteristicas && Array.isArray(barraca.caracteristicas) && barraca.caracteristicas.length > 0) {
            this.updateCategorias(barraca.caracteristicas);
        }

        // Galeria de fotos
        if (barraca.galeria_urls && Array.isArray(barraca.galeria_urls) && barraca.galeria_urls.length > 0) {
            this.updateGallery(barraca.galeria_urls);
        }

        // Horário de funcionamento
        const horarioInfo = document.querySelector('#tab-content-geral .border-t');
        if (horarioInfo && barraca.horario_func) {
            const horarioSection = document.createElement('div');
            horarioSection.className = 'mt-6 pt-6 border-t border-gray-200';
            horarioSection.innerHTML = `
                <h3 class="text-xl font-bold text-gray-800 mb-3">Horário de Funcionamento</h3>
                <p class="text-gray-600">${barraca.horario_func}</p>
                ${barraca.dias_funcionamento && barraca.dias_funcionamento.length > 0
                    ? `<p class="text-gray-600 mt-2">Dias: ${barraca.dias_funcionamento.join(', ')}</p>`
                    : ''}
                ${barraca.abre_feriados ? '<p class="text-green-600 mt-2">✓ Abre em feriados</p>' : ''}
            `;
            horarioInfo.parentNode.insertBefore(horarioSection, horarioInfo.nextSibling);
        }

        // Preço médio
        const precoContainer = document.querySelector('.flex.items-center.justify-start.mt-2');
        if (precoContainer && barraca.preco_medio) {
            const precoFormatado = barraca.preco_medio.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            const precoSpan = precoContainer.querySelector('span');
            if (precoSpan) {
                precoSpan.textContent = `Preço médio: R$ ${precoFormatado} por pessoa`;
            }
        } else if (precoContainer) {
            // Se não tiver preço, ocultar a seção
            precoContainer.style.display = 'none';
        }

        // Atualizar links
        const reservarBtn = document.getElementById('reserve-btn');
        if (reservarBtn) {
            reservarBtn.href = `reservar.html?id=${this.idBarraca}`;
        }

        const cardapioLink = document.querySelector('a[href*="cardapio.html"]');
        if (cardapioLink) {
            if (barraca.link_cardapio) {
                cardapioLink.href = barraca.link_cardapio;
                cardapioLink.target = '_blank';
            } else {
                cardapioLink.href = `cardapio.html?id=${this.idBarraca}`;
            }
        }
    }

    updateCategorias(caracteristicas) {
        const container = document.querySelector('#tab-content-geral .flex-wrap');
        if (!container) return;

        const iconMap = {
            'musica': 'music',
            'música ao vivo': 'music',
            'agitado': 'zap',
            'ambiente agitado': 'zap',
            'familia': 'users',
            'bom para grupos': 'users',
            'pet-friendly': 'dog',
            'pet friendly': 'dog',
            'esportes': 'volleyball',
            'relax': 'wind',
            'vista para o mar': 'waves',
            'acessível': 'accessibility'
        };

        container.innerHTML = caracteristicas.map(cat => {
            const catLower = cat.toLowerCase();
            const icon = iconMap[catLower] || 'check';
            const label = cat.charAt(0).toUpperCase() + cat.slice(1);
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
        // Encontrar o container de promoções
        const promoSection = Array.from(document.querySelectorAll('section h2'))
            .find(h2 => h2.textContent.includes('Promoções'));

        if (!promoSection) return;

        const container = promoSection.closest('section').querySelector('.grid');
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
            <div class="bg-blue-800 p-4 rounded-xl shadow-lg">
                <div>
                    <h3 class="font-bold text-lg text-white">${promo.titulo}</h3>
                    <p class="text-blue-100 mt-1">${promo.descricao}</p>
                    ${promo.data_inicio && promo.data_fim
                ? `<p class="text-blue-200 text-sm mt-2">Válido: ${new Date(promo.data_inicio).toLocaleDateString('pt-BR')} até ${new Date(promo.data_fim).toLocaleDateString('pt-BR')}</p>`
                : ''}
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

    async loadAvaliacoes() {
        try {
            console.log('[InfoBarraca] Carregando avaliações...');

            // Primeiro, verificar se a tabela avaliacoes existe
            const { data: avaliacoes, error } = await supabase
                .from('avaliacoes')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .order('data_avaliacao', { ascending: false });

            if (error) {
                // Se a tabela não existe, usar dados mock
                if (error.code === '42P01') {
                    console.warn('[InfoBarraca] Tabela avaliacoes não existe. Usando dados de exemplo.');
                    this.renderAvaliacoes([]);
                    return;
                }
                throw error;
            }

            // Buscar informações dos usuários separadamente
            if (avaliacoes && avaliacoes.length > 0) {
                const userIds = [...new Set(avaliacoes.map(av => av.id_usuario))];

                // Buscar dados dos clientes (tipo_conta = 'cliente')
                const { data: clientes } = await supabase
                    .from('cliente')
                    .select('id_cliente, nome')
                    .in('id_cliente', userIds);

                // Buscar dados dos gestores (tipo_conta = 'gestor') como fallback
                const { data: gestores } = await supabase
                    .from('gestor')
                    .select('id_gestor, nome')
                    .in('id_gestor', userIds);

                // Buscar email da tabela usuarios como último fallback
                const { data: usuarios } = await supabase
                    .from('usuarios')
                    .select('id_usuario, email')
                    .in('id_usuario', userIds);

                // Mapear usuários para as avaliações
                const avaliacoesComUsuarios = avaliacoes.map(av => {
                    // Tentar encontrar o nome em ordem: cliente -> gestor -> email -> fallback
                    let nome = 'Usuário';

                    const cliente = clientes?.find(c => c.id_cliente === av.id_usuario);
                    if (cliente?.nome) {
                        nome = cliente.nome;
                    } else {
                        const gestor = gestores?.find(g => g.id_gestor === av.id_usuario);
                        if (gestor?.nome) {
                            nome = gestor.nome;
                        } else {
                            const usuario = usuarios?.find(u => u.id_usuario === av.id_usuario);
                            if (usuario?.email) {
                                nome = usuario.email.split('@')[0];
                            }
                        }
                    }

                    return {
                        ...av,
                        usuario_nome: nome
                    };
                });

                this.renderAvaliacoes(avaliacoesComUsuarios);
            } else {
                this.renderAvaliacoes([]);
            }

        } catch (error) {
            console.error('[InfoBarraca] Erro ao carregar avaliações:', error);
            // Em caso de erro, renderizar sem avaliações
            this.renderAvaliacoes([]);
        }
    }

    renderAvaliacoes(avaliacoes) {
        const reviewsList = document.getElementById('reviews-list');
        if (!reviewsList) return;

        const reviewSummaryText = document.getElementById('review-summary-text');
        const reviewSummaryStars = document.querySelector('#review-summary .flex');

        if (avaliacoes.length === 0) {
            reviewsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>Ainda não há avaliações para esta barraca.</p>
                    <p class="text-sm mt-2">Seja o primeiro a avaliar!</p>
                </div>
            `;
            if (reviewSummaryText) reviewSummaryText.textContent = '(0 avaliações)';
            return;
        }

        // Calcular média
        const totalRating = avaliacoes.reduce((sum, av) => sum + av.nota, 0);
        const avgRating = totalRating / avaliacoes.length;

        // Atualizar resumo
        if (reviewSummaryText) {
            reviewSummaryText.textContent = `${avgRating.toFixed(1)} (${avaliacoes.length} ${avaliacoes.length === 1 ? 'avaliação' : 'avaliações'})`;
        }

        // Atualizar estrelas do resumo
        if (reviewSummaryStars) {
            const stars = [...reviewSummaryStars.children];
            const roundedAvg = Math.round(avgRating);
            stars.forEach((star, index) => {
                if (index < roundedAvg) {
                    star.classList.add('fill-current');
                } else {
                    star.classList.remove('fill-current');
                }
            });
        }

        // Renderizar lista
        reviewsList.innerHTML = avaliacoes.map(av => {
            const userName = av.usuario_nome || 'Usuário';
            const userInitial = userName.charAt(0).toUpperCase();
            const starsHTML = Array.from({ length: 5 }, (_, i) =>
                `<i data-lucide="star" class="w-4 h-4 ${i < av.nota ? 'fill-current' : ''}"></i>`
            ).join('');

            const dataFormatada = av.data_avaliacao
                ? new Date(av.data_avaliacao).toLocaleDateString('pt-BR')
                : '';

            return `
                <div class="review-card p-4 border rounded-lg bg-gray-50" data-rating="${av.nota}">
                    <div class="flex items-center mb-2">
                        <img src="https://placehold.co/40x40/0138b4/FFFFFF?text=${userInitial}" 
                             class="w-10 h-10 rounded-full mr-3" 
                             alt="Foto de ${userName}">
                        <div>
                            <p class="font-bold">${userName}</p>
                            <div class="flex text-yellow-500">${starsHTML}</div>
                        </div>
                    </div>
                    <p class="text-gray-600">${av.comentario}</p>
                    ${dataFormatada ? `<p class="text-xs text-gray-400 mt-2">${dataFormatada}</p>` : ''}
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }

    // === SISTEMA DE FAVORITOS ===

    initFavorites() {
        const favoriteBtn = document.getElementById('favorite-btn');
        if (!favoriteBtn) return;

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

        if (!galleryModal || !modalImage || !modalClose) return;

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
        const ratingStars = ratingStarsContainer ? [...ratingStarsContainer.children] : [];
        const submitReviewBtn = document.getElementById('submit-review-btn');
        const reviewTextarea = document.getElementById('review-textarea');

        if (!ratingStarsContainer || !submitReviewBtn || !reviewTextarea) return;

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

            try {
                // Verificar se usuário está logado
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError || !user) {
                    this.showToast('Você precisa estar logado para avaliar.');
                    setTimeout(() => window.location.href = 'login.html', 1500);
                    return;
                }

                // Salvar avaliação
                const { error: insertError } = await supabase
                    .from('avaliacoes')
                    .insert({
                        id_barraca: this.idBarraca,
                        id_usuario: user.id,
                        nota: this.currentRating,
                        comentario: reviewTextarea.value.trim()
                    });

                if (insertError) throw insertError;

                this.showToast('Avaliação enviada com sucesso!');
                this.currentRating = 0;
                updateStars(0);
                reviewTextarea.value = '';

                // Recarregar avaliações
                await this.loadAvaliacoes();

            } catch (error) {
                console.error('[ReviewSystem] Erro:', error);
                this.showToast('Erro ao enviar avaliação.');
            }
        });

        // Filtros de avaliações
        const filterAllBtn = document.getElementById('filter-all');
        const filterMediaBtn = document.getElementById('filter-media');
        const allReviews = document.querySelectorAll('#reviews-list .review-card');

        filterAllBtn?.addEventListener('click', () => {
            allReviews.forEach(review => review.style.display = 'block');
            filterAllBtn.classList.add('bg-blue-500', 'text-white');
            filterMediaBtn?.classList.remove('bg-blue-500', 'text-white');
        });

        filterMediaBtn?.addEventListener('click', () => {
            allReviews.forEach(review => {
                review.style.display = review.classList.contains('has-media') ? 'block' : 'none';
            });
            filterMediaBtn.classList.add('bg-blue-500', 'text-white');
            filterAllBtn?.classList.remove('bg-blue-500', 'text-white');
        });
    }

    // === MODAL DO MAPA ===

    initMapModal() {
        if (!this.barracaData.localizacao) return;

        const locationBtn = document.getElementById('location-btn');
        const mapModal = document.getElementById('map-modal');
        const mapModalClose = document.getElementById('map-modal-close');

        if (!locationBtn || !mapModal || !mapModalClose) return;

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
        const apiKey = 'ee1c7addcc374cafbd0194317250610';
        const coords = { lat: -12.9985, lng: -38.5230 };
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
        if (!toast) return;

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