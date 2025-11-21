import { supabase } from './supabaseClient.js';

console.log('[EditarReserva] Script carregado');

class EditarReservaManager {
    constructor() {
        this.idReserva = null;
        this.reservaData = null;
        this.barracaData = null;
        this.peopleCount = 1;
        this.userId = null;
    }

    async init() {
        try {
            console.log('[EditarReserva] Inicializando...');

            // Verificar se o usuário está logado
            await this.checkAuth();

            // Pegar ID da reserva da URL
            const urlParams = new URLSearchParams(window.location.search);
            this.idReserva = urlParams.get('id');

            if (!this.idReserva) {
                this.showNotification('Nenhuma reserva selecionada. Redirecionando...', true);
                setTimeout(() => window.location.href = './suasReservas.html', 2000);
                return;
            }

            console.log('[EditarReserva] ID da reserva:', this.idReserva);

            // Carregar dados da reserva
            await this.loadReservaData();

            // Inicializar componentes
            this.initDatePickers();
            this.initPeopleCounter();
            this.initForm();
            this.initMobileMenu();

            // Atualizar UI
            this.updatePageTitle();

        } catch (error) {
            console.error('[EditarReserva] Erro na inicialização:', error);
            this.showNotification('Erro ao carregar dados. Tente novamente.', true);
        }
    }

    async checkAuth() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                this.showNotification('Você precisa estar logado para editar reservas.', true);
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }

            this.userId = user.id;
            console.log('[EditarReserva] Usuário autenticado:', this.userId);

        } catch (error) {
            console.error('[EditarReserva] Erro na autenticação:', error);
            this.showNotification('Erro ao verificar login.', true);
        }
    }

    async loadReservaData() {
        try {
            console.log('[EditarReserva] Carregando dados da reserva...');

            const { data: reserva, error } = await supabase
                .from('reservas')
                .select(`
                    *,
                    barracas (
                        id_barraca,
                        nome_barraca,
                        localizacao,
                        foto_destaque
                    )
                `)
                .eq('id_reserva', this.idReserva)
                .eq('id_cliente', this.userId)
                .single();

            if (error) throw error;
            if (!reserva) throw new Error('Reserva não encontrada ou você não tem permissão para editá-la');

            // Verificar se a reserva pode ser editada
            if (reserva.status === 'cancelada' || reserva.status === 'concluida') {
                this.showNotification('Esta reserva não pode mais ser editada.', true);
                setTimeout(() => window.location.href = './suasReservas.html', 2000);
                return;
            }

            this.reservaData = reserva;
            this.barracaData = reserva.barracas;
            console.log('[EditarReserva] Reserva carregada:', reserva);

            // Preencher formulário com dados existentes
            this.fillForm();

        } catch (error) {
            console.error('[EditarReserva] Erro ao carregar reserva:', error);
            this.showNotification('Erro ao carregar reserva.', true);
            setTimeout(() => window.location.href = './suasReservas.html', 2000);
        }
    }

    fillForm() {
        if (!this.reservaData || !this.barracaData) return;

        // Preencher nome da barraca
        const barracaNameInput = document.getElementById('barracaName');
        if (barracaNameInput) {
            barracaNameInput.value = this.barracaData.nome_barraca;
        }

        // Preencher data
        const dateInput = document.getElementById('reservationDate');
        if (dateInput && this.reservaData.data_reserva) {
            // Converter de YYYY-MM-DD para DD/MM/YYYY
            const dateParts = this.reservaData.data_reserva.split('-');
            dateInput.value = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        }

        // Preencher horário
        const timeInput = document.getElementById('reservationTime');
        if (timeInput && this.reservaData.data_inicio) {
            // Extrair hora do timestamp
            const time = new Date(this.reservaData.data_inicio).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            timeInput.value = time;
        }

        // Preencher duração (calcular diferença entre data_inicio e data_fim)
        const durationSelect = document.getElementById('reservationDuration');
        if (durationSelect && this.reservaData.data_inicio && this.reservaData.data_fim) {
            const inicio = new Date(this.reservaData.data_inicio);
            const fim = new Date(this.reservaData.data_fim);
            const diffHours = Math.round((fim - inicio) / (1000 * 60 * 60));
            durationSelect.value = diffHours.toString();
        }

        // Preencher número de pessoas
        if (this.reservaData.num_pessoas) {
            this.peopleCount = this.reservaData.num_pessoas;
            const peopleCountSpan = document.getElementById('peopleCount');
            if (peopleCountSpan) {
                peopleCountSpan.textContent = this.peopleCount;
            }
        }

        // Preencher nomes dos participantes
        if (this.reservaData.participantes && Array.isArray(this.reservaData.participantes)) {
            const namesContainer = document.getElementById('namesContainer');
            if (namesContainer) {
                namesContainer.innerHTML = '';

                this.reservaData.participantes.forEach((nome, index) => {
                    const newField = document.createElement('div');
                    newField.className = index === 0 ? 'input-wrapper relative' : 'input-wrapper relative dynamic-name-field';
                    newField.innerHTML = `
                        <input type="text" 
                               name="participantName[]" 
                               class="form-input name-input" 
                               placeholder="${index === 0 ? 'Seu nome' : 'Nome do acompanhante'}" 
                               required 
                               value="${nome}">
                        <i data-lucide="user" class="lucide"></i>
                    `;
                    namesContainer.appendChild(newField);
                });

                lucide.createIcons();
            }
        }

        console.log('[EditarReserva] Formulário preenchido com sucesso');
    }

    updatePageTitle() {
        // Atualizar título da página
        const titleElement = document.querySelector('.form-title');
        if (titleElement) {
            titleElement.textContent = 'Editar Reserva';
        }

        // Atualizar subtítulo
        const introElement = document.querySelector('.form-intro p');
        if (introElement) {
            introElement.textContent = 'Altere os detalhes da sua reserva conforme necessário.';
        }

        // Atualizar botão de submit
        const submitButton = document.querySelector('.submit-btn');
        if (submitButton) {
            submitButton.innerHTML = '<i data-lucide="save" style="width:20px; height:20px;"></i> Salvar Alterações';
            lucide.createIcons();
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
                validationMessage.textContent = 'Por favor, preencha todos os campos.';
                validationMessage.style.display = 'block';
                return;
            }

            // Desabilitar botão
            const submitButton = form.querySelector('.submit-btn');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i data-lucide="loader" class="animate-spin" style="width:20px; height:20px;"></i> Salvando...';
            lucide.createIcons();

            try {
                // Coletar dados do formulário
                const reservationData = this.collectFormData();
                
                // Atualizar no Supabase
                await this.updateReservation(reservationData);

                // Sucesso
                this.showNotification('Reserva atualizada com sucesso!');

                // Redirecionar após 2 segundos
                setTimeout(() => {
                    window.location.href = 'suasReservas.html';
                }, 2000);

            } catch (error) {
                console.error('[EditarReserva] Erro ao atualizar reserva:', error);
                this.showNotification('Erro ao atualizar reserva. Tente novamente.', true);
                
                // Reabilitar botão
                submitButton.disabled = false;
                submitButton.innerHTML = '<i data-lucide="save" style="width:20px; height:20px;"></i> Salvar Alterações';
                lucide.createIcons();
            }
        });
    }

    collectFormData() {
        const dateInput = document.getElementById('reservationDate');
        const timeInput = document.getElementById('reservationTime');
        const durationSelect = document.getElementById('reservationDuration');
        const nameInputs = document.querySelectorAll('input[name="participantName[]"]');

        // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
        const dateParts = dateInput.value.split('/');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        // Combinar data e hora para timestamp de início
        const dateTimeString = `${formattedDate}T${timeInput.value}:00`;

        // Calcular data_fim (adicionar duração ao horário de início)
        const duration = parseInt(durationSelect.value);
        const startDate = new Date(dateTimeString);
        const endDate = new Date(startDate.getTime() + (duration * 60 * 60 * 1000));
        
        const endDateString = endDate.toISOString().slice(0, 19).replace('T', ' ');
        const startDateString = startDate.toISOString().slice(0, 19).replace('T', ' ');

        // Coletar nomes dos participantes
        const participantes = Array.from(nameInputs).map(input => input.value.trim());

        return {
            data_reserva: formattedDate,
            data_inicio: startDateString,
            data_fim: endDateString,
            num_pessoas: this.peopleCount,
            participantes: participantes
        };
    }

    async updateReservation(reservationData) {
        try {
            console.log('[EditarReserva] Atualizando reserva:', reservationData);

            const { data, error } = await supabase
                .from('reservas')
                .update(reservationData)
                .eq('id_reserva', this.idReserva)
                .eq('id_cliente', this.userId)
                .select()
                .single();

            if (error) throw error;

            console.log('[EditarReserva] Reserva atualizada com sucesso:', data);

            return data;

        } catch (error) {
            console.error('[EditarReserva] Erro ao atualizar no Supabase:', error);
            throw error;
        }
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
    console.log('[EditarReserva] DOM carregado');
    
    // Inicializar ícones
    lucide.createIcons();

    // Inicializar gerenciador de edição de reservas
    const manager = new EditarReservaManager();
    await manager.init();
});