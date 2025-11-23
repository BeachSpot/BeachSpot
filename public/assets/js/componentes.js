// components.js - Sistema de carregamento de componentes
// Salvar em: public/assets/js/components.js

/**
 * Carrega um componente HTML e insere no elemento especificado
 * @param {string} componentPath - Caminho do arquivo do componente
 * @param {string} elementId - ID do elemento onde o componente será inserido
 */
async function loadComponent(componentPath, elementId) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Erro ao carregar componente: ${response.status}`);
        }
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    } catch (error) {
        console.error(`Erro ao carregar componente ${componentPath}:`, error);
    }
}

/**
 * Detecta automaticamente se está em Telas Clientes ou Telas Gestor
 */
function detectUserType() {
    const path = window.location.pathname;
    
    // Se estiver em Telas Gestor
    if (path.includes('/Telas Gestor/') || path.includes('/Telas%20Gestor/')) {
        return 'gestor';
    }
    
    // Se estiver em Telas Clientes
    if (path.includes('/Telas Clientes/') || path.includes('/Telas%20Clientes/')) {
        return 'cliente';
    }
    
    // Fallback: verifica o atributo data-user-type no body
    return document.body.getAttribute('data-user-type') || 'cliente';
}

/**
 * Detecta o caminho correto baseado na localização do arquivo
 */
function getComponentsPath() {
    const path = window.location.pathname;
    
    // Se estiver em Telas Clientes ou Telas Gestor, volta uma pasta
    if (path.includes('/Telas Clientes/') || path.includes('/Telas Gestor/')) {
        return '../assets/components';
    }
    
    // Se estiver na raiz de public
    return './assets/components';
}

/**
 * Inicializa os componentes da página
 * @param {string} userType - Tipo de usuário: 'cliente' ou 'gestor' (opcional)
 */
async function initComponents(userType = null) {
    // Detecta automaticamente se não foi especificado
    if (!userType) {
        userType = detectUserType();
    }
    
    const basePath = getComponentsPath();
    
    console.log(`[COMPONENTS] Carregando componentes para: ${userType}`);
    
    // Carrega header baseado no tipo de usuário
    const headerPath = userType === 'gestor' 
        ? `${basePath}/header-gestor.html` 
        : `${basePath}/header-cliente.html`;
    
    await loadComponent(headerPath, 'header-container');
    await loadComponent(`${basePath}/footer.html`, 'footer-container');
    
    // Aguarda os componentes serem inseridos
    setTimeout(() => {
        // Re-inicializa os ícones do Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            console.log('[COMPONENTS] Ícones Lucide inicializados');
        }
        
        // Configura o menu mobile após carregar o header
        setupMobileMenu(userType);
        
        // Configura os links do footer baseado no tipo de usuário
        setupFooterLinks(userType);
        
        console.log('[COMPONENTS] ✅ Componentes carregados com sucesso');
    }, 100);
}

/**
 * Configura o menu mobile
 * @param {string} userType - Tipo de usuário
 */
function setupMobileMenu(userType) {
    const menuButtonId = userType === 'gestor' ? 'mobile-menu-btn' : 'mobile-menu-button';
    const menuDropdownId = userType === 'gestor' ? 'mobile-menu' : 'mobile-menu-dropdown';
    
    const menuButton = document.getElementById(menuButtonId);
    const menuDropdown = document.getElementById(menuDropdownId);
    const menuContainer = document.getElementById('mobile-menu-container');

    if (menuButton && menuDropdown) {
        menuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            menuDropdown.classList.toggle('hidden');
        });

        window.addEventListener('click', (event) => {
            const targetContainer = menuContainer || menuButton.parentElement;
            if (targetContainer && !targetContainer.contains(event.target)) {
                menuDropdown.classList.add('hidden');
            }
        });
        
        console.log('[COMPONENTS] Menu mobile configurado');
    }
}

/**
 * Configura os links do footer baseado no tipo de usuário
 * @param {string} userType - Tipo de usuário
 */
function setupFooterLinks(userType) {
    const footerNav = document.getElementById('footer-nav-links');
    if (!footerNav) return;

    const linksCliente = [
        { href: 'inicio.html', text: 'Início' },
        { href: 'suasReservas.html', text: 'Suas Reservas' },
        { href: 'configuracoes.html', text: 'Configurações' },
        { href: 'perfilCliente.html', text: 'Perfil' }
    ];

    const linksGestor = [
        { href: 'inicioGestor.html', text: 'Início' },
        { href: 'gestaoBarraca.html', text: 'Gerenciar Barracas' },
        { href: 'cadastroBarraca.html', text: 'Cadastrar Barracas' },
        { href: 'configuracoesGestor.html', text: 'Configurações' },
        { href: 'perfilGestor.html', text: 'Perfil' }
    ];

    const links = userType === 'gestor' ? linksGestor : linksCliente;
    
    footerNav.innerHTML = links.map(link => 
        `<li><a href="${link.href}" class="hover:text-blue-600 transition-colors">${link.text}</a></li>`
    ).join('');
}

// Exporta as funções
window.ComponentLoader = {
    init: initComponents,
    load: loadComponent,
    detectUserType: detectUserType
};

// Auto-inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('[COMPONENTS] Inicializando sistema de componentes...');
    initComponents();
});