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

            // Carregar dados da barraca ANTES de inicializar os date pickers
            await this.loadBarracaData();

            // Inicializar componentes DEPOIS de carregar os dados
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
            console.log('[DEBUG] Horário funcionamento:', barraca.horario_func);

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

        // Exibir informações de funcionamento
        this.displayFuncionamentoInfo();
    }

    parseHorarioFunc() {
        // Parsear horario_func (formato: "09:00-16:00")
        let horarioInicio = '08:00';
        let horarioFim = '20:00';
        
        if (this.barracaData?.horario_func) {
            const horarios = this.barracaData.horario_func.split('-');
            if (horarios.length === 2) {
                horarioInicio = horarios[0].trim();
                horarioFim = horarios[1].trim();
            }
        }
        
        return { horarioInicio, horarioFim };
    }

    displayFuncionamentoInfo() {
        if (!this.barracaData) return;

        const barracaInfo = document.getElementById('barracaInfo');
        const funcionamentoText = document.getElementById('funcionamentoText');

        if (!barracaInfo || !funcionamentoText) return;

        const diasFuncionamento = this.parseDiasFuncionamento();
        const { horarioInicio, horarioFim } = this.parseHorarioFunc();

        // Mapear números para nomes dos dias abreviados
        const diasNomesAbrev = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const diasTexto = diasFuncionamento.map(d => diasNomesAbrev[d]).join(', ');

        funcionamentoText.textContent = `Funcionamento: ${diasTexto} | ${horarioInicio} às ${horarioFim}`;
        barracaInfo.style.display = 'block';

        // Recriar ícones após adicionar conteúdo
        setTimeout(() => lucide.createIcons(), 100);
    }

    parseDiasFuncionamento() {
        if (!this.barracaData.dias_funcionamento) {
            // Padrão: segunda a domingo
            return [0, 1, 2, 3, 4, 5, 6];
        }

        // Mapear nomes dos dias para números (0 = Domingo, 1 = Segunda, etc)
        const diasMap = {
            'dom': 0, 'domingo': 0,
            'seg': 1, 'segunda': 1, 'segunda-feira': 1,
            'ter': 2, 'terça': 2, 'terca': 2, 'terça-feira': 2, 'terca-feira': 2,
            'qua': 3, 'quarta': 3, 'quarta-feira': 3,
            'qui': 4, 'quinta': 4, 'quinta-feira': 4,
            'sex': 5, 'sexta': 5, 'sexta-feira': 5,
            'sab': 6, 'sábado': 6, 'sabado': 6
        };

        const dias = [];
        const diasFuncionamento = this.barracaData.dias_funcionamento;

        // Se já for um array (PostgreSQL JSON/JSONB)
        if (Array.isArray(diasFuncionamento)) {
            diasFuncionamento.forEach(dia => {
                if (typeof dia === 'string') {
                    const diaLower = dia.toLowerCase().trim();
                    if (diasMap[diaLower] !== undefined) {
                        dias.push(diasMap[diaLower]);
                    }
                }
            });
            return dias.length > 0 ? dias : [0, 1, 2, 3, 4, 5, 6];
        }

        // Se for uma string, tentar parsear
        if (typeof diasFuncionamento === 'string') {
            const diasStr = diasFuncionamento.toLowerCase();

            // Se for um array JSON em formato string
            try {
                const diasArray = JSON.parse(diasStr);
                if (Array.isArray(diasArray)) {
                    diasArray.forEach(dia => {
                        const diaLower = dia.toLowerCase().trim();
                        if (diasMap[diaLower] !== undefined) {
                            dias.push(diasMap[diaLower]);
                        }
                    });
                    return dias.length > 0 ? dias : [0, 1, 2, 3, 4, 5, 6];
                }
            } catch (e) {
                // Não é JSON, continuar com parsing de string
            }

            // Parsing de string separada por vírgula
            diasStr.split(',').forEach(dia => {
                const diaLower = dia.trim().toLowerCase();
                if (diasMap[diaLower] !== undefined) {
                    dias.push(diasMap[diaLower]);
                }
            });
        }

        return dias.length > 0 ? dias : [0, 1, 2, 3, 4, 5, 6];
    }

    async checkAvailability(date, barracaId) {
        try {
            console.log('[Reservar] Verificando disponibilidade para:', date);

            // Buscar todas as reservas confirmadas ou pendentes para aquela data e barraca
            const { data: reservas, error } = await supabase
                .from('reservas')
                .select('id_reserva, num_pessoas')
                .eq('id_barraca', barracaId)
                .eq('data_reserva', date)
                .in('status', ['pendente', 'confirmada']);

            if (error) throw error;

            // Contar quantas mesas estão ocupadas
            const mesasOcupadas = reservas ? reservas.length : 0;
            const capacidadeTotal = this.barracaData?.capacidade_mesas || 0;
            const mesasDisponiveis = capacidadeTotal - mesasOcupadas;

            console.log('[Reservar] Disponibilidade:', {
                data: date,
                mesasOcupadas,
                capacidadeTotal,
                mesasDisponiveis,
                percentualOcupacao: `${Math.round((mesasOcupadas / capacidadeTotal) * 100)}%`
            });

            return {
                disponivel: mesasDisponiveis > 0,
                mesasOcupadas,
                mesasDisponiveis,
                capacidadeTotal
            };

        } catch (error) {
            console.error('[Reservar] Erro ao verificar disponibilidade:', error);
            throw error;
        }
    }

    async updateAvailabilityDisplay(dateStr) {
        try {
            // Converter data de DD/MM/YYYY para YYYY-MM-DD
            const dateParts = dateStr.split('/');
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

            const availability = await this.checkAvailability(formattedDate, this.idBarraca);
            
            // Criar ou atualizar elemento de disponibilidade
            let availabilityDiv = document.getElementById('availability-indicator');
            if (!availabilityDiv) {
                availabilityDiv = document.createElement('div');
                availabilityDiv.id = 'availability-indicator';
                availabilityDiv.style.cssText = `
                    margin-top: 8px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                
                const dateInput = document.getElementById('reservationDate');
                dateInput.parentElement.parentElement.appendChild(availabilityDiv);
            }

            // Atualizar conteúdo baseado na disponibilidade
            const percentOcupacao = Math.round((availability.mesasOcupadas / availability.capacidadeTotal) * 100);
            
            if (availability.disponivel) {
                if (percentOcupacao < 50) {
                    availabilityDiv.style.backgroundColor = '#d1fae5';
                    availabilityDiv.style.color = '#065f46';
                    availabilityDiv.innerHTML = `
                        <i data-lucide="check-circle" style="width:18px; height:18px;"></i>
                        <span>Ótima disponibilidade! ${availability.mesasDisponiveis} de ${availability.capacidadeTotal} mesas disponíveis</span>
                    `;
                } else if (percentOcupacao < 80) {
                    availabilityDiv.style.backgroundColor = '#fef3c7';
                    availabilityDiv.style.color = '#92400e';
                    availabilityDiv.innerHTML = `
                        <i data-lucide="alert-circle" style="width:18px; height:18px;"></i>
                        <span>Disponibilidade moderada. ${availability.mesasDisponiveis} de ${availability.capacidadeTotal} mesas disponíveis</span>
                    `;
                } else {
                    availabilityDiv.style.backgroundColor = '#fed7aa';
                    availabilityDiv.style.color = '#9a3412';
                    availabilityDiv.innerHTML = `
                        <i data-lucide="alert-triangle" style="width:18px; height:18px;"></i>
                        <span>Últimas mesas! Apenas ${availability.mesasDisponiveis} de ${availability.capacidadeTotal} disponíveis</span>
                    `;
                }
            } else {
                availabilityDiv.style.backgroundColor = '#fee2e2';
                availabilityDiv.style.color = '#991b1b';
                availabilityDiv.innerHTML = `
                    <i data-lucide="x-circle" style="width:18px; height:18px;"></i>
                    <span>Sem disponibilidade. Todas as ${availability.capacidadeTotal} mesas estão ocupadas</span>
                `;
            }

            lucide.createIcons();

        } catch (error) {
            console.error('[Reservar] Erro ao atualizar display de disponibilidade:', error);
        }
    }

    initDatePickers() {
        if (!this.barracaData) {
            console.warn('[Reservar] Dados da barraca não carregados ainda');
            return;
        }

        // Parsear dias e horários de funcionamento
        const diasFuncionamento = this.parseDiasFuncionamento();
        const { horarioInicio, horarioFim } = this.parseHorarioFunc();

        console.log('[Reservar] Configurando validações - Dias:', diasFuncionamento, 'Horário:', horarioInicio, '-', horarioFim);

        // Inicializar Flatpickr para data com validação de dias
        flatpickr("#reservationDate", {
            dateFormat: "d/m/Y",
            minDate: "today",
            locale: "pt",
            disable: [
                function(date) {
                    // Desabilitar dias que não estão no funcionamento
                    const dayOfWeek = date.getDay();
                    return !diasFuncionamento.includes(dayOfWeek);
                }
            ],
            onChange: (selectedDates, dateStr) => {
                // Verificar disponibilidade quando a data muda
                if (dateStr) {
                    this.updateAvailabilityDisplay(dateStr);
                }
            }
        });

        // Inicializar Flatpickr para horário com validação de horários
        flatpickr("#reservationTime", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            minuteIncrement: 15,
            locale: "pt",
            minTime: horarioInicio,
            maxTime: horarioFim
        });
    }

    initPeopleCounter() {
        const decreaseBtn = document.getElementById('decreaseBtn');
        const increaseBtn = document.getElementById('increaseBtn');
        const peopleCountSpan = document.getElementById('peopleCount');

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

            // Validar dia e horário de funcionamento
            const validationError = this.validateDateTimeSelection();
            if (validationError) {
                validationMessage.textContent = validationError;
                validationMessage.style.display = 'block';
                return;
            }

            // NOVA VALIDAÇÃO: Verificar disponibilidade de mesas
            const dateInput = document.getElementById('reservationDate');
            const dateParts = dateInput.value.split('/');
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

            try {
                const availability = await this.checkAvailability(formattedDate, this.idBarraca);
                
                if (!availability.disponivel) {
                    validationMessage.textContent = `Desculpe, não há mesas disponíveis para este dia. Capacidade: ${availability.capacidadeTotal} mesas (${availability.mesasOcupadas} ocupadas).`;
                    validationMessage.style.display = 'block';
                    return;
                }

                // Mostrar informação de disponibilidade
                console.log(`✅ Mesas disponíveis: ${availability.mesasDisponiveis} de ${availability.capacidadeTotal}`);

            } catch (error) {
                console.error('[Reservar] Erro ao verificar disponibilidade:', error);
                validationMessage.textContent = 'Erro ao verificar disponibilidade. Tente novamente.';
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

    validateDateTimeSelection() {
        if (!this.barracaData) return null;

        const dateInput = document.getElementById('reservationDate');
        const timeInput = document.getElementById('reservationTime');
        const durationSelect = document.getElementById('reservationDuration');

        if (!dateInput.value || !timeInput.value) {
            return 'Por favor, selecione a data e horário.';
        }

        // Validar dia da semana
        const dateParts = dateInput.value.split('/');
        const selectedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]); // ano, mês (0-indexed), dia
        const dayOfWeek = selectedDate.getDay();
        
        console.log('[Reservar] Data selecionada:', dateInput.value, '| Dia da semana:', dayOfWeek, '| Date object:', selectedDate);
        
        const diasFuncionamento = this.parseDiasFuncionamento();
        if (!diasFuncionamento.includes(dayOfWeek)) {
            const diasNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            return `A barraca não funciona às ${diasNomes[dayOfWeek]}s. Por favor, escolha outro dia.`;
        }

        // Validar horário de entrada
        const selectedTime = timeInput.value;
        const { horarioInicio, horarioFim } = this.parseHorarioFunc();

        if (selectedTime < horarioInicio || selectedTime > horarioFim) {
            return `O horário selecionado está fora do horário de funcionamento (${horarioInicio} - ${horarioFim}).`;
        }

        // NOVA VALIDAÇÃO: Verificar se a duração não ultrapassa o horário de fechamento
        const duration = parseFloat(durationSelect?.value || '4'); // Agora aceita decimais
        const [startHour, startMinute] = selectedTime.split(':').map(Number);
        const [endHour, endMinute] = horarioFim.split(':').map(Number);
        
        // Calcular horário de saída (agora em minutos para suportar frações de hora)
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = startTotalMinutes + (duration * 60);
        const closeTotalMinutes = endHour * 60 + endMinute;
        
        const exitHour = Math.floor(endTotalMinutes / 60);
        const exitMinute = endTotalMinutes % 60;
        const exitTime = `${String(exitHour).padStart(2, '0')}:${String(exitMinute).padStart(2, '0')}`;
        
        // Formatar duração para exibição
        const durationHours = Math.floor(duration);
        const durationMinutes = Math.round((duration - durationHours) * 60);
        let durationText = '';
        if (durationHours > 0) durationText += `${durationHours}h`;
        if (durationMinutes > 0) durationText += `${durationMinutes}min`;
        
        console.log('[Reservar] Validação de duração:', {
            entrada: selectedTime,
            duracao: durationText,
            saida_calculada: exitTime,
            fechamento: horarioFim,
            dentro_horario: endTotalMinutes <= closeTotalMinutes
        });

        if (endTotalMinutes > closeTotalMinutes) {
            return `Com essa duração (${durationText}), você sairia às ${exitTime}, mas a barraca fecha às ${horarioFim}. Por favor, escolha uma duração menor ou um horário de entrada mais cedo.`;
        }

        return null;
    }

    collectFormData() {
        const dateInput = document.getElementById('reservationDate');
        const timeInput = document.getElementById('reservationTime');
        const durationSelect = document.getElementById('reservationDuration');
        const nameInputs = document.querySelectorAll('input[name="participantName[]"]');

        // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
        const dateParts = dateInput.value.split('/');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        // Combinar data e hora para timestamp de início (SEM timezone para evitar conversão)
        const [hours, minutes] = timeInput.value.split(':');
        const startDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], hours, minutes, 0);
        
        // Calcular data_fim (adicionar duração selecionada) - agora suporta decimais
        const duration = parseFloat(durationSelect?.value || '4');
        const endDate = new Date(startDate.getTime() + (duration * 60 * 60 * 1000));
        
        // Formatar para PostgreSQL timestamp (formato: YYYY-MM-DD HH:MM:SS) sem conversão UTC
        const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            const second = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        };

        const startDateString = formatDateTime(startDate);
        const endDateString = formatDateTime(endDate);

        // Formatar duração para exibição no log
        const durationHours = Math.floor(duration);
        const durationMinutes = Math.round((duration - durationHours) * 60);
        let durationText = '';
        if (durationHours > 0) durationText += `${durationHours}h`;
        if (durationMinutes > 0) durationText += `${durationMinutes}min`;

        console.log('[Reservar] Horários calculados:', {
            inicio: startDateString,
            fim: endDateString,
            duracao: durationText
        });

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