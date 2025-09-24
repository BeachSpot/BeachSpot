        // --- Ativação de Ícones e Menu Mobile ---
        lucide.createIcons();

        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        // --- Lógica das Abas "Como Funciona" ---
        const clienteBtn = document.getElementById('cliente-btn');
        const gestorBtn = document.getElementById('gestor-btn');
        const clienteSteps = document.getElementById('cliente-steps');
        const gestorSteps = document.getElementById('gestor-steps');

        clienteBtn.addEventListener('click', () => {
            clienteSteps.style.display = 'grid';
            gestorSteps.style.display = 'none';
            clienteBtn.classList.add('bg-white', 'text-blue-600');
            clienteBtn.classList.remove('bg-white/20', 'text-white');
            gestorBtn.classList.add('bg-white/20', 'text-white');
            gestorBtn.classList.remove('bg-white', 'text-blue-600');
        });

        gestorBtn.addEventListener('click', () => {
            gestorSteps.style.display = 'grid';
            clienteSteps.style.display = 'none';
            gestorBtn.classList.add('bg-white', 'text-blue-600');
            gestorBtn.classList.remove('bg-white/20', 'text-white');
            clienteBtn.classList.add('bg-white/20', 'text-white');
            clienteBtn.classList.remove('bg-white', 'text-blue-600');
        });

        function adjustInitialDisplay() {
            if (window.getComputedStyle(clienteSteps).display !== 'none') {
                clienteSteps.style.display = 'grid';
            }
            if (window.getComputedStyle(gestorSteps).display !== 'none') {
                gestorSteps.style.display = 'grid';
            } else {
                 gestorSteps.style.display = 'none';
            }
        }
        window.addEventListener('load', adjustInitialDisplay);