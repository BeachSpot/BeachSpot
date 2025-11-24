import { supabase } from './supabaseClient.js';
import { favoritesManager } from './favoritesManager.js';

console.log('[inicio] Script carregado');

// Variáveis globais dos Swipers
let barracasSwiper = null;
let maisBarracasSwiper = null;

/**
 * Classe para gerenciar a página inicial do cliente
 */
class InicioClienteManager {
    constructor() {
        this.barracas = [];
        this.todasBarracas = [];
        this.searching = false;
        this.categoriaAtiva = 'todas';
        this.filtrandoCategoria = false;
    }

    async init() {
        try {
            console.log('[InicioCliente] Inicializando...');

            // Carregar foto do perfil do usuário no header
            await this.loadUserProfilePhoto();

            // Carregar barracas do banco
            await this.loadBarracas();

            // Carregar promoções
            await this.loadPromocoes();

            // Inicializar Swipers após carregar as barracas
            this.initSwipers();

            // Inicializar funcionalidades
            this.initFavorites();
            this.initSearch();
            this.initCategorias();
            this.initVerMais();

        } catch (error) {
            console.error('[InicioCliente] Erro na inicialização:', error);
        }
    }

    async loadUserProfilePhoto() {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.log('[InicioCliente] Usuário não autenticado');
                return;
            }

            const userId = session.user.id;

            const { data: cliente, error: clienteError } = await supabase
                .from('cliente')
                .select('nome, foto_perfil, avatar_url')
                .eq('id_cliente', userId)
                .maybeSingle();

            const headerAvatar = document.querySelector('header a[href="perfilCliente.html"] img');
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
            console.log('[InicioCliente] ✅ Foto do perfil carregada no header');

        } catch (error) {
            console.error('[InicioCliente] Erro ao carregar foto do perfil:', error);
        }
    }

    async loadPromocoes() {
        try {
            console.log('[InicioCliente] Carregando promoções...');

            const { data: promocoes, error } = await supabase
                .from('promocoes')
                .select(`
                    *,
                    barracas:id_barraca (
                        id_barraca,
                        nome_barraca,
                        foto_destaque,
                        galeria_urls
                    )
                `)
                .order('data_criacao', { ascending: false })
                .limit(6);

            if (error) throw error;

            if (promocoes && promocoes.length > 0) {
                this.renderPromocoes(promocoes);
            }

        } catch (error) {
            console.error('[InicioCliente] Erro ao carregar promoções:', error);
        }
    }

    renderPromocoes(promocoes) {
        const promoSection = Array.from(document.querySelectorAll('section h2'))
            .find(h2 => h2.textContent.includes('Promoções'));

        if (!promoSection) return;

        const container = promoSection.closest('section').querySelector('.grid');
        if (!container) return;

        const cards = container.querySelectorAll('.relative.rounded-xl');
        
        promocoes.slice(0, Math.min(4, cards.length)).forEach((promo, index) => {
            const card = cards[index];
            if (!card) return;

            const barraca = promo.barracas;
            if (!barraca) return;

            const imagens = [];
            if (barraca.foto_destaque) imagens.push(barraca.foto_destaque);
            if (barraca.galeria_urls && Array.isArray(barraca.galeria_urls)) {
                imagens.push(...barraca.galeria_urls);
            }

            if (imagens.length > 0) {
                card.style.backgroundImage = '';
                
                const slideshowHTML = `
                    <div class="promo-slideshow">
                        ${imagens.map((img, idx) => `
                            <div class="promo-slide ${idx === 0 ? 'active' : ''}" 
                                 style="background-image: url('${img}')"></div>
                        `).join('')}
                    </div>
                `;
                
                card.insertAdjacentHTML('afterbegin', slideshowHTML);

                if (imagens.length > 1) {
                    this.initSlideshow(card, imagens.length);
                }
            }

            const contentDiv = card.querySelector('.relative.z-10');
            if (contentDiv) {
                contentDiv.innerHTML = `
                    <h3 class="text-2xl font-bold">${promo.titulo}</h3>
                    <p class="mb-4">${promo.descricao}</p>
                    <button class="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-full transition"
                            onclick="window.location.href='infoBarraca.html?id=${barraca.id_barraca}'">
                        ${index === 0 ? 'Aproveitar' : index === 1 ? 'Ver Cardápio' : index === 2 ? 'Reservar' : 'Aproveitar'}
                    </button>
                `;
            }
        });
    }

    initSlideshow(card, totalImages) {
        let currentIndex = 0;
        const slides = card.querySelectorAll('.promo-slide');

        setInterval(() => {
            slides[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % totalImages;
            slides[currentIndex].classList.add('active');
        }, 5000);
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
            this.todasBarracas = [...this.barracas];
            console.log(`[InicioCliente] ${this.barracas.length} barracas carregadas`);

            this.renderBarracasPopulares();
            this.renderMaisBarracas();

        } catch (error) {
            console.error('[InicioCliente] Erro ao carregar barracas:', error);
        }
    }

    renderBarracasPopulares() {
        const container = document.querySelector('.barracas-swiper .swiper-wrapper');
        if (!container) return;

        container.innerHTML = '';

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

        barracasPopulares.forEach(barraca => {
            const slide = this.createBarracaSlide(barraca);
            container.insertAdjacentHTML('beforeend', slide);
        });

        lucide.createIcons();
    }

    renderMaisBarracas() {
        const container = document.querySelector('.mais-barracas-swiper .swiper-wrapper');
        if (!container) return;

        container.innerHTML = '';

        const maisBarracas = this.barracas.slice(5, 10);

        if (maisBarracas.length === 0 && this.barracas.length > 0) {
            maisBarracas.push(...this.barracas.slice(0, Math.min(5, this.barracas.length)));
        }

        maisBarracas.forEach(barraca => {
            const slide = this.createBarracaSlide(barraca);
            container.insertAdjacentHTML('beforeend', slide);
        });

        lucide.createIcons();
    }

    createBarracaSlide(barraca) {
        const foto = barraca.foto_destaque || 'https://placehold.co/600x400/0138b4/FFFFFF?text=' + encodeURIComponent(barraca.nome_barraca);
        const descricao = barraca.descricao_barraca || 'Sem descrição disponível.';
        
        let precoFormatado = 'R$ --';
        if (barraca.preco_medio && typeof barraca.preco_medio === 'number') {
            precoFormatado = `R$ ${barraca.preco_medio.toFixed(2).replace('.', ',')}`;
        }
        
        const descricaoCurta = descricao.length > 50 
            ? descricao.substring(0, 50) + '...' 
            : descricao;

        const isFavorited = favoritesManager.isFavorited(barraca.id_barraca);
        const favClass = isFavorited ? 'favorited' : '';

        return `
            <div class="swiper-slide barraca-card" data-id="barraca-${barraca.id_barraca}" data-barraca-id="${barraca.id_barraca}">
                <div class="relative bg-white text-gray-800 rounded-xl overflow-hidden group w-full h-full">
                    <button class="btn-favorite ${favClass} absolute top-3 right-3 bg-black/30 p-2 rounded-full text-white hover:text-red-500 transition-colors z-10" title="Favoritar">
                        <i data-lucide="heart" class="w-5 h-5 ${isFavorited ? 'fill-current' : ''}"></i>
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
                            <p class="text-lg font-semibold">${precoFormatado}</p>
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

        barracasSwiper = new Swiper(".barracas-swiper", {
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
                nextEl: ".barracas-swiper-container .swiper-button-next",
                prevEl: ".barracas-swiper-container .swiper-button-prev",
            },
        });

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

    initFavorites() {
        favoritesManager.initFavoriteButtons('', () => {
            if (barracasSwiper) barracasSwiper.update();
            if (maisBarracasSwiper) maisBarracasSwiper.update();
        });
    }

    initSearch() {
        const searchInput = document.getElementById('search-input');
        const searchForm = document.querySelector('form.relative');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                
                if (searchTerm.length > 0) {
                    this.showSearchMode();
                    this.searchBarracas(searchTerm);
                } else {
                    this.hideSearchMode();
                }
            });
        }

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (searchInput && searchInput.value.trim().length > 0) {
                    this.showSearchMode();
                    this.searchBarracas(searchInput.value.trim());
                }
            });
        }
    }

    showSearchMode() {
        if (this.searching) return;
        this.searching = true;

        // Ocultar todas as seções exceto o hero
        const sections = document.querySelectorAll('main > div.space-y-16 > section');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Criar seção de resultados se não existir
        let resultsSection = document.getElementById('search-results-section');
        if (!resultsSection) {
            resultsSection = document.createElement('section');
            resultsSection.id = 'search-results-section';
            resultsSection.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-3xl font-bold mb-2">Resultados da Pesquisa</h2>
                    <button id="clear-search-btn" class="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-2">
                        <i data-lucide="x-circle" class="w-5 h-5"></i>
                        <span>Limpar pesquisa</span>
                    </button>
                </div>
                <div id="search-results-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            `;
            document.querySelector('main > div.space-y-16').appendChild(resultsSection);
            lucide.createIcons();

            document.getElementById('clear-search-btn').addEventListener('click', () => {
                document.getElementById('search-input').value = '';
                this.hideSearchMode();
            });
        }

        resultsSection.style.display = 'block';
    }

    hideSearchMode() {
        this.searching = false;

        // Se está filtrando por categoria, mostrar apenas categorias e resultados
        if (this.filtrandoCategoria) {
            this.showCategoriaMode();
        } else {
            // Mostrar todas as seções normalmente
            const sections = document.querySelectorAll('main > div.space-y-16 > section');
            sections.forEach(section => {
                if (section.id !== 'search-results-section' && section.id !== 'categoria-results-section') {
                    section.style.display = 'block';
                }
            });
            
            // Esconder seção de resultados de categoria
            const categoriaResultsSection = document.getElementById('categoria-results-section');
            if (categoriaResultsSection) {
                categoriaResultsSection.style.display = 'none';
            }
        }

        const resultsSection = document.getElementById('search-results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    searchBarracas(searchTerm) {
        const filter = searchTerm.toLowerCase();

        const barracasFiltradas = this.todasBarracas.filter(barraca => {
            const nomeMatch = barraca.nome_barraca.toLowerCase().includes(filter);
            const descMatch = barraca.descricao_barraca?.toLowerCase().includes(filter);
            const locMatch = barraca.localizacao?.toLowerCase().includes(filter);
            const caracMatch = barraca.caracteristicas?.some(c => c.toLowerCase().includes(filter));

            return nomeMatch || descMatch || locMatch || caracMatch;
        });

        this.renderSearchResults(barracasFiltradas, searchTerm);
    }

    renderSearchResults(barracas, searchTerm) {
        const resultsGrid = document.getElementById('search-results-grid');
        if (!resultsGrid) return;

        if (barracas.length === 0) {
            resultsGrid.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i data-lucide="search-x" class="w-20 h-20 mx-auto mb-4 text-gray-400"></i>
                    <p class="text-xl text-gray-300 mb-2">Nenhuma barraca encontrada</p>
                    <p class="text-gray-400">Tente buscar por outro termo</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        resultsGrid.innerHTML = barracas.map(barraca => this.createBarracaGridCard(barraca)).join('');

        lucide.createIcons();
        this.initFavorites();
    }

    renderCategoriaResults(barracas) {
        const resultsGrid = document.getElementById('categoria-results-grid');
        if (!resultsGrid) return;

        if (barracas.length === 0) {
            resultsGrid.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i data-lucide="package-x" class="w-20 h-20 mx-auto mb-4 text-gray-400"></i>
                    <p class="text-xl text-gray-300 mb-2">Nenhuma barraca encontrada nesta categoria</p>
                    <p class="text-gray-400">Tente outra categoria</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        resultsGrid.innerHTML = barracas.map(barraca => this.createBarracaGridCard(barraca)).join('');

        lucide.createIcons();
        this.initFavorites();
    }

    createBarracaGridCard(barraca) {
        const foto = barraca.foto_destaque || 'https://placehold.co/600x400/0138b4/FFFFFF?text=' + encodeURIComponent(barraca.nome_barraca);
        const descricao = barraca.descricao_barraca || 'Sem descrição disponível.';
        
        let precoFormatado = 'R$ --';
        if (barraca.preco_medio && typeof barraca.preco_medio === 'number') {
            precoFormatado = `R$ ${barraca.preco_medio.toFixed(2).replace('.', ',')}`;
        }

        const isFavorited = favoritesManager.isFavorited(barraca.id_barraca);

        return `
            <div class="barraca-card bg-white text-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow" data-barraca-id="${barraca.id_barraca}">
                <div class="relative">
                    <button class="btn-favorite ${isFavorited ? 'favorited' : ''} absolute top-3 right-3 bg-black/30 p-2 rounded-full text-white hover:text-red-500 transition-colors z-10">
                        <i data-lucide="heart" class="w-5 h-5 ${isFavorited ? 'fill-current' : ''}"></i>
                    </button>
                    <img src="${foto}" 
                         alt="${barraca.nome_barraca}" 
                         class="w-full h-48 object-cover"
                         onerror="this.src='https://placehold.co/600x400/0138b4/FFFFFF?text=${encodeURIComponent(barraca.nome_barraca)}'">
                </div>
                <div class="p-4">
                    <h3 class="text-xl font-bold mb-2">${barraca.nome_barraca}</h3>
                    <p class="text-sm text-gray-600 mb-3 line-clamp-2">${descricao}</p>
                    <div class="flex items-center justify-between">
                        <p class="text-lg font-semibold text-blue-600">${precoFormatado}</p>
                        <a href="infoBarraca.html?id=${barraca.id_barraca}" 
                           class="bg-[#1985d4] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition">
                            Ver Detalhes
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    initCategorias() {
        const categorias = document.querySelectorAll('.categoria-btn');
        
        const categoriaMap = {
            'todas': null,
            'familia': ['familia', 'familiar', 'criança'],
            'musica': ['musica', 'música ao vivo', 'show'],
            'agitado': ['agitado', 'festa', 'balada'],
            'relax': ['relax', 'tranquilo', 'calmo'],
            'pet': ['pet', 'pet-friendly', 'cachorro'],
            'esportes': ['esporte', 'esportes', 'vôlei', 'futebol']
        };

        categorias.forEach(categoria => {
            categoria.addEventListener('click', () => {
                const categoriaId = categoria.getAttribute('data-categoria');
                
                // Se clicar na mesma categoria ativa, desativa o filtro
                if (this.categoriaAtiva === categoriaId && categoriaId !== 'todas') {
                    this.categoriaAtiva = 'todas';
                    this.filtrandoCategoria = false;
                    this.resetarTodasBarracas();
                    this.updateCategoriaButtons();
                    return;
                }
                
                // Atualizar categoria ativa
                this.categoriaAtiva = categoriaId;
                this.updateCategoriaButtons();
                
                if (categoriaId === 'todas') {
                    this.filtrandoCategoria = false;
                    this.resetarTodasBarracas();
                } else {
                    this.filtrandoCategoria = true;
                    const caracteristicas = categoriaMap[categoriaId];
                    console.log('[Categorias] Filtrando por:', caracteristicas);
                    this.filterByCategoria(caracteristicas);
                }
            });
        });
    }

    updateCategoriaButtons() {
        const categorias = document.querySelectorAll('.categoria-btn');
        categorias.forEach(btn => {
            const categoriaId = btn.getAttribute('data-categoria');
            if (categoriaId === this.categoriaAtiva) {
                btn.classList.remove('bg-white/10', 'backdrop-blur-sm', 'border-white/20');
                btn.classList.add('bg-gradient-to-br', 'from-cyan-500', 'to-blue-600', 'active');
            } else {
                btn.classList.remove('bg-gradient-to-br', 'from-cyan-500', 'to-blue-600', 'active');
                btn.classList.add('bg-white/10', 'backdrop-blur-sm', 'border-white/20');
            }
        });
    }

    resetarTodasBarracas() {
        // Resetar para todas as barracas
        this.barracas = [...this.todasBarracas];
        this.renderBarracasPopulares();
        this.renderMaisBarracas();

        // Reinicializar os swipers
        if (barracasSwiper) barracasSwiper.destroy();
        if (maisBarracasSwiper) maisBarracasSwiper.destroy();
        this.initSwipers();
        this.initFavorites();

        // Esconder seção de resultados de categoria
        const categoriaResultsSection = document.getElementById('categoria-results-section');
        if (categoriaResultsSection) {
            categoriaResultsSection.style.display = 'none';
        }

        // Mostrar todas as seções
        const sections = document.querySelectorAll('main > div.space-y-16 > section');
        sections.forEach(section => {
            if (section.id !== 'search-results-section' && section.id !== 'categoria-results-section') {
                section.style.display = 'block';
            }
        });

        favoritesManager.showToast('Mostrando todas as barracas!');
    }

    showCategoriaMode() {
        // Ocultar todas as seções exceto categorias
        const sections = document.querySelectorAll('main > div.space-y-16 > section');
        sections.forEach(section => {
            const h2 = section.querySelector('h2');
            if (!h2) return;
            
            const titulo = h2.textContent;
            
            // Mostrar apenas Categorias
            if (titulo.includes('Categorias')) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });

        // Esconder resultados de pesquisa
        const resultsSection = document.getElementById('search-results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }

        // Criar/mostrar seção de resultados de categoria
        let categoriaResultsSection = document.getElementById('categoria-results-section');
        if (!categoriaResultsSection) {
            categoriaResultsSection = document.createElement('section');
            categoriaResultsSection.id = 'categoria-results-section';
            categoriaResultsSection.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-3xl font-bold mb-2">Barracas Encontradas</h2>
                </div>
                <div id="categoria-results-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            `;
            
            // Inserir logo após a seção de categorias
            const categoriasSection = document.getElementById('categorias-section');
            if (categoriasSection && categoriasSection.nextElementSibling) {
                categoriasSection.parentNode.insertBefore(categoriaResultsSection, categoriasSection.nextElementSibling);
            }
        }
        
        categoriaResultsSection.style.display = 'block';
    }

    filterByCategoria(caracteristicas) {
        const barracasFiltradas = this.todasBarracas.filter(barraca => {
            if (!barraca.caracteristicas || !Array.isArray(barraca.caracteristicas)) {
                return false;
            }
            
            return barraca.caracteristicas.some(carac => {
                const caracLower = carac.toLowerCase();
                return caracteristicas.some(filtro => caracLower.includes(filtro));
            });
        });

        console.log(`[Categorias] Encontradas ${barracasFiltradas.length} barracas`);

        // Mostrar modo de categoria (grid)
        this.showCategoriaMode();

        // Renderizar barracas em grid
        this.renderCategoriaResults(barracasFiltradas);

        // Scroll suave para os resultados
        setTimeout(() => {
            document.getElementById('categoria-results-section')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }

    initVerMais() {
        // Botões "Ver mais" das barracas - MOSTRAR TODAS EM GRID
        const verMaisBarracas = document.querySelectorAll('section:has(.barracas-swiper, .mais-barracas-swiper) a[href="#"]');
        verMaisBarracas.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.mostrarTodasBarracas();
            });
        });

        // Botão "Ver mais" das promoções
        const promoHeader = Array.from(document.querySelectorAll('section h2')).find(h2 => h2.textContent.includes('Promoções'));
        if (promoHeader) {
            const verMaisPromo = promoHeader.parentElement.querySelector('a[href="#"]');
            if (verMaisPromo) {
                verMaisPromo.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.mostrarTodasPromocoes();
                });
            }
        }
    }

    mostrarTodasBarracas() {
        // Resetar categoria ativa
        this.categoriaAtiva = 'todas';
        this.filtrandoCategoria = false;
        this.updateCategoriaButtons();

        // Ocultar todas as seções
        const sections = document.querySelectorAll('main > div.space-y-16 > section');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Criar/mostrar seção de todas as barracas
        let todasBarracasSection = document.getElementById('todas-barracas-section');
        if (!todasBarracasSection) {
            todasBarracasSection = document.createElement('section');
            todasBarracasSection.id = 'todas-barracas-section';
            todasBarracasSection.innerHTML = `
                <div class="mb-6 flex justify-between items-center">
                    <div>
                        <h2 class="text-3xl font-bold mb-2">Todas as Barracas</h2>
                        <p class="text-gray-300" id="total-barracas-count"></p>
                    </div>
                    <button id="fechar-todas-barracas" class="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-2">
                        <i data-lucide="x-circle" class="w-5 h-5"></i>
                        <span>Voltar</span>
                    </button>
                </div>
                <div id="todas-barracas-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            `;
            document.querySelector('main > div.space-y-16').appendChild(todasBarracasSection);
        }

        todasBarracasSection.style.display = 'block';
        
        // Atualizar contagem
        const countEl = document.getElementById('total-barracas-count');
        if (countEl) {
            countEl.textContent = `${this.todasBarracas.length} barracas disponíveis`;
        }

        // Renderizar todas as barracas
        const grid = document.getElementById('todas-barracas-grid');
        if (grid) {
            grid.innerHTML = this.todasBarracas.map(barraca => this.createBarracaGridCard(barraca)).join('');
        }

        lucide.createIcons();
        this.initFavorites();

        // Event listener para voltar
        const btnFechar = document.getElementById('fechar-todas-barracas');
        if (btnFechar) {
            btnFechar.onclick = () => {
                todasBarracasSection.style.display = 'none';
                sections.forEach(section => {
                    if (section.id !== 'search-results-section' && 
                        section.id !== 'categoria-results-section' && 
                        section.id !== 'todas-barracas-section' &&
                        section.id !== 'todas-promocoes-section') {
                        section.style.display = 'block';
                    }
                });
            };
        }

        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async mostrarTodasPromocoes() {
        // Carregar todas as promoções
        const { data: promocoes, error } = await supabase
            .from('promocoes')
            .select(`
                *,
                barracas:id_barraca (
                    id_barraca,
                    nome_barraca,
                    foto_destaque,
                    galeria_urls
                )
            `)
            .order('data_criacao', { ascending: false });

        if (error) {
            console.error('[Promoções] Erro ao carregar:', error);
            favoritesManager.showToast('Erro ao carregar promoções');
            return;
        }

        // Ocultar todas as seções
        const sections = document.querySelectorAll('main > div.space-y-16 > section');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Criar/mostrar seção de todas as promoções
        let todasPromocoesSection = document.getElementById('todas-promocoes-section');
        if (!todasPromocoesSection) {
            todasPromocoesSection = document.createElement('section');
            todasPromocoesSection.id = 'todas-promocoes-section';
            todasPromocoesSection.innerHTML = `
                <div class="mb-6 flex justify-between items-center">
                    <div>
                        <h2 class="text-3xl font-bold mb-2">Todas as Promoções</h2>
                        <p class="text-gray-300" id="total-promocoes-count"></p>
                    </div>
                    <button id="fechar-todas-promocoes" class="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-2">
                        <i data-lucide="x-circle" class="w-5 h-5"></i>
                        <span>Voltar</span>
                    </button>
                </div>
                <div id="todas-promocoes-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            `;
            document.querySelector('main > div.space-y-16').appendChild(todasPromocoesSection);
        }

        todasPromocoesSection.style.display = 'block';
        
        // Atualizar contagem
        const countEl = document.getElementById('total-promocoes-count');
        if (countEl) {
            countEl.textContent = `${promocoes.length} promoções ativas`;
        }

        // Renderizar todas as promoções
        const grid = document.getElementById('todas-promocoes-grid');
        if (grid) {
            grid.innerHTML = promocoes.map(promo => this.createPromocaoCard(promo)).join('');
        }

        lucide.createIcons();

        // Event listener para voltar
        const btnFechar = document.getElementById('fechar-todas-promocoes');
        if (btnFechar) {
            btnFechar.onclick = () => {
                todasPromocoesSection.style.display = 'none';
                sections.forEach(section => {
                    if (section.id !== 'search-results-section' && 
                        section.id !== 'categoria-results-section' && 
                        section.id !== 'todas-barracas-section' &&
                        section.id !== 'todas-promocoes-section') {
                        section.style.display = 'block';
                    }
                });
            };
        }

        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    createPromocaoCard(promo) {
        const barraca = promo.barracas;
        const foto = barraca?.foto_destaque || 'https://placehold.co/600x400/0138b4/FFFFFF?text=Promoção';

        return `
            <div class="bg-white text-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <div class="relative h-48">
                    <img src="${foto}" 
                         alt="${promo.titulo}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='https://placehold.co/600x400/0138b4/FFFFFF?text=Promoção'">
                    <div class="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        PROMOÇÃO
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="text-xl font-bold mb-2">${promo.titulo}</h3>
                    <p class="text-sm text-gray-600 mb-3">${promo.descricao}</p>
                    ${barraca ? `
                        <p class="text-xs text-gray-500 mb-3">
                            <i data-lucide="map-pin" class="w-3 h-3 inline"></i>
                            ${barraca.nome_barraca}
                        </p>
                    ` : ''}
                    <button onclick="window.location.href='infoBarraca.html?id=${barraca?.id_barraca}'" 
                            class="w-full bg-[#1985d4] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition">
                        Aproveitar Promoção
                    </button>
                </div>
            </div>
        `;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[inicio] DOM carregado');

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

    const manager = new InicioClienteManager();
    await manager.init();
});