        // Inicializa os ícones do Lucide
        lucide.createIcons();

        // Inicializa o Carrossel de Barracas
        var barracasSwiper = new Swiper(".barracas-swiper", {
            effect: "slide",
            grabCursor: true,
            centeredSlides: true,
            loop: true,
            slidesPerView: 3,
            navigation: {
                nextEl: ".barracas-swiper-container .swiper-button-next",
                prevEl: ".barracas-swiper-container .swiper-button-prev",
            },
        });

        // Inicializa o Carrossel de Praias
        var praiasSwiper = new Swiper(".praias-swiper", {
            effect: "slide",
            grabCursor: true,
            centeredSlides: true,
            loop: true,
            slidesPerView: 3,
            navigation: {
                nextEl: ".praias-swiper-container .swiper-button-next",
                prevEl: ".praias-swiper-container .swiper-button-prev",
            },
        });

        // Inicializa o Carrossel 'Mais barracas para você'
        var maisBarracasSwiper = new Swiper(".mais-barracas-swiper", {
            effect: "slide",
            grabCursor: true,
            centeredSlides: true,
            loop: true,
            slidesPerView: 3,
            navigation: {
                nextEl: ".mais-barracas-swiper-container .swiper-button-next",
                prevEl: ".mais-barracas-swiper-container .swiper-button-prev",
            },
        });
        
        // --- LÓGICA DE FAVORITOS ---
        document.addEventListener('DOMContentLoaded', function() {
            const favoriteButtons = document.querySelectorAll('.btn-favorite');
            const storageKey = 'beachspotFavorites';

            const getFavorites = () => JSON.parse(localStorage.getItem(storageKey)) || [];
            const saveFavorites = (favorites) => localStorage.setItem(storageKey, JSON.stringify(favorites));

            const updateButtonStates = () => {
                const favorites = getFavorites();
                favoriteButtons.forEach(button => {
                    const card = button.closest('.barraca-card');
                    if (!card) return;
                    
                    const cardId = card.dataset.id;
                    const isFavorited = favorites.some(fav => fav.id === cardId);
                    
                    button.classList.toggle('favorited', isFavorited);
                });
            };

            const handleFavoriteClick = (event) => {
                const button = event.currentTarget;
                const card = button.closest('.barraca-card');
                if (!card) return;

                const cardId = card.dataset.id;
                let favorites = getFavorites();
                const favoriteIndex = favorites.findIndex(fav => fav.id === cardId);

                if (favoriteIndex > -1) {
                    favorites.splice(favoriteIndex, 1);
                } else {
                    const favoriteData = {
                        id: cardId,
                        title: card.querySelector('.barraca-title').textContent.trim(),
                        description: card.querySelector('.barraca-desc').textContent.trim(),
                        image: card.querySelector('.barraca-img').src
                    };
                    favorites.push(favoriteData);
                }
                
                saveFavorites(favorites);
                updateButtonStates();
            };

            favoriteButtons.forEach(button => {
                button.addEventListener('click', handleFavoriteClick);
            });

            updateButtonStates();
        });

        