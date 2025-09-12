import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

// Define o caminho do diretório atual.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
    connectionString: 'postgresql://postgres.ncabatizzzpxctqsbxpd:Be@chSp0t680@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
});

const app = express();
const PORT = 3001;

// Middlewares para habilitar CORS e processar JSON.
app.use(cors());
app.use(express.json());

// Serve arquivos estáticos da pasta 'client'.
app.use(express.static(path.join(__dirname, 'client')));

// Rota de registro de usuário.
app.post('/api/register', async (req, res) => {
    // Extrai os dados do corpo da requisição.
    const { email, senha, nome, tipo_conta } = req.body;

    // Garante que o tipo de conta é 'cliente' ou 'gestor'.
    if (tipo_conta !== 'cliente' && tipo_conta !== 'gestor') {
        return res.status(400).json({ error: 'Tipo de conta inválido. Use "cliente" ou "gestor".' });
    }

    // Inicia uma transação para garantir que ambas as inserções aconteçam com sucesso.
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicia a transação.

        // 1. Insere na tabela 'usuarios'.
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

// Inicia o servidor.
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});