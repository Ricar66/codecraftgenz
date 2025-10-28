import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import express from 'express'; // Framework web
import helmet from 'helmet'; // Para segurança básica (headers HTTP)
import sql from 'mssql'; // Biblioteca para conectar ao SQL Server / Azure SQL

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração da Ligação ao Banco de Dados ---
// Lê as credenciais das Variáveis de Ambiente configuradas no Azure App Service
const dbConfig = {
    server: process.env.codecraftgenz.database.windows.net, // Ex: codecraftgenz.database.windows.net ou localhost
    database: process.env.codecraftgenz, // Ex: codecraftgenz
    user: process.env.CloudSA12565d7a, // Ex: sa ou CloudSA12565d7a
    password: process.env['Dedecdmm1902@66'], // A senha que você definiu
    options: {
        encrypt: process.env.NODE_ENV === 'production', // Obrigatório para Azure SQL, opcional para local
        trustServerCertificate: process.env.NODE_ENV !== 'production' // true para desenvolvimento local
    },
    pool: { // Configurações do pool de ligações (melhora performance)
        max: 10, // Máximo de 10 ligações simultâneas
        min: 0,  // Mínimo de 0 ligações
        idleTimeoutMillis: 30000 // Fecha ligações inativas após 30 segundos
    }
};

// Cria uma promessa para o pool de ligações. O código tentará conectar ao iniciar.
// As rotas da API usarão `pool` para garantir que a ligação esteja pronta.
let pool = sql.connect(dbConfig)
    .then(pool => {
        console.log('✅ Ligado ao Banco de Dados SQL do Azure com sucesso!');
        return pool;
    })
    .catch(err => {
        console.error('### ERRO GRAVE ao ligar ao Banco de Dados:', err);
        // Retornamos null para que as rotas possam verificar se o pool está disponível
        return null;
    });

// --- Configuração do Servidor Express ---
const app = express();
app.set('trust proxy', true); // Necessário para confiar nos headers do proxy do Azure
const PORT = process.env.PORT || 8080; // Porta definida pelo Azure ou 8080 localmente

// --- Middlewares Essenciais ---
app.use(helmet({ // Adiciona headers de segurança
  contentSecurityPolicy: false, // Mantido como false, conforme seu código original
}));

// Middleware para parsing JSON
app.use(express.json());

// Servir arquivos estáticos do build do React
app.use(express.static(path.join(__dirname, 'dist')));

// Rota de teste para verificar conexão com banco
app.get('/api/test-db', async (req, res) => {
    try {
        const poolConnection = await pool;
        if (!poolConnection) {
            return res.status(500).json({ error: 'Conexão com banco de dados não disponível' });
        }
        
        const result = await poolConnection.request().query('SELECT 1 as test');
        res.json({ message: 'Conexão com banco de dados OK', data: result.recordset });
    } catch (error) {
        console.error('Erro ao testar conexão:', error);
        res.status(500).json({ error: 'Erro ao conectar com banco de dados' });
    }
});

// Todas as outras rotas devem retornar o React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});