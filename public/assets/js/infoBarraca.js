
import { supabase } from './supabaseClient.js';
import { favoritesManager } from './favoritesManager.js';
import { LocationManager } from './locationManager.js';
import { WeatherManager } from './weatherManager.js';

console.log('[infoBarraca] Script carregado');

class InfoBarracaManager {
    constructor() {
        this.idBarraca = null;
        this.barracaData = null;
        this.promocoes = [];
        this.produtos = [];
        this.locationManager = null;
        this.weatherManager = null;
        this.currentRating = 0;
        this.userReview = null;
        this.gestorEmail = null;
    }

    async init() {
        try {
            console.log('[InfoBarraca] Inicializando...');

            const urlParams = new URLSearchParams(window.location.search);
            this.idBarraca = urlParams.get('id');

            if (!this.idBarraca) {
                alert('Barraca não encontrada. Redirecionando...');
                window.location.href = './inicio.html';
                return;
            }

            console.log('[InfoBarraca] ID da barraca:', this.idBarraca);

            // Carregar foto do perfil do usuário no header
            await this.loadUserProfilePhoto();

            await this.loadBarracaData();
            await this.loadPromocoes();
            await this.loadProdutos();
            await this.loadAvaliacoes();

            this.initFavorites();
            this.initTabs();
            this.initGalleryModal();
            this.initReviewSystem();
            this.initLocationManager();
            this.initWeatherManager();
            this.initContatoModal();

        } catch (error) {
            console.error('[InfoBarraca] Erro na inicialização:', error);
            alert('Erro ao carregar informações da barraca.');
        }
    }

    async loadUserProfilePhoto() {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.log('[InfoBarraca] Usuário não autenticado');
                return;
            }

            const userId = session.user.id;

            const { data: cliente, error: clienteError } = await supabase
                .from('cliente')
                .select('nome, foto_perfil, avatar_url')
                .eq('id_cliente', userId)
                .maybeSingle();

            const headerAvatar = document.getElementById('header-avatar');
            if (!headerAvatar) return;

            let fotoUrl = null;

            if (cliente?.foto_perfil) {
                if (cliente.foto_perfil.startsWith('http')) {
                    fotoUrl = cliente.foto_perfil;
                } else {
                    const { data } = supabase
                        .storage
                        .from('media')
                        .getPublicUrl(cliente.foto_perfil);

                    fotoUrl = data?.publicUrl;
                }
            }

            if (!fotoUrl) {
                const nome = cliente?.nome || session.user.email?.split('@')[0] || 'C';
                const iniciais = nome
                    .split(' ')
                    .filter(word => word.length > 0)
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                fotoUrl = `https://placehold.co/40x40/0138b4/FFFFFF?text=${iniciais}`;
            }

            headerAvatar.src = fotoUrl;
            console.log('[InfoBarraca] ✅ Foto do perfil carregada no header');

        } catch (error) {
            console.error('[InfoBarraca] Erro ao carregar foto do perfil:', error);
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

            await this.updateBarracaInfo();

        } catch (error) {
            console.error('[InfoBarraca] Erro ao carregar barraca:', error);
            alert('Barraca não encontrada.');
            window.location.href = './inicio.html';
        }
    }

    async updateBarracaInfo() {
        const barraca = this.barracaData;

        const titleElement = document.querySelector('h1');
        if (titleElement) titleElement.textContent = barraca.nome_barraca;

        // Foto destaque com tamanho fixo
        const mainImage = document.querySelector('section img[alt*="Barraca"]');
        if (mainImage) {
            if (barraca.foto_destaque) {
                mainImage.src = barraca.foto_destaque;
                mainImage.alt = barraca.nome_barraca;
            }
            mainImage.onerror = () => {
                mainImage.src = `https://placehold.co/400x300/0138b4/FFFFFF?text=${encodeURIComponent(barraca.nome_barraca)}`;
            };

            // Aplicar estilos para tamanho fixo e object-fit
            mainImage.style.width = '100%';
            mainImage.style.height = '300px';
            mainImage.style.objectFit = 'cover';
        }

        const locationText = document.getElementById('location-text');
        if (locationText && barraca.localizacao) {
            locationText.textContent = barraca.localizacao;
        }

        const descriptionContainer = document.querySelector('#tab-content-geral .space-y-4');
        if (descriptionContainer && barraca.descricao_barraca) {
            descriptionContainer.innerHTML = `<p>${barraca.descricao_barraca}</p>`;
        }

        if (barraca.caracteristicas && Array.isArray(barraca.caracteristicas) && barraca.caracteristicas.length > 0) {
            this.updateCategorias(barraca.caracteristicas);
        }

        if (barraca.galeria_urls && Array.isArray(barraca.galeria_urls) && barraca.galeria_urls.length > 0) {
            this.updateGallery(barraca.galeria_urls);
        }

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
            precoContainer.style.display = 'none';
        }

        if (barraca.capacidade_mesas) {
            await this.calcularOcupacao(barraca.capacidade_mesas);
        }

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

        // Carregar email do gestor para contato
        if (barraca.id_gestor) {
            this.loadGestorEmail(barraca.id_gestor);
        }
    }

    async loadGestorEmail(gestorId) {
        try {
            const { data: usuario, error } = await supabase
                .from('usuarios')
                .select('email')
                .eq('id_usuario', gestorId)
                .single();

            if (error || !usuario) {
                console.warn('[InfoBarraca] Email do gestor não encontrado');
                return;
            }

            this.gestorEmail = usuario.email;
            console.log('[InfoBarraca] Email do gestor carregado');

        } catch (error) {
            console.error('[InfoBarraca] Erro ao carregar email do gestor:', error);
        }
    }

    async calcularOcupacao(capacidadeMesas) {
        try {
            const hoje = new Date().toISOString().split('T')[0];

            const { data: reservas, error } = await supabase
                .from('reservas')
                .select('num_pessoas')
                .eq('id_barraca', this.idBarraca)
                .eq('data_reserva', hoje)
                .eq('status', 'confirmada');

            if (error) {
                console.error('[InfoBarraca] Erro ao buscar reservas:', error);
                return;
            }

            const pessoasReservadas = reservas?.reduce((sum, r) => sum + (r.num_pessoas || 0), 0) || 0;
            const mesasOcupadas = Math.ceil(pessoasReservadas / 4);
            const percentual = Math.round((mesasOcupadas / capacidadeMesas) * 100);

            let status = 'Disponível';
            let colorClass = 'text-green-600';
            if (percentual >= 90) {
                status = 'Lotado';
                colorClass = 'text-red-600';
            } else if (percentual >= 70) {
                status = 'Quase Lotado';
                colorClass = 'text-yellow-600';
            }

            const dataHoje = new Date();
            const dataFormatada = dataHoje.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });

            const ocupacaoHTML = `
                <div class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="flex items-center justify-between mb-1">
                        <div>
                            <p class="text-sm text-gray-600">Ocupação de Hoje</p>
                            <p class="text-xs text-gray-400">${dataFormatada}</p>
                            <p class="text-lg font-bold ${colorClass} mt-1">${status}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-bold">${percentual}%</p>
                            <p class="text-sm text-gray-500">${mesasOcupadas}/${capacidadeMesas} mesas</p>
                        </div>
                    </div>
                    <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full transition-all" style="width: ${percentual}%"></div>
                    </div>
                </div>
            `;

            const targetSection = document.querySelector('#tab-content-geral .space-y-4');
            if (targetSection) {
                targetSection.insertAdjacentHTML('beforeend', ocupacaoHTML);
            }

        } catch (error) {
            console.error('[InfoBarraca] Erro ao calcular ocupação:', error);
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

        gallery.innerHTML = urls.map((url, index) => `
            <div class="gallery-item rounded-lg shadow-md cursor-pointer overflow-hidden bg-gray-100">
                <img src="${url}" 
                     alt="Foto ${index + 1} da barraca" 
                     class="hover:scale-105 transition-transform duration-300 w-full h-full object-cover"
                     onerror="this.onerror=null; this.src='https://placehold.co/600x400/0138b4/FFFFFF?text=Foto+${index + 1}'; this.classList.add('opacity-75');">
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

            const { data: avaliacoes, error } = await supabase
                .from('avaliacoes')
                .select('*')
                .eq('id_barraca', this.idBarraca);

            if (error) {
                console.error('[InfoBarraca] Erro ao carregar avaliações:', error);
                this.renderAvaliacoes([]);
                return;
            }

            if (avaliacoes && avaliacoes.length > 0) {
                console.log('[InfoBarraca] Avaliações encontradas:', avaliacoes.length);
                this.renderAvaliacoes(avaliacoes);
            } else {
                console.log('[InfoBarraca] Nenhuma avaliação encontrada');
                this.renderAvaliacoes([]);
            }

        } catch (error) {
            console.error('[InfoBarraca] Erro ao carregar avaliações:', error);
            this.renderAvaliacoes([]);
        }
    }
    renderAvaliacoes(avaliacoes) {
        const reviewSummaryText = document.getElementById('review-summary-text');
        const reviewSummaryStars = document.querySelector('#review-summary .flex');

        if (avaliacoes.length === 0) {
            if (reviewSummaryText) reviewSummaryText.textContent = '(0 avaliações)';
            if (reviewSummaryStars) {
                const stars = [...reviewSummaryStars.children];
                stars.forEach(star => star.classList.remove('fill-current'));
            }
            return;
        }

        const totalRating = avaliacoes.reduce((sum, av) => sum + av.nota, 0);
        const avgRating = totalRating / avaliacoes.length;

        if (reviewSummaryText) {
            reviewSummaryText.textContent = `${avgRating.toFixed(1)} (${avaliacoes.length} ${avaliacoes.length === 1 ? 'avaliação' : 'avaliações'})`;
        }

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

        // Distribuição de estrelas
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        avaliacoes.forEach(av => {
            if (distribution[av.nota] !== undefined) {
                distribution[av.nota]++;
            }
        });

        const reviewsList = document.getElementById('reviews-list');
        if (!reviewsList) return;

        reviewsList.innerHTML = `
        <div class="space-y-4">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
                <div class="text-center mb-6">
                    <div class="text-5xl font-bold text-blue-600 mb-2">${avgRating.toFixed(1)}</div>
                    <div class="flex justify-center gap-1 mb-2">
                        ${[1, 2, 3, 4, 5].map(i => `
                            <i data-lucide="star" class="w-6 h-6 text-yellow-500 ${i <= Math.round(avgRating) ? 'fill-current' : ''}"></i>
                        `).join('')}
                    </div>
                    <p class="text-gray-600 font-semibold">${avaliacoes.length} ${avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}</p>
                </div>

                <div class="space-y-2">
                    ${[5, 4, 3, 2, 1].map(stars => {
            const count = distribution[stars];
            const percentage = avaliacoes.length > 0 ? (count / avaliacoes.length) * 100 : 0;
            return `
                            <div class="flex items-center gap-3">
                                <span class="text-sm font-semibold text-gray-700 w-12">${stars} ${stars === 1 ? 'estrela' : 'estrelas'}</span>
                                <div class="flex-1 bg-gray-200 rounded-full h-2.5">
                                    <div class="bg-yellow-500 h-2.5 rounded-full transition-all" style="width: ${percentage}%"></div>
                                </div>
                                <span class="text-sm font-semibold text-gray-600 w-8">${count}</span>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p class="text-sm text-gray-700 text-center">
                    <i data-lucide="info" class="w-4 h-4 inline-block mr-1"></i>
                    As avaliações ajudam outros clientes a conhecerem melhor esta barraca
                </p>
            </div>
        </div>
    `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    initFavorites() {
        const favoriteBtn = document.getElementById('favorite-btn');
        if (!favoriteBtn) return;

        const wrapper = document.createElement('div');
        wrapper.dataset.barracaId = this.idBarraca;
        wrapper.style.display = 'inline-block';

        favoriteBtn.parentNode.insertBefore(wrapper, favoriteBtn);
        wrapper.appendChild(favoriteBtn);

        favoriteBtn.classList.add('btn-favorite');

        const isFavorited = favoritesManager.isFavorited(this.idBarraca);
        if (isFavorited) {
            favoriteBtn.classList.add('is-favorited');
        }

        favoritesManager.initFavoriteButtons('', (barracaId, isFavorited) => {
            if (isFavorited) {
                favoriteBtn.classList.add('is-favorited');
            } else {
                favoriteBtn.classList.remove('is-favorited');
            }
        });
    }

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

    initReviewSystem() {
        const ratingStarsContainer = document.getElementById('rating-stars');
        const submitReviewBtn = document.getElementById('submit-review-btn');

        if (!ratingStarsContainer || !submitReviewBtn) return;

        const updateStars = (rating) => {
            const stars = ratingStarsContainer.querySelectorAll('[data-lucide="star"]');
            stars.forEach((star, index) => {
                const starValue = parseInt(star.dataset.value);
                if (starValue <= rating) {
                    star.classList.remove('text-gray-300');
                    star.classList.add('text-yellow-400');
                    star.setAttribute('fill', 'currentColor');
                } else {
                    star.classList.remove('text-yellow-400');
                    star.classList.add('text-gray-300');
                    star.setAttribute('fill', 'none');
                }
            });
        };

        ratingStarsContainer.addEventListener('mouseover', (e) => {
            if (e.target.hasAttribute('data-value')) {
                const starValue = parseInt(e.target.dataset.value);
                updateStars(starValue);
            }
        });

        ratingStarsContainer.addEventListener('mouseout', () => {
            updateStars(this.currentRating);
        });

        ratingStarsContainer.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-value')) {
                this.currentRating = parseInt(e.target.dataset.value);
                updateStars(this.currentRating);
                console.log('[ReviewSystem] Nota selecionada:', this.currentRating);
            }
        });

        submitReviewBtn.addEventListener('click', async () => {
            if (this.currentRating === 0) {
                favoritesManager.showToast('Por favor, selecione uma nota.');
                return;
            }

            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError || !user) {
                    favoritesManager.showToast('Você precisa estar logado para avaliar.');
                    setTimeout(() => window.location.href = '../entrar.html', 1500);
                    return;
                }

                const { data: avaliacaoExistente } = await supabase
                    .from('avaliacoes')
                    .select('id_avaliacao')
                    .eq('id_barraca', this.idBarraca)
                    .eq('id_usuario', user.id)
                    .single();

                if (avaliacaoExistente) {
                    favoritesManager.showToast('Você já avaliou esta barraca.');
                    return;
                }

                const { data: novaAvaliacao, error: insertError } = await supabase
                    .from('avaliacoes')
                    .insert({
                        id_barraca: parseInt(this.idBarraca),
                        id_usuario: user.id,
                        nota: this.currentRating
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                favoritesManager.showToast('Avaliação enviada com sucesso!');

                this.currentRating = 0;
                updateStars(0);

                await this.loadAvaliacoes();

            } catch (error) {
                console.error('[ReviewSystem] Erro:', error);
                favoritesManager.showToast('Erro ao enviar avaliação: ' + error.message);
            }
        });
    }

    initLocationManager() {
        this.locationManager = new LocationManager(this.barracaData);
        this.locationManager.init();
    }

    async initWeatherManager() {
        this.weatherManager = new WeatherManager(this.barracaData);
        await this.weatherManager.init();
    }
    // Substituir a função initContatoModal() no infoBarraca.js
    // Substituir a função initContatoModal() no infoBarraca.js

    initContatoModal() {
        const btnContato = document.getElementById('btn-contato-gestor');
        const contatoModal = document.getElementById('contato-modal');
        const contatoModalClose = document.getElementById('contato-modal-close');

        if (!btnContato || !contatoModal) return;

        // Abrir modal
        btnContato.addEventListener('click', () => {
            if (!this.gestorEmail) {
                alert('Não foi possível carregar as informações de contato do gestor.');
                return;
            }

            // Preencher o modal com informações simples
            const modalContent = contatoModal.querySelector('.p-6');
            modalContent.innerHTML = `
            <div class="text-center space-y-6">
                <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <i data-lucide="mail" class="w-10 h-10 text-blue-600"></i>
                </div>
                
                <div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">Entre em Contato</h3>
                    <p class="text-gray-600">Para falar com o gestor de <strong>${this.barracaData.nome_barraca}</strong>, envie um email para:</p>
                </div>

                <div class="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <p class="text-xl font-semibold text-blue-600 break-all">${this.gestorEmail}</p>
                </div>

                <button id="copy-email-btn"
                        class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2">
                    <i data-lucide="copy" class="w-5 h-5"></i>
                    <span>Copiar Email</span>
                </button>
            </div>
        `;

            contatoModal.classList.remove('hidden');

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Adicionar funcionalidade de copiar
            const copyBtn = document.getElementById('copy-email-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(this.gestorEmail).then(() => {
                        copyBtn.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i><span>Email Copiado!</span>';
                        copyBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                        copyBtn.classList.add('bg-green-500', 'hover:bg-green-600');

                        lucide.createIcons();

                        setTimeout(() => {
                            copyBtn.innerHTML = '<i data-lucide="copy" class="w-5 h-5"></i><span>Copiar Email</span>';
                            copyBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                            copyBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                            lucide.createIcons();
                        }, 2000);
                    }).catch(err => {
                        console.error('Erro ao copiar:', err);
                        alert('Não foi possível copiar o email.');
                    });
                });
            }
        });

        // Fechar modal
        const closeModal = () => {
            contatoModal.classList.add('hidden');
        };

        if (contatoModalClose) {
            contatoModalClose.addEventListener('click', closeModal);
        }

        contatoModal.addEventListener('click', (e) => {
            if (e.target === contatoModal) closeModal();
        });
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[infoBarraca] DOM carregado');

    lucide.createIcons();

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

    const manager = new InfoBarracaManager();
    await manager.init();
});

export default InfoBarracaManager;