import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- CORREÇÃO CRÍTICA PARA O RENDER ---
// O Render exige o uso de process.env.PORT
const PORT = process.env.PORT || 3001; 

app.use(cors());
app.use(express.json());

// Serve os arquivos do frontend (pasta public)
app.use(express.static(path.join(__dirname, '../public')));

// Rotas da API
app.use('/api', apiRoutes);

// Rota raiz
app.get('/', (req, res) => {
    res.redirect('/inicio.html');
});

// O servidor precisa escutar em '0.0.0.0' para funcionar na nuvem
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Pasta public servida em: ${path.join(__dirname, '../public')}`);
});