        document.addEventListener('DOMContentLoaded', () => {
            // Ativa os ícones do Lucide
            lucide.createIcons();

            // Lógica para manter a altura do card principal
            const mainCard = document.querySelector('.main-content-card');
            if (mainCard) {
                // Define a altura mínima com base na altura inicial do conteúdo
                const initialHeight = mainCard.offsetHeight;
                mainCard.style.minHeight = `${initialHeight}px`;
            }

            // Lógica para o menu mobile
            const mobileMenuButton = document.getElementById('mobile-menu-button');
            const mobileMenu = document.getElementById('mobile-menu');
            if(mobileMenuButton && mobileMenu) {
                mobileMenuButton.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                });
            }

            // Lógica para os filtros do cardápio
            const filterContainer = document.getElementById('category-filters');
            const categorySections = document.querySelectorAll('.category-section');

            if (filterContainer && categorySections.length > 0) {
                filterContainer.addEventListener('click', (event) => {
                    const targetButton = event.target.closest('button');
                    if (!targetButton) return;

                    // Atualiza o estilo dos botões
                    filterContainer.querySelectorAll('button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    targetButton.classList.add('active');
                    
                    const filter = targetButton.getAttribute('data-filter');

                    // Filtra as seções
                    categorySections.forEach(section => {
                        const category = section.getAttribute('data-category');
                        if (filter === 'all' || category === filter) {
                            section.style.display = 'block';
                        } else {
                            section.style.display = 'none';
                        }
                    });
                });
            }
        });