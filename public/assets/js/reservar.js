import { supabase } from './supabaseClient.js';

console.log('[Reservar] Script carregado');

class ReservaManager {
    constructor() {
        this.idBarraca = null;
        this.barracaData = null;
        this.peopleCount = 1;
        this.userId = null;
    }

    async init() {
        try {
            console.log('[Reservar] Inicializando...');

            // Verificar se o usuário está logado
            await this.checkAuth();

            // Pegar ID da barraca da URL
            const urlParams = new URLSearchParams(window.location.search);
            this.idBarraca = urlParams.get('id');

            if (!this.idBarraca) {
                this.showNotification('Nenhuma barraca selecionada. Redirecionando...', true);
                setTimeout(() => window.location.href = './inicio.html', 2000);
                return;
            }

            console.log('[Reservar] ID da barraca:', this.idBarraca);

            // Carregar dados da barraca
            await this.loadBarracaData();

            // Inicializar componentes
            this.initDatePickers();
            this.initPeopleCounter();
            this.initForm();
            this.initMobileMenu();

        } catch (error) {
            console.error('[Reservar] Erro na inicialização:', error);
            this.showNotification('Erro ao carregar dados. Tente novamente.', true);
        }
    }

    async checkAuth() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                this.showNotification('Você precisa estar logado para fazer reservas.', true);
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }

            this.userId = user.id;
            console.log('[Reservar] Usuário autenticado:', this.userId);

        } catch (error) {
            console.error('[Reservar] Erro na autenticação:', error);
            this.showNotification('Erro ao verificar login.', true);
        }
    }

    async loadBarracaData() {
        try {
            console.log('[Reservar] Carregando dados da barraca...');

            const { data: barraca, error } = await supabase
                .from('barracas')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .single();

            if (error) throw error;
            if (!barraca) throw new Error('Barraca não encontrada');

            this.barracaData = barraca;
            console.log('[Reservar] Barraca carregada:', barraca);

            // Atualizar UI
            this.updateBarracaInfo();

        } catch (error) {
            console.error('[Reservar] Erro ao carregar barraca:', error);
            this.showNotification('Barraca não encontrada.', true);
            setTimeout(() => window.location.href = './inicio.html', 2000);
        }
    }

    updateBarracaInfo() {
        const barracaNameInput = document.getElementById('barracaName');
        if (barracaNameInput && this.barracaData) {
            barracaNameInput.value = this.barracaData.nome_barraca;
        }
    }

    initDatePickers() {
        // Inicializar Flatpickr para data
        flatpickr("#reservationDate", {
            dateFormat: "d/m/Y",
            minDate: "today",
            locale: "pt",
        });

        // Inicializar Flatpickr para horário
        flatpickr("#reservationTime", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            minuteIncrement: 15,
            locale: "pt",
            minTime: "08:00",
            maxTime: "20:00"
        });
    }

    initPeopleCounter() {
        const decreaseBtn = document.getElementById('decreaseBtn');
        const increaseBtn = document.getElementById('increaseBtn');
        const peopleCountSpan = document.getElementById('peopleCount');
        const namesContainer = document.getElementById('namesContainer');

        decreaseBtn.addEventListener('click', () => {
            if (this.peopleCount > 1) {
                this.peopleCount--;
                peopleCountSpan.textContent = this.peopleCount;
                this.removeLastNameField();
            }
        });

        increaseBtn.addEventListener('click', () => {
            this.peopleCount++;
            peopleCountSpan.textContent = this.peopleCount;
            this.addNameField();
        });
    }

    addNameField() {
        const namesContainer = document.getElementById('namesContainer');
        const newField = document.createElement('div');
        newField.className = 'input-wrapper relative dynamic-name-field';
        newField.innerHTML = `
            <input type="text" name="participantName[]" class="form-input name-input" placeholder="Nome do acompanhante" required>
            <i data-lucide="user" class="lucide"></i>
        `;
        namesContainer.appendChild(newField);
        lucide.createIcons();
    }

    removeLastNameField() {
        const namesContainer = document.getElementById('namesContainer');
        const dynamicFields = namesContainer.querySelectorAll('.dynamic-name-field');
        if (dynamicFields.length > 0) {
            dynamicFields[dynamicFields.length - 1].remove();
        }
    }

    initForm() {
        const form = document.getElementById('reservationForm');
        const validationMessage = document.getElementById('validation-message');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Validação
            let isValid = true;
            validationMessage.style.display = 'none';

            form.querySelectorAll('[required]').forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = 'var(--error-red)';
                } else {
                    input.style.borderColor = '';
                }
            });

            if (!isValid) {
                validationMessage.style.display = 'block';
                return;
            }

            // Desabilitar botão
            const submitButton = form.querySelector('.submit-btn');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i data-lucide="loader" class="animate-spin" style="width:20px; height:20px;"></i> Reservando...';
            lucide.createIcons();

            try {
                // Coletar dados do formulário
                const reservationData = this.collectFormData();
                
                // Salvar no Supabase
                await this.saveReservation(reservationData);

                // Sucesso
                this.showNotification('Reserva realizada com sucesso!');

                // Redirecionar após 2 segundos
                setTimeout(() => {
                    window.location.href = 'suasReservas.html';
                }, 2000);

            } catch (error) {
                console.error('[Reservar] Erro ao salvar reserva:', error);
                this.showNotification('Erro ao fazer reserva. Tente novamente.', true);
                
                // Reabilitar botão
                submitButton.disabled = false;
                submitButton.innerHTML = '<i data-lucide="check-circle" style="width:20px; height:20px;"></i> Fazer Reserva';
                lucide.createIcons();
            }
        });
    }

    collectFormData() {
        const dateInput = document.getElementById('reservationDate');
        const timeInput = document.getElementById('reservationTime');
        const nameInputs = document.querySelectorAll('input[name="participantName[]"]');

        // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
        const dateParts = dateInput.value.split('/');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        // Combinar data e hora para timestamp de início
        const dateTimeString = `${formattedDate}T${timeInput.value}:00`;

        // Calcular data_fim (adicionar 4 horas ao horário de início como padrão)
        const startDate = new Date(dateTimeString);
        const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000)); // +4 horas
        const endDateString = endDate.toISOString().slice(0, 19).replace('T', ' ');
        const startDateString = startDate.toISOString().slice(0, 19).replace('T', ' ');

        // Coletar nomes dos participantes
        const participantes = Array.from(nameInputs).map(input => input.value.trim());

        return {
            id_barraca: this.idBarraca,
            id_cliente: this.userId,
            data_reserva: formattedDate,
            data_inicio: startDateString,
            data_fim: endDateString,
            num_pessoas: this.peopleCount,
            participantes: participantes,
            status: 'pendente'
        };
    }

    async saveReservation(reservationData) {
        try {
            console.log('[Reservar] Salvando reserva:', reservationData);

            const { data, error } = await supabase
                .from('reservas')
                .insert([reservationData])
                .select()
                .single();

            if (error) throw error;

            console.log('[Reservar] Reserva salva com sucesso:', data);

            // Atualizar ocupação da barraca (localStorage como backup)
            this.updateOcupacao();

            return data;

        } catch (error) {
            console.error('[Reservar] Erro ao salvar no Supabase:', error);
            throw error;
        }
    }

    updateOcupacao() {
        if (!this.barracaData?.capacidade_mesas) return;

        const storageKey = `ocupacao-barraca-${this.idBarraca}`;
        const mesasOcupadas = parseInt(localStorage.getItem(storageKey)) || 0;
        const novaOcupacao = Math.min(mesasOcupadas + 1, this.barracaData.capacidade_mesas);
        localStorage.setItem(storageKey, novaOcupacao.toString());
    }

    initMobileMenu() {
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
    }

    showNotification(message, isError = false) {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.style.backgroundColor = isError ? 'var(--error-red)' : 'var(--text-dark)';
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Reservar] DOM carregado');
    
    // Inicializar ícones
    lucide.createIcons();

    // Inicializar gerenciador de reservas
    const manager = new ReservaManager();
    await manager.init();
});