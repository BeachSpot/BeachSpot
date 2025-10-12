        document.addEventListener('DOMContentLoaded', () => {
            // Lógica para o menu mobile
            const mobileMenuButton = document.getElementById('mobile-menu-button');
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenuButton && mobileMenu) {
                mobileMenuButton.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                });
            }

            // Ativa os ícones do Lucide em toda a página.
            lucide.createIcons();

            // Lógica para avaliação com estrelas
            const stars = document.querySelectorAll('#rating-stars i');
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    stars.forEach((s, i) => {
                        if (i <= index) {
                            s.classList.add('text-yellow-400', 'fill-current');
                        } else {
                            s.classList.remove('text-yellow-400', 'fill-current');
                        }
                    });
                });
            });

            // Lógica para filtrar avaliações
            const filterAllButton = document.getElementById('filter-all');
            const filterMediaButton = document.getElementById('filter-media');
            const reviewCards = document.querySelectorAll('.review-card');

            filterAllButton.addEventListener('click', () => {
                reviewCards.forEach(card => card.style.display = 'block');
                filterAllButton.classList.add('active-filter');
                filterMediaButton.classList.remove('active-filter');
            });

            filterMediaButton.addEventListener('click', () => {
                reviewCards.forEach(card => {
                    if (card.classList.contains('has-media')) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
                filterMediaButton.classList.add('active-filter');
                filterAllButton.classList.remove('active-filter');
            });
        });

        // a

                document.addEventListener('DOMContentLoaded', () => {
            lucide.createIcons();
            
            // --- Dados da Localização (simulação de dados do backend) ---
            const locationData = {
                nome: "Barraca Axé Bahia",
                endereco: "Praia do Porto da Barra, Barra, Salvador - BA",
                coordenadas: {
                    lng: -38.5230,
                    lat: -12.9985
                },
                pontosTuristicos: [
                    {
                        nome: "Farol da Barra",
                        tipo: "Ponto Turístico",
                        coordenadas: { lng: -38.5328, lat: -13.0105 }
                    },
                    {
                        nome: "Morro do Cristo",
                        tipo: "Monumento",
                        coordenadas: { lng: -38.5126, lat: -13.0044 }
                    }
                ],
                lugaresProximos: [
                     {
                         nome: "Yacht Clube da Bahia",
                         tipo: "Clube",
                         categoria: "Clubes",
                         coordenadas: { lng: -38.5222, lat: -12.9932 }
                    },
                    {
                        nome: "Restaurante Acarajé Dourado",
                        tipo: "Culinária Baiana",
                        categoria: "Restaurantes",
                        coordenadas: { lng: -38.5200, lat: -12.9980 }
                    },
                     {
                        nome: "Monte Pascoal Praia Hotel",
                        tipo: "Hospedagem",
                        categoria: "Hotéis",
                        coordenadas: { lng: -38.5273, lat: -13.0078 }
                    },
                    {
                        nome: "Shopping Barra",
                        tipo: "Centro Comercial",
                        categoria: "Compras",
                        coordenadas: { lng: -38.5085, lat: -12.9967 }
                    },
                    {
                        nome: "Bompreço Supermercado",
                        tipo: "Supermercado",
                        categoria: "Mercados",
                        coordenadas: { lng: -38.5147, lat: -12.9996 }
                    },
                    {
                        nome: "Estação Lapa",
                        tipo: "Transporte Público",
                        categoria: "Metrô",
                        coordenadas: { lng: -38.5097, lat: -12.9818 }
                    }
                ]
            };
            
            // --- CÓDIGO DA API DE PREVISÃO DO TEMPO (ATUAL E PRÓXIMOS DIAS) ---
            async function buscarPrevisaoTempo() {
                // **IMPORTANTE**: Substitua pela sua chave de API da WeatherAPI
                const apiKey = ' ee1c7addcc374cafbd0194317250610'; 
                const locationQuery = `${locationData.coordenadas.lat},${locationData.coordenadas.lng}`;
                const days = 3; 
                const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${locationQuery}&days=${days}&lang=pt`;

                const tempElement = document.getElementById('weather-temp');
                const conditionElement = document.getElementById('weather-condition');
                const iconElement = document.getElementById('weather-icon');
                const forecastContainer = document.getElementById('forecast-container');
                
                // Limpa o container da previsão para exibir mensagem de carregamento
                forecastContainer.innerHTML = `<p class="text-sm text-gray-500 w-full">Carregando previsão...</p>`;


                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error('Falha na resposta da API do tempo');
                    }
                    const data = await response.json();
                    
                    // 1. ATUALIZA O TEMPO ATUAL
                    const current = data.current;
                    tempElement.textContent = `${Math.round(current.temp_c)}°C`;
                    conditionElement.textContent = current.condition.text;
                    iconElement.src = `https:${current.condition.icon}`;
                    iconElement.alt = current.condition.text;

                    // 2. ATUALIZA A PREVISÃO PARA OS PRÓXIMOS DIAS
                    const forecastDays = data.forecast.forecastday;
                    forecastContainer.innerHTML = ''; // Limpa a mensagem "carregando"

                    forecastDays.forEach(dayData => {
                        const date = new Date(dayData.date + 'T00:00:00');
                        const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
                        
                        const dayElement = document.createElement('div');
                        dayElement.className = 'flex flex-col items-center space-y-1';
                        
                        dayElement.innerHTML = `
                            <p class="font-semibold text-sm text-gray-700">${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}</p>
                            <img src="https:${dayData.day.condition.icon}" alt="${dayData.day.condition.text}" class="w-8 h-8">
                            <p class="text-sm text-gray-600">
                                <span class="font-bold text-gray-800">${Math.round(dayData.day.maxtemp_c)}°</span>
                                <span>${Math.round(dayData.day.mintemp_c)}°</span>
                            </p>
                        `;
                        forecastContainer.appendChild(dayElement);
                    });

                } catch (error) {
                    console.error("Erro ao buscar previsão do tempo:", error);
                    conditionElement.textContent = 'Erro ao carregar';
                    forecastContainer.innerHTML = '<p class="text-sm text-red-500 w-full">Não foi possível carregar a previsão.</p>';
                }
            }

            buscarPrevisaoTempo();

            // --- LÓGICA PARA EXPANDIR/RECOLHER PREVISÃO ---
            const weatherSection = document.getElementById('weather-section');
            const forecastContainer = document.getElementById('forecast-container');
            const weatherChevron = document.getElementById('weather-chevron');

            weatherSection.addEventListener('click', () => {
                forecastContainer.classList.toggle('hidden');
                weatherChevron.classList.toggle('rotate-180');
            });


            // --- Sistema de Toast (Notificação) ---
            const toast = document.getElementById('toast');
            function showToast(message) {
                toast.textContent = message;
                toast.classList.remove('opacity-0', 'translate-y-3');
                setTimeout(() => {
                    toast.classList.add('opacity-0', 'translate-y-3');
                }, 3000);
            }

            // --- Botão de Favorito ---
            const favoriteBtn = document.getElementById('favorite-btn');
            favoriteBtn.addEventListener('click', () => {
                const isFavorited = favoriteBtn.classList.toggle('is-favorited');
                if (isFavorited) {
                    showToast('Adicionado aos seus favoritos!');
                } else {
                    showToast('Removido dos favoritos.');
                }
            });

            // --- Atualiza o texto do botão de localização ---
            document.getElementById('location-text').textContent = locationData.endereco;


            // --- Elementos do Modal do Mapa ---
            const locationBtn = document.getElementById('location-btn');
            const mapModal = document.getElementById('map-modal');
            const mapModalClose = document.getElementById('map-modal-close');
            let map; 

            locationBtn.addEventListener('click', () => {
                mapModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; 

                document.getElementById('info-nome').textContent = locationData.nome;
                document.getElementById('info-endereco').textContent = locationData.endereco;
                
                const turisticosContainer = document.getElementById('info-turisticos');
                const proximosContainer = document.getElementById('info-proximos');
                turisticosContainer.innerHTML = ''; 
                proximosContainer.innerHTML = '';

                const createAndAppendLugar = (lugar, container) => {
                    const lugarEl = document.createElement('div');
                    lugarEl.className = 'p-3 bg-white rounded-lg border hover:shadow-md hover:border-blue-500 cursor-pointer transition-all';
                    lugarEl.innerHTML = `
                        <p class="font-semibold text-blue-700">${lugar.nome}</p>
                        <p class="text-sm text-gray-500">${lugar.tipo}</p>
                    `;
                    lugarEl.addEventListener('click', () => {
                        if(map) {
                            map.flyTo({
                                center: [lugar.coordenadas.lng, lugar.coordenadas.lat],
                                zoom: 16,
                                essential: true
                            });
                        }
                    });
                    container.appendChild(lugarEl);
                };

                locationData.pontosTuristicos.forEach(lugar => {
                    createAndAppendLugar(lugar, turisticosContainer);
                });
                
                const lugaresAgrupados = locationData.lugaresProximos.reduce((acc, lugar) => {
                    const categoria = lugar.categoria || 'Outros';
                    if (!acc[categoria]) {
                        acc[categoria] = [];
                    }
                    acc[categoria].push(lugar);
                    return acc;
                }, {});

                for (const categoria in lugaresAgrupados) {
                    const categoriaWrapper = document.createElement('div');
                    categoriaWrapper.className = 'mb-5';

                    const categoriaTitle = document.createElement('h4');
                    categoriaTitle.className = 'font-semibold text-lg text-gray-600 mb-3';
                    categoriaTitle.textContent = categoria;
                    categoriaWrapper.appendChild(categoriaTitle);

                    const listaLugares = document.createElement('div');
                    listaLugares.className = 'space-y-3';
                    
                    lugaresAgrupados[categoria].forEach(lugar => {
                        createAndAppendLugar(lugar, listaLugares);
                    });

                    categoriaWrapper.appendChild(listaLugares);
                    proximosContainer.appendChild(categoriaWrapper);
                }
                
                if (!map) {
                    const apiKey = 'fQkLRhuKNXOuJ7C7hE32'; 
                    
                    map = new maplibregl.Map({
                        container: 'map',
                        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
                        center: [locationData.coordenadas.lng, locationData.coordenadas.lat],
                        zoom: 15
                    });

                    map.on('load', () => {
                        const barracaPopupContent = `
                            <div class="text-center">
                                <strong class="text-gray-800">${locationData.nome}</strong><br>
                                <a href="https://maps.google.com/?q=${locationData.coordenadas.lat},${locationData.coordenadas.lng}" target="_blank" rel="noopener noreferrer" class="map-directions-link">
                                    Ver Rotas
                                </a>
                            </div>`;
                        const popupBarraca = new maplibregl.Popup({ offset: 25 }).setHTML(barracaPopupContent);

                        new maplibregl.Marker({color: "#0138b4", scale: 1.2})
                            .setLngLat([locationData.coordenadas.lng, locationData.coordenadas.lat])
                            .setPopup(popupBarraca)
                            .addTo(map);

                        const todosOsLugares = [...locationData.pontosTuristicos, ...locationData.lugaresProximos];

                        todosOsLugares.forEach(lugar => {
                            const lugarPopupContent = `
                                <div class="text-center">
                                    <strong class="text-gray-800">${lugar.nome}</strong><br>
                                    <a href="https://maps.google.com/?q=${lugar.coordenadas.lat},${lugar.coordenadas.lng}" target="_blank" rel="noopener noreferrer" class="map-directions-link">
                                        Ver Rotas
                                    </a>
                                </div>`;
                            const lugarPopup = new maplibregl.Popup({ offset: 25 }).setHTML(lugarPopupContent);
                            new maplibregl.Marker({color: "#ef4444"})
                                .setLngLat([lugar.coordenadas.lng, lugar.coordenadas.lat])
                                .setPopup(lugarPopup)
                                .addTo(map);
                        });
                    });

                } else {
                    map.resize();
                    map.flyTo({
                        center: [locationData.coordenadas.lng, locationData.coordenadas.lat],
                        zoom: 15
                    });
                }
            });

            function closeMapModal() {
                mapModal.classList.add('hidden');
                document.body.style.overflow = '';
            }

            mapModalClose.addEventListener('click', closeMapModal);

            mapModal.addEventListener('click', (e) => {
                if (e.target === mapModal) {
                    closeMapModal();
                }
            });
            // --- FIM DO CÓDIGO DO MAPA ---


            // --- Botão de Reservar ---
            document.getElementById('reserve-btn').addEventListener('click', () => {
                showToast('Redirecionando para a página de reserva...');
            });
            
            // --- Galeria de Fotos Modal ---
            const galleryModal = document.getElementById('gallery-modal');
            const modalImage = document.getElementById('modal-image');
            const modalClose = document.getElementById('modal-close');
            const galleryImages = document.querySelectorAll('#gallery img');

            galleryImages.forEach(img => {
                img.addEventListener('click', () => {
                    modalImage.src = img.src;
                    galleryModal.classList.remove('hidden');
                });
            });

            function closeModal() {
                galleryModal.classList.add('hidden');
            }
            modalClose.addEventListener('click', closeModal);
            galleryModal.addEventListener('click', (e) => {
                if (e.target === galleryModal) {
                    closeModal();
                }
            });

            // --- Sistema de Avaliação por Estrelas ---
            const starsContainer = document.getElementById('rating-stars');
            const stars = starsContainer.querySelectorAll('svg');
            let currentRating = 0;

            function updateStars(rating) {
                stars.forEach((star, index) => {
                    if (index < rating) {
                        star.classList.add('text-yellow-400', 'fill-current');
                        star.classList.remove('text-gray-300');
                    } else {
                        star.classList.remove('text-yellow-400', 'fill-current');
                        star.classList.add('text-gray-300');
                    }
                });
            }

            stars.forEach((star, index) => {
                star.addEventListener('mouseover', () => {
                    updateStars(index + 1);
                });
                star.addEventListener('mouseout', () => {
                    updateStars(currentRating);
                });
                star.addEventListener('click', () => {
                    currentRating = index + 1;
                    updateStars(currentRating);
                });
            });
            
            // --- Botão de Enviar Avaliação ---
            const submitReviewBtn = document.getElementById('submit-review-btn');
            const reviewTextarea = document.getElementById('review-textarea');
            
            submitReviewBtn.addEventListener('click', () => {
                if (currentRating === 0) {
                    showToast('Por favor, selecione uma nota (estrelas).');
                    return;
                }
                if (reviewTextarea.value.trim() === '') {
                    showToast('Por favor, escreva um comentário.');
                    return;
                }
                showToast('Avaliação enviada com sucesso! Obrigado.');
                
                currentRating = 0;
                updateStars(0);
                reviewTextarea.value = '';
            });

            // --- Filtros de Avaliações ---
            const filterAllBtn = document.getElementById('filter-all');
            const filterMediaBtn = document.getElementById('filter-media');
            const allReviews = document.querySelectorAll('#reviews-list .review-card');

            function setActiveFilter(activeBtn) {
                const inactiveClasses = ['bg-gray-200', 'text-gray-800'];
                const activeClasses = ['bg-blue-500', 'text-white'];
                
                [filterAllBtn, filterMediaBtn].forEach(btn => {
                    btn.classList.remove(...activeClasses);
                    btn.classList.add(...inactiveClasses);
                });
                
                activeBtn.classList.remove(...inactiveClasses);
                activeBtn.classList.add(...activeClasses);
            }

            function applyFilter(filterType) {
                allReviews.forEach(review => {
                    if (filterType === 'media' && !review.classList.contains('has-media')) {
                        review.classList.add('hidden');
                    } else {
                        review.classList.remove('hidden');
                    }
                });
            }

            filterAllBtn.addEventListener('click', () => {
                applyFilter('all');
                setActiveFilter(filterAllBtn);
            });

            filterMediaBtn.addEventListener('click', () => {
                applyFilter('media');
                setActiveFilter(filterMediaBtn);
            });

            setActiveFilter(filterAllBtn);
        });