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
const PORT = 3001;

// Middlewares para habilitar CORS e processar JSON.
app.use(cors());
app.use(express.json());

// Serve arquivos estáticos da pasta 'client'.
app.use(express.static(path.join(__dirname, 'client')));

// Usa as rotas importadas para os endpoints da API.
app.use('/api', apiRoutes);

// Inicia o servidor.
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
