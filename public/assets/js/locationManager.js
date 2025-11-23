/**
 * LocationManager - Gerenciador de Mapas e Localização
 * Responsável por inicializar mapas, buscar lugares próximos e gerenciar modais de localização
 */

export class LocationManager {
    constructor(barracaData) {
        this.barracaData = barracaData;
        this.map = null;
        this.markers = [];
    }

    /**
     * Inicializa o sistema de localização
     */
    init() {
        if (!this.barracaData.localizacao) {
            console.warn('[LocationManager] Barraca sem localização definida');
            return;
        }

        this.initMapModal();
    }

    /**
     * Configura o modal do mapa
     */
    initMapModal() {
        const locationBtn = document.getElementById('location-btn');
        const mapModal = document.getElementById('map-modal');
        const mapModalClose = document.getElementById('map-modal-close');

        if (!locationBtn || !mapModal || !mapModalClose) {
            console.warn('[LocationManager] Elementos do modal não encontrados');
            return;
        }

        locationBtn.addEventListener('click', async () => {
            mapModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            // Atualizar informações do painel
            document.getElementById('info-nome').textContent = this.barracaData.nome_barraca;
            document.getElementById('info-endereco').textContent = this.barracaData.localizacao;

            if (!this.map) {
                await this.initMap();
            } else {
                this.map.resize();
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

    /**
     * Inicializa o mapa com MapLibre GL
     */
    async initMap() {
        let coords = { lng: -38.5230, lat: -12.9985 }; // Coordenadas padrão (Salvador)

        if (this.barracaData.latitude && this.barracaData.longitude) {
            coords = {
                lng: this.barracaData.longitude,
                lat: this.barracaData.latitude
            };
            console.log('[LocationManager] Usando coordenadas do banco:', coords);
        } else {
            console.warn('[LocationManager] Barraca sem coordenadas. Usando padrão.');
        }

        const apiKey = 'fQkLRhuKNXOuJ7C7hE32';

        this.map = new maplibregl.Map({
            container: 'map',
            style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
            center: [coords.lng, coords.lat],
            zoom: 15
        });

        this.map.on('load', async () => {
            // Adicionar marcador da barraca
            const marker = new maplibregl.Marker({
                color: "#0138b4",
                scale: 1.2
            })
                .setLngLat([coords.lng, coords.lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25 }).setHTML(`
                        <div class="text-center p-2">
                            <strong class="text-gray-800">${this.barracaData.nome_barraca}</strong><br>
                            <p class="text-xs text-gray-600 mt-1">${this.barracaData.localizacao || 'Localização'}</p>
                            <a href="https://maps.google.com/?q=${coords.lat},${coords.lng}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               class="map-directions-link mt-2 inline-block">
                               Ver Rotas no Google Maps
                            </a>
                        </div>
                    `)
                )
                .addTo(this.map);

            this.markers.push(marker);

            // Buscar lugares próximos
            await this.buscarLugaresProximos(coords);
        });
    }

    /**
     * Busca lugares próximos usando Overpass API
     */
    async buscarLugaresProximos(coords) {
        try {
            console.log('[LocationManager] Buscando lugares próximos...');

            const turisticosContainer = document.getElementById('info-turisticos');
            const proximosContainer = document.getElementById('info-proximos');

            if (turisticosContainer) {
                turisticosContainer.innerHTML = '<p class="text-sm text-gray-500"><i data-lucide="loader" class="w-4 h-4 inline animate-spin"></i> Buscando...</p>';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            if (proximosContainer) {
                proximosContainer.innerHTML = '<p class="text-sm text-gray-500"><i data-lucide="loader" class="w-4 h-4 inline animate-spin"></i> Buscando...</p>';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }

            // Buscar em paralelo (com timeout de 15s cada)
            const promises = [
                this.searchOverpass(coords, 'tourism', 2000),
                this.searchOverpass(coords, 'restaurant', 1500),
                this.searchOverpass(coords, 'hotel', 2000),
                this.searchOverpass(coords, 'shop', 1000),
                this.searchOverpass(coords, 'leisure', 1500)
            ];

            const [pontosTuristicos, restaurantes, hoteis, lojas, lazer] = await Promise.all(
                promises.map(p => p.catch(() => []))
            );

            // Renderizar pontos turísticos
            if (turisticosContainer) {
                if (pontosTuristicos.length > 0) {
                    turisticosContainer.innerHTML = '';
                    pontosTuristicos.slice(0, 6).forEach(lugar => {
                        this.renderLugar(lugar, turisticosContainer);
                    });
                } else {
                    turisticosContainer.innerHTML = '<p class="text-sm text-gray-500">Nenhum ponto turístico cadastrado próximo.</p>';
                }
            }

            // Renderizar lugares próximos
            if (proximosContainer) {
                proximosContainer.innerHTML = '';

                const categorias = [
                    { nome: 'Restaurantes & Bares', lugares: restaurantes, icon: 'utensils' },
                    { nome: 'Hotéis & Hospedagem', lugares: hoteis, icon: 'hotel' },
                    { nome: 'Lojas & Comércio', lugares: lojas, icon: 'shopping-bag' },
                    { nome: 'Lazer & Entretenimento', lugares: lazer, icon: 'volleyball' }
                ];

                let hasResults = false;

                categorias.forEach(categoria => {
                    if (categoria.lugares.length > 0) {
                        hasResults = true;
                        const categoriaDiv = document.createElement('div');
                        categoriaDiv.className = 'mb-5';
                        categoriaDiv.innerHTML = `
                            <h4 class="font-semibold text-lg text-gray-600 mb-3 flex items-center gap-2">
                                <i data-lucide="${categoria.icon}" class="w-5 h-5"></i>
                                ${categoria.nome}
                            </h4>
                        `;

                        const listaDiv = document.createElement('div');
                        listaDiv.className = 'space-y-3';

                        categoria.lugares.slice(0, 5).forEach(lugar => {
                            this.renderLugar(lugar, listaDiv);
                        });

                        categoriaDiv.appendChild(listaDiv);
                        proximosContainer.appendChild(categoriaDiv);
                    }
                });

                if (!hasResults) {
                    proximosContainer.innerHTML = '<p class="text-sm text-gray-500">Nenhum estabelecimento cadastrado próximo no OpenStreetMap.</p>';
                }

                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }

        } catch (error) {
            console.error('[LocationManager] Erro ao buscar lugares próximos:', error);
            if (document.getElementById('info-turisticos')) {
                document.getElementById('info-turisticos').innerHTML = '<p class="text-sm text-red-500">Erro ao carregar.</p>';
            }
            if (document.getElementById('info-proximos')) {
                document.getElementById('info-proximos').innerHTML = '<p class="text-sm text-red-500">Erro ao carregar.</p>';
            }
        }
    }

    /**
     * Busca lugares usando Overpass API
     */
    async searchOverpass(coords, type, radiusMeters = 1500) {
        try {
            // Mapeamento de tags do OpenStreetMap
            const queries = {
                'tourism': `
                    node["tourism"](around:${radiusMeters},${coords.lat},${coords.lng});
                    node["historic"](around:${radiusMeters},${coords.lat},${coords.lng});
                `,
                'restaurant': `
                    node["amenity"="restaurant"](around:${radiusMeters},${coords.lat},${coords.lng});
                    node["amenity"="bar"](around:${radiusMeters},${coords.lat},${coords.lng});
                    node["amenity"="cafe"](around:${radiusMeters},${coords.lat},${coords.lng});
                `,
                'hotel': `
                    node["tourism"="hotel"](around:${radiusMeters},${coords.lat},${coords.lng});
                    node["tourism"="hostel"](around:${radiusMeters},${coords.lat},${coords.lng});
                    node["tourism"="guest_house"](around:${radiusMeters},${coords.lat},${coords.lng});
                `,
                'shop': `
                    node["shop"](around:${radiusMeters},${coords.lat},${coords.lng});
                    node["amenity"="marketplace"](around:${radiusMeters},${coords.lat},${coords.lng});
                `,
                'leisure': `
                    node["leisure"](around:${radiusMeters},${coords.lat},${coords.lng});
                    node["sport"](around:${radiusMeters},${coords.lat},${coords.lng});
                `
            };

            const query = queries[type] || queries['tourism'];

            const overpassQuery = `
                [out:json][timeout:15];
                (
                    ${query}
                );
                out body;
            `;

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: `data=${encodeURIComponent(overpassQuery)}`
            });

            if (!response.ok) throw new Error('Falha na Overpass API');

            const data = await response.json();

            const lugares = data.elements
                .filter(element => element.tags && element.tags.name)
                .map(element => {
                    const distance = this.calcularDistancia(coords, {
                        lat: element.lat,
                        lng: element.lon
                    });

                    let tipo = 'Local';
                    let categoria = type;

                    if (element.tags.tourism) tipo = element.tags.tourism;
                    else if (element.tags.amenity) tipo = element.tags.amenity;
                    else if (element.tags.shop) tipo = 'Loja';
                    else if (element.tags.leisure) tipo = element.tags.leisure;
                    else if (element.tags.historic) tipo = element.tags.historic;

                    return {
                        nome: element.tags.name,
                        tipo: this.formatarTipo(tipo),
                        categoria: categoria,
                        coordenadas: { lng: element.lon, lat: element.lat },
                        distancia: distance
                    };
                })
                .sort((a, b) => a.distancia - b.distancia);

            console.log(`[LocationManager] ${type}: ${lugares.length} resultados`);
            return lugares;

        } catch (error) {
            console.error(`[LocationManager] Erro ao buscar ${type}:`, error);
            return [];
        }
    }

    /**
     * Formata o tipo de lugar para português
     */
    formatarTipo(tipo) {
        const traducoes = {
            'restaurant': 'Restaurante',
            'bar': 'Bar',
            'cafe': 'Café',
            'hotel': 'Hotel',
            'hostel': 'Hostel',
            'guest_house': 'Pousada',
            'attraction': 'Atração',
            'museum': 'Museu',
            'viewpoint': 'Mirante',
            'beach': 'Praia',
            'monument': 'Monumento',
            'castle': 'Castelo',
            'sports_centre': 'Centro Esportivo'
        };
        return traducoes[tipo] || tipo;
    }

    /**
     * Calcula distância entre duas coordenadas (fórmula de Haversine)
     */
    calcularDistancia(coord1, coord2) {
        const R = 6371e3; // Raio da Terra em metros
        const φ1 = coord1.lat * Math.PI / 180;
        const φ2 = coord2.lat * Math.PI / 180;
        const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
        const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Renderiza um lugar no container especificado
     */
    renderLugar(lugar, container) {
        const lugarEl = document.createElement('div');
        lugarEl.className = 'p-3 bg-white rounded-lg border hover:shadow-md hover:border-blue-500 cursor-pointer transition-all';

        const distanciaKm = (lugar.distancia / 1000).toFixed(1);
        const distanciaTexto = lugar.distancia < 1000
            ? `${Math.round(lugar.distancia)}m`
            : `${distanciaKm}km`;

        lugarEl.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <p class="font-semibold text-blue-700">${lugar.nome}</p>
                    <p class="text-xs text-gray-500 mt-1">${lugar.tipo}</p>
                </div>
                <span class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full ml-2">
                    ${distanciaTexto}
                </span>
            </div>
        `;

        lugarEl.addEventListener('click', () => {
            if (this.map) {
                const marker = new maplibregl.Marker({ color: "#ef4444" })
                    .setLngLat([lugar.coordenadas.lng, lugar.coordenadas.lat])
                    .setPopup(
                        new maplibregl.Popup({ offset: 25 }).setHTML(`
                            <div class="text-center p-2">
                                <strong class="text-gray-800">${lugar.nome}</strong><br>
                                <p class="text-xs text-gray-600 mt-1">${lugar.tipo}</p>
                                <p class="text-xs text-gray-400 mt-1">${distanciaTexto} de distância</p>
                                <a href="https://maps.google.com/?q=${lugar.coordenadas.lat},${lugar.coordenadas.lng}" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="map-directions-link mt-2 inline-block">
                                   Ver Rotas
                                </a>
                            </div>
                        `)
                    )
                    .addTo(this.map);

                this.map.flyTo({
                    center: [lugar.coordenadas.lng, lugar.coordenadas.lat],
                    zoom: 16,
                    essential: true
                });

                marker.togglePopup();
            }
        });

        container.appendChild(lugarEl);
    }

    /**
     * Limpa todos os marcadores do mapa
     */
    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    }

    /**
     * Destrói a instância do mapa
     */
    destroy() {
        if (this.map) {
            this.clearMarkers();
            this.map.remove();
            this.map = null;
        }
    }
}