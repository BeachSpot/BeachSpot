import { supabase } from './supabaseClient.js';
import { checkAuthentication } from './getUserProfile.js';
import { reservationPolicies } from './reservationPolicies.js';
console.log('[gestaoBarraca] Script Unificado Carregado');

/**
 * Classe para gerenciar a página de gestão da barraca
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

class GestaoBarracaManager {
    constructor() {
        this.idBarraca = null;
        this.barracaData = null;
        this.promocoes = [];
        this.reservas = [];
        this.atividades = [];
        this.filtroAtividades = 'todas';
        this.currentTab = 'dashboard';
        this.promotionToDelete = null;
        this.userId = null;
        this.mesasOcupadas = 0;

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Elementos das abas
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Modal de promoção
        this.promotionModal = document.getElementById('promotion-modal');
        this.promotionForm = document.getElementById('promotion-form');
        this.addPromotionBtn = document.getElementById('add-promotion-btn');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.cancelModalBtn = document.getElementById('cancel-modal-btn');

        // Modal de confirmação de exclusão de promoção
        this.confirmDeleteModal = document.getElementById('confirm-delete-modal');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');

        // Filtro de atividades
        this.filtroAtividadesSelect = document.getElementById('filtro-atividades');
    }

    initEventListeners() {
        // Abas
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Modal de promoção
        if (this.addPromotionBtn) {
            this.addPromotionBtn.addEventListener('click', () => this.openPromotionModal());
        }

        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closePromotionModal());
        }

        if (this.cancelModalBtn) {
            this.cancelModalBtn.addEventListener('click', () => this.closePromotionModal());
        }

        if (this.promotionForm) {
            this.promotionForm.addEventListener('submit', (e) => this.handlePromotionSubmit(e));
        }

        // Modal de exclusão
        if (this.cancelDeleteBtn) {
            this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        }

        if (this.confirmDeleteBtn) {
            this.confirmDeleteBtn.addEventListener('click', () => this.confirmDeletePromotion());
        }

        // Filtro de atividades
        if (this.filtroAtividadesSelect) {
            this.filtroAtividadesSelect.addEventListener('change', (e) => {
                this.filtroAtividades = e.target.value;
                this.renderAtividades();
            });
        }

        // Delegação de eventos para editar e deletar promoções
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-promotion-btn')) {
                const btn = e.target.closest('.edit-promotion-btn');
                const id = btn.dataset.id;
                this.editPromotion(id);
            }

            if (e.target.closest('.delete-promotion-btn')) {
                const btn = e.target.closest('.delete-promotion-btn');
                const id = btn.dataset.id;
                this.deletePromotion(id);
            }
        });
    }

    async init() {
        try {
            console.log('[GestaoBarraca] Inicializando...');

            // Verificar autenticação
            const isAuthenticated = await checkAuthentication('../entrar.html');
            if (!isAuthenticated) return;

            // Obter sessão atual do Supabase
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('[GestaoBarraca] Erro ao obter sessão:', sessionError);
                window.location.href = '../entrar.html';
                return;
            }

            if (!session || !session.user) {
                console.warn('[GestaoBarraca] Usuário não autenticado');
                window.location.href = '../entrar.html';
                return;
            }

            this.userId = session.user.id;
            console.log('[GestaoBarraca] Usuário autenticado:', this.userId);


            // Pegar ID da barraca da URL
            const urlParams = new URLSearchParams(window.location.search);
            const barracaIdUrl = urlParams.get('id');

            if (!barracaIdUrl) {
                console.warn('[GestaoBarraca] ID da barraca não especificado. Redirecionando...');
                showNotification('ID da barraca não especificado. Redirecionando...');
                window.location.href = './inicioGestor.html';
                return;
            }

            this.idBarraca = barracaIdUrl;
            console.log('[GestaoBarraca] ID da barraca:', this.idBarraca);

            const { data: gestor } = await supabase
                .from('gestor')
                .select('nome, foto_perfil, avatar_url')
                .eq('id_gestor', this.userId)
                .single();

            if (gestor) {
                updateHeaderAvatar(gestor);
            }

            // Carregar dados da barraca
            await this.loadBarracaData();

            // Carregar promoções
            await this.loadPromocoes();

            // Carregar estatísticas e reservas
            await this.loadDashboardStats();

            // Carregar todas as atividades
            await this.loadTodasAtividades();

        } catch (error) {
            console.error('[GestaoBarraca] Erro na inicialização:', error);
            showNotification('Erro ao carregar dados da barraca.');
        }
    }

    async loadBarracaData() {
        try {
            console.log('[GestaoBarraca] Carregando dados da barraca...');

            const { data: barraca, error } = await supabase
                .from('barracas')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .eq('id_gestor', this.userId)
                .single();

            if (error) throw error;

            if (!barraca) {
                throw new Error('Barraca não encontrada ou você não tem permissão para acessá-la.');
            }

            this.barracaData = barraca;
            console.log('[GestaoBarraca] Dados carregados:', barraca);

            // Atualizar UI com dados da barraca
            this.updateBarracaInfo();
            this.atualizarLinksComIdBarraca();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao carregar barraca:', error);
            showNotification('Erro ao carregar informações da barraca.');
            window.location.href = './inicioGestor.html';
        }
    }

    updateBarracaInfo() {
        // Atualizar título e subtítulo
        const titleElement = document.querySelector('section h1');
        const subtitleElement = document.querySelector('section p');

        if (titleElement) {
            titleElement.textContent = 'Painel de Gestão';
        }

        if (subtitleElement) {
            subtitleElement.textContent = `Administre sua barraca ${this.barracaData.nome_barraca}`;
        }
    }

    async loadDashboardStats() {
        try {
            console.log('[GestaoBarraca] Carregando estatísticas...');

            // Carregar reservas do dia
            await this.loadReservasHoje();

            // Carregar todas as reservas para a aba de reservas
            await this.loadTodasReservas();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao carregar estatísticas:', error);
        }
    }

    async loadReservasHoje() {
        try {
            // MODO DEBUG: Descomente a linha abaixo para testar com outra data
            // const dataTestDebug = '2025-11-28'; // Coloque a data que quiser testar

            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const dia = String(hoje.getDate()).padStart(2, '0');

            // Se tiver data de debug, usa ela, senão usa hoje
            const dataHoje = typeof dataTestDebug !== 'undefined' ? dataTestDebug : `${ano}-${mes}-${dia}`;

            console.log('[GestaoBarraca] Buscando reservas para:', dataHoje);

            // Buscar todas as reservas
            const { data: todasReservas, error: errorTodas } = await supabase
                .from('reservas')
                .select('*')
                .eq('id_barraca', this.idBarraca);

            if (errorTodas) {
                console.error('[GestaoBarraca] Erro ao buscar reservas:', errorTodas);
                throw errorTodas;
            }

            console.log('[GestaoBarraca] TODAS as reservas da barraca:', todasReservas);

            // Filtrar reservas do dia (compara apenas a parte da data)
            const reservasDoDia = todasReservas?.filter(reserva => {
                // Extrai apenas a data (YYYY-MM-DD) do timestamp
                const dataReserva = reserva.data_reserva.split('T')[0];
                console.log('[GestaoBarraca] Comparando:', dataReserva, '===', dataHoje, '?', dataReserva === dataHoje);
                return dataReserva === dataHoje;
            }) || [];

            console.log('[GestaoBarraca] Reservas filtradas do dia:', reservasDoDia);

            // Contar total de reservas do dia
            const reservasHoje = reservasDoDia.length;

            // Filtrar apenas confirmadas para ocupação
            const reservasConfirmadas = reservasDoDia.filter(r => {
                console.log('[GestaoBarraca] Status da reserva:', r.status, '- É confirmada?', r.status === 'confirmada');
                return r.status === 'confirmada';
            });

            console.log('[GestaoBarraca] Reservas CONFIRMADAS:', reservasConfirmadas);

            console.log('[GestaoBarraca] Resumo - Reservas hoje:', {
                total: reservasHoje,
                confirmadas: reservasConfirmadas.length,
                data: dataHoje,
                todasReservas: todasReservas?.length || 0
            });

            // Atualizar UI - Card de Reservas Hoje
            const reservasCard = document.querySelector('.bg-gray-50.p-4');
            if (reservasCard) {
                const valueElement = reservasCard.querySelector('.text-2xl.font-bold');
                if (valueElement) {
                    valueElement.textContent = reservasHoje;
                    console.log('[GestaoBarraca] UI atualizada - Reservas Hoje:', reservasHoje);
                }
            } else {
                console.warn('[GestaoBarraca] Card de reservas não encontrado!');
            }

            // Atualizar ocupação AUTOMÁTICA baseada nas reservas confirmadas do dia
            await this.updateOcupacaoAutomatica(reservasConfirmadas);

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao carregar reservas hoje:', error);
        }
    }

    async updateOcupacaoAutomatica(reservasConfirmadas) {
        console.log('[updateOcupacaoAutomatica] Iniciando com:', reservasConfirmadas);

        if (!this.barracaData?.capacidade_mesas) {
            console.warn('[updateOcupacaoAutomatica] Barraca sem capacidade definida');
            this.renderOcupacaoSemCapacidade();
            return;
        }

        // Calcular mesas ocupadas baseado no número de pessoas das reservas CONFIRMADAS
        // Assumindo média de 4 pessoas por mesa
        const pessoasTotal = reservasConfirmadas.reduce((sum, r) => {
            console.log('[updateOcupacaoAutomatica] Somando pessoas:', r.num_pessoas);
            return sum + (r.num_pessoas || 0);
        }, 0);

        const mesasOcupadas = Math.ceil(pessoasTotal / 4);

        this.mesasOcupadas = Math.min(mesasOcupadas, this.barracaData.capacidade_mesas);

        console.log('[GestaoBarraca] Ocupação automática calculada:', {
            reservasConfirmadas: reservasConfirmadas.length,
            pessoasTotal,
            mesasCalculadas: mesasOcupadas,
            mesasOcupadas: this.mesasOcupadas,
            capacidade: this.barracaData.capacidade_mesas,
            percentual: Math.round((this.mesasOcupadas / this.barracaData.capacidade_mesas) * 100) + '%'
        });

        this.renderOcupacao();
    }

    renderOcupacao() {
        const ocupacaoCard = document.getElementById('ocupacao-card');
        if (!ocupacaoCard) return;

        const capacidade = this.barracaData.capacidade_mesas;
        const ocupadas = this.mesasOcupadas;
        const percentual = Math.round((ocupadas / capacidade) * 100);

        // Determinar cor baseada na ocupação
        let bgColor = 'bg-green-50';
        let textColor = 'text-green-600';
        let iconBg = 'bg-green-100';

        if (percentual >= 90) {
            bgColor = 'bg-red-50';
            textColor = 'text-red-600';
            iconBg = 'bg-red-100';
        } else if (percentual >= 70) {
            bgColor = 'bg-yellow-50';
            textColor = 'text-yellow-600';
            iconBg = 'bg-yellow-100';
        }

        ocupacaoCard.className = `${bgColor} p-4 rounded-xl border border-gray-200 flex items-center gap-3`;

        ocupacaoCard.innerHTML = `
            <div class="${iconBg} ${textColor} p-2 rounded-full">
                <i data-lucide="users" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-gray-500 text-sm">Ocupação Atual</p>
                <p class="text-2xl font-bold ${textColor}">${percentual}%</p>
                <p class="text-xs mt-0.5 text-gray-600">${ocupadas} de ${capacidade} mesas</p>
            </div>
        `;

        lucide.createIcons();
    }

    renderOcupacaoSemCapacidade() {
        const ocupacaoCard = document.getElementById('ocupacao-card');
        if (!ocupacaoCard) return;

        ocupacaoCard.className = 'bg-yellow-50 p-4 rounded-xl border border-gray-200 flex items-center gap-3';
        ocupacaoCard.innerHTML = `
            <div class="bg-yellow-100 text-yellow-600 p-2 rounded-full">
                <i data-lucide="alert-circle" class="w-5 h-5"></i>
            </div>
            <div>
                <p class="text-gray-500 text-sm">Capacidade</p>
                <p class="text-sm text-yellow-600 font-semibold">Configure no cadastro</p>
            </div>
        `;
        lucide.createIcons();
    }

    async loadTodasAtividades() {
        try {
            console.log('[GestaoBarraca] Carregando todas as atividades...');

            this.atividades = [];

            // 1. Carregar reservas (usando data_reserva ao invés de created_at)
            const { data: reservas, error: errorReservas } = await supabase
                .from('reservas')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .order('data_reserva', { ascending: false })
                .limit(50);

            if (!errorReservas && reservas) {
                reservas.forEach(reserva => {
                    const nomeCliente = this.extrairNomeCliente(reserva);

                    if (reserva.status === 'cancelada') {
                        this.atividades.push({
                            tipo: 'cancelamento',
                            data: reserva.data_reserva, // Usar data_reserva
                            descricao: `Reserva de <span class="font-semibold">${nomeCliente}</span> foi cancelada`,
                            icon: 'calendar-x',
                            bgColor: 'bg-red-100',
                            textColor: 'text-red-600'
                        });
                    } else if (reserva.status === 'confirmada') {
                        this.atividades.push({
                            tipo: 'reserva',
                            data: reserva.data_reserva,
                            descricao: `Reserva de <span class="font-semibold">${nomeCliente}</span> foi confirmada para ${reserva.num_pessoas} pessoa${reserva.num_pessoas > 1 ? 's' : ''}`,
                            icon: 'check-circle',
                            bgColor: 'bg-green-100',
                            textColor: 'text-green-600'
                        });
                    } else if (reserva.status === 'pendente') {
                        this.atividades.push({
                            tipo: 'reserva',
                            data: reserva.data_reserva,
                            descricao: `Nova reserva de <span class="font-semibold">${nomeCliente}</span> para ${reserva.num_pessoas} pessoa${reserva.num_pessoas > 1 ? 's' : ''}`,
                            icon: 'user-plus',
                            bgColor: 'bg-blue-100',
                            textColor: 'text-blue-600'
                        });
                    }
                });
            }

            // 2. Carregar avaliações (usando data_avaliacao ao invés de created_at)
            const { data: avaliacoes, error: errorAvaliacoes } = await supabase
                .from('avaliacoes')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .order('data_avaliacao', { ascending: false })
                .limit(20);

            if (!errorAvaliacoes && avaliacoes) {
                avaliacoes.forEach(avaliacao => {
                    // Buscar nome do usuário (se precisar, fazer join com tabela usuarios)
                    const nomeCliente = 'Cliente'; // Placeholder, ajuste conforme sua estrutura

                    this.atividades.push({
                        tipo: 'avaliacao',
                        data: avaliacao.data_avaliacao,
                        descricao: `Nova avaliação de ${avaliacao.nota} estrela${avaliacao.nota > 1 ? 's' : ''}${avaliacao.comentario ? ': "' + avaliacao.comentario.substring(0, 50) + '..."' : ''}`,
                        icon: 'star',
                        bgColor: 'bg-yellow-100',
                        textColor: 'text-yellow-600'
                    });
                });
            }

            // Ordenar todas as atividades por data (mais recente primeiro)
            this.atividades.sort((a, b) => new Date(b.data) - new Date(a.data));

            console.log(`[GestaoBarraca] ${this.atividades.length} atividades carregadas`);
            this.renderAtividades();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao carregar atividades:', error);
            this.renderAtividades();
        }
    }

    extrairNomeCliente(reserva) {
        if (reserva.participantes && Array.isArray(reserva.participantes) && reserva.participantes.length > 0) {
            const nome = reserva.participantes[0];
            const primeiroNome = nome.split(' ')[0];
            const palavras = nome.split(' ');
            const inicial = palavras.length > 1 ? palavras[palavras.length - 1].charAt(0).toUpperCase() : '';
            return `${primeiroNome}${inicial ? ' ' + inicial + '.' : ''}`;
        }
        return 'Cliente';
    }

    renderAtividades() {
        const container = document.getElementById('lista-atividades');
        if (!container) return;

        // Filtrar atividades
        let atividadesFiltradas = this.atividades;

        if (this.filtroAtividades !== 'todas') {
            const mapeamentoFiltros = {
                'reservas': 'reserva',
                'cancelamentos': 'cancelamento',
                'avaliacoes': 'avaliacao',
                'favoritos': 'favorito'
            };

            atividadesFiltradas = this.atividades.filter(a =>
                a.tipo === mapeamentoFiltros[this.filtroAtividades]
            );
        }

        if (atividadesFiltradas.length === 0) {
            container.innerHTML = `
                <li class="text-center text-gray-500 py-4">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-gray-300"></i>
                    <p>Nenhuma atividade encontrada</p>
                </li>
            `;
            lucide.createIcons();
            return;
        }

        // Limitar a 10 atividades mais recentes
        const atividadesLimitadas = atividadesFiltradas.slice(0, 10);

        container.innerHTML = atividadesLimitadas.map(ativ => {
            const tempo = this.formatarTempoAtras(ativ.data);

            return `
                <li class="flex items-center gap-3">
                    <div class="${ativ.bgColor} ${ativ.textColor} p-2 rounded-full flex-shrink-0">
                        <i data-lucide="${ativ.icon}" class="w-4 h-4"></i>
                    </div>
                    <p class="text-gray-600 flex-1">${ativ.descricao}</p>
                    <span class="text-xs text-gray-400 whitespace-nowrap">${tempo}</span>
                </li>
            `;
        }).join('');

        lucide.createIcons();
    }

    formatarTempoAtras(dataISO) {
        const agora = new Date();
        const data = new Date(dataISO);
        const diffMs = agora - data;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHoras = Math.floor(diffMs / 3600000);
        const diffDias = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'agora';
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHoras < 24) return `${diffHoras}h atrás`;
        if (diffDias === 1) return 'ontem';
        if (diffDias < 7) return `${diffDias} dias atrás`;
        return data.toLocaleDateString('pt-BR');
    }

    async loadTodasReservas() {
        try {
            console.log('[GestaoBarraca] Carregando todas as reservas...');

            const { data: reservas, error } = await supabase
                .from('reservas')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .order('data_reserva', { ascending: false })
                .order('data_inicio', { ascending: false });

            if (error) throw error;

            this.reservas = reservas || [];
            console.log(`[GestaoBarraca] ${this.reservas.length} reservas carregadas`);

            this.renderReservas();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao carregar reservas:', error);
            this.reservas = [];
            this.renderReservas();
        }
    }

    renderReservas() {
        const tbody = document.querySelector('#reservas tbody');
        if (!tbody) return;

        if (this.reservas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                        <i data-lucide="calendar-x" class="w-12 h-12 mx-auto mb-2 text-gray-300"></i>
                        <p>Nenhuma reserva encontrada</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        // Debug: Verificar formato da primeira reserva
        if (this.reservas.length > 0) {
            console.log('[DEBUG] Exemplo de reserva:', {
                data_reserva: this.reservas[0].data_reserva,
                data_inicio: this.reservas[0].data_inicio,
                data_fim: this.reservas[0].data_fim,
                num_pessoas: this.reservas[0].num_pessoas,
                participantes: this.reservas[0].participantes,
                status: this.reservas[0].status
            });
        }

        tbody.innerHTML = this.reservas.map(reserva => {
            const nomeCliente = this.extrairNomeClienteCompleto(reserva);
            const dataFormatada = this.formatarDataSimples(reserva.data_reserva);
            const horarioCompleto = this.formatarHorarioCompleto(reserva.data_inicio, reserva.data_fim);
            const status = this.getStatusBadge(reserva.status);
            const podeConfirmar = reserva.status === 'pendente';
            const podeCancelar = reserva.status === 'pendente' || reserva.status === 'confirmada';

            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900">${nomeCliente}</div>
                        ${reserva.participantes && reserva.participantes.length > 1 ?
                    `<div class="text-xs text-gray-500 mt-1">+${reserva.participantes.length - 1} acompanhante${reserva.participantes.length > 2 ? 's' : ''}</div>`
                    : ''}
                    </td>
                    <td class="px-6 py-4">${dataFormatada}</td>
                    <td class="px-6 py-4">
                        <div class="text-sm">${horarioCompleto}</div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1">
                            <i data-lucide="users" class="w-4 h-4 text-gray-400"></i>
                            ${reserva.num_pessoas || '-'}
                        </span>
                    </td>
                    <td class="px-6 py-4">${status}</td>
                    <td class="px-6 py-4">
                        <div class="flex justify-center gap-2">
                            ${podeConfirmar ? `
                                <button class="confirm-reserva-btn text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50 transition" 
                                        data-id="${reserva.id_reserva}" 
                                        title="Confirmar reserva">
                                    <i data-lucide="check-circle" class="w-5 h-5 pointer-events-none"></i>
                                </button>
                            ` : `
                                <button class="text-gray-300 cursor-not-allowed p-2" disabled title="Reserva já confirmada">
                                    <i data-lucide="check-circle" class="w-5 h-5"></i>
                                </button>
                            `}
                            
                            ${podeCancelar ? `
                                <button class="cancel-reserva-btn text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition" 
                                        data-id="${reserva.id_reserva}"
                                        title="Cancelar reserva">
                                    <i data-lucide="x-circle" class="w-5 h-5 pointer-events-none"></i>
                                </button>
                            ` : `
                                <button class="text-gray-300 cursor-not-allowed p-2" disabled title="Não pode cancelar">
                                    <i data-lucide="x-circle" class="w-5 h-5"></i>
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons();
        this.addReservaActionListeners();
    }

    formatarDataSimples(dataReserva) {
        // Criar data a partir do formato do Supabase
        let data;

        if (dataReserva.includes('T')) {
            data = new Date(dataReserva);
        } else {
            data = new Date(dataReserva + 'T00:00:00');
        }

        if (isNaN(data.getTime())) {
            return 'Data inválida';
        }

        return data.toLocaleDateString('pt-BR');
    }

    formatarHorarioCompleto(dataInicio, dataFim) {
        if (!dataInicio) {
            return '<span class="text-gray-400">Não especificado</span>';
        }

        const inicio = new Date(dataInicio);

        if (isNaN(inicio.getTime())) {
            return '<span class="text-gray-400">Horário inválido</span>';
        }

        const horaInicio = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (dataFim) {
            const fim = new Date(dataFim);

            if (!isNaN(fim.getTime())) {
                const horaFim = fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return `<span class="font-medium">${horaInicio}</span> <span class="text-gray-400">até</span> <span class="font-medium">${horaFim}</span>`;
            }
        }

        return `<span class="font-medium">${horaInicio}</span>`;
    }

    extrairNomeClienteCompleto(reserva) {
        if (reserva.participantes && Array.isArray(reserva.participantes) && reserva.participantes.length > 0) {
            return reserva.participantes[0];
        }
        return 'Cliente';
    }

    formatarDataHora(dataReserva, dataInicio) {
        // Criar data a partir do formato do Supabase
        let data;

        // Se dataReserva já vier como timestamp completo
        if (dataReserva.includes('T')) {
            data = new Date(dataReserva);
        } else {
            // Se vier apenas como data (YYYY-MM-DD)
            data = new Date(dataReserva + 'T00:00:00');
        }

        // Verificar se a data é válida
        if (isNaN(data.getTime())) {
            console.error('[formatarDataHora] Data inválida:', dataReserva);
            return 'Data inválida';
        }

        const dataFormatada = data.toLocaleDateString('pt-BR');

        if (dataInicio) {
            const inicio = new Date(dataInicio);

            // Verificar se dataInicio é válido
            if (isNaN(inicio.getTime())) {
                return dataFormatada; // Retorna só a data se o horário for inválido
            }

            const hora = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `${dataFormatada} ${hora}`;
        }

        return dataFormatada;
    }

    getStatusBadge(status) {
        const badges = {
            'pendente': '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Pendente</span>',
            'confirmada': '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Confirmada</span>',
            'cancelada': '<span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Cancelada</span>',
            'concluida': '<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Concluída</span>'
        };

        return badges[status] || '<span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Desconhecido</span>';
    }

    addReservaActionListeners() {
        // Confirmar reserva
        document.querySelectorAll('.confirm-reserva-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reservaId = btn.dataset.id;
                if (confirm('Confirmar esta reserva?')) {
                    await this.confirmarReserva(reservaId);
                }
            });
        });

        // Cancelar reserva
        document.querySelectorAll('.cancel-reserva-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reservaId = btn.dataset.id;
                if (confirm('Tem certeza que deseja cancelar esta reserva?')) {
                    await this.cancelarReserva(reservaId);
                }
            });
        });
    }

    async confirmarReserva(reservaId) {
        try {
            const { error } = await supabase
                .from('reservas')
                .update({
                    status: 'confirmada'
                })
                .eq('id_reserva', reservaId);

            if (error) throw error;

            this.showToast('Reserva confirmada com sucesso! ✅');
            await this.loadDashboardStats();
            await this.loadTodasAtividades();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao confirmar reserva:', error);
            showNotification('Erro ao confirmar reserva.');
        }
    }

    async cancelarReserva(reservaId) {
        try {
            const { error } = await supabase
                .from('reservas')
                .update({
                    status: 'cancelada'
                })
                .eq('id_reserva', reservaId);

            if (error) throw error;

            this.showToast('Reserva cancelada! ❌');
            await this.loadDashboardStats();
            await this.loadTodasAtividades();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao cancelar reserva:', error);
            showNotification('Erro ao cancelar reserva.');
        }
    }

    showToast(message) {
        let toast = document.getElementById('toast-geral');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-geral';
            toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 opacity-0 z-50';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.remove('opacity-0');

        setTimeout(() => {
            toast.classList.add('opacity-0');
        }, 2000);
    }

    atualizarLinksComIdBarraca() {
        if (!this.idBarraca) {
            console.warn('[GestaoBarraca] ID da barraca não disponível para atualizar links.');
            return;
        }

        console.log('[GestaoBarraca] Atualizando links com ID da barraca:', this.idBarraca);

        // 1. Link de "Editar Barraca"
        const linkEditarBarraca = document.querySelector('a[href*="infoBarraca.html"]') ||
            document.querySelector('a[href*="cadastroBarraca.html"]') ||
            document.getElementById('link-editar-barraca');

        if (linkEditarBarraca) {
            linkEditarBarraca.href = `cadastroBarraca.html?id=${this.idBarraca}&origem=gestao`;

            const textElement = linkEditarBarraca.querySelector('span');
            if (textElement) {
                if (textElement.textContent.includes('Ver Página') || textElement.textContent.includes('Ver página')) {
                    textElement.textContent = 'Editar Barraca';
                }
            }

            if (linkEditarBarraca.textContent.includes('Ver Página') || linkEditarBarraca.textContent.includes('Ver página')) {
                linkEditarBarraca.innerHTML = linkEditarBarraca.innerHTML.replace(/Ver [Pp]ágina da Barraca/g, 'Editar Barraca');
            }

            console.log('[GestaoBarraca] ✅ Link "Editar Barraca" atualizado:', linkEditarBarraca.href);
        }

        // 2. Link de "Gerenciar Cardápio"
        const linkCardapio = document.querySelector('a[href*="cadastrocardapio.html"]');
        if (linkCardapio) {
            linkCardapio.href = `cadastrocardapio.html?id=${this.idBarraca}`;
            console.log('[GestaoBarraca] Link "Gerenciar Cardápio" atualizado com ID:', this.idBarraca);
        }

        // 3. Atualiza links do menu de navegação
        document.querySelectorAll('a[href="gestaoBarraca.html"]').forEach(link => {
            link.href = `gestaoBarraca.html?id=${this.idBarraca}`;
        });

        // 4. Atualiza todos os links para cadastroBarraca.html
        document.querySelectorAll('a[href="cadastroBarraca.html"]').forEach(link => {
            link.href = `cadastroBarraca.html?id=${this.idBarraca}&origem=gestao`;
        });

        console.log('[GestaoBarraca] ✅ Todos os links atualizados com ID da barraca:', this.idBarraca);
    }

    async loadPromocoes() {
        try {
            console.log('[GestaoBarraca] Carregando promoções...');

            const { data: promocoes, error } = await supabase
                .from('promocoes')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .order('data_criacao', { ascending: false });

            if (error) throw error;

            this.promocoes = promocoes || [];
            console.log(`[GestaoBarraca] ${this.promocoes.length} promoções carregadas`);

            this.renderPromocoes();

        } catch (error) {
            console.error('[GestaoBarraca] Erro ao carregar promoções:', error);
        }
    }

    renderPromocoes() {
        const container = document.getElementById('promotions-list') || document.getElementById('promocoes-list');
        if (!container) return;

        if (this.promocoes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i data-lucide="ticket-percent" class="w-16 h-16 mx-auto mb-4 text-gray-300"></i>
                    <p class="text-lg font-semibold">Nenhuma promoção cadastrada</p>
                    <p class="text-sm">Clique em "Adicionar Promoção" para criar sua primeira oferta.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = this.promocoes.map(promo => `
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-200 flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-1">${promo.titulo}</h3>
                    <p class="text-gray-600 text-sm">${promo.descricao}</p>
                    ${promo.preco_promocional ? `<p class="text-blue-600 font-bold mt-2 text-lg">R$ ${promo.preco_promocional}</p>` : ''}
                </div>
                <div class="flex gap-2 ml-4">
                    <button data-id="${promo.id_promocao}" class="edit-promotion-btn text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition">
                        <i data-lucide="pencil" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                    <button data-id="${promo.id_promocao}" class="delete-promotion-btn text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition">
                        <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                </div>
            </div>
        `).join('');

        lucide.createIcons();
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        this.tabButtons.forEach(button => {
            if (button.dataset.tab === tabName) {
                button.classList.add('active', 'border-blue-600', 'text-blue-600');
            } else {
                button.classList.remove('active', 'border-blue-600', 'text-blue-600');
            }
        });

        this.tabContents.forEach(content => {
            if (content.id === tabName) {
                content.classList.add('active');
                content.classList.remove('hidden');
                content.style.display = 'block';
            } else {
                content.classList.remove('active');
                content.classList.add('hidden');
                content.style.display = 'none';
            }
        });

        lucide.createIcons();
    }

    openPromotionModal(promocao = null) {
        const modalTitle = document.getElementById('modal-title');
        const promotionId = document.getElementById('promotion-id');
        const promotionTitle = document.getElementById('promotion-title');
        const promotionDescription = document.getElementById('promotion-description');

        if (promocao) {
            modalTitle.textContent = 'Editar Promoção';
            promotionId.value = promocao.id_promocao;
            promotionTitle.value = promocao.titulo;
            promotionDescription.value = promocao.descricao;
        } else {
            modalTitle.textContent = 'Adicionar Nova Promoção';
            this.promotionForm.reset();
            if (promotionId) promotionId.value = '';
        }

        this.promotionModal.classList.remove('hidden');
        lucide.createIcons();
    }

    closePromotionModal() {
        this.promotionModal.classList.add('hidden');
        this.promotionForm.reset();
    }

    async handlePromotionSubmit(e) {
        e.preventDefault();

        const promotionId = document.getElementById('promotion-id')?.value;
        const titulo = document.getElementById('promotion-title')?.value;
        const descricao = document.getElementById('promotion-description')?.value;
        const preco = document.getElementById('promotion-price')?.value;

        try {
            const promocaoData = {
                id_barraca: parseInt(this.idBarraca),
                titulo,
                descricao
            };

            if (preco) {
                promocaoData.preco_promocional = parseFloat(preco);
            }

            if (promotionId) {
                const { error } = await supabase
                    .from('promocoes')
                    .update(promocaoData)
                    .eq('id_promocao', promotionId);

                if (error) throw error;

                this.showToast('Promoção atualizada com sucesso! ✅');
            } else {
                const { error } = await supabase
                    .from('promocoes')
                    .insert(promocaoData);

                if (error) throw error;

                this.showToast('Promoção criada com sucesso! 🎉');
            }

            this.closePromotionModal();
            await this.loadPromocoes();

        } catch (error) {
            console.error('[handlePromotionSubmit] Erro:', error);
            showNotification(`Erro ao salvar promoção: ${error.message}`);
        }
    }

    editPromotion(id) {
        const promocao = this.promocoes.find(p => p.id_promocao == id);
        if (promocao) {
            this.openPromotionModal(promocao);
        }
    }

    deletePromotion(id) {
        this.promotionToDelete = id;
        this.confirmDeleteModal.classList.remove('hidden');
        lucide.createIcons();
    }

    closeDeleteModal() {
        this.confirmDeleteModal.classList.add('hidden');
        this.promotionToDelete = null;
    }

    async confirmDeletePromotion() {
        if (!this.promotionToDelete) return;

        try {
            const { error } = await supabase
                .from('promocoes')
                .delete()
                .eq('id_promocao', this.promotionToDelete);

            if (error) throw error;

            this.showToast('Promoção excluída com sucesso! 🗑️');
            this.closeDeleteModal();
            await this.loadPromocoes();

        } catch (error) {
            console.error('[confirmDeletePromotion] Erro:', error);
            showNotification(`Erro ao excluir promoção: ${error.message}`);
        }
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
    console.log('[gestaoBarraca] DOM carregado');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Inicializar gerenciador
    const manager = new GestaoBarracaManager();
    await manager.init();
});