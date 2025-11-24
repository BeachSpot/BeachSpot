import { supabase } from './supabaseClient.js';

/**
 * Sistema SIMPLIFICADO de Políticas de Reservas
 * Mantém APENAS:
 * - Política de Cancelamento (4h antes)
 * - Limite de Reservas Ativas (máx 3)
 */

export class ReservationPolicies {
    constructor() {
        this.PRAZO_CANCELAMENTO_HORAS = 4;
        this.MAX_RESERVAS_ATIVAS = 3;
    }

    /**
     * 🔴 REMOVIDO: Confirmação dupla - Agora é automático
     * Reservas confirmadas imediatamente ao criar
     */

    /**
     * ✅ MANTIDO: POLÍTICA DE CANCELAMENTO COM PRAZO
     * Verifica se está dentro do prazo e registra faltas
     */
    async cancelarReserva(idReserva, idCliente, motivoCancelamento = 'Cliente cancelou') {
        try {
            console.log('[Policies] Processando cancelamento:', idReserva);

            // Buscar reserva
            const { data: reserva, error } = await supabase
                .from('reservas')
                .select('*')
                .eq('id_reserva', idReserva)
                .eq('id_cliente', idCliente)
                .single();

            if (error) throw error;

            // Verificar se pode cancelar
            const agora = new Date();
            const dataReserva = new Date(reserva.data_inicio);
            const horasRestantes = (dataReserva - agora) / (1000 * 60 * 60);

            let registrarFalta = false;
            let mensagem = '';

            if (horasRestantes < this.PRAZO_CANCELAMENTO_HORAS) {
                registrarFalta = true;
                mensagem = `Cancelamento fora do prazo (menos de ${this.PRAZO_CANCELAMENTO_HORAS}h). Registrado como falta.`;
            } else {
                mensagem = 'Cancelamento realizado dentro do prazo. Sem penalidades.';
            }

            // Atualizar status
            const { error: updateError } = await supabase
                .from('reservas')
                .update({ 
                    status: 'cancelada',
                    motivo_cancelamento: motivoCancelamento,
                    cancelado_em: new Date().toISOString()
                })
                .eq('id_reserva', idReserva);

            if (updateError) throw updateError;

            // Registrar falta se necessário
            if (registrarFalta) {
                await this.registrarFalta(idCliente, idReserva, 'cancelamento_tardio');
            }

            console.log('[Policies]', registrarFalta ? '❌ Falta registrada' : '✅ Cancelado sem penalidade');

            return { 
                success: true, 
                registrouFalta: registrarFalta,
                mensagem 
            };

        } catch (error) {
            console.error('[Policies] Erro ao cancelar:', error);
            throw error;
        }
    }

    /**
     * Registrar falta do cliente
     */
    async registrarFalta(idCliente, idReserva, tipo = 'no_show') {
        try {
            const { error } = await supabase
                .from('faltas_clientes')
                .insert({
                    id_cliente: idCliente,
                    id_reserva: idReserva,
                    tipo_falta: tipo,
                    data_falta: new Date().toISOString()
                });

            if (error) throw error;

            // Verificar se deve bloquear
            await this.verificarBloqueio(idCliente);

        } catch (error) {
            console.error('[Policies] Erro ao registrar falta:', error);
        }
    }

    /**
     * Verificar se cliente deve ser bloqueado (3 faltas)
     */
    async verificarBloqueio(idCliente) {
        try {
            const { data: faltas, error } = await supabase
                .from('faltas_clientes')
                .select('*')
                .eq('id_cliente', idCliente);

            if (error) throw error;

            const totalFaltas = faltas?.length || 0;

            if (totalFaltas >= 3) {
                // Bloquear por 7 dias
                const dataBloqueioAte = new Date();
                dataBloqueioAte.setDate(dataBloqueioAte.getDate() + 7);

                await supabase
                    .from('cliente')
                    .update({ 
                        bloqueado_ate: dataBloqueioAte.toISOString(),
                        motivo_bloqueio: `${totalFaltas} faltas acumuladas`
                    })
                    .eq('id_cliente', idCliente);

                console.log('[Policies] 🚫 Cliente bloqueado por 7 dias');
            }

        } catch (error) {
            console.error('[Policies] Erro ao verificar bloqueio:', error);
        }
    }

    /**
     * 🔴 REMOVIDO: Sistema de Reputação/Taxa de Comparecimento
     * Substituído por contagem simples de avaliações
     */

    /**
     * ✅ MANTIDO: LIMITE DE RESERVAS ATIVAS
     * Verifica se cliente pode fazer nova reserva
     */
    async podeReservar(idCliente) {
        try {
            // Verificar bloqueio
            const { data: cliente, error: errorCliente } = await supabase
                .from('cliente')
                .select('bloqueado_ate')
                .eq('id_cliente', idCliente)
                .single();

            if (errorCliente) throw errorCliente;

            if (cliente?.bloqueado_ate) {
                const dataBloqueio = new Date(cliente.bloqueado_ate);
                if (dataBloqueio > new Date()) {
                    return {
                        pode: false,
                        motivo: `Cliente bloqueado até ${this.formatarData(cliente.bloqueado_ate)}`
                    };
                }
            }

            // Contar reservas ativas (pendentes ou confirmadas)
            const { data: reservasAtivas, error } = await supabase
                .from('reservas')
                .select('id_reserva')
                .eq('id_cliente', idCliente)
                .in('status', ['pendente', 'confirmada']);

            if (error) throw error;

            const totalAtivas = reservasAtivas?.length || 0;

            if (totalAtivas >= this.MAX_RESERVAS_ATIVAS) {
                return {
                    pode: false,
                    motivo: `Você já tem ${totalAtivas} reservas ativas. Máximo permitido: ${this.MAX_RESERVAS_ATIVAS}`
                };
            }

            return { pode: true };

        } catch (error) {
            console.error('[Policies] Erro ao verificar limite:', error);
            return { pode: true }; // Em caso de erro, permitir
        }
    }

    /**
     * ✨ NOVA FUNÇÃO: Obter estatísticas do cliente
     * Conta avaliações feitas pelo cliente
     */
    async obterEstatisticasCliente(idCliente) {
        try {
            // Contar reservas totais
            const { count: totalReservas } = await supabase
                .from('reservas')
                .select('*', { count: 'exact', head: true })
                .eq('id_cliente', idCliente);

            // Contar avaliações feitas
            const { count: totalAvaliacoes } = await supabase
                .from('avaliacoes')
                .select('*', { count: 'exact', head: true })
                .eq('id_usuario', idCliente);

            // Contar faltas
            const { count: totalFaltas } = await supabase
                .from('faltas_clientes')
                .select('*', { count: 'exact', head: true })
                .eq('id_cliente', idCliente);

            return {
                totalReservas: totalReservas || 0,
                totalAvaliacoes: totalAvaliacoes || 0,
                totalFaltas: totalFaltas || 0
            };

        } catch (error) {
            console.error('[Policies] Erro ao obter estatísticas:', error);
            return {
                totalReservas: 0,
                totalAvaliacoes: 0,
                totalFaltas: 0
            };
        }
    }

    /**
     * FUNÇÕES AUXILIARES
     */
    formatarData(dataISO) {
        if (!dataISO) return '';
        const data = new Date(dataISO);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    formatarHora(dataISO) {
        if (!dataISO) return '';
        const data = new Date(dataISO);
        return data.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Instância global
export const reservationPolicies = new ReservationPolicies();