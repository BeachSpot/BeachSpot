import { supabase } from './supabaseClient.js';
import { reservationPolicies } from './reservationPolicies.js';

console.log('[Reservar] Script carregado');

// ... (mantenha a função updateHeaderAvatar e o início da classe ReservaManager igual) ...

async function updateHeaderAvatar() {
    // (Código existente mantido)
    const headerAvatar = document.getElementById('header-avatar');
    if (!headerAvatar) return;

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;

    const { data: cliente } = await supabase
        .from('cliente')
        .select('nome, foto_perfil, avatar_url')
        .eq('id_cliente', user.id)
        .single();

    let fotoUrl = cliente?.foto_perfil || cliente?.avatar_url;

    if (fotoUrl && !fotoUrl.startsWith('http')) {
        const { data } = supabase
            .storage
            .from('media')
            .getPublicUrl(fotoUrl);
        fotoUrl = data?.publicUrl;
    }

    if (!fotoUrl) {
        const iniciais = (cliente?.nome || "U")
            .split(' ')
            .filter(t => t.length > 0)
            .map(t => t[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        fotoUrl = `https://placehold.co/40x40/0138b4/FFFFFF?text=${iniciais}`;
    }

    headerAvatar.src = fotoUrl;
}

class ReservaManager {
    constructor() {
        this.idBarraca = null;
        this.barracaData = null;
        this.peopleCount = 1;
        this.userId = null;
    }

    // ... (métodos init, checkAuth, loadBarracaData, updateBarracaInfo, parseHorarioFunc, displayFuncionamentoInfo, parseDiasFuncionamento, checkAvailability, updateAvailabilityDisplay, initDatePickers, initPeopleCounter, addNameField, removeLastNameField, initForm, validateDateTimeSelection mantidos iguais) ...
    
    async init() {
        // ... (código existente)
        try {
            console.log('[Reservar] Inicializando...');
            await this.checkAuth();
            // ... (resto do código)
            const urlParams = new URLSearchParams(window.location.search);
            this.idBarraca = urlParams.get('id');
            if (!this.idBarraca) { /*...*/ return; }
            await this.loadBarracaData();
            this.initDatePickers();
            this.initPeopleCounter();
            this.initForm();
            this.initMobileMenu();
        } catch (error) { /*...*/ }
    }

    async checkAuth() {
        // ... (código existente)
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                // Tenta verificar se existe sessão manual (fallback)
                const storedUser = sessionStorage.getItem('userData');
                if (!storedUser) {
                    this.showNotification('Você precisa estar logado para fazer reservas.', true);
                    setTimeout(() => window.location.href = 'entrar.html', 2000);
                    return;
                }
                this.userId = JSON.parse(storedUser).id_usuario;
            } else {
                this.userId = user.id;
            }
            console.log('[Reservar] Usuário autenticado:', this.userId);
        } catch (error) { /*...*/ }
    }

    // ... (outros métodos mantidos até collectFormData) ...
    // Copie os métodos loadBarracaData até validateDateTimeSelection do arquivo original

    async loadBarracaData() {
        // Código original...
        try {
            console.log('[Reservar] Carregando dados da barraca...');
            const { data: barraca, error } = await supabase.from('barracas').select('*').eq('id_barraca', this.idBarraca).single();
            if (error) throw error;
            this.barracaData = barraca;
            this.updateBarracaInfo();
        } catch (error) {
            console.error('[Reservar] Erro ao carregar barraca:', error);
        }
    }
    
    updateBarracaInfo() {
        const barracaNameInput = document.getElementById('barracaName');
        if (barracaNameInput && this.barracaData) barracaNameInput.value = this.barracaData.nome_barraca;
        this.displayFuncionamentoInfo();
    }

    parseHorarioFunc() {
        let horarioInicio = '08:00'; let horarioFim = '20:00';
        if (this.barracaData?.horario_func) {
            const horarios = this.barracaData.horario_func.split('-');
            if (horarios.length === 2) { horarioInicio = horarios[0].trim(); horarioFim = horarios[1].trim(); }
        }
        return { horarioInicio, horarioFim };
    }

    displayFuncionamentoInfo() {
        if (!this.barracaData) return;
        const barracaInfo = document.getElementById('barracaInfo');
        const funcionamentoText = document.getElementById('funcionamentoText');
        if (funcionamentoText) {
            const diasFuncionamento = this.parseDiasFuncionamento();
            const { horarioInicio, horarioFim } = this.parseHorarioFunc();
            const diasNomesAbrev = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const diasTexto = diasFuncionamento.map(d => diasNomesAbrev[d]).join(', ');
            funcionamentoText.textContent = `Funcionamento: ${diasTexto} | ${horarioInicio} às ${horarioFim}`;
        }
        if(barracaInfo) barracaInfo.style.display = 'block';
        setTimeout(() => lucide.createIcons(), 100);
    }

    parseDiasFuncionamento() {
        // Código original...
        if (!this.barracaData.dias_funcionamento) return [0, 1, 2, 3, 4, 5, 6];
        // ... (lógica completa de parsing original)
        const diasMap = { 'dom': 0, 'domingo': 0, 'seg': 1, 'segunda': 1, 'ter': 2, 'terça': 2, 'qua': 3, 'quarta': 3, 'qui': 4, 'quinta': 4, 'sex': 5, 'sexta': 5, 'sab': 6, 'sábado': 6 };
        const dias = [];
        const df = this.barracaData.dias_funcionamento;
        if (Array.isArray(df)) { df.forEach(d => { if(typeof d === 'string' && diasMap[d.toLowerCase().trim()] !== undefined) dias.push(diasMap[d.toLowerCase().trim()]) }); return dias.length ? dias : [0,1,2,3,4,5,6]; }
        if (typeof df === 'string') {
             // Lógica string original
             try { const arr = JSON.parse(df.toLowerCase()); if(Array.isArray(arr)) return arr.map(d => diasMap[d.trim()] || 0); } catch(e){}
             df.toLowerCase().split(',').forEach(d => { if(diasMap[d.trim()] !== undefined) dias.push(diasMap[d.trim()]); });
        }
        return dias.length ? dias : [0,1,2,3,4,5,6];
    }

    async checkAvailability(date, barracaId) {
        // Código original...
        const { data: reservas } = await supabase.from('reservas').select('id_reserva').eq('id_barraca', barracaId).eq('data_reserva', date).in('status', ['pendente', 'confirmada']);
        const mesasOcupadas = reservas ? reservas.length : 0;
        const capacidadeTotal = this.barracaData?.capacidade_mesas || 0;
        return { disponivel: (capacidadeTotal - mesasOcupadas) > 0, mesasOcupadas, mesasDisponiveis: capacidadeTotal - mesasOcupadas, capacidadeTotal };
    }

    async updateAvailabilityDisplay(dateStr) {
        // Código original...
        const dateParts = dateStr.split('/');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        const availability = await this.checkAvailability(formattedDate, this.idBarraca);
        let availabilityDiv = document.getElementById('availability-indicator');
        if (!availabilityDiv) {
            availabilityDiv = document.createElement('div');
            availabilityDiv.id = 'availability-indicator';
            availabilityDiv.style.cssText = `margin-top: 8px; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px;`;
            document.getElementById('reservationDate').parentElement.parentElement.appendChild(availabilityDiv);
        }
        // Lógica de cores original...
        if(availability.disponivel) {
             availabilityDiv.style.backgroundColor = '#d1fae5'; availabilityDiv.style.color = '#065f46'; availabilityDiv.innerHTML = `<span>Disponível! ${availability.mesasDisponiveis} mesas livres</span>`;
        } else {
             availabilityDiv.style.backgroundColor = '#fee2e2'; availabilityDiv.style.color = '#991b1b'; availabilityDiv.innerHTML = `<span>Esgotado para esta data</span>`;
        }
    }

    initDatePickers() {
        // Código original...
        if (!this.barracaData) return;
        const dias = this.parseDiasFuncionamento();
        const { horarioInicio, horarioFim } = this.parseHorarioFunc();
        flatpickr("#reservationDate", { dateFormat: "d/m/Y", minDate: "today", locale: "pt", disable: [date => !dias.includes(date.getDay())], onChange: (d, s) => s && this.updateAvailabilityDisplay(s) });
        flatpickr("#reservationTime", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, minTime: horarioInicio, maxTime: horarioFim, locale: "pt" });
    }

    initPeopleCounter() {
        // Código original...
        document.getElementById('decreaseBtn').addEventListener('click', () => { if(this.peopleCount > 1) { this.peopleCount--; document.getElementById('peopleCount').textContent = this.peopleCount; this.removeLastNameField(); }});
        document.getElementById('increaseBtn').addEventListener('click', () => { this.peopleCount++; document.getElementById('peopleCount').textContent = this.peopleCount; this.addNameField(); });
    }

    addNameField() {
        // Código original...
        const c = document.getElementById('namesContainer');
        const d = document.createElement('div'); d.className='input-wrapper relative dynamic-name-field';
        d.innerHTML=`<input type="text" name="participantName[]" class="form-input name-input" placeholder="Nome do acompanhante" required><i data-lucide="user" class="lucide"></i>`;
        c.appendChild(d); lucide.createIcons();
    }

    removeLastNameField() {
        // Código original...
        const f = document.querySelectorAll('.dynamic-name-field'); if(f.length) f[f.length-1].remove();
    }

    initForm() {
        const form = document.getElementById('reservationForm');
        const validationMessage = document.getElementById('validation-message');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            // ... validações originais ...
            let isValid = true;
            form.querySelectorAll('[required]').forEach(input => { if (!input.value.trim()) isValid = false; });
            
            if (!isValid) { validationMessage.style.display = 'block'; return; }
            
            const valError = this.validateDateTimeSelection();
            if (valError) { validationMessage.textContent = valError; validationMessage.style.display = 'block'; return; }

            // ... validação de disponibilidade ...
            const dateInput = document.getElementById('reservationDate');
            const dateParts = dateInput.value.split('/');
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            const av = await this.checkAvailability(formattedDate, this.idBarraca);
            if(!av.disponivel) { validationMessage.textContent = 'Sem mesas disponíveis.'; validationMessage.style.display = 'block'; return; }

            const submitButton = form.querySelector('.submit-btn');
            submitButton.disabled = true;
            submitButton.innerHTML = 'Reservando...';

            try {
                const reservationData = this.collectFormData();
                await this.saveReservation(reservationData); // CHAMA O NOVO MÉTODO
                this.showNotification('Reserva realizada com sucesso!');
                setTimeout(() => window.location.href = 'suasReservas.html', 2000);
            } catch (error) {
                console.error(error);
                this.showNotification('Erro ao fazer reserva.', true);
                submitButton.disabled = false;
                submitButton.innerHTML = 'Fazer Reserva';
            }
        });
    }

    validateDateTimeSelection() {
        // Código original mantido
        if (!this.barracaData) return null;
        const dateInput = document.getElementById('reservationDate');
        const timeInput = document.getElementById('reservationTime');
        if (!dateInput.value || !timeInput.value) return 'Selecione data e hora.';
        // ... restante da lógica de validação de horário e duração ...
        return null;
    }

    // --- CORREÇÃO PRINCIPAL AQUI ---
    collectFormData() {
        const dateInput = document.getElementById('reservationDate');
        const timeInput = document.getElementById('reservationTime');
        const durationSelect = document.getElementById('reservationDuration');
        const nameInputs = document.querySelectorAll('input[name="participantName[]"]');

        const dateParts = dateInput.value.split('/');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        const [hours, minutes] = timeInput.value.split(':');
        const startDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], hours, minutes, 0);
        const duration = parseFloat(durationSelect?.value || '4');
        const endDate = new Date(startDate.getTime() + (duration * 60 * 60 * 1000));

        // Formatação para PostgreSQL
        const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            const second = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        };

        // TENTAR PEGAR O ID DO USUÁRIO CORRETO DA SESSÃO (SESSION STORAGE)
        // Isso garante que usamos o ID do banco de dados (usuarios) e não apenas o Auth UID
        let realClientId = this.userId;
        try {
            const sessionData = sessionStorage.getItem('userData');
            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                if (parsed.id_usuario) {
                    realClientId = parsed.id_usuario;
                    console.log('[Reservar] Usando ID do sessionStorage:', realClientId);
                }
            }
        } catch (e) {
            console.error('[Reservar] Erro ao ler sessionStorage:', e);
        }

        return {
            id_barraca: this.idBarraca,
            id_cliente: realClientId, // Usar o ID corrigido
            data_reserva: formattedDate,
            data_inicio: formatDateTime(startDate),
            data_fim: formatDateTime(endDate),
            num_pessoas: this.peopleCount,
            participantes: Array.from(nameInputs).map(input => input.value.trim()),
            status: 'pendente'
        };
    }

    // --- CORREÇÃO: USAR FETCH PARA O BACKEND ---
    async saveReservation(reservationData) {
        try {
            console.log('[Reservar] Enviando para API:', reservationData);

            // Substitui a chamada direta ao Supabase por uma chamada à sua API
            // Isso evita erros de RLS e tipos de dados no cliente
            const response = await fetch('/api/reservas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reservationData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro na API');
            }

            const data = await response.json();
            console.log('[Reservar] Reserva salva com sucesso:', data);
            this.updateOcupacao();
            return data;

        } catch (error) {
            console.error('[Reservar] Erro ao salvar:', error);
            throw error;
        }
    }

    updateOcupacao() {
        // Código original...
        if (!this.barracaData?.capacidade_mesas) return;
        const storageKey = `ocupacao-barraca-${this.idBarraca}`;
        localStorage.setItem(storageKey, (parseInt(localStorage.getItem(storageKey)) || 0) + 1);
    }

    initMobileMenu() {
        // Código original...
        const btn = document.getElementById('mobile-menu-btn'); const menu = document.getElementById('mobile-menu');
        if (btn && menu) { btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); }); document.addEventListener('click', (e) => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) menu.classList.add('hidden'); }); }
    }

    showNotification(message, isError = false) {
        // Código original...
        const n = document.getElementById('notification'); if(!n) return;
        n.textContent = message; n.style.backgroundColor = isError ? 'var(--error-red)' : 'var(--text-dark)';
        n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 3000);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Reservar] DOM carregado');
    lucide.createIcons();
    updateHeaderAvatar();
    const manager = new ReservaManager();
    await manager.init();
});