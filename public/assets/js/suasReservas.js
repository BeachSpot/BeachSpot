        document.addEventListener('DOMContentLoaded', function() {
            // --- CÓDIGO ORIGINAL MANTIDO (Ícones, Menu, Abas, Modal) ---
            lucide.createIcons();

            const mobileMenuButton = document.getElementById('mobile-menu-button');
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });

            const tabReservas = document.getElementById('tab-reservas');
            const tabFavoritos = document.getElementById('tab-favoritos');
            const contentReservas = document.getElementById('content-reservas');
            const contentFavoritos = document.getElementById('content-favoritos');

            tabReservas.addEventListener('click', () => {
                contentReservas.classList.remove('hidden');
                contentFavoritos.classList.add('hidden');
                tabReservas.classList.add('active');
                tabFavoritos.classList.remove('active');
            });

            tabFavoritos.addEventListener('click', () => {
                contentReservas.classList.add('hidden');
                contentFavoritos.classList.remove('hidden');
                tabReservas.classList.remove('active');
                tabFavoritos.classList.add('active');
            });

            let currentReservationCard = null;
            const modal = document.getElementById('cancelModal');
            const modalContent = modal.querySelector('div');

            function openCancelModal(card) {
                currentReservationCard = card;
                const title = card.querySelector('.reserva-title').textContent;
                const message = document.getElementById('modalMessage');
                message.innerHTML = `Tem certeza que quer cancelar a reserva em <strong>${title}</strong>?`;
                modal.classList.remove('opacity-0', 'pointer-events-none');
                modalContent.classList.remove('scale-95');
            }

            function closeCancelModal() {
                modal.classList.add('opacity-0', 'pointer-events-none');
                modalContent.classList.add('scale-95');
                currentReservationCard = null;
            }

            function cancelReservation() {
                if (currentReservationCard) {
                    currentReservationCard.remove();
                }
                closeCancelModal();
            }
            
            document.querySelectorAll('.btn-cancelar').forEach(btn => {
                btn.addEventListener('click', function() {
                    openCancelModal(this.closest('.reserva-card'));
                });
            });

            document.getElementById('btnYes').addEventListener('click', cancelReservation);
            document.getElementById('btnNo').addEventListener('click', closeCancelModal);
            modal.addEventListener('click', (e) => { if (e.target === modal) closeCancelModal(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCancelModal(); });
            // --- FIM DO CÓDIGO ORIGINAL ---


            // ===== INÍCIO DA FUNCIONALIDADE DE FAVORITOS INTEGRADA E CORRIGIDA =====
            const storageKey = 'beachspotFavorites';
            const favoritosGrid = document.getElementById('favoritos-grid');
            const emptyFavoritesMessage = document.getElementById('empty-favorites-message');

            const getFavorites = () => JSON.parse(localStorage.getItem(storageKey)) || [];
            const saveFavorites = (favorites) => localStorage.setItem(storageKey, JSON.stringify(favorites));

            // --- FUNÇÕES PARA A ABA DE FAVORITOS ---
            function renderFavorites() {
                const favorites = getFavorites();
                favoritosGrid.querySelectorAll('.favorite-card').forEach(card => card.remove());

                if (favorites.length === 0) {
                    emptyFavoritesMessage.style.display = 'flex';
                } else {
                    emptyFavoritesMessage.style.display = 'none';
                    favorites.forEach(fav => {
                        const cardHTML = `
                            <div class="favorite-card bg-white text-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col relative" data-id="${fav.id}">
                                <button class="btn-favorite favorited absolute top-4 right-4 bg-white/70 backdrop-blur-sm p-2 rounded-full hover:bg-white z-10" title="Remover dos Favoritos">
                                    <i data-lucide="heart" class="w-5 h-5 text-gray-700 pointer-events-none"></i>
                                </button>
                                <img src="${fav.image}" alt="Imagem da barraca ${fav.title}" class="w-full h-48 object-cover">
                                <div class="p-6 flex flex-col flex-grow">
                                    <h3 class="text-2xl font-bold mb-2">${fav.title}</h3>
                                    <p class="text-gray-600 text-sm">${fav.description}</p>
                                </div>
                            </div>
                        `;
                        favoritosGrid.insertAdjacentHTML('beforeend', cardHTML);
                    });
                }
                
                lucide.createIcons();
                addRemoveFavoriteListeners();
            }

            function addRemoveFavoriteListeners() {
                document.querySelectorAll('#favoritos-grid .btn-favorite').forEach(button => {
                    button.addEventListener('click', function() {
                        const card = this.closest('.favorite-card');
                        const cardId = card.dataset.id;
                        let favorites = getFavorites();
                        
                        const updatedFavorites = favorites.filter(fav => fav.id !== cardId);
                        saveFavorites(updatedFavorites);

                        renderFavorites();
                        updateReservationFavoriteButtons();
                    });
                });
            }

            // --- FUNÇÕES PARA A ABA DE RESERVAS ---
            function updateReservationFavoriteButtons() {
                const favorites = getFavorites();
                document.querySelectorAll('#reservas-grid .btn-favorite').forEach(button => {
                    const card = button.closest('.reserva-card');
                    if (!card) return;
                    const cardId = card.dataset.id;
                    const isFavorited = favorites.some(fav => fav.id === cardId);
                    button.classList.toggle('favorited', isFavorited);
                });
            }

            function addFavoriteListenersToReservations() {
                document.querySelectorAll('#reservas-grid .btn-favorite').forEach(button => {
                    button.addEventListener('click', function() {
                        const card = this.closest('.reserva-card');
                        if (!card) return;

                        const cardId = card.dataset.id;
                        let favorites = getFavorites();
                        const favoriteIndex = favorites.findIndex(fav => fav.id === cardId);

                        if (favoriteIndex > -1) {
                            favorites.splice(favoriteIndex, 1);
                        } else {
                            const favoriteData = {
                                id: cardId,
                                title: card.querySelector('.reserva-title').textContent.trim(),
                                description: card.querySelector('.reserva-location span').textContent.trim(),
                                image: card.querySelector('img').src
                            };
                            favorites.push(favoriteData);
                        }
                        saveFavorites(favorites);
                        
                        updateReservationFavoriteButtons();
                        renderFavorites();
                    });
                });
            }

            // --- INICIALIZAÇÃO DE TODAS AS FUNÇÕES DE FAVORITOS ---
            renderFavorites();
            addFavoriteListenersToReservations();
            updateReservationFavoriteButtons();
            // ===== FIM DA FUNCIONALIDADE CORRIGIDA =====
        });