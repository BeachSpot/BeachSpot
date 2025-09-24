        document.addEventListener('DOMContentLoaded', () => {
            // Ativa os ícones do Lucide
            lucide.createIcons();
            
            // Lógica para navegação por abas
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabId = button.dataset.tab;

                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    button.classList.add('active');
                    document.getElementById(tabId).classList.add('active');
                });
            });

            // --- LÓGICA DA ABA DE PROMOÇÕES ---

            const promotionsListContainer = document.getElementById('promotions-list');
            const addPromotionBtn = document.getElementById('add-promotion-btn');
            
            // Modal de Edição/Criação
            const promotionModal = document.getElementById('promotion-modal');
            const closeModalBtn = document.getElementById('close-modal-btn');
            const cancelModalBtn = document.getElementById('cancel-modal-btn');
            const promotionForm = document.getElementById('promotion-form');
            const modalTitle = document.getElementById('modal-title');
            const promotionIdInput = document.getElementById('promotion-id');
            const promotionTitleInput = document.getElementById('promotion-title');
            const promotionDescriptionInput = document.getElementById('promotion-description');

            // Modal de Confirmação de Exclusão
            const confirmDeleteModal = document.getElementById('confirm-delete-modal');
            const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
            const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
            let promotionIdToDelete = null;

            // Carrega promoções do localStorage ou usa dados de exemplo
            let promotions = JSON.parse(localStorage.getItem('promotions')) || [
                { id: 1, title: 'Happy Hour Dobrado', description: 'Compre uma caipirinha e ganhe outra. Válido de segunda a quinta, das 17h às 19h.', active: true },
                { id: 2, title: 'Balde de Cerveja com Desconto', description: 'Balde com 6 long necks por R$50,00.', active: false },
            ];

            const savePromotions = () => {
                localStorage.setItem('promotions', JSON.stringify(promotions));
            };

            const renderPromotions = () => {
                promotionsListContainer.innerHTML = '';
                if (promotions.length === 0) {
                    promotionsListContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Nenhuma promoção cadastrada.</p>`;
                } else {
                    promotions.forEach(promo => {
                        const promoElement = document.createElement('div');
                        promoElement.className = 'bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4';
                        promoElement.innerHTML = `
                            <div class="flex-grow">
                                <h3 class="font-bold text-gray-800">${promo.title}</h3>
                                <p class="text-sm text-gray-500">${promo.description}</p>
                            </div>
                            <div class="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto">
                                <button data-id="${promo.id}" class="edit-promo-btn text-blue-600 hover:text-blue-800 p-2"><i data-lucide="edit" class="pointer-events-none"></i></button>
                                <button data-id="${promo.id}" class="delete-promo-btn text-red-600 hover:text-red-800 p-2"><i data-lucide="trash-2" class="pointer-events-none"></i></button>
                                <label for="promo-toggle-${promo.id}" class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="promo-toggle-${promo.id}" data-id="${promo.id}" class="promo-toggle sr-only peer" ${promo.active ? 'checked' : ''}>
                                    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span class="ml-3 text-sm font-medium text-gray-900">${promo.active ? 'Ativa' : 'Inativa'}</span>
                                </label>
                            </div>
                        `;
                        promotionsListContainer.appendChild(promoElement);
                    });
                }
                lucide.createIcons(); // Recria os ícones após a renderização
            };
            
            // --- Funções dos Modais ---
            const openPromotionModal = (mode = 'add', promo = null) => {
                promotionForm.reset();
                if (mode === 'edit' && promo) {
                    modalTitle.textContent = 'Editar Promoção';
                    promotionIdInput.value = promo.id;
                    promotionTitleInput.value = promo.title;
                    promotionDescriptionInput.value = promo.description;
                } else {
                    modalTitle.textContent = 'Adicionar Nova Promoção';
                    promotionIdInput.value = '';
                }
                promotionModal.classList.remove('hidden');
            };

            const closePromotionModal = () => {
                promotionModal.classList.add('hidden');
            };

            const openConfirmModal = (id) => {
                promotionIdToDelete = id;
                confirmDeleteModal.classList.remove('hidden');
            };

            const closeConfirmModal = () => {
                promotionIdToDelete = null;
                confirmDeleteModal.classList.add('hidden');
            };

            // --- Event Listeners ---
            addPromotionBtn.addEventListener('click', () => openPromotionModal('add'));
            closeModalBtn.addEventListener('click', closePromotionModal);
            cancelModalBtn.addEventListener('click', closePromotionModal);
            promotionModal.addEventListener('click', (e) => {
                if(e.target === promotionModal) closePromotionModal();
            });

            promotionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = promotionIdInput.value;
                const title = promotionTitleInput.value;
                const description = promotionDescriptionInput.value;

                if (id) { // Editando
                    const promoIndex = promotions.findIndex(p => p.id == id);
                    if (promoIndex > -1) {
                        promotions[promoIndex] = { ...promotions[promoIndex], title, description };
                    }
                } else { // Adicionando
                    const newPromo = {
                        id: Date.now(),
                        title,
                        description,
                        active: true
                    };
                    promotions.push(newPromo);
                }
                savePromotions();
                renderPromotions();
                closePromotionModal();
            });
            
            // Listeners para a lista de promoções (editar, deletar)
            promotionsListContainer.addEventListener('click', (e) => {
                const target = e.target;
                                
                if (target.closest('.edit-promo-btn')) {
                    const id = target.closest('.edit-promo-btn').dataset.id;
                    const promo = promotions.find(p => p.id == id);
                    if(promo) openPromotionModal('edit', promo);
                }
                
                if (target.closest('.delete-promo-btn')) {
                    const id = target.closest('.delete-promo-btn').dataset.id;
                    openConfirmModal(id);
                }
            });

            // Listener específico para a MUDANÇA (change) do switch
            promotionsListContainer.addEventListener('change', (e) => {
                const target = e.target;
                if (target.classList.contains('promo-toggle')) {
                    const id = target.dataset.id;
                    const promoIndex = promotions.findIndex(p => p.id == id);
                    if(promoIndex > -1) {
                        promotions[promoIndex].active = target.checked;
                        savePromotions();
                        renderPromotions();
                    }
                }
            });

            // Listeners do modal de exclusão
            cancelDeleteBtn.addEventListener('click', closeConfirmModal);
            confirmDeleteModal.addEventListener('click', (e) => {
                if(e.target === confirmDeleteModal) closeConfirmModal();
            });

            confirmDeleteBtn.addEventListener('click', () => {
                if (promotionIdToDelete) {
                    promotions = promotions.filter(p => p.id != promotionIdToDelete);
                    savePromotions();
                    renderPromotions();
                    closeConfirmModal();
                }
            });

            // Renderização inicial
            renderPromotions();
        });