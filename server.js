import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';

import { getConnectionPool, dbSql } from './src/lib/db.js';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração do Servidor Express ---
const app = express();
const PORT = process.env.PORT || 8080;

// --- Middlewares Essenciais ---
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// (Removido) Dados mock de demonstração – não utilizados

// Removido: mocks de apps e histórico; rotas agora usam SQL (dbo.apps, dbo.app_history, dbo.app_payments)

// --- Configuração Mercado Pago ---
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const MP_SUCCESS_URL = process.env.MERCADO_PAGO_SUCCESS_URL || 'http://localhost:5173/apps/:id/compra';
const MP_FAILURE_URL = process.env.MERCADO_PAGO_FAILURE_URL || 'http://localhost:5173/apps/:id/compra';
const MP_PENDING_URL = process.env.MERCADO_PAGO_PENDING_URL || 'http://localhost:5173/apps/:id/compra';
const MP_WEBHOOK_URL = process.env.MERCADO_PAGO_WEBHOOK_URL || 'http://localhost:8080/api/apps/webhook';

let mpClient = null;
try {
  if (MP_ACCESS_TOKEN) {
    mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    console.log('✅ Mercado Pago SDK configurado');
  } else {
    console.log('ℹ️ Mercado Pago não configurado (MERCADO_PAGO_ACCESS_TOKEN ausente); usando fluxo mock.');
  }
} catch (e) {
  console.warn('⚠️ Falha ao inicializar Mercado Pago SDK:', e?.message || e);
}

// Estado simples em memória para associar status por app
const paymentsByApp = new Map(); // appId -> { payment_id, status }

// --- Middleware de Autenticação e Autorização ---
function authenticate(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const [type, token] = auth.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    // Decodificação simples baseada em prefixo do token (mock)
    const isAdmin = token.startsWith('admin-token');
    req.user = {
      id: isAdmin ? 1 : 2,
      email: isAdmin ? 'admin@codecraft.dev' : 'user@example.com',
      role: isAdmin ? 'admin' : 'user',
      token,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
}

function authorizeAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

// --- Rotas da API ---

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota de autenticação (hardcoded para admin)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Credenciais hardcoded para admin
  const adminCredentials = {
    email: 'admin@codecraft.dev',
    password: 'admin123'
  };
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  
  if (email === adminCredentials.email && password === adminCredentials.password) {
    // Login bem-sucedido
    const token = 'admin-token-' + Date.now(); // Token simples para demonstração
    const user = {
      id: 1,
      email: adminCredentials.email,
      name: 'Administrador',
      role: 'admin'
    };
    
    res.json({
      success: true,
      token,
      user
    });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// Rotas de Projetos (integradas com banco)
// Rotas de Projetos (integradas com banco)
app.get('/api/projetos', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    // CORREÇÃO: Adicione dbo.
    const result = await pool.request().query('SELECT * FROM dbo.projetos'); 
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Erro ao buscar projetos no banco:', err);
    next(err);
  }
});

app.get('/api/projetos/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do projeto inválido' });
    }
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', dbSql.Int, id)
       // CORREÇÃO: Adicione dbo.
      .query('SELECT * FROM dbo.projetos WHERE id = @id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao buscar projeto por ID:', err);
    next(err);
  }
});

// Substituição: inserir projeto diretamente no banco (dbo.projetos)
app.post('/api/projetos', async (req, res, next) => {
  const { nome, descricao, tecnologias } = req.body;

  if (!nome || !descricao) {
    return res.status(400).json({ error: 'Nome e descrição são obrigatórios' });
  }

  // 'tecnologias' é NVARCHAR(MAX). Se vier array, salvar como JSON.
  const tecnologiasString = JSON.stringify(tecnologias || []);

  try {
    const pool = await getConnectionPool();

    const query = `
      INSERT INTO dbo.projetos (nome, descricao, tecnologias, status)
      OUTPUT Inserted.* VALUES (@nome, @descricao, @tecnologias, @status)
    `;

    const result = await pool.request()
      .input('nome', dbSql.NVarChar, nome)
      .input('descricao', dbSql.NVarChar, descricao)
      .input('tecnologias', dbSql.NVarChar(dbSql.MAX), tecnologiasString)
      .input('status', dbSql.NVarChar, 'desenvolvimento')
      .query(query);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Erro ao INSERIR projeto no banco:', err);
    next(err);
  }
});

// Rotas de Mentores
app.get('/api/mentores', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '50', 10)));
    const offset = (page - 1) * pageSize;

    const pool = await getConnectionPool();
    const totalResult = await pool.request().query('SELECT COUNT(*) AS total FROM mentores');
    const total = totalResult.recordset[0]?.total || 0;
    const rowsResult = await pool.request()
      .input('offset', dbSql.Int, offset)
      .input('limit', dbSql.Int, pageSize)
      .query('SELECT * FROM mentores ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');

    const data = rowsResult.recordset;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Erro ao buscar mentores no banco:', err);
    next(err);
  }
});

app.get('/api/mentores/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do mentor inválido' });
    }
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', dbSql.Int, id)
      .query('SELECT * FROM mentores WHERE id = @id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Mentor não encontrado' });
    }
    res.json({ success: true, mentor: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao buscar mentor por ID:', err);
    next(err);
  }
});

// Cria um novo mentor
app.post('/api/mentores', async (req, res, next) => {
  try {
    const { nome, email, especialidade, bio, visible, ativo } = req.body || {};
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('nome', dbSql.NVarChar(255), nome)
      .input('email', dbSql.NVarChar(255), email)
      .input('especialidade', dbSql.NVarChar(255), especialidade ?? null)
      .input('bio', dbSql.NVarChar(dbSql.MAX), bio ?? null)
      .input('visible', dbSql.Bit, visible !== undefined ? !!visible : null)
      .input('ativo', dbSql.Bit, ativo !== undefined ? !!ativo : null)
      .query(`INSERT INTO mentores (nome, email, especialidade, bio, visible, ativo, created_at)
              OUTPUT INSERTED.*
              VALUES (@nome, @email, @especialidade, @bio, @visible, @ativo, GETDATE())`);
    return res.status(201).json({ mentor: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao criar mentor:', err);
    next(err);
  }
});

// Atualiza um mentor existente
app.put('/api/mentores/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do mentor inválido' });
    }
    const { nome, email, especialidade, bio, visible, ativo } = req.body || {};
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', dbSql.Int, id)
      .input('nome', dbSql.NVarChar(255), nome ?? null)
      .input('email', dbSql.NVarChar(255), email ?? null)
      .input('especialidade', dbSql.NVarChar(255), especialidade ?? null)
      .input('bio', dbSql.NVarChar(dbSql.MAX), bio ?? null)
      .input('visible', dbSql.Bit, visible !== undefined ? !!visible : null)
      .input('ativo', dbSql.Bit, ativo !== undefined ? !!ativo : null)
      .query(`UPDATE mentores SET
                nome = COALESCE(@nome, nome),
                email = COALESCE(@email, email),
                especialidade = COALESCE(@especialidade, especialidade),
                bio = COALESCE(@bio, bio),
                visible = COALESCE(@visible, visible),
                ativo = COALESCE(@ativo, ativo)
              OUTPUT INSERTED.*
              WHERE id = @id`);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Mentor não encontrado' });
    }
    return res.json({ mentor: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao atualizar mentor:', err);
    next(err);
  }
});

// Remove um mentor
app.delete('/api/mentores/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do mentor inválido' });
    }
    const pool = await getConnectionPool();
    const del = await pool.request()
      .input('id', dbSql.Int, id)
      .query('DELETE FROM mentores WHERE id = @id');
    if ((del.rowsAffected?.[0] || 0) === 0) {
      return res.status(404).json({ error: 'Mentor não encontrado' });
    }
    return res.json({ removed: { id } });
  } catch (err) {
    console.error('Erro ao remover mentor:', err);
    next(err);
  }
});

// Rotas de Crafters
app.get('/api/crafters', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '50', 10)));
    const offset = (page - 1) * pageSize;

    const pool = await getConnectionPool();
    const totalResult = await pool.request().query('SELECT COUNT(*) AS total FROM crafters');
    const total = totalResult.recordset[0]?.total || 0;
    const rowsResult = await pool.request()
      .input('offset', dbSql.Int, offset)
      .input('limit', dbSql.Int, pageSize)
      .query('SELECT * FROM crafters ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');

    const craftersWithStatus = rowsResult.recordset.map(crafter => ({
      ...crafter,
      points: crafter.points ?? crafter.pontos ?? 0,
      active: crafter.active ?? true,
      avatar_url: crafter.avatar_url ?? null,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({
      success: true,
      data: craftersWithStatus,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Erro ao buscar crafters no banco:', err);
    next(err);
  }
});

app.get('/api/ranking', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request().query('SELECT * FROM crafters ORDER BY pontos DESC');
    const crafters = result.recordset.map(crafter => ({
      ...crafter,
      points: crafter.points ?? crafter.pontos ?? 0,
      name: crafter.name ?? crafter.nome,
    }));
    const top3 = crafters.slice(0, 3).map((crafter, index) => ({
      crafter_id: crafter.id,
      position: index + 1,
      reward: index === 0 ? 'Badge Ouro' : index === 1 ? 'Badge Prata' : 'Badge Bronze'
    }));
    res.json({ crafters, top3 });
  } catch (err) {
    console.error('Erro ao buscar ranking no banco:', err);
    next(err);
  }
});

// Rota de feedbacks (site)
app.get('/api/feedbacks', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request().query('SELECT * FROM dbo.site_feedbacks ORDER BY created_at DESC');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Erro ao buscar feedbacks no banco:', err);
    next(err);
  }
});

app.post('/api/feedbacks', async (req, res, next) => {
  try {
    const { nome, email, feedback, rating } = req.body;
    if (!nome || !email || !feedback) {
      return res.status(400).json({ error: 'Nome, email e feedback são obrigatórios' });
    }
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('nome', dbSql.NVarChar(255), nome)
      .input('email', dbSql.NVarChar(255), email)
      .input('feedback', dbSql.NVarChar(dbSql.MAX), feedback)
      .input('rating', dbSql.Int, Number.isFinite(rating) ? rating : 5)
      .query(`INSERT INTO dbo.site_feedbacks (nome, email, feedback, rating)
              OUTPUT INSERTED.*
              VALUES (@nome, @email, @feedback, @rating)`);
    res.status(201).json({ success: true, message: 'Feedback enviado com sucesso!', feedback: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao inserir feedback no banco:', err);
    next(err);
  }
});

// Rota de estatísticas (mock)
app.get('/api/stats', async (req, res, next) => {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM projetos) AS totalProjetos,
        (SELECT COUNT(*) FROM mentores) AS totalMentores,
        (SELECT COUNT(*) FROM crafters) AS totalCrafters,
        (SELECT COUNT(*) FROM projetos WHERE status = 'ativo') AS projetosAtivos
    `);
    const row = result.recordset[0] || { totalProjetos: 0, totalMentores: 0, totalCrafters: 0, projetosAtivos: 0 };
    res.json({ ...row, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Erro ao buscar estatísticas no banco:', err);
    next(err);
  }
});

// --- Rotas de Aplicativos (SQL) ---
// Lista apps do usuário autenticado
app.get('/api/apps/mine', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '12', 10)));
    const offset = (page - 1) * pageSize;
    const userId = req.user?.id;
    const pool = await getConnectionPool();
    const totalResult = await pool.request()
      .input('owner_id', dbSql.Int, userId)
      .query('SELECT COUNT(*) AS total FROM dbo.apps WHERE owner_id = @owner_id');
    const total = totalResult.recordset[0]?.total || 0;
    const rowsResult = await pool.request()
      .input('owner_id', dbSql.Int, userId)
      .input('offset', dbSql.Int, offset)
      .input('limit', dbSql.Int, pageSize)
      .query('SELECT * FROM dbo.apps WHERE owner_id = @owner_id ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');
    res.json({ success: true, data: rowsResult.recordset, pagination: { total, page, pageSize } });
  } catch (err) {
    console.error('Erro ao listar apps do usuário:', err);
    next(err);
  }
});

// Lista todos apps (admin)
app.get('/api/apps', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '50', 10)));
    const offset = (page - 1) * pageSize;
    const pool = await getConnectionPool();
    const totalResult = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.apps');
    const total = totalResult.recordset[0]?.total || 0;
    const rowsResult = await pool.request()
      .input('offset', dbSql.Int, offset)
      .input('limit', dbSql.Int, pageSize)
      .query('SELECT * FROM dbo.apps ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');
    res.json({ success: true, data: rowsResult.recordset, pagination: { total, page, pageSize } });
  } catch (err) {
    console.error('Erro ao listar todos apps:', err);
    next(err);
  }
});

// Detalhes de um app
app.get('/api/apps/:id', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getConnectionPool();
    const result = await pool.request().input('id', dbSql.Int, id).query('SELECT * FROM dbo.apps WHERE id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Aplicativo não encontrado' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Erro ao buscar app por ID:', err);
    next(err);
  }
});

// Criar/atualizar card de app a partir de um projeto (admin)
app.post('/api/apps/from-project/:projectId', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { name, mainFeature, price, thumbnail, executableUrl, status, ownerId } = req.body || {};
    const pool = await getConnectionPool();
    // Tenta UPDATE; se nenhum afetado, faz INSERT
    const update = await pool.request()
      .input('id', dbSql.Int, projectId)
      .input('owner_id', dbSql.Int, ownerId ?? req.user?.id ?? null)
      .input('name', dbSql.NVarChar(120), name ?? `App do Projeto ${projectId}`)
      .input('main_feature', dbSql.NVarChar(400), mainFeature ?? null)
      .input('description', dbSql.NVarChar(dbSql.MAX), mainFeature ?? null)
      .input('status', dbSql.NVarChar(50), status ?? 'finalizado')
      .input('price', dbSql.Decimal(10, 2), price ?? 0)
      .input('thumbnail', dbSql.NVarChar(512), thumbnail ?? null)
      .input('executable_url', dbSql.NVarChar(512), executableUrl ?? null)
      .query(`UPDATE dbo.apps SET owner_id=@owner_id, name=@name, main_feature=@main_feature, description=@description,
              status=@status, price=@price, thumbnail=@thumbnail, executable_url=@executable_url
              WHERE id=@id`);
    if ((update.rowsAffected?.[0] || 0) === 0) {
      await pool.request()
        .input('id', dbSql.Int, projectId)
        .input('owner_id', dbSql.Int, ownerId ?? req.user?.id ?? null)
        .input('name', dbSql.NVarChar(120), name ?? `App do Projeto ${projectId}`)
        .input('main_feature', dbSql.NVarChar(400), mainFeature ?? null)
        .input('description', dbSql.NVarChar(dbSql.MAX), mainFeature ?? null)
        .input('status', dbSql.NVarChar(50), status ?? 'finalizado')
        .input('price', dbSql.Decimal(10, 2), price ?? 0)
        .input('thumbnail', dbSql.NVarChar(512), thumbnail ?? null)
        .input('executable_url', dbSql.NVarChar(512), executableUrl ?? null)
        .query(`INSERT INTO dbo.apps (id, owner_id, name, main_feature, description, status, price, thumbnail, executable_url)
                VALUES (@id, @owner_id, @name, @main_feature, @description, @status, @price, @thumbnail, @executable_url)`);
    }
    const fetch = await pool.request().input('id', dbSql.Int, projectId).query('SELECT * FROM dbo.apps WHERE id=@id');
    res.status(201).json({ success: true, data: fetch.recordset[0] });
  } catch (err) {
    console.error('Erro ao upsert app de projeto:', err);
    next(err);
  }
});

// Editar card de app (admin)
app.put('/api/apps/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, mainFeature, price, thumbnail, executableUrl, status, ownerId } = req.body || {};
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', dbSql.Int, id)
      .input('owner_id', dbSql.Int, ownerId ?? null)
      .input('name', dbSql.NVarChar(120), name ?? null)
      .input('main_feature', dbSql.NVarChar(400), mainFeature ?? null)
      .input('description', dbSql.NVarChar(dbSql.MAX), null)
      .input('status', dbSql.NVarChar(50), status ?? null)
      .input('price', dbSql.Decimal(10, 2), price ?? null)
      .input('thumbnail', dbSql.NVarChar(512), thumbnail ?? null)
      .input('executable_url', dbSql.NVarChar(512), executableUrl ?? null)
      .query(`UPDATE dbo.apps SET
                owner_id = COALESCE(@owner_id, owner_id),
                name = COALESCE(@name, name),
                main_feature = COALESCE(@main_feature, main_feature),
                description = COALESCE(@description, description),
                status = COALESCE(@status, status),
                price = COALESCE(@price, price),
                thumbnail = COALESCE(@thumbnail, thumbnail),
                executable_url = COALESCE(@executable_url, executable_url)
              WHERE id = @id`);
    if ((result.rowsAffected?.[0] || 0) === 0) return res.status(404).json({ error: 'Aplicativo não encontrado' });
    const fetch = await pool.request().input('id', dbSql.Int, id).query('SELECT * FROM dbo.apps WHERE id=@id');
    res.json({ success: true, data: fetch.recordset[0] });
  } catch (err) {
    console.error('Erro ao atualizar app:', err);
    next(err);
  }
});

// Mercado Pago – criar preferência de pagamento (SQL)
app.post('/api/apps/:id/purchase', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getConnectionPool();
    const appFetch = await pool.request().input('id', dbSql.Int, id).query('SELECT * FROM dbo.apps WHERE id=@id');
    const appItem = appFetch.recordset[0];
    if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

    if (mpClient) {
      try {
        const successUrl = MP_SUCCESS_URL.replace(':id', String(id));
        const failureUrl = MP_FAILURE_URL.replace(':id', String(id));
        const pendingUrl = MP_PENDING_URL.replace(':id', String(id));
        const pref = new Preference(mpClient);
        const prefResult = await pref.create({
          body: {
            items: [
              {
                title: appItem.name,
                description: appItem.main_feature || appItem.description || 'Aplicativo CodeCraft',
                currency_id: 'BRL',
                quantity: 1,
                unit_price: Number(appItem.price || 0),
              },
            ],
            back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
            notification_url: MP_WEBHOOK_URL,
            auto_return: 'approved',
            external_reference: String(id),
          },
        });
        const preference_id = prefResult?.id || `pref_${Date.now()}`;
        const init_point = prefResult?.init_point || prefResult?.sandbox_init_point;
        await pool.request()
          .input('type', dbSql.NVarChar(30), 'purchase')
          .input('app_id', dbSql.Int, id)
          .input('app_name', dbSql.NVarChar(200), appItem.name)
          .input('status', dbSql.NVarChar(30), 'pending')
          .query(`INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)`);
        return res.status(201).json({ success: true, preference_id, init_point });
      } catch (e) {
        console.error('Erro ao criar preferência Mercado Pago:', e);
        return res.status(500).json({ error: 'Falha ao iniciar pagamento' });
      }
    }

    // Fallback mock
    const preference_id = `pref_${Date.now()}`;
    const init_point = `http://localhost:5173/apps/${id}/compra?preference_id=${preference_id}&status=approved`;
    await pool.request()
      .input('type', dbSql.NVarChar(30), 'purchase')
      .input('app_id', dbSql.Int, id)
      .input('app_name', dbSql.NVarChar(200), appItem.name)
      .input('status', dbSql.NVarChar(30), 'approved')
      .query(`INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)`);
    res.status(201).json({ success: true, preference_id, init_point });
  } catch (err) {
    next(err);
  }
});

// Consultar status da compra (SQL)
app.get('/api/apps/:id/purchase/status', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status: statusQuery, payment_id } = req.query;
    const pool = await getConnectionPool();
    const appFetch = await pool.request().input('id', dbSql.Int, id).query('SELECT * FROM dbo.apps WHERE id=@id');
    const appItem = appFetch.recordset[0];
    if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });

    if (mpClient && payment_id) {
      try {
        const payment = new Payment(mpClient);
        const data = await payment.get({ id: payment_id });
        const status = data?.status || statusQuery || 'pending';
        const download_url = status === 'approved' ? (appItem.executable_url || 'https://example.com/downloads/dev-placeholder.exe') : null;
        paymentsByApp.set(id, { payment_id, status });
        await pool.request()
          .input('payment_id', dbSql.NVarChar(64), String(payment_id))
          .input('app_id', dbSql.Int, id)
          .input('user_id', dbSql.Int, req.user?.id ?? null)
          .input('status', dbSql.NVarChar(30), status)
          .query(`MERGE dbo.app_payments AS t
                  USING (SELECT @payment_id AS payment_id) AS s
                  ON (t.payment_id = s.payment_id)
                  WHEN MATCHED THEN
                    UPDATE SET status=@status
                  WHEN NOT MATCHED THEN
                    INSERT (payment_id, app_id, user_id, status) VALUES (@payment_id, @app_id, @user_id, @status);`);
        return res.json({ success: true, status, download_url });
      } catch (e) {
        console.warn('Falha ao consultar pagamento no Mercado Pago:', e?.message || e);
        return res.status(500).json({ error: 'Não foi possível consultar status do pagamento' });
      }
    }

    const fallbackStatus = statusQuery || paymentsByApp.get(id)?.status || 'approved';
    const download_url = fallbackStatus === 'approved' ? (appItem.executable_url || 'https://example.com/downloads/dev-placeholder.exe') : null;
    res.json({ success: true, status: fallbackStatus, download_url });
  } catch (err) {
    next(err);
  }
});

// Registrar download (SQL)
app.post('/api/apps/:id/download', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getConnectionPool();
    const appFetch = await pool.request().input('id', dbSql.Int, id).query('SELECT * FROM dbo.apps WHERE id=@id');
    const appItem = appFetch.recordset[0];
    if (!appItem) return res.status(404).json({ error: 'Aplicativo não encontrado' });
    let statusOk = !mpClient;
    if (mpClient) {
      const pay = await pool.request()
        .input('app_id', dbSql.Int, id)
        .input('user_id', dbSql.Int, req.user?.id ?? null)
        .query(`SELECT TOP 1 status FROM dbo.app_payments WHERE app_id=@app_id AND user_id=@user_id ORDER BY created_at DESC`);
      const st = pay.recordset[0]?.status || paymentsByApp.get(id)?.status;
      statusOk = st === 'approved';
    }
    if (!statusOk) return res.status(403).json({ error: 'Download não liberado. Pagamento não aprovado.' });
    const url = appItem.executable_url || 'https://example.com/downloads/dev-placeholder.exe';
    await pool.request()
      .input('type', dbSql.NVarChar(30), 'download')
      .input('app_id', dbSql.Int, id)
      .input('app_name', dbSql.NVarChar(200), appItem.name)
      .input('status', dbSql.NVarChar(30), 'done')
      .query(`INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)`);
    res.json({ success: true, download_url: url });
  } catch (err) {
    next(err);
  }
});

// Histórico de compras e downloads (SQL)
app.get('/api/apps/history', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '20', 10)));
    const offset = (page - 1) * pageSize;
    const pool = await getConnectionPool();
    const totalResult = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.app_history');
    const total = totalResult.recordset[0]?.total || 0;
    const rowsResult = await pool.request()
      .input('offset', dbSql.Int, offset)
      .input('limit', dbSql.Int, pageSize)
      .query('SELECT * FROM dbo.app_history ORDER BY date DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');
    res.json({ success: true, data: rowsResult.recordset, pagination: { total, page, pageSize } });
  } catch (err) {
    next(err);
  }
});

// Feedback do app (SQL)
app.post('/api/apps/:id/feedback', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rating = 5, comment = '' } = req.body || {};
    const pool = await getConnectionPool();
    const appFetch = await pool.request().input('id', dbSql.Int, id).query('SELECT id, name FROM dbo.apps WHERE id=@id');
    if (appFetch.recordset.length === 0) return res.status(404).json({ error: 'Aplicativo não encontrado' });
    const ins = await pool.request()
      .input('app_id', dbSql.Int, id)
      .input('user_id', dbSql.Int, req.user?.id ?? null)
      .input('rating', dbSql.Int, Number.isFinite(rating) ? rating : 5)
      .input('comment', dbSql.NVarChar(dbSql.MAX), comment ?? '')
      .query('INSERT INTO dbo.app_feedbacks (app_id, user_id, rating, comment) OUTPUT INSERTED.* VALUES (@app_id, @user_id, @rating, @comment)');
    res.status(201).json({ success: true, feedback: ins.recordset[0] });
  } catch (err) {
    next(err);
  }
});

// Webhook de pagamento Mercado Pago (SQL)
app.post('/api/apps/webhook', async (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (mpClient && type === 'payment' && data?.id) {
      const payment = new Payment(mpClient);
      const pay = await payment.get({ id: data.id });
      const appId = parseInt(pay?.external_reference || '0', 10);
      const status = pay?.status || 'pending';
      paymentsByApp.set(appId, { payment_id: String(data.id), status });
      if (appId) {
        const pool = await getConnectionPool();
        await pool.request()
          .input('payment_id', dbSql.NVarChar(64), String(data.id))
          .input('app_id', dbSql.Int, appId)
          .input('user_id', dbSql.Int, null)
          .input('status', dbSql.NVarChar(30), status)
          .query(`MERGE dbo.app_payments AS t
                  USING (SELECT @payment_id AS payment_id) AS s
                  ON (t.payment_id = s.payment_id)
                  WHEN MATCHED THEN
                    UPDATE SET status=@status
                  WHEN NOT MATCHED THEN
                    INSERT (payment_id, app_id, user_id, status) VALUES (@payment_id, @app_id, @user_id, @status);`);
        if (status === 'approved') {
          const appFetch = await pool.request().input('id', dbSql.Int, appId).query('SELECT id, name FROM dbo.apps WHERE id=@id');
          const appName = appFetch.recordset[0]?.name || null;
          await pool.request()
            .input('type', dbSql.NVarChar(30), 'purchase')
            .input('app_id', dbSql.Int, appId)
            .input('app_name', dbSql.NVarChar(200), appName)
            .input('status', dbSql.NVarChar(30), 'approved')
            .query(`INSERT INTO dbo.app_history (type, app_id, app_name, status) VALUES (@type, @app_id, @app_name, @status)`);
        }
      }
    }
    res.status(200).json({ received: true });
  } catch (e) {
    console.error('Erro no webhook:', e);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// --- Servir Arquivos Estáticos ---
app.use(express.static(path.join(__dirname, 'dist')));

// Rota catch-all para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Middleware de Tratamento de Erros ---
app.use((err, req, res, next) => {
  void next; // manter assinatura de 4 args sem usar
  console.error('Erro no servidor:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// --- Inicialização do Servidor (aguarda conexão ao banco) ---
getConnectionPool().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Falha fatal ao conectar ao banco de dados. Servidor não iniciado.', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});