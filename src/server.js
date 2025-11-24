// Importa as bibliotecas necessárias.
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes.js'; // Importa as rotas

// Define o caminho do diretório atual.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- CORREÇÃO PARA O RENDER ---
// Usa a porta definida pelo Render (process.env.PORT) ou 3001 se estiver local
const PORT = process.env.PORT || 3001; 

// Middlewares para habilitar CORS e processar JSON.
app.use(cors());
app.use(express.json());

// Serve toda a pasta 'public' como raiz
app.use(express.static(path.join(__dirname, '../public')));

// Usa as rotas importadas para os endpoints da API.
app.use('/api', apiRoutes);

// Rota raiz - redireciona para cadastro
app.get('/', (req, res) => {
    res.redirect('/cadastro.html');
});

// Inicia o servidor.
app.listen(PORT, '0.0.0.0', () => { // '0.0.0.0' é importante para acesso externo
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Pasta public servida em: ${path.join(__dirname, '../public')}`);
});