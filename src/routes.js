import express from 'express';
import pool from './database.js'; // Importa o pool de conexões.

const router = express.Router();

// Rota de registro de usuário.
router.post('/register', async (req, res) => {
    // ... (mantenha o código existente do registro) ...
    // Extrai os dados do corpo da requisição.
    const { email, senha, nome, tipo_conta } = req.body;

    // Garante que o tipo de conta é 'cliente' ou 'gestor'.
    if (tipo_conta !== 'cliente' && tipo_conta !== 'gestor') {
        return res.status(400).json({ error: 'Tipo de conta inválido. Use "cliente" ou "gestor".' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicia a transação.

        // 1. Insere na tabela 'usuarios', usando a senha em texto simples.
        const usuarioResult = await client.query(
            'INSERT INTO usuarios (email, senha, tipo_conta) VALUES ($1, $2, $3) RETURNING id_usuario',
            [email, senha, tipo_conta]
        );
        const id_usuario = usuarioResult.rows[0].id_usuario;

        // 2. Insere o nome na tabela de cliente ou gestor, dependendo do tipo.
        if (tipo_conta === 'cliente') {
            await client.query(
                'INSERT INTO cliente (id_cliente, nome) VALUES ($1, $2)',
                [id_usuario, nome]
            );
        } else if (tipo_conta === 'gestor') {
            await client.query(
                'INSERT INTO gestor (id_gestor, nome) VALUES ($1, $2)',
                [id_usuario, nome]
            );
        }

        await client.query('COMMIT'); // Confirma a transação.
        res.status(201).json({ message: 'Usuário registrado com sucesso!', id_usuario, email, nome, tipo_conta });

    } catch (error) {
        await client.query('ROLLBACK'); // Desfaz a transação em caso de erro.
        console.error('Erro ao registrar o usuário:', error);
        res.status(500).json({ error: 'Erro ao registrar o usuário.', details: error.message });
    } finally {
        client.release(); // Libera a conexão.
    }
});

// Rota de login de usuário.
router.post('/login', async (req, res) => {
    // ... (mantenha o código existente do login) ...
    const { email, senha } = req.body;

    const client = await pool.connect();
    
    try {
        // Busca o usuário pelo e-mail.
        const result = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        // Se o usuário não for encontrado.
        if (!usuario) {
            return res.status(401).json({ error: 'Email ou senha incorretos.' });
        }

        // Compara a senha digitada com a senha em texto simples do banco de dados.
        if (senha !== usuario.senha) {
            return res.status(401).json({ error: 'Email ou senha incorretos.' });
        }

        // Se a senha estiver correta, busca informações adicionais (nome)
        // do cliente ou gestor.
        let nomeUsuario = null;
        if (usuario.tipo_conta === 'cliente') {
            const clienteResult = await client.query('SELECT nome FROM cliente WHERE id_cliente = $1', [usuario.id_usuario]);
            nomeUsuario = clienteResult.rows[0]?.nome;
        } else if (usuario.tipo_conta === 'gestor') {
            const gestorResult = await client.query('SELECT nome FROM gestor WHERE id_gestor = $1', [usuario.id_usuario]);
            nomeUsuario = gestorResult.rows[0]?.nome;
        }

        res.status(200).json({ 
            message: 'Login bem-sucedido!',
            id_usuario: usuario.id_usuario,
            email: usuario.email,
            nome: nomeUsuario,
            tipo_conta: usuario.tipo_conta
        });

    } catch (error) {
        console.error('Erro ao tentar fazer login:', error);
        res.status(500).json({ error: 'Erro no servidor.', details: error.message });
    } finally {
        client.release(); // Libera a conexão.
    }
});

// --- NOVA ROTA: Criar Reserva ---
router.post('/reservas', async (req, res) => {
    const { id_barraca, id_cliente, data_reserva, data_inicio, data_fim, num_pessoas, participantes, status } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verifica disponibilidade básica (opcional, pois o front já verifica)
        // Aqui apenas inserimos a reserva
        const query = `
            INSERT INTO reservas (id_barraca, id_cliente, data_reserva, data_inicio, data_fim, num_pessoas, participantes, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const values = [id_barraca, id_cliente, data_reserva, data_inicio, data_fim, num_pessoas, participantes, status || 'pendente'];
        
        const result = await client.query(query, values);
        const novaReserva = result.rows[0];

        await client.query('COMMIT');
        res.status(201).json(novaReserva);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar reserva:', error);
        res.status(500).json({ error: 'Erro ao criar reserva.', details: error.message });
    } finally {
        client.release();
    }
});

export default router;