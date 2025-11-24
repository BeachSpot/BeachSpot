import express from 'express';
import pool from './database.js'; // Importa o pool de conexões.

const router = express.Router();

// Rota de registro de usuário.
router.post('/register', async (req, res) => {
    const { email, senha, nome, tipo_conta } = req.body;

    if (tipo_conta !== 'cliente' && tipo_conta !== 'gestor') {
        return res.status(400).json({ error: 'Tipo de conta inválido.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const usuarioResult = await client.query(
            'INSERT INTO usuarios (email, senha, tipo_conta) VALUES ($1, $2, $3) RETURNING id_usuario',
            [email, senha, tipo_conta]
        );
        const id_usuario = usuarioResult.rows[0].id_usuario;

        if (tipo_conta === 'cliente') {
            await client.query('INSERT INTO cliente (id_cliente, nome) VALUES ($1, $2)', [id_usuario, nome]);
        } else if (tipo_conta === 'gestor') {
            await client.query('INSERT INTO gestor (id_gestor, nome) VALUES ($1, $2)', [id_usuario, nome]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Usuário registrado com sucesso!', id_usuario, email, nome, tipo_conta });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao registrar:', error);
        res.status(500).json({ error: 'Erro ao registrar usuário.', details: error.message });
    } finally {
        client.release();
    }
});

// Rota de login
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    const client = await pool.connect();
    
    try {
        const result = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        if (!usuario || senha !== usuario.senha) {
            return res.status(401).json({ error: 'Email ou senha incorretos.' });
        }

        let nomeUsuario = null;
        if (usuario.tipo_conta === 'cliente') {
            const r = await client.query('SELECT nome FROM cliente WHERE id_cliente = $1', [usuario.id_usuario]);
            nomeUsuario = r.rows[0]?.nome;
        } else if (usuario.tipo_conta === 'gestor') {
            const r = await client.query('SELECT nome FROM gestor WHERE id_gestor = $1', [usuario.id_usuario]);
            nomeUsuario = r.rows[0]?.nome;
        }

        res.status(200).json({ 
            message: 'Login bem-sucedido!',
            id_usuario: usuario.id_usuario,
            email: usuario.email,
            nome: nomeUsuario,
            tipo_conta: usuario.tipo_conta
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro no servidor.' });
    } finally {
        client.release();
    }
});

// --- NOVA ROTA DE RESERVA (Faltava isso) ---
router.post('/reservas', async (req, res) => {
    // Pega os dados enviados pelo frontend (reservar.js)
    const { id_barraca, id_cliente, data_reserva, data_inicio, data_fim, num_pessoas, participantes, status } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insere a reserva no banco de dados
        const query = `
            INSERT INTO reservas (id_barraca, id_cliente, data_reserva, data_inicio, data_fim, num_pessoas, participantes, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const values = [id_barraca, id_cliente, data_reserva, data_inicio, data_fim, num_pessoas, participantes, status || 'pendente'];
        
        const result = await client.query(query, values);
        
        await client.query('COMMIT');
        
        // Retorna a reserva criada para o frontend
        res.status(201).json(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar reserva:', error);
        res.status(500).json({ error: 'Erro ao criar reserva no servidor.', details: error.message });
    } finally {
        client.release();
    }
});

export default router;