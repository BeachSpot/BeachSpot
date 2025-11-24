import { supabase } from './supabaseClient.js';
import { getUserProfile, checkAuthentication } from './getUserProfile.js';

console.log('[inicioGestor] Script carregado');

/**
 * Classe para gerenciar a página inicial do gestor
 */

function showNotification(message, type = 'default') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    // Remove classes anteriores
    notification.classList.remove('error', 'success');
    
    // Adiciona classe se for erro ou sucesso
    if (type === 'error') {
        notification.classList.add('error');
    } else if (type === 'success') {
        notification.classList.add('success');
    }

    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

class InicioGestorManager {
    constructor() {
        this.idGestor = null;
        this.barracas = [];
        this.userData = null;
    }

    async init() {
        try {
            console.log('[InicioGestor] Inicializando...');

            // Verificar autenticação
            const isAuthenticated = await checkAuthentication('../entrar.html');
            if (!isAuthenticated) return;

            // Buscar dados do gestor
            this.userData = await getUserProfile();

            if (!this.userData) {
                showNotification('Erro ao carregar dados do usuário.');
                window.location.href = '../entrar.html';
                return;
            }

            // Verificar se é gestor
            if (this.userData.tipo_conta !== 'gestor') {
                console.warn('[InicioGestor] Usuário não é gestor');
                window.location.href = '../Telas Clientes/inicio.html';
                return;
            }

            this.idGestor = this.userData.id_usuario;
            console.log('[InicioGestor] Gestor ID:', this.idGestor);

            // Dentro do método init() da classe, após definir this.idGestor
            const { data: gestor } = await supabase
                .from('gestor')
                .select('nome, foto_perfil, avatar_url')
                .eq('id_gestor', this.idGestor)
                .single();

            if (gestor) {
                updateHeaderAvatar(gestor);
            }
            // Atualizar nome do gestor no header
            this.updateGestorName();

            updateHeaderAvatar(this.userData);
            // Carregar barracas
            await this.loadBarracas();

        } catch (error) {
            console.error('[InicioGestor] Erro na inicialização:', error);
            showNotification('Erro ao carregar a página. Tente novamente.');
        }
    }

    updateGestorName() {
        // Atualizar o título com o nome do gestor
        const welcomeTitle = document.querySelector('main h1');
        if (welcomeTitle && this.userData && this.userData.nome) {
            const firstName = this.userData.nome.trim().split(' ')[0];
            welcomeTitle.textContent = `Bem-vindo, ${firstName}`;
            console.log('[InicioGestor] Nome atualizado para:', firstName);
        } else {
            console.warn('[InicioGestor] Não foi possível atualizar o nome do gestor');
        }

        // Atualizar avatar do header
        const avatarImg = document.querySelector('header img[alt="Avatar do Gestor"]');
        if (avatarImg && this.userData) {
            if (this.userData.foto_perfil) {
                // Verificar se é uma URL válida ou caminho do Supabase Storage
                const fotoUrl = this.userData.foto_perfil;

                // Se for um caminho relativo, tentar construir URL do Supabase
                if (!fotoUrl.startsWith('http')) {
                    // Assumir que está no Supabase Storage
                    const { data } = supabase.storage
                        .from('perfis') // ajuste o bucket conforme necessário
                        .getPublicUrl(fotoUrl);

                    avatarImg.src = data.publicUrl;
                } else {
                    avatarImg.src = fotoUrl;
                }

                // Fallback em caso de erro ao carregar
                avatarImg.onerror = () => {
                    const initials = this.userData.nome.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                    avatarImg.src = `https://placehold.co/40x40/0138b4/FFFFFF?text=${initials}`;
                };
            } else if (this.userData.nome) {
                const initials = this.userData.nome.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                avatarImg.src = `https://placehold.co/40x40/0138b4/FFFFFF?text=${initials}`;
            }
        }
    }

    async loadBarracas() {
        try {
            console.log('[InicioGestor] Carregando barracas...');

            const { data: barracas, error } = await supabase
                .from('barracas')
                .select('*')
                .eq('id_gestor', this.idGestor)
                .order('data_cadastro', { ascending: false });

            if (error) throw error;

            this.barracas = barracas || [];
            console.log(`[InicioGestor] ${this.barracas.length} barracas carregadas`);

            this.renderBarracas();

        } catch (error) {
            console.error('[InicioGestor] Erro ao carregar barracas:', error);
            showNotification('Erro ao carregar suas barracas.');
        }
    }

    renderBarracas() {
        const container = document.querySelector('section .flex.justify-center.flex-wrap');
        if (!container) {
            console.error('[InicioGestor] Container não encontrado');
            return;
        }

        // Limpar container (remover barracas de exemplo)
        container.innerHTML = '';

        // Se não houver barracas, mostrar mensagem
        if (this.barracas.length === 0) {
            container.innerHTML = `
                <div class="w-full text-center py-12">
                    <div class="bg-white text-gray-800 rounded-xl p-8 max-w-md mx-auto">
                        <i data-lucide="package-x" class="w-16 h-16 mx-auto mb-4 text-gray-400"></i>
                        <h3 class="text-2xl font-bold mb-2">Nenhuma Barraca Cadastrada</h3>
                        <p class="text-gray-600 mb-6">Comece cadastrando sua primeira barraca para gerenciar suas reservas e produtos.</p>
                        <a href="cadastroBarraca.html" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition">
                            Cadastrar Primeira Barraca
                        </a>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Renderizar cada barraca
        this.barracas.forEach(barraca => {
            const barracaCard = this.createBarracaCard(barraca);
            container.insertAdjacentHTML('beforeend', barracaCard);
        });

        // Adicionar card para cadastrar nova barraca
        const addNewCard = this.createAddNewCard();
        container.insertAdjacentHTML('beforeend', addNewCard);

        // Recriar ícones
        lucide.createIcons();
    }

    createBarracaCard(barraca) {
        const fotoDestaque = barraca.foto_destaque || 'https://placehold.co/600x400/0138b4/FFFFFF?text=' + encodeURIComponent(barraca.nome_barraca);
        const descricao = barraca.descricao_barraca || 'Sem descrição disponível.';
        const localizacao = barraca.localizacao || 'Localização não informada';

        // Limitar descrição a 80 caracteres
        const descricaoCurta = descricao.length > 80
            ? descricao.substring(0, 80) + '...'
            : descricao;

        return `
            <div class="w-full max-w-sm">
                <div class="relative bg-white text-gray-800 rounded-xl overflow-hidden group w-full h-full transform transition-transform hover:scale-105 shadow-lg">
                    <img src="${fotoDestaque}" 
                         alt="Imagem da barraca ${barraca.nome_barraca}" 
                         class="w-full h-48 object-cover"
                         onerror="this.src='https://placehold.co/600x400/0138b4/FFFFFF?text=${encodeURIComponent(barraca.nome_barraca)}'">
                    
                    <!-- Badge de status -->
                    <div class="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        <i data-lucide="check-circle" class="w-3 h-3 inline mr-1"></i>
                        Ativa
                    </div>

                    <div class="p-5 flex flex-col justify-between" style="min-height: 14rem;">
                        <div>
                            <h3 class="text-2xl font-bold text-center mb-2">${barraca.nome_barraca}</h3>
                            <p class="text-sm text-gray-600 mb-2 text-center">${descricaoCurta}</p>
                            <div class="flex items-center justify-center text-xs text-gray-500 mb-4">
                                <i data-lucide="map-pin" class="w-3 h-3 mr-1"></i>
                                <span>${localizacao}</span>
                            </div>
                        </div>
                        <a href="gestaoBarraca.html?id=${barraca.id_barraca}" 
                           class="block w-full text-center bg-[#1985d4] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-full transition text-lg">
                            Gerenciar Barraca
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    createAddNewCard() {
        return `
            <div class="w-full max-w-sm">
                <div class="relative bg-white text-gray-800 rounded-xl overflow-hidden group w-full h-full transform transition-transform hover:scale-105 shadow-lg border-2 border-dashed border-gray-300">
                    <div class="flex items-center justify-center h-48 bg-gray-100">
                        <i data-lucide="plus-circle" class="w-20 h-20 text-gray-400"></i>
                    </div>
                    <div class="p-5 flex flex-col justify-between" style="min-height: 14rem;">
                        <div>
                            <h3 class="text-2xl font-bold text-center mb-2">Cadastrar Nova Barraca</h3>
                            <p class="text-sm text-gray-600 mb-4 text-center">Adicione e gerencie uma nova barraca para expandir seus negócios.</p>
                        </div>
                        <a href="cadastroBarraca.html" 
                           class="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-full transition text-lg">
                            <i data-lucide="plus" class="w-5 h-5 inline mr-2"></i>
                            Cadastrar Barraca
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
}

function updateHeaderAvatar(profileData) {
    const headerAvatar = document.getElementById('header-avatar');

    if (!headerAvatar || !profileData) return;

    let fotoUrl = profileData.foto_perfil || profileData.avatar_url;

    if (fotoUrl && !fotoUrl.startsWith('http')) {
        const { data } = supabase
            .storage
            .from('media')
            .getPublicUrl(fotoUrl);
        fotoUrl = data?.publicUrl;
    }

    if (!fotoUrl) {
        const iniciais = profileData.nome
            .split(' ')
            .filter(w => w.length > 0)
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        fotoUrl = `https://placehold.co/40x40/0138b4/FFFFFF?text=${iniciais}`;
    }

    headerAvatar.src = fotoUrl;
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[inicioGestor] DOM carregado');

    // Inicializar ícones do Lucide
    lucide.createIcons();


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

    // Inicializar gerenciador
    const manager = new InicioGestorManager();
    await manager.init();
});