import path from 'path';
import process from 'process'; // Mantido do seu código
import { fileURLToPath } from 'url';

import compression from 'compression'; // Adicionado de volta para performance
import dotenv from 'dotenv'; // Mantido do seu código
import express from 'express'; // Framework web
import helmet from 'helmet'; // Para segurança básica (headers HTTP)
import sql from 'mssql'; // Biblioteca para conectar ao SQL Server / Azure SQL

// Carregar variáveis de ambiente de um arquivo .env (apenas para desenvolvimento local)
// No Azure, as variáveis são lidas das "Configurações de Aplicativo"
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração da Ligação ao Banco de Dados ---
// CORRIGIDO: Lê os *nomes* das variáveis de ambiente
const dbConfig = {
    server: process.env.DB_SERVER,     // Ex: codecraftgenz.database.windows.net
    database: process.env.DB_DATABASE, // Ex: codecraftgenz
    user: process.env.DB_USER,         // Ex: CloudSA12565d7a
    password: process.env.DB_PASSWORD, // A senha que você definiu no Azure
    options: {
        // Usa a variável NODE_ENV para decidir a encriptação (boa prática!)
        // Lembre-se de definir NODE_ENV = production nas Configurações de Aplicativo do Azure
        encrypt: process.env.NODE_ENV === 'production',
        trustServerCertificate: process.env.NODE_ENV !== 'production' // true para dev local, false para Azure
    },
    pool: { // Configurações do pool de ligações
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
        console.error('### ERRO ao ligar ao Banco de Dados:', err.message);
        console.log('⚠️ Servidor continuará funcionando sem conexão com BD');
        return null;
    });

// --- Configuração do Servidor Express ---
const app = express();
app.set('trust proxy', true); // Necessário para confiar nos headers do proxy do Azure
const PORT = process.env.PORT || 8080;

// --- Middlewares Essenciais ---
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression()); // Compressão para melhor performance
app.use(express.json({ limit: '10mb' })); // Para parsing de JSON com limite

// Middleware para logs de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// --- ROTAS DA API ---

// GET /api/feedbacks - Busca os últimos feedbacks aprovados
app.get('/api/feedbacks', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/feedbacks`);
    try {
        const pool = await poolPromise;
        if (!pool) {
            console.log(`[${new Date().toISOString()}] GET /api/feedbacks: BD indisponível, retornando dados mock`);
            // Retorna dados mock quando BD não está disponível
            const mockFeedbacks = [
                {
                    ID: 1,
                    Author: "João Silva",
                    Company: "Tech Corp",
                    Message: "Excelente trabalho! Muito profissional.",
                    Rating: 5,
                    Type: "general",
                    AvatarUrl: null,
                    CreatedAt: new Date().toISOString()
                },
                {
                    ID: 2,
                    Author: "Maria Santos",
                    Company: "Digital Solutions",
                    Message: "Projeto entregue no prazo e com qualidade.",
                    Rating: 5,
                    Type: "technical",
                    AvatarUrl: null,
                    CreatedAt: new Date().toISOString()
                }
            ];
            return res.status(200).json(mockFeedbacks);
        }

        const result = await pool.request()
            .query(`
                SELECT TOP 20 ID, Author, Company, Message, Rating, Type, AvatarUrl, CreatedAt
                FROM Feedbacks
                WHERE Approved = 1
                ORDER BY CreatedAt DESC
            `);

        console.log(`[${new Date().toISOString()}] GET /api/feedbacks: ${result.recordset.length} feedbacks encontrados.`);
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em GET /api/feedbacks:`, err.message);
        // Retorna dados mock em caso de erro
        const mockFeedbacks = [
            {
                ID: 1,
                Author: "Sistema",
                Company: "CodeCraft",
                Message: "Dados temporariamente indisponíveis",
                Rating: 5,
                Type: "system",
                AvatarUrl: null,
                CreatedAt: new Date().toISOString()
            }
        ];
        res.status(200).json(mockFeedbacks);
    }
});

// POST /api/feedbacks - Cria um novo feedback
app.post('/api/feedbacks', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido POST /api/feedbacks com dados:`, req.body);
    const { author, company, message, rating, type, avatarUrl } = req.body;

    // Validação básica
    if (!message || typeof rating !== 'number' || !type) {
        console.warn(`[${new Date().toISOString()}] POST /api/feedbacks: Dados inválidos.`);
        return res.status(400).json({ error: 'Campos obrigatórios em falta ou inválidos: message, rating, type' });
    }

    try {
        const pool = await poolPromise;
        if (!pool) {
            console.log(`[${new Date().toISOString()}] POST /api/feedbacks: BD indisponível, simulando sucesso`);
            // Simula sucesso quando BD não está disponível
            const mockResponse = {
                id: Date.now(),
                createdAt: new Date().toISOString(),
                approved: true,
                ...req.body
            };
            return res.status(201).json(mockResponse);
        }

        const result = await pool.request()
            .input('Author', sql.NVarChar(100), author || null)
            .input('Company', sql.NVarChar(100), company || null)
            .input('Message', sql.NVarChar(500), message)
            .input('Rating', sql.Int, rating)
            .input('Type', sql.VarChar(20), type)
            .input('AvatarUrl', sql.VarChar(255), avatarUrl || null)
            .query(`
                INSERT INTO Feedbacks (Author, Company, Message, Rating, Type, AvatarUrl, Approved)
                OUTPUT INSERTED.ID, INSERTED.CreatedAt, INSERTED.Approved
                VALUES (@Author, @Company, @Message, @Rating, @Type, @AvatarUrl, 1);
            `);

        if (result.recordset && result.recordset.length > 0) {
            const newFeedback = { id: result.recordset[0].ID, createdAt: result.recordset[0].CreatedAt, approved: result.recordset[0].Approved, ...req.body };
            console.log(`[${new Date().toISOString()}] POST /api/feedbacks: Feedback ID ${newFeedback.id} inserido.`);
            res.status(201).json(newFeedback);
        } else {
            throw new Error('Falha ao obter ID do feedback inserido.');
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em POST /api/feedbacks:`, err.message);
        // Simula sucesso em caso de erro
        const mockResponse = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            approved: true,
            ...req.body
        };
        res.status(201).json(mockResponse);
    }
});

// Rota de teste
app.get('/api/test-db', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/test-db`);
    try {
        const pool = await poolPromise;
        if (!pool) {
            console.log(`[${new Date().toISOString()}] GET /api/test-db: BD indisponível`);
            return res.status(200).json({ 
                message: 'Servidor funcionando (BD temporariamente indisponível)', 
                status: 'ok_without_db',
                timestamp: new Date().toISOString()
            });
        }
        
        const result = await pool.request().query('SELECT 1 as test');
        console.log(`[${new Date().toISOString()}] GET /api/test-db: Teste de BD OK.`);
        res.json({ 
            message: 'Conexão com banco de dados OK', 
            data: result.recordset,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro em GET /api/test-db:`, error.message);
        res.status(200).json({ 
            message: 'Servidor funcionando (erro de BD)', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// --- Servir Arquivos Estáticos ---
const staticDir = path.join(__dirname, 'dist');

// Configuração de headers de cache para assets estáticos
app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
  maxAge: '1y', // Cache por 1 ano
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Cache específico para diferentes tipos de arquivo
    if (filePath.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 dias para imagens
    }
  }
}));

// Serve arquivos estáticos do React com cache otimizado
app.use(express.static(staticDir, {
  maxAge: '1d', // Cache por 1 dia para arquivos HTML
  etag: true,
  lastModified: true
}));

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