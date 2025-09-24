       lucide.createIcons();

        // --- FUNCIONALIDADE DE IDIOMA ---
        const translations = {
            en: {
                page_title: "Settings - BeachSpot",
                header_inicio: "Home",
                header_reservas: "Your Reservations",
                header_perfil: "Profile",
                header_sobre: "About",
                header_config: "Settings",
                main_title: "Settings",
                lang_title: "Language",
                lang_desc: "Choose the platform's display language.",
                notifications_title: "Notifications",
                promo_offers_label: "Promotional Offers",
                promo_offers_desc: "Receive emails about promotions and special offers.",
                booking_reminders_label: "Booking Reminders",
                booking_reminders_desc: "Get notified about your upcoming reservations.",
                add_account_title: "Add Account",
                add_account_desc: "Connect to save your preferences and reservations.",
                login_button: "Log in to existing account",
                create_account_button: "Create new account",
                disconnect_label: "Disconnect",
                disconnect_desc: "End the session on your current device.",
                disconnect_button: "Disconnect",
                delete_account_label: "Delete your account",
                delete_account_desc: "This action is permanent and will remove all your data.",
                delete_account_button: "Delete",
            },
            es: {
                page_title: "Configuraciones - BeachSpot",
                header_inicio: "Inicio",
                header_reservas: "Tus Reservas",
                header_perfil: "Perfil",
                header_sobre: "Sobre",
                header_config: "Configuraciones",
                main_title: "Configuraciones",
                lang_title: "Idioma",
                lang_desc: "Elija el idioma de visualización de la plataforma.",
                notifications_title: "Notificaciones",
                promo_offers_label: "Ofertas Promocionales",
                promo_offers_desc: "Reciba correos electrónicos sobre promociones y ofertas especiales.",
                booking_reminders_label: "Recordatorios de Reserva",
                booking_reminders_desc: "Reciba notificaciones sobre sus próximas reservas.",
                add_account_title: "Añadir Cuenta",
                add_account_desc: "Conéctese para guardar sus preferencias y reservas.",
                login_button: "Iniciar sesión en cuenta existente",
                create_account_button: "Crear nueva cuenta",
                disconnect_label: "Desconectar",
                disconnect_desc: "Cierre la sesión en su dispositivo actual.",
                disconnect_button: "Desconectar",
                delete_account_label: "Eliminar su cuenta",
                delete_account_desc: "Esta acción es permanente y eliminará todos sus datos.",
                delete_account_button: "Eliminar",
            }
        };

        const languageSelect = document.getElementById('language-select');

        function translatePage(lang) {
            document.documentElement.lang = lang;
            document.querySelectorAll('[data-translate]').forEach(el => {
                const key = el.dataset.translate;
                if (lang === 'pt') {
                    // Recarrega a página para voltar ao texto original do HTML
                    if (localStorage.getItem('beachspot_lang') !== 'pt') {
                        localStorage.setItem('beachspot_lang', 'pt');
                        location.reload();
                    }
                } else if (translations[lang] && translations[lang][key]) {
                    el.textContent = translations[lang][key];
                }
            });
            if (lang !== 'pt') {
                localStorage.setItem('beachspot_lang', lang);
            }
        }

        languageSelect.addEventListener('change', (e) => {
            translatePage(e.target.value);
        });
        
        // Aplica o idioma salvo ao carregar a página
        document.addEventListener('DOMContentLoaded', () => {
            const savedLang = localStorage.getItem('beachspot_lang');
            if (savedLang && savedLang !== 'pt') {
                languageSelect.value = savedLang;
                translatePage(savedLang);
            }
        });


        // --- Sistema de Toast e Modal (Genérico) ---
        const toast = document.getElementById('toast');
        const modalContainer = document.getElementById('modal');

        function showToast(message, success = true) {
            toast.textContent = message;
            toast.style.backgroundColor = success ? '#2f3640' : '#c0392b';
            toast.classList.remove('opacity-0', 'translate-y-3');
            setTimeout(() => {
                toast.classList.add('opacity-0', 'translate-y-3');
            }, 3000);
        }

        function showModal({ title, message, confirmText, onConfirm, confirmColor = 'bg-red-500', confirmHoverColor = 'hover:bg-red-600' }) {
            modalContainer.innerHTML = `
                <div class="bg-white text-gray-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-auto transform transition-transform duration-300 scale-95" id="modal-content">
                    <h2 class="text-2xl font-bold text-center mb-4">${title}</h2>
                    <p class="text-center text-gray-600 mb-8">${message}</p>
                    <div class="flex justify-center gap-4">
                        <button id="modal-confirm" class="w-full py-2 px-6 ${confirmColor} ${confirmHoverColor} text-white font-bold rounded-full">${confirmText}</button>
                        <button id="modal-cancel" class="w-full py-2 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-full">Cancelar</button>
                    </div>
                </div>
            `;
            modalContainer.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => modalContainer.querySelector('#modal-content').classList.remove('scale-95'), 10);

            const closeModal = () => {
                modalContainer.querySelector('#modal-content').classList.add('scale-95');
                modalContainer.classList.add('opacity-0');
                setTimeout(() => modalContainer.classList.add('pointer-events-none'), 300);
            };

            document.getElementById('modal-confirm').onclick = () => {
                onConfirm();
                closeModal();
            };
            document.getElementById('modal-cancel').onclick = closeModal;
        }

        // --- Event Listeners para as Configurações ---
        document.getElementById('disconnect-btn').addEventListener('click', () => {
            showModal({
                title: 'Desconectar Conta',
                message: 'Você tem certeza que quer encerrar a sessão?',
                confirmText: 'Sim, Desconectar',
                confirmColor: 'bg-amber-500',
                confirmHoverColor: 'hover:bg-amber-600',
                onConfirm: () => {
                    showToast('Você foi desconectado.');
                    // Aqui iria a lógica de logout e redirect
                }
            });
        });
        
        document.getElementById('delete-account-btn').addEventListener('click', () => {
            showModal({
                title: 'Excluir Conta',
                message: 'Esta ação é permanente e todos os seus dados serão perdidos. Tem certeza absoluta?',
                confirmText: 'Sim, Excluir',
                onConfirm: () => {
                    showToast('Conta excluída com sucesso.', false);
                    // Aqui iria a lógica de exclusão e redirect
                }
            });
        });