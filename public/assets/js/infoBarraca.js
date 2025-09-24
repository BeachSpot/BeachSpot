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