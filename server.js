import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import compression from 'compression'; // Adicionado de volta
import dotenv from 'dotenv';
import express from 'express'; 
import helmet from 'helmet'; 
import sql from 'mssql'; 

// Carregar variáveis de ambiente (para desenvolvimento local)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração da Ligação ao Banco de Dados (CORRIGIDO) ---
const dbConfig = {
    // CORRETO: Usa os NOMES das variáveis de ambiente
    server: process.env.DB_SERVER,     
    database: process.env.DB_DATABASE, 
    user: process.env.DB_USER,         
    password: process.env.DB_PASSWORD, 
    options: {
        // Usa a variável NODE_ENV para decidir a encriptação (boa prática!)
        // Lembre-se de definir NODE_ENV = production nas Configurações de Aplicativo do Azure
        encrypt: process.env.NODE_ENV === 'production', 
        trustServerCertificate: process.env.NODE_ENV !== 'production' // true para dev local
    },
    pool: { 
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000 
    }
};

// Cria uma promessa para o pool de ligações
let poolPromise = sql.connect(dbConfig)
    .then(pool => {
        console.log('✅ Ligado ao Banco de Dados SQL do Azure com sucesso!');
        return pool;
    })
    .catch(err => {
        console.error('### ERRO GRAVE ao ligar ao Banco de Dados:', err.message);
        return null;
    });

// --- Configuração do Servidor Express ---
const app = express();
app.set('trust proxy', true); 
const PORT = process.env.PORT || 8080;

// --- Middlewares Essenciais ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression()); // Adicionado de volta para performance
app.use(express.json()); // Para parsing de JSON

// --- ROTAS DA API ---
// (Aqui virão as suas rotas, como /api/feedbacks, /api/projects, etc.)
// Exemplo de rota de teste:
app.get('/api/test-db', async (req, res) => {
    try {
        const pool = await poolPromise;
        if (!pool) {
            return res.status(500).json({ error: 'Conexão com banco de dados não disponível' });
        }
        const result = await pool.request().query('SELECT 1 as test');
        res.json({ message: 'Conexão com banco de dados OK', data: result.recordset });
    } catch (error) {
        console.error('Erro ao testar conexão:', error);
        res.status(500).json({ error: 'Erro ao conectar com banco de dados', details: error.message });
    }
});
// (Adicione aqui as rotas GET /api/feedbacks e POST /api/feedbacks da mensagem anterior)

// --- Servir Arquivos Estáticos (do build do Vite) ---
const staticDir = path.join(__dirname, 'dist');
app.use(express.static(staticDir, { maxAge: '7d' }));

// --- SPA Fallback (DEVE SER A ÚLTIMA ROTA) ---
app.get('*', (req, res) => {
    // Evita que APIs deem fallback para index.html
    if (req.path.startsWith('/api/')) {
        return res.status(404).send('Endpoint de API não encontrado');
    }
    console.log(`[${new Date().toISOString()}] Rota não API/estática, servindo index.html para ${req.path}`);
    res.sendFile(path.join(staticDir, 'index.html'));
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.WEBSITE_HOSTNAME) {
        console.log(`   Acessível publicamente em: https://${process.env.WEBSITE_HOSTNAME}`);
    } else {
        console.log(`   Acesse localmente em: http://localhost:${PORT}`);
    }
});