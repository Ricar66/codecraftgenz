import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import bcrypt from 'bcrypt';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

// Importar cliente Prisma para todas as operações do banco
import { prisma } from './src/lib/database.js';

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

// Cache simples em memória para consultas frequentes
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Middleware de cache para rotas GET
const cacheMiddleware = (duration = CACHE_TTL) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < duration) {
      return res.json(cached.data);
    }
    
    const originalSend = res.json;
    res.json = function(data) {
      cache.set(key, {
        data,
        timestamp: Date.now()
      });
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Função para limpar cache relacionado a crafters
const clearCraftersCache = () => {
  for (const key of cache.keys()) {
    if (key.includes('/api/crafters')) {
      cache.delete(key);
    }
  }
};

// Middleware para logs de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// --- ROTAS DA API ---

// --- Autenticação ---

// Função para criar hash da senha
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Função para verificar senha
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
}

// --- Middlewares de Autenticação JWT ---

// Função helper para extrair userId para auditoria
const getUserIdForAudit = (req) => {
  return req.user?.userId || 'local-admin';
};

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token de acesso requerido' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro na verificação do token:', error.message);
    return res.status(403).json({ 
      success: false, 
      error: 'Token inválido ou expirado' 
    });
  }
};

// Middleware para verificar se o usuário é admin
const isAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado. Privilégios de administrador requeridos.' 
      });
    }
  });
};

// POST /api/auth/login → autenticação via banco
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e senha são obrigatórios' 
      });
    }

    // Verificar se usuário está bloqueado
    const userCheck = await prisma.usuario.findUnique({
      where: { email },
      select: { bloqueado_ate: true }
    });
    
    const isBlocked = userCheck?.bloqueado_ate && new Date() < new Date(userCheck.bloqueado_ate);
    if (isBlocked) {
      return res.status(423).json({ 
        success: false, 
        error: 'Usuário temporariamente bloqueado. Tente novamente em alguns minutos.' 
      });
    }

    // Buscar usuário no banco
    const user = await prisma.usuario.findUnique({
      where: { 
        email,
        status: 'active'
      }
    });
    
    if (!user) {
      // Incrementar tentativas de login se usuário existir
      await prisma.usuario.updateMany({
        where: { email },
        data: { tentativas_login: { increment: 1 } }
      });
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Verificar senha
    const isPasswordValid = await verifyPassword(password, user.senha_hash);
    if (!isPasswordValid) {
      const updatedUser = await prisma.usuario.update({
        where: { email },
        data: { tentativas_login: { increment: 1 } }
      });
      
      // Bloquear após 5 tentativas
      if (updatedUser.tentativas_login >= 5) {
        const blockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.usuario.update({
          where: { email },
          data: { bloqueado_ate: blockUntil }
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Login bem-sucedido
    await prisma.usuario.update({
      where: { id: user.id },
      data: { 
        ultimo_login: new Date(),
        tentativas_login: 0
      }
    });

    // Gerar token JWT
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      email: user.email
    };

    const token = jwt.sign(
      tokenPayload, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Retornar dados do usuário (sem senha)
    const userData = {
      id: user.id,
      name: user.nome,
      email: user.email,
      role: user.role,
      status: user.status
    };

    res.status(200).json({ 
      success: true, 
      user: userData,
      token: token
    });

  } catch (error) {
    console.error('Erro no login:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// --- Rota de Inicialização (apenas quando não há usuários) ---
app.post('/api/auth/init-admin', async (req, res) => {
  try {
    // Verificar se já existem usuários no sistema
    const existingUsers = await prisma.usuario.findMany();
    if (existingUsers.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Sistema já foi inicializado'
      });
    }

    // Criar usuário admin inicial
    const adminData = {
      nome: 'Admin',
      email: 'admin@codecraft.dev',
      senha_hash: await hashPassword('admin123'),
      role: 'admin',
      status: 'active'
    };

    const newAdmin = await prisma.usuario.create({
      data: adminData
    });
    
    // Retornar sem senha
    const { senha_hash: _, ...adminResponse } = newAdmin;
    
    res.status(201).json({ 
      success: true, 
      message: 'Usuário admin criado com sucesso',
      user: adminResponse 
    });

  } catch (error) {
    console.error('Erro ao inicializar admin:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// GET /api/auth/users → listar usuários (apenas admin)
app.get('/api/auth/users', isAdmin, async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        status: true,
        ultimo_login: true,
        created_at: true
      }
    });
    res.status(200).json({ 
      success: true, 
      data: users 
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// POST /api/auth/users → criar usuário (apenas admin)
app.post('/api/auth/users', isAdmin, async (req, res) => {
  try {
    const { nome, email, senha, role = 'user' } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome, email e senha são obrigatórios' 
      });
    }

    const userData = {
      nome,
      email,
      senha_hash: await hashPassword(senha),
      role,
      status: 'active'
    };

    const newUser = await prisma.usuario.create({
      data: userData,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        status: true,
        created_at: true
      }
    });
    
    res.status(201).json({ 
      success: true, 
      user: newUser 
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error.message);
    if (error.code === 'P2002') {
      res.status(409).json({ 
        success: false, 
        error: 'Email já está em uso' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }
});

// PUT /api/auth/users/:id → atualizar usuário (apenas admin)
app.put('/api/auth/users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, role, status } = req.body;

    const updateData = {};
    if (nome) updateData.nome = nome;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const updatedUser = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        status: true,
        created_at: true
      }
    });
    
    res.status(200).json({ 
      success: true, 
      user: updatedUser 
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error.message);
    if (error.code === 'P2025') {
      res.status(404).json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }
});

// PATCH /api/auth/users/:id/toggle-status → alternar status do usuário (apenas admin)
app.patch('/api/auth/users/:id/toggle-status', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, status: true }
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      });
    }

    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    const updatedUser = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        status: true,
        created_at: true
      }
    });
    
    res.status(200).json({ 
      success: true, 
      user: updatedUser 
    });

  } catch (error) {
    console.error('Erro ao alternar status do usuário:', error.message);
    if (error.code === 'P2025') {
      res.status(404).json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }
});

// --- Mentores ---
function normalizeMentorDbInput(body) {
  const b = body || {};
  return {
    nome: String(b.nome || b.name || '').trim(),
    email: String(b.email || '').trim(),
    telefone: b.telefone ? String(b.telefone).trim() : (b.phone ? String(b.phone).trim() : ''),
    bio: String(b.bio || '').trim()
  };
}

function publicMentorFromDb(row) {
  return {
    id: row.id,
    name: row.nome,
    cargo: '',
    specialty: '',
    phone: row.telefone || '',
    email: row.email || '',
    bio: row.bio || '',
    foto_url: null,
    visible: true,
    status: 'published'
  };
}

// GET /api/mentores
app.get('/api/mentores', async (req, res) => {
  try {
    const rows = await prisma.mentor.findMany();
    const payload = rows.map(publicMentorFromDb);
    res.status(200).json({ success: true, data: payload, total: payload.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao listar mentores:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/mentores
app.post('/api/mentores', async (req, res) => {
  try {
    const input = normalizeMentorDbInput(req.body);
    if (!input.nome || !input.email) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, email' });
    }
    const created = await prisma.mentor.create({ data: input });
    res.status(201).json({ success: true, mentor: publicMentorFromDb(created) });
  } catch (error) {
    console.error('Erro ao criar mentor:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PUT /api/mentores/:id
app.put('/api/mentores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.mentor.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, error: 'Mentor não encontrado' });
    const input = normalizeMentorDbInput(req.body);
    if (!input.nome || !input.email) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, email' });
    }
    await prisma.mentor.update({ where: { id: parseInt(id) }, data: input });
    res.status(200).json({ success: true, mentor: publicMentorFromDb({ id: Number(id), ...input }) });
  } catch (error) {
    console.error('Erro ao atualizar mentor:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// DELETE /api/mentores/:id
app.delete('/api/mentores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.mentor.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, error: 'Mentor não encontrado' });
    await prisma.mentor.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ success: true, removed: publicMentorFromDb(existing) });
  } catch (error) {
    console.error('Erro ao remover mentor:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// --- SISTEMA DE EQUIPES (API) ---

// Endpoints para Mentores
app.get('/api/mentores', async (req, res) => {
  try {
    const mentores = await prisma.mentor.findMany();
    res.json({ success: true, data: mentores });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/mentores', async (req, res) => {
  try {
    const { nome, email, telefone, bio } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ success: false, error: 'Nome e email são obrigatórios' });
    }
    const mentor = await prisma.mentor.create({ data: { nome, email, telefone, bio } });
    res.status(201).json({ success: true, data: mentor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/mentores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, bio } = req.body;
    const mentor = await prisma.mentor.update({ 
      where: { id: parseInt(id) }, 
      data: { nome, email, telefone, bio } 
    });
    res.json({ success: true, data: mentor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints para Projetos
app.get('/api/projetos', async (req, res) => {
  try {
    const { visivel, status } = req.query;
    const where = {};
    if (visivel !== undefined) where.visivel = visivel === 'true';
    if (status) where.status = status;
    
    const projetos = await prisma.projeto.findMany({ where });
    res.json({ success: true, data: projetos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projetos', async (req, res) => {
  try {
    const projeto = await prisma.projeto.create({ data: req.body });
    res.status(201).json({ success: true, data: projeto });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projetos/:id/mentor', async (req, res) => {
  try {
    const { id } = req.params;
    const { mentor_id } = req.body;
    if (!mentor_id) {
      return res.status(400).json({ success: false, error: 'mentor_id é obrigatório' });
    }
    const result = await prisma.projeto.update({
      where: { id: parseInt(id) },
      data: { mentor_id: parseInt(mentor_id) }
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints para Crafters
app.get('/api/crafters', async (req, res) => {
  try {
    const crafters = await prisma.crafter.findMany();
    res.json({ success: true, data: crafters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/crafters', async (req, res) => {
  try {
    const { nome, email, avatar_url } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ success: false, error: 'Nome e email são obrigatórios' });
    }
    const crafter = await prisma.crafter.create({ data: { nome, email, avatar_url } });
    res.status(201).json({ success: true, data: crafter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints para Equipes
app.get('/api/equipes', async (req, res) => {
  try {
    const equipes = await prisma.equipe.findMany();
    res.json({ success: true, data: equipes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/equipes', async (req, res) => {
  try {
    const { crafter_id, mentor_id, projeto_id, status_inscricao } = req.body;
    if (!crafter_id || !projeto_id) {
      return res.status(400).json({ success: false, error: 'crafter_id e projeto_id são obrigatórios' });
    }
    const equipe = await prisma.equipe.create({ 
      data: { 
        crafter_id: parseInt(crafter_id), 
        mentor_id: mentor_id ? parseInt(mentor_id) : null, 
        projeto_id: parseInt(projeto_id), 
        status_inscricao 
      } 
    });
    res.status(201).json({ success: true, data: equipe });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/equipes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status_inscricao } = req.body;
    if (!status_inscricao) {
      return res.status(400).json({ success: false, error: 'status_inscricao é obrigatório' });
    }
    const result = await prisma.equipe.update({
      where: { id: parseInt(id) },
      data: { status_inscricao }
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/equipes/crafter/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const equipes = await prisma.equipe.findMany({
      where: { crafter_id: parseInt(id) }
    });
    res.json({ success: true, data: equipes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/equipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.equipe.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Crafter removido da equipe com sucesso' });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Equipe não encontrada' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Endpoints para Inscrições
app.post('/api/projetos/:id/inscricao', async (req, res) => {
  try {
    const { id } = req.params;
    const { crafter_id, status } = req.body;
    if (!crafter_id) {
      return res.status(400).json({ success: false, error: 'crafter_id é obrigatório' });
    }
    const inscricao = await prisma.inscricao.create({ 
      data: {
        crafter_id: parseInt(crafter_id), 
        projeto_id: parseInt(id), 
        status: status || 'pendente' 
      }
    });
    res.status(201).json({ success: true, data: inscricao });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/projetos → lista de projetos; por padrão públicos (visíveis e não draft). Use ?all=1 para admin.
app.get('/api/projetos', async (req, res) => {
  try {
    const { all, status, visivel, periodo } = req.query;
    
    if (all === '1') {
      // Admin: lista completa (não pública)
      const projetos = await prisma.projeto.findMany();
      return res.status(200).json({ success: true, data: projetos, total: projetos.length, timestamp: new Date().toISOString() });
    }
    
    // Pública: aplicar filtros padrão
    const where = {};
    
    if (visivel !== undefined) {
      where.visivel = visivel === 'true';
    } else {
      where.visivel = true; // Por padrão, só visíveis
    }
    
    if (status) {
      where.status = status;
    }
    
    let projetos = await prisma.projeto.findMany({ where });
    
    // Filtrar por período se especificado
    if (periodo) {
      const days = String(periodo).endsWith('d') ? Number(String(periodo).replace('d','')) : null;
      if (days) {
        const now = new Date();
        const from = new Date(now.getTime() - days*24*60*60*1000);
        projetos = projetos.filter(p => p.data_inicio && new Date(p.data_inicio) >= from && new Date(p.data_inicio) <= now);
      }
    }
    
    // Filtrar projetos não-draft para API pública
    const visiveis = projetos.filter(p => p.visivel && p.status !== 'rascunho');
    const payload = visiveis.map(publicProjetoView);
    
    res.status(200).json({ success: true, data: payload, total: payload.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/projetos → cria projeto (admin)
app.post('/api/projetos', async (req, res) => {
  try {
    const input = normalizeProjetoInput(req.body || {});
    if (!input.title) return res.status(400).json({ success: false, error: 'Campo obrigatório: title' });
    
    // Mapear campos para banco de dados
    const projetoData = {
      titulo: input.title,
      descricao: input.description || '',
      data_inicio: input.startDate || (input.status !== 'draft' ? new Date().toISOString() : null),
      status: input.status || 'rascunho',
      preco: Number(input.price || 0),
      progresso: Math.max(0, Math.min(100, Number(input.progress || 0))),
      visivel: Boolean(input.visible),
      thumb_url: input.thumbUrl || null,
      mentor_id: input.mentorId || null
    };
    
    const projeto = await prisma.projeto.create({ data: projetoData });
    
    // TODO: Criar registro financeiro se necessário (quando implementarmos finanças)
    
    res.status(201).json({ success: true, project: projeto });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PUT /api/projetos/:id → atualiza projeto (admin)
app.put('/api/projetos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o projeto existe
    const projeto = await prisma.projeto.findUnique({ where: { id: parseInt(id) } });
    if (!projeto) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }
    
    const input = normalizeProjetoInput(req.body || {});
    if (!input.title) {
      return res.status(400).json({ success: false, error: 'Campo obrigatório: title' });
    }
    
    // Mapear campos para banco de dados
    const updates = {
      titulo: input.title,
      descricao: input.description || projeto.descricao,
      data_inicio: input.startDate || projeto.data_inicio,
      status: input.status || projeto.status,
      preco: Number(input.price || projeto.preco || 0),
      visivel: input.visible !== undefined ? Boolean(input.visible) : projeto.visivel,
      thumb_url: input.thumbUrl || projeto.thumb_url,
      mentor_id: input.mentorId || projeto.mentor_id
    };
    
    // Normalizar progresso e aplicar regra de finalização automática
    if (input.progress !== undefined) {
      updates.progresso = Math.max(0, Math.min(100, Number(input.progress || 0)));
      if (updates.progresso === 100) {
        updates.status = 'concluído';
      }
    }
    
    const projetoAtualizado = await prisma.projeto.update({
      where: { id: parseInt(id) },
      data: updates
    });
    
    // TODO: Sincronizar finanças vinculadas quando implementarmos
    
    res.status(200).json({ success: true, project: projetoAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PUT /api/projetos/:id/visibilidade → alterna visível
app.put('/api/projetos/:id/visibilidade', async (req, res) => {
  try {
    const { id } = req.params;
    
    const projeto = await prisma.projeto.findUnique({ where: { id: parseInt(id) } });
    if (!projeto) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }
    
    const body = req.body || {};
    const nextVisible = body.visivel !== undefined ? !!body.visivel : 
                       body.visible !== undefined ? !!body.visible : 
                       !projeto.visivel;
    
    const projetoAtualizado = await prisma.projeto.update({
      where: { id: parseInt(id) },
      data: { visivel: nextVisible }
    });
    
    res.status(200).json({ success: true, project: projetoAtualizado });
  } catch (error) {
    console.error('Erro ao alterar visibilidade do projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// DELETE /api/projetos/:id → arquiva (não remove)
app.delete('/api/projetos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const projeto = await prisma.projeto.findUnique({ where: { id: parseInt(id) } });
    if (!projeto) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }
    
    const projetoAtualizado = await prisma.projeto.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'arquivado', 
        visivel: false 
      }
    });
    
    res.status(200).json({ success: true, project: projetoAtualizado });
  } catch (error) {
    console.error('Erro ao arquivar projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/projetos/:id → detalhes
app.get('/api/projetos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projeto = await prisma.projeto.findUnique({ where: { id: parseInt(id) } });
    
    if (!projeto) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }
    
    res.status(200).json({ success: true, project: projeto });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});
app.get('/api/financas', async (req, res) => {
  try {
    const where = {};
    
    // Filtrar por project_id se fornecido
    if (req.query.project_id) {
      where.project_id = parseInt(req.query.project_id);
    }
    
    const list = await prisma.financa.findMany({ where });
    
    res.status(200).json({ success: true, data: list, total: list.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao buscar finanças:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.post('/api/financas', async (req, res) => {
  try {
    const data = req.body || {};
    
    // Validação dos dados obrigatórios
    if (!data.item || !data.valor) {
      return res.status(400).json({ success: false, error: 'Item e valor são obrigatórios' });
    }
    
    const newRecord = {
      item: data.item,
      valor: Number(data.valor),
      status: data.status || 'pending',
      type: data.type || 'other',
      project_id: data.project_id || null,
      progress: Math.max(0, Math.min(100, Number(data.progress || 0))),
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = await prisma.financa.create({ data: newRecord });
    
    // Se vinculado a um projeto, atualizar o projeto também
    if (newRecord.project_id && newRecord.type === 'project') {
      try {
        const updateData = {
          price: newRecord.valor,
          progress: newRecord.progress,
          updated_at: new Date().toISOString()
        };
        
        if (newRecord.status === 'paid') {
          updateData.status = 'completed';
        }
        
        await prisma.projeto.update({
          where: { id: newRecord.project_id },
          data: updateData
        });
      } catch (projectError) {
        console.warn('Erro ao atualizar projeto vinculado:', projectError);
      }
    }
    
    res.status(201).json({ success: true, data: result, message: 'Registro financeiro criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar registro financeiro:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/financas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    
    const updates = { ...patch };
    updates.valor = Number(updates.valor || 0);
    updates.progress = Math.max(0, Math.min(100, Number(updates.progress || 0)));
    updates.date = new Date().toISOString();
    
    const updatedFinanca = await prisma.financa.update({
      where: { id: parseInt(id) },
      data: updates
    });
    
    // Sincroniza com projeto vinculado (bidirecional)
    if (updatedFinanca.type === 'project' && updatedFinanca.project_id) {
      const projectUpdates = {};
      if (patch.valor !== undefined) projectUpdates.preco = Number(updatedFinanca.valor);
      if (patch.progress !== undefined) {
        projectUpdates.progress = Number(updatedFinanca.progress);
        if (projectUpdates.progress === 100) projectUpdates.status = 'finalizado';
      }
      
      if (Object.keys(projectUpdates).length > 0) {
        await prisma.projeto.update({
          where: { id: updatedFinanca.project_id },
          data: projectUpdates
        });
      }
    }
    
    res.status(200).json({ success: true, item: updatedFinanca });
  } catch (error) {
    console.error('Erro ao atualizar finança:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Registro financeiro não encontrado' });
    }
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.delete('/api/financas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.financa.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(200).json({ success: true, message: 'Registro financeiro excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir registro financeiro:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Registro financeiro não encontrado' });
    }
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.get('/api/financas/export', async (req, res) => {
  try {
    const financas = await prisma.financa.findMany();
    const cols = ['id','item','valor','status'];
    const header = cols.join(',');
    const rows = financas.map(f => cols.map(c => String(f[c] || '').replaceAll(',', '.')).join(','));
    const csv = [header, ...rows].join('\n');
    res.header('Content-Type', 'text/csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Erro ao exportar finanças:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// --- Dashboard resumo ---
app.get('/api/dashboard/resumo', async (req, res) => {
  try {
    const { periodo = '30d' } = req.query;

    // Calcula janela de tempo
    const now = new Date();
    const days = String(periodo).endsWith('d') ? Number(String(periodo).replace('d','')) : 30;
    const from = new Date(now.getTime() - days*24*60*60*1000);

    // Buscar projetos e finanças
    const projetos = await prisma.projeto.findMany();
    const financas = await prisma.financa.findMany();

    // Filtra projetos por período (usa data_inicio)
    const projetosPeriodo = projetos.filter(p => {
      if (!p.data_inicio) return false;
      const dt = new Date(p.data_inicio);
      return dt >= from && dt <= now;
    });

    // Contagens de status
    const toLower = (s) => String(s || '').toLowerCase();
    const countByStatus = (status) => projetosPeriodo.filter(p => {
      const pStatus = toLower(p.status);
      return pStatus === status || 
             (status === 'ongoing' && pStatus === 'ongoing') || 
             (status === 'completed' && (pStatus === 'finalizado' || pStatus === 'concluído')) || 
             (status === 'draft' && pStatus === 'rascunho');
    }).length;
    
    const ativos = countByStatus('ongoing');
    const finalizados = countByStatus('completed');
    const rascunhos = countByStatus('draft');

    // Progresso médio (assumindo que não há campo progress na tabela projetos)
    const mediaProgresso = 0; // Pode ser implementado se necessário

    // Finanças por período
    const financasPeriodo = financas.filter(f => {
      const dt = new Date(f.date || now);
      return dt >= from && dt <= now;
    });
    
    const soma = (filterFn) => financasPeriodo.filter(filterFn).reduce((acc, f) => acc + Number(f.valor || 0), 0);
    const receitaTotal = soma(() => true);
    const receitaPaga = soma(f => f.status === 'paid');
    const receitaPendente = soma(f => f.status === 'pending');
    const descontos = soma(f => f.status === 'discount');

    // Evolução mensal (últimos 4 meses)
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const evolucao_mensal = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const valorMes = financas
        .filter(f => new Date(f.date || now) >= start && new Date(f.date || now) < end)
        .reduce((acc, f) => acc + Number(f.valor || 0), 0);
      evolucao_mensal.push({ mes: monthNames[d.getMonth()], valor: valorMes });
    }

    const payload = {
      totais: {
        projetos_ativos: ativos,
        projetos_finalizados: finalizados,
        projetos_rascunho: rascunhos,
        receita_total: receitaTotal,
        receita_pendente: receitaPendente,
        receita_paga: receitaPaga,
        media_progresso: mediaProgresso,
        receita_liquida: receitaTotal - descontos,
        descontos: descontos,
      },
      evolucao_mensal,
    };

    res.status(200).json(payload);
  } catch (error) {
    console.error('Erro ao buscar resumo do dashboard:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// --- Ranking (Mock/Local) ---
function _currentWeekRef() {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil(((now - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Server-side notifier (no-op placeholder for realtime)
function notifyRealtime() {
  // In dev, frontend listens to its own realtime bus.
  // This function serves as a placeholder to satisfy linter and future server-side events.
}

app.get('/api/ranking', async (req, res) => {
  try {
    // Buscar dados de ranking usando Prisma
    const crafters = await prisma.crafter.findMany({
      orderBy: { points: 'desc' }
    });
    
    const settings = await prisma.rankingSetting.findFirst();
    const top3 = await prisma.top3.findMany({
      orderBy: { position: 'asc' }
    });
    
    const rankingData = {
      crafters,
      settings: settings || {},
      top3
    };
    
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json(rankingData);
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/ranking/points/:crafter_id', isAdmin, async (req, res) => {
  try {
    const { crafter_id } = req.params;
    const { delta, set } = req.body || {};
    const actor = getUserIdForAudit(req);
    
    let finalDelta = 0;
    if (typeof set === 'number') {
      // Se for para definir um valor absoluto, precisamos calcular o delta
      const currentCrafter = await prisma.crafter.findUnique({
        where: { id: parseInt(crafter_id) }
      });
      
      if (!currentCrafter) {
        return res.status(404).json({ success: false, error: 'Crafter não encontrado' });
      }
      finalDelta = set - (currentCrafter.points || 0);
    } else if (typeof delta === 'number') {
      finalDelta = delta;
    } else {
      return res.status(400).json({ success: false, error: 'Delta ou set deve ser fornecido' });
    }
    
    // Atualizar pontos do crafter
    const result = await prisma.crafter.update({
      where: { id: parseInt(crafter_id) },
      data: { 
        points: { increment: finalDelta },
        updated_at: new Date().toISOString()
      }
    });
    
    // Criar log da alteração
    await prisma.log.create({
      data: {
        action: 'update_points',
        entity: 'crafter',
        entity_id: parseInt(crafter_id),
        details: JSON.stringify({ delta: finalDelta, actor }),
        created_at: new Date().toISOString()
      }
    });
    
    // Atualizar configurações do ranking
    await prisma.rankingSetting.upsert({
      where: { id: 1 },
      update: {
        updated_at: new Date().toISOString(),
        updated_by: actor
      },
      create: {
        id: 1,
        updated_at: new Date().toISOString(),
        updated_by: actor,
        created_at: new Date().toISOString()
      }
    });
    
    notifyRealtime('ranking_changed');
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Erro ao atualizar pontos:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro interno do servidor' });
  }
});

app.put('/api/ranking/top3', isAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const arr = Array.isArray(body.top3) ? body.top3 : [];
    const actor = getUserIdForAudit(req);
    
    if (arr.length !== 3) {
      return res.status(400).json({ success: false, error: 'Top 3 deve conter três entradas' });
    }
    
    const positions = new Set(arr.map(x => x.position));
    const ids = new Set(arr.map(x => x.crafter_id));
    
    if (!(positions.has(1) && positions.has(2) && positions.has(3))) {
      return res.status(400).json({ success: false, error: 'Posições inválidas: 1,2,3 obrigatórias' });
    }
    
    if (ids.size !== 3) {
      return res.status(400).json({ success: false, error: 'Top 3 deve conter crafters distintos' });
    }
    
    // Validar se crafters existem
    const crafters = await prisma.crafter.findMany();
    for (const x of arr) {
      if (!crafters.find(c => c.id === x.crafter_id)) {
        return res.status(404).json({ success: false, error: `Crafter inexistente: ${x.crafter_id}` });
      }
    }
    
    // Limpar top3 existente e inserir novos dados
    await prisma.top3.deleteMany();
    
    const top3Data = arr.map(x => ({ 
      crafter_id: x.crafter_id, 
      position: x.position, 
      reward: x.reward || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    await prisma.top3.createMany({ data: top3Data });
    
    // Criar log da alteração
    await prisma.log.create({
      data: {
        action: 'update_top3',
        entity: 'ranking',
        entity_id: null,
        details: JSON.stringify({ top3Data, actor }),
        created_at: new Date().toISOString()
      }
    });
    
    notifyRealtime('ranking_changed');
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar top3:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Audit logs endpoint
app.get('/api/ranking/audit', async (req, res) => {
  try {
    const logs = await prisma.rankingHistory.findMany({
      orderBy: { at: 'desc' }
    });
    res.status(200).json({ data: logs });
  } catch (error) {
    console.error('Erro ao buscar histórico do ranking:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Ranking filters (admin state persistence)
app.put('/api/ranking/filters', isAdmin, async (req, res) => {
  try {
    const f = req.body || {};
    const actor = getUserIdForAudit(req);
    
    const filters = {
      min_points: typeof f.min_points === 'number' ? f.min_points : 0,
      max_points: typeof f.max_points === 'number' ? f.max_points : null,
      active_only: f.active_only !== undefined ? !!f.active_only : true,
      search: typeof f.search === 'string' ? f.search : '',
      updated_at: new Date().toISOString(),
      updated_by: actor
    };
    
    await prisma.rankingSetting.upsert({
      where: { id: 1 },
      update: filters,
      create: { id: 1, ...filters, created_at: new Date().toISOString() }
    });
    
    // Criar histórico
    await prisma.log.create({
      data: {
        action: 'filters_update',
        entity: 'ranking',
        entity_id: null,
        details: JSON.stringify({ filters, actor }),
        created_at: new Date().toISOString()
      }
    });
    
    res.status(200).json({ success: true, filters });
  } catch (error) {
    console.error('Erro ao atualizar filtros:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Crafters CRUD
app.get('/api/crafters', cacheMiddleware(2 * 60 * 1000), async (req, res) => { // Cache por 2 minutos
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      active_only = 'false',
      order_by = 'nome',
      order_direction = 'ASC'
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Máximo 100 itens por página
    const offset = (pageNum - 1) * limitNum;
    
    // Construir filtros
    const where = {};
    if (search?.trim()) {
      where.OR = [
        { nome: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }
    if (active_only === 'true') {
      where.active = true;
    }
    
    // Construir ordenação
    const orderBy = {};
    orderBy[order_by] = order_direction.toLowerCase();
    
    const [crafters, total] = await Promise.all([
      prisma.crafter.findMany({
        where,
        orderBy,
        skip: offset,
        take: limitNum
      }),
      prisma.crafter.count({ where })
    ]);
    
    const list = crafters.map(c => ({ 
      id: c.id, 
      name: c.nome, 
      email: c.email,
      avatar_url: c.avatar_url || null, 
      points: c.points || 0,
      active: c.active !== 0,
      created_at: c.created_at,
      updated_at: c.updated_at
    }));
    
    res.status(200).json({ 
      success: true, 
      data: list,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar crafters:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro interno do servidor' });
  }
});

app.get('/api/crafters/:id', cacheMiddleware(5 * 60 * 1000), async (req, res) => { // Cache por 5 minutos
  try {
    const { id } = req.params;
    const crafter = await prisma.crafter.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!crafter) {
      return res.status(404).json({ success: false, error: 'Crafter não encontrado' });
    }
    
    const crafterData = {
      id: crafter.id,
      name: crafter.nome,
      email: crafter.email,
      avatar_url: crafter.avatar_url || null,
      points: crafter.points || 0,
      active: crafter.active !== 0,
      created_at: crafter.created_at,
      updated_at: crafter.updated_at
    };
    
    res.status(200).json({ success: true, data: crafterData });
  } catch (error) {
    console.error('Erro ao buscar crafter:', error);
    res.status(400).json({ success: false, error: error.message || 'Erro interno do servidor' });
  }
});

app.post('/api/crafters', async (req, res) => {
  try {
    const body = req.body || {};
    const actor = getUserIdForAudit(req);
    
    // Validação de campos obrigatórios
    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ success: false, error: 'Campo obrigatório: name' });
    }
    
    const crafterData = {
      nome: String(body.name).trim(),
      email: body.email?.trim() || null,
      avatar_url: body.avatar_url || null,
      points: Math.max(0, Number(body.points || 0)),
      active: body.active !== false ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const crafter = await prisma.crafter.create({ data: crafterData });
    
    // Limpar cache de crafters
    clearCraftersCache();
    
    // Criar histórico
    await prisma.log.create({
      data: {
        action: 'crafter_create',
        entity: 'crafter',
        entity_id: crafter.id,
        details: JSON.stringify({ actor, name: crafter.nome }),
        created_at: new Date().toISOString()
      }
    });
    
    notifyRealtime('ranking_changed');
    res.status(201).json({ success: true, crafter });
  } catch (error) {
    console.error('Erro ao criar crafter:', error);
    
    // Retornar erro específico baseado no tipo
    if (error.message.includes('Nome é obrigatório') || 
        error.message.includes('Email inválido') ||
        error.message.includes('Email já está em uso')) {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }
});

app.put('/api/crafters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    const actor = getUserIdForAudit(req);
    
    const updates = {};
    
    if (patch.name !== undefined) {
      updates.nome = String(patch.name).trim();
    }
    if (patch.email !== undefined) {
      updates.email = patch.email?.trim() || null;
    }
    if (patch.avatar_url !== undefined) {
      updates.avatar_url = patch.avatar_url;
    }
    if (patch.points !== undefined) {
      updates.points = Math.max(0, Number(patch.points));
    }
    if (patch.active !== undefined) {
      updates.active = patch.active ? 1 : 0;
    }
    
    updates.updated_at = new Date().toISOString();
    
    const updatedCrafter = await prisma.crafter.update({
      where: { id: parseInt(id) },
      data: updates
    });
    
    // Limpar cache de crafters
    clearCraftersCache();
    
    // Criar histórico
    await prisma.log.create({
      data: {
        action: 'crafter_update',
        entity: 'crafter',
        entity_id: parseInt(id),
        details: JSON.stringify({ 
          actor,
          updates: { 
            name: updatedCrafter.nome, 
            points: updatedCrafter.points, 
            active: updatedCrafter.active 
          } 
        }),
        created_at: new Date().toISOString()
      }
    });
    
    // Atualizar configurações do ranking
    await prisma.rankingSetting.upsert({
      where: { id: 1 },
      update: {
        updated_at: new Date().toISOString(),
        updated_by: actor
      },
      create: {
        id: 1,
        updated_at: new Date().toISOString(),
        updated_by: actor,
        created_at: new Date().toISOString()
      }
    });
    
    notifyRealtime('ranking_changed');
    res.status(200).json({ success: true, crafter: updatedCrafter });
  } catch (error) {
    console.error('Erro ao atualizar crafter:', error);
    
    // Retornar erro específico baseado no tipo
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Crafter não encontrado' });
    } else if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Email já está em uso' });
    } else {
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }
});

app.delete('/api/crafters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const actor = getUserIdForAudit(req);
    
    await prisma.crafter.delete({
      where: { id: parseInt(id) }
    });
    
    // Limpar cache de crafters
    clearCraftersCache();
    
    // Criar histórico
    await prisma.log.create({
      data: {
        action: 'crafter_delete',
        entity: 'crafter',
        entity_id: parseInt(id),
        details: JSON.stringify({ actor }),
        created_at: new Date().toISOString()
      }
    });
    
    notifyRealtime('ranking_changed');
    res.status(200).json({ success: true, message: 'Crafter removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar crafter:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Crafter não encontrado' });
    }
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// --- Helper Functions ---

/**
 * Converte um projeto interno para visualização pública
 * Remove campos sensíveis e formata dados para o frontend
 */
function publicProjetoView(p) {
  return {
    id: p.id,
    title: p.titulo,
    description: p.descricao,
    startDate: p.data_inicio,
    status: p.status,
    price: p.preco,
    progress: p.progresso || 0,
    visible: !!p.visivel,
    thumbUrl: p.thumb_url,
    mentorId: p.mentor_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

/**
 * Normaliza e valida dados de entrada para projetos
 * Garante que os campos estejam no formato correto
 */
function normalizeProjetoInput(input) {
  return {
    title: String(input.title || '').trim(),
    description: String(input.description || '').trim(),
    startDate: input.startDate || null,
    status: input.status || 'rascunho',
    price: Number(input.price || 0),
    progress: Number(input.progress || 0),
    visible: Boolean(input.visible),
    thumbUrl: input.thumbUrl || null,
    mentorId: input.mentorId || null
  };
}

/**
 * Converte um desafio interno para visualização pública
 * Remove campos sensíveis e formata dados para o frontend
 */
function publicChallenge(c) {
  return {
    id: c.id,
    name: c.name,
    objective: c.objective,
    description: c.description,
    deadline: c.deadline,
    base_points: c.base_points,
    reward: c.reward,
    status: c.status,
    criteria: c.criteria,
    delivery_type: c.delivery_type,
    visible: !!c.visible,
    difficulty: c.difficulty,
    tags: c.tags,
    thumb_url: c.thumb_url || null,
    updated_at: c.updated_at,
  };
}

// --- Desafios ---
function _addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function isDeadlinePassed(deadlineIso) {
  try { return new Date(deadlineIso).getTime() < Date.now(); } catch { return false; }
}

app.get('/api/desafios', async (req, res) => {
  try {
    const { status, visible, all } = req.query;
    
    if (all === '1') {
      // Admin: lista completa (não pública)
      const desafios = await prisma.desafio.findMany({
        orderBy: { created_at: 'desc' }
      });
      return res.status(200).json({ success: true, data: desafios, total: desafios.length });
    }
    
    // Pública: aplicar filtros padrão
    const where = {};
    
    if (visible !== undefined) {
      where.visible = visible === 'true';
    } else {
      where.visible = true; // Por padrão, só visíveis
    }
    
    if (status) {
      where.status = status;
    } else {
      where.status = 'active'; // Por padrão, só ativos
    }
    
    const desafios = await prisma.desafio.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
    
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json({ success: true, data: desafios.map(publicChallenge), total: desafios.length });
  } catch (error) {
    console.error('Erro ao buscar desafios:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.get('/api/desafios/:id', async (req, res) => {
  try {
    const desafio = await prisma.desafio.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!desafio || !desafio.visible) {
      return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json({ success: true, challenge: publicChallenge(desafio) });
  } catch (error) {
    console.error('Erro ao buscar desafio:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.post('/api/desafios', async (req, res) => {
  try {
    const body = req.body || {};
    const required = ['name','objective','deadline','delivery_type'];
    for (const k of required) { 
      if (!body[k]) return res.status(400).json({ success:false, error:`Campo obrigatório: ${k}` }); 
    }
    
    const desafioData = {
      name: String(body.name).trim(),
      objective: String(body.objective).trim(),
      description: String(body.description || '').trim(),
      deadline: body.deadline,
      base_points: Math.max(0, Number(body.base_points || 0)),
      reward: String(body.reward || '').trim(),
      status: body.status || 'active',
      criteria: JSON.stringify(Array.isArray(body.criteria) ? body.criteria : []),
      delivery_type: body.delivery_type,
      visible: Boolean(body.visible),
      difficulty: body.difficulty || 'starter',
      tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      thumb_url: body.thumb_url || null,
      created_by: getUserIdForAudit(req),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const desafio = await prisma.desafio.create({
      data: desafioData
    });
    
    res.set('Cache-Control', 'no-store');
    res.status(201).json({ success: true, challenge: publicChallenge(desafio) });
  } catch (error) {
    console.error('Erro ao criar desafio:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/desafios/:id', async (req, res) => {
  try {
    const desafio = await prisma.desafio.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!desafio) {
      return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
    }
    
    const patch = req.body || {};
    const updateData = { ...patch };
    
    if (patch.base_points !== undefined) {
      updateData.base_points = Math.max(0, Number(patch.base_points));
    }
    
    if (patch.criteria && Array.isArray(patch.criteria)) {
      updateData.criteria = JSON.stringify(patch.criteria);
    }
    
    if (patch.tags && Array.isArray(patch.tags)) {
      updateData.tags = JSON.stringify(patch.tags);
    }
    
    updateData.updated_at = new Date().toISOString();
    
    const updatedDesafio = await prisma.desafio.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, challenge: publicChallenge(updatedDesafio) });
  } catch (error) {
    console.error('Erro ao atualizar desafio:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
    }
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/desafios/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['draft','active','closed','archived'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status inválido' });
    }
    
    await prisma.desafio.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        status,
        updated_at: new Date().toISOString()
      }
    });
    
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar status do desafio:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
    }
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Alterna visibilidade
app.put('/api/desafios/:id/visibility', async (req, res) => {
  try {
    const desafio = await prisma.desafio.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!desafio) {
      return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
    }
    
    const body = req.body || {};
    const nextVisible = body.visible !== undefined ? !!body.visible : !desafio.visible;
    
    const updatedDesafio = await prisma.desafio.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        visible: nextVisible,
        updated_at: new Date().toISOString()
      }
    });
    
    res.status(200).json({ success: true, challenge: publicChallenge(updatedDesafio) });
  } catch (error) {
    console.error('Erro ao atualizar visibilidade do desafio:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
    }
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.post('/api/desafios/:id/inscrever', async (req, res) => {
  try {
    const { crafter_id } = req.body || {};
    const desafio = await prisma.desafio.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!desafio || !desafio.visible) {
      return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
    }
    if (desafio.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Desafio não aceita novas inscrições' });
    }
    if (isDeadlinePassed(desafio.deadline)) {
      return res.status(400).json({ success: false, error: 'Prazo encerrado para novas inscrições' });
    }
    if (!crafter_id) {
      return res.status(400).json({ success: false, error: 'Crafter obrigatório' });
    }
    
    // Verificar se já existe inscrição
    const existingInscricao = await prisma.inscricaoDesafio.findFirst({
      where: {
        crafter_id: parseInt(crafter_id),
        challenge_id: parseInt(req.params.id)
      }
    });
    if (existingInscricao) {
      return res.status(409).json({ success: false, error: 'Inscrição já existente' });
    }
    
    const inscricao = await prisma.inscricaoDesafio.create({
      data: {
        crafter_id: parseInt(crafter_id),
        challenge_id: parseInt(req.params.id),
        enrolled_at: new Date().toISOString()
      }
    });
    
    res.set('Cache-Control', 'no-store');
    res.status(201).json({ success: true, registration: inscricao });
  } catch (error) {
    console.error('Erro ao inscrever no desafio:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.post('/api/desafios/:id/entregar', async (req, res) => {
  try {
    const body = req.body || {};
    const { crafter_id, delivery } = body;
    const challengeId = req.params.id;
    
    // Verificar se o desafio existe e está visível
    const desafio = await prisma.desafio.findUnique({
      where: { id: parseInt(challengeId) }
    });
    
    if (!desafio || !desafio.visible) {
      return res.status(404).json({ success: false, error: 'Desafio não encontrado' });
    }
    
    if (desafio.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Desafio encerrado para novas entregas' });
    }
    
    if (isDeadlinePassed(desafio.deadline)) {
      return res.status(400).json({ success: false, error: 'Prazo encerrado para novas entregas' });
    }
    
    if (!crafter_id) {
      return res.status(400).json({ success: false, error: 'Crafter obrigatório' });
    }
    
    if (!delivery || typeof delivery !== 'object') {
      return res.status(400).json({ success: false, error: 'Entrega inválida' });
    }
    
    // Validação conforme tipo
    if (desafio.delivery_type === 'link' || desafio.delivery_type === 'github') {
      const url = String(delivery.url || '').trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ success: false, error: 'URL inválida' });
      }
    }
    
    // Criar submission
    const submissionData = {
      challenge_id: parseInt(challengeId),
      crafter_id: parseInt(crafter_id),
      delivery_url: delivery.url || '',
      delivery_notes: String(delivery.notes || '').trim(),
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };
    
    const submission = await prisma.submission.create({
      data: submissionData
    });
    
    // Criar log da ação
    await prisma.log.create({
      data: {
        action: 'submit',
        entity: 'submission',
        entity_id: submission.id,
        details: JSON.stringify({
          actor: crafter_id,
          challenge_id: challengeId,
          submission_id: submission.id
        }),
        created_at: new Date().toISOString()
      }
    });
    
    res.set('Cache-Control', 'no-store');
    res.status(201).json({ success: true, submission });
  } catch (error) {
    console.error('Erro ao entregar desafio:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Lista submissions de um desafio (admin)
app.get('/api/desafios/:id/submissions', async (req, res) => {
  try {
    const challengeId = req.params.id;
    const submissions = await prisma.submission.findMany({
      where: { challenge_id: parseInt(challengeId) },
      include: {
        crafter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });
    
    res.status(200).json({ success: true, data: submissions, total: submissions.length });
  } catch (error) {
    console.error('Erro ao buscar submissions:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/submissions/:id/review', async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await prisma.submission.findUnique({
      where: { id: parseInt(submissionId) }
    });
    
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission não encontrada' });
    }
    
    const body = req.body || {};
    const allowed = ['reviewed', 'approved', 'rejected'];
    if (!allowed.includes(body.status)) {
      return res.status(400).json({ success: false, error: 'Status de review inválido' });
    }
    
    const reviewData = {
      status: body.status,
      reviewed_by: getUserIdForAudit(req),
      review_notes: String(body.review?.notes || '').trim(),
      criteria_scores: JSON.stringify(body.review?.criteria_scores || {}),
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const updatedSubmission = await prisma.submission.update({
      where: { id: parseInt(submissionId) },
      data: reviewData
    });
    
    // Criar log da ação
    await prisma.log.create({
      data: {
        action: 'review',
        entity: 'submission',
        entity_id: parseInt(submissionId),
        details: JSON.stringify({
          actor: reviewData.reviewed_by,
          challenge_id: submission.challenge_id,
          submission_id: submissionId,
          status: body.status
        }),
        created_at: new Date().toISOString()
      }
    });
    
    // Integração Ranking opcional
    try {
      if (body.status === 'approved') {
        const desafio = await prisma.desafio.findUnique({
          where: { id: submission.challenge_id }
        });
        
        const delta = Math.max(0, Number(desafio?.base_points || 0));
        if (delta > 0) {
          await fetch(`http://localhost:${PORT}/api/ranking/points/${submission.crafter_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta })
          });
        }
      }
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] Falha na integração de pontos do Ranking`, err?.message || err);
    }
    
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, submission: updatedSubmission });
  } catch (error) {
    console.error('Erro ao revisar submission:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Submission não encontrada' });
    }
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/feedbacks - Busca feedbacks com filtros
app.get('/api/feedbacks', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/feedbacks`);
    try {
        const { origem, limit } = req.query;
        const where = {};
        
        if (origem) where.origem = origem;

        const feedbacks = await prisma.feedback.findMany({
            where,
            orderBy: { data_criacao: 'desc' },
            take: limit ? parseInt(limit) : undefined
        });
        
        console.log(`[${new Date().toISOString()}] GET /api/feedbacks: ${feedbacks.length} feedbacks encontrados.`);
        res.status(200).json(feedbacks);

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em GET /api/feedbacks:`, err.message);
        // Retorna dados mock em caso de erro
        const mockFeedbacks = [
            {
                id: 1,
                nome: "Sistema",
                email: null,
                mensagem: "Dados temporariamente indisponíveis",
                origem: "pagina_inicial",
                created_at: new Date().toISOString()
            }
        ];
        res.status(200).json(mockFeedbacks);
    }
});

// POST /api/feedbacks - Cria um novo feedback
app.post('/api/feedbacks', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido POST /api/feedbacks com dados:`, req.body);
    const { nome, email, mensagem, origem } = req.body;

    // Validação básica
    if (!nome || !mensagem) {
        console.warn(`[${new Date().toISOString()}] POST /api/feedbacks: Dados inválidos.`);
        return res.status(400).json({ error: 'Campos obrigatórios: nome, mensagem' });
    }

    try {
        const feedback = await prisma.feedback.create({
            data: {
                nome,
                email,
                mensagem,
                origem: origem || 'pagina_inicial',
                created_at: new Date().toISOString()
            }
        });

        console.log(`[${new Date().toISOString()}] POST /api/feedbacks: Feedback ID ${feedback.id} criado.`);
        res.status(201).json(feedback);

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em POST /api/feedbacks:`, err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/inscricoes - Cria nova inscrição de crafter
app.post('/api/inscricoes', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido POST /api/inscricoes com dados:`, req.body);
    const { nome, email, telefone, cidade, estado, area_interesse, mensagem } = req.body;

    // Validação básica
    if (!nome || !email) {
        console.warn(`[${new Date().toISOString()}] POST /api/inscricoes: Dados inválidos.`);
        return res.status(400).json({ error: 'Campos obrigatórios: nome, email' });
    }

    try {
        const inscricao = await prisma.inscricaoCrafter.create({
            data: {
                nome,
                email,
                telefone,
                cidade,
                estado,
                area_interesse,
                mensagem,
                status: 'pendente',
                created_at: new Date().toISOString()
            }
        });

        console.log(`[${new Date().toISOString()}] POST /api/inscricoes: Inscrição ID ${inscricao.id} criada.`);
        res.status(201).json(inscricao);

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em POST /api/inscricoes:`, err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/inscricoes - Lista inscrições de crafters com filtros
app.get('/api/inscricoes', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/inscricoes`);
    try {
        const { status } = req.query;
        const where = {};
        
        if (status) where.status = status;

        const inscricoes = await prisma.inscricaoCrafter.findMany({
            where,
            orderBy: { data_inscricao: 'desc' }
        });
        
        console.log(`[${new Date().toISOString()}] GET /api/inscricoes: ${inscricoes.length} inscrições encontradas.`);
        res.status(200).json(inscricoes);

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em GET /api/inscricoes:`, err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/inscricoes/:id/status - Atualiza status de inscrição
app.put('/api/inscricoes/:id/status', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido PUT /api/inscricoes/${req.params.id}/status`);
    const { id } = req.params;
    const { status } = req.body;

    // Validação básica
    if (!status || !['pendente', 'contato_realizado', 'rejeitado', 'confirmado'].includes(status)) {
        console.warn(`[${new Date().toISOString()}] PUT /api/inscricoes/${id}/status: Status inválido.`);
        return res.status(400).json({ error: 'Status deve ser: pendente, contato_realizado, rejeitado ou confirmado' });
    }

    try {
        const inscricao = await prisma.inscricaoCrafter.update({
            where: { id: parseInt(id) },
            data: { 
                status,
                updated_at: new Date().toISOString()
            }
        });
        
        if (!inscricao) {
            return res.status(404).json({ error: 'Inscrição não encontrada' });
        }

        console.log(`[${new Date().toISOString()}] PUT /api/inscricoes/${id}/status: Status atualizado para ${status}.`);
        res.status(200).json(inscricao);

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro em PUT /api/inscricoes/${id}/status:`, err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/projects - Busca todos os projetos
app.get('/api/projects', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/projects`);
    try {
        const projetos = await prisma.projeto.findMany({
            orderBy: { created_at: 'desc' }
        });
        
        // Mapear dados do Prisma para o formato esperado pelo frontend
        const projects = projetos.map(projeto => ({
            id: projeto.id,
            title: projeto.titulo,
            description: projeto.descricao,
            status: projeto.status === 'ongoing' ? 'active' : projeto.status,
            startDate: projeto.data_inicio,
            progress: Math.floor(Math.random() * 100), // Temporário até implementar campo progress
            technology: 'React/Node.js', // Temporário até implementar campo technology
            category: 'Web Development', // Temporário até implementar campo category
            imageUrl: projeto.thumb_url,
            createdAt: projeto.created_at,
            updatedAt: projeto.updated_at
        }));
        
        console.log(`[${new Date().toISOString()}] GET /api/projects: ${projects.length} projetos encontrados`);
        res.json({
            success: true,
            data: projects,
            total: projects.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro em GET /api/projects:`, error.message);
        
        // Retorna dados mock em caso de erro
        const mockProjects = [
            {
                id: 1,
                title: 'OverlayCraft',
                status: 'active',
                startDate: '2025-05-26',
                description: 'Um utilitário em C# Windows Forms que exibe, em tempo real, uma sobreposição flutuante (overlay) com informações do sistema — CPU, GPU, RAM, IP, sistema operacional e usuário — funcionando como uma marca d\'água transparente, sempre visível e arrastável pela tela, podendo ser minimizado para a bandeja.',
                progress: 80,
                technology: 'C# Windows Forms',
                category: 'Sistema'
            },
            {
                id: 2,
                title: 'CleanCraft',
                status: 'active',
                startDate: '2025-10-26',
                description: 'CleanCraft é uma aplicação desenvolvida para auxiliar o usuário na organização automática de arquivos presentes em sua área de trabalho, nas pastas pessoais (como Documentos, Imagens, Vídeos e Downloads) ou em qualquer outra pasta escolhida. O sistema identifica e agrupa os arquivos por tipo ou extensão, movendo-os para pastas correspondentes.',
                progress: 0,
                technology: 'C#',
                category: 'Utilitário'
            }
        ];
        
        res.json({
            success: true,
            data: mockProjects,
            total: mockProjects.length,
            timestamp: new Date().toISOString()
        });
    }
});

// Rota de teste
app.get('/api/test-db', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/test-db`);
    try {
        // Testa operação simples no Prisma
        const mentores = await prisma.mentor.findMany();
        
        console.log(`[${new Date().toISOString()}] GET /api/test-db: Prisma funcionando OK`);
        res.json({
            success: true,
            message: 'Conexão com banco de dados funcionando corretamente',
            database: 'Prisma',
            mentoresCount: mentores.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro ao testar Prisma:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao conectar com banco de dados',
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
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Headers específicos para diferentes tipos de arquivo
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
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

// --- Tratamento de Erros Globais ---
// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Erro não tratado:`, err);
    
    // Se já foi enviada uma resposta, delega para o handler padrão do Express
    if (res.headersSent) {
        return next(err);
    }
    
    // Resposta de erro genérica
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
    });
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (err) => {
    console.error(`[${new Date().toISOString()}] Exceção não capturada:`, err);
    // Em produção, não mata o processo imediatamente
    if (process.env.NODE_ENV === 'production') {
        console.error('Continuando execução em produção...');
    } else {
        process.exit(1);
    }
});

// Tratamento de promises rejeitadas
process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toISOString()}] Promise rejeitada não tratada:`, reason);
    console.error('Promise:', promise);
    // Em produção, não mata o processo
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
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