import { supabase } from './supabaseClient.js';

console.log('[cardapio] Script carregado');

class CardapioViewer {
    constructor() {
        this.idBarraca = null;
        this.produtos = [];
    }

    async init() {
        try {
            console.log('[CardapioViewer] Inicializando...');

            // Pegar ID da barraca da URL
            const urlParams = new URLSearchParams(window.location.search);
            this.idBarraca = urlParams.get('id');

            if (!this.idBarraca) {
                console.warn('[CardapioViewer] Sem ID na URL, exibindo produtos de exemplo');
                this.renderExemplos();
                return;
            }

            console.log('[CardapioViewer] ID da barraca:', this.idBarraca);

            // Carregar produtos do banco
            await this.loadProdutos();

        } catch (error) {
            console.error('[CardapioViewer] Erro na inicialização:', error);
            this.renderExemplos();
        }
    }

    async loadProdutos() {
        try {
            console.log('[CardapioViewer] Carregando produtos...');

            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .order('categoria', { ascending: true })
                .order('nome_produto', { ascending: true });

            if (error) throw error;

            this.produtos = produtos || [];
            console.log(`[CardapioViewer] ${this.produtos.length} produtos carregados`);

            if (this.produtos.length > 0) {
                this.renderProdutos();
            } else {
                console.log('[CardapioViewer] Nenhum produto cadastrado, exibindo exemplos');
                this.renderMensagemVazio();
            }

        } catch (error) {
            console.error('[CardapioViewer] Erro ao carregar produtos:', error);
            this.renderExemplos();
        }
    }

    renderProdutos() {
        // Agrupar produtos por categoria
        const produtosPorCategoria = {
            comidas: [],
            bebidas: [],
            outros: []
        };

        this.produtos.forEach(produto => {
            const categoria = produto.categoria || 'outros';
            if (produtosPorCategoria[categoria]) {
                produtosPorCategoria[categoria].push(produto);
            }
        });

        // Renderizar cada categoria
        Object.keys(produtosPorCategoria).forEach(categoria => {
            this.renderCategoria(categoria, produtosPorCategoria[categoria]);
        });

        console.log('[CardapioViewer] Produtos renderizados');
    }

    renderCategoria(categoria, produtos) {
        const container = document.getElementById(categoria);
        const grid = container.querySelector('.grid');

        if (!grid) {
            console.error(`[CardapioViewer] Container não encontrado: ${categoria}`);
            return;
        }

        if (produtos.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <p>Nenhum item disponível nesta categoria.</p>
                </div>
            `;
            return;
        }

        // Limpar container e adicionar produtos
        grid.innerHTML = produtos.map(produto => this.createProdutoHTML(produto)).join('');

        console.log(`[CardapioViewer] ${produtos.length} produtos renderizados em ${categoria}`);
    }

    createProdutoHTML(produto) {
        const precoFormatado = produto.preco 
            ? `R$ ${produto.preco.toFixed(2).replace('.', ',')}` 
            : 'Preço sob consulta';

        const imagemUrl = produto.imagem_url || this.getPlaceholderImage(produto.categoria);
        const descricao = produto.descricao_produto || 'Delicioso produto da casa.';

        return `
            <div class="menu-item py-4 flex items-center space-x-4">
                <img src="${imagemUrl}" 
                     alt="${produto.nome_produto}" 
                     class="w-20 h-20 rounded-md object-cover flex-shrink-0"
                     onerror="this.src='https://placehold.co/80x80/0138b4/FFFFFF?text=P'">
                <div class="flex-grow">
                    <div class="flex justify-between items-baseline">
                        <h3 class="text-lg font-semibold">${produto.nome_produto}</h3>
                        <p class="text-lg font-semibold text-blue-600">${precoFormatado}</p>
                    </div>
                    <p class="text-gray-600 text-sm mt-1">${descricao}</p>
                </div>
            </div>
        `;
    }

    getPlaceholderImage(categoria) {
        const placeholders = {
            comidas: 'https://placehold.co/80x80/0138b4/FFFFFF?text=Comida',
            bebidas: 'https://placehold.co/80x80/73bff6/FFFFFF?text=Bebida',
            outros: 'https://placehold.co/80x80/012a8c/FFFFFF?text=Produto'
        };
        return placeholders[categoria] || placeholders.outros;
    }

    renderMensagemVazio() {
        ['comidas', 'bebidas', 'outros'].forEach(categoria => {
            const container = document.getElementById(categoria);
            const grid = container.querySelector('.grid');
            
            if (grid) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-12 text-gray-500">
                        <i data-lucide="package-x" class="w-16 h-16 mx-auto mb-4 text-gray-300"></i>
                        <p class="text-lg font-medium">Cardápio em construção</p>
                        <p class="text-sm mt-2">O gestor ainda não cadastrou produtos nesta categoria.</p>
                    </div>
                `;
            }
        });

        // Recriar ícones
        lucide.createIcons();
    }

    renderExemplos() {
        console.log('[CardapioViewer] Mantendo exemplos do HTML');
        // Os exemplos já estão no HTML, então não precisa fazer nada
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[cardapio] DOM carregado');

    // Inicializar ícones
    lucide.createIcons();

    // Lógica das Abas
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Mostrar o primeiro conteúdo por padrão
    const firstTab = tabs[0];
    const firstTabContent = document.getElementById(firstTab.dataset.tab);
    if (firstTabContent) {
        firstTabContent.style.display = 'block';
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(content => {
                content.style.display = 'none';
            });

            const activeTabContent = document.getElementById(tab.dataset.tab);
            if (activeTabContent) {
                activeTabContent.style.display = 'block';
            }
        });
    });

    // Menu mobile
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!mobileMenu.classList.contains('hidden') && 
                !mobileMenu.contains(e.target) && 
                !mobileMenuBtn.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    // Inicializar visualizador do cardápio
    const viewer = new CardapioViewer();
    await viewer.init();
});