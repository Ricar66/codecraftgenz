import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

// Importar módulo SQLite para todas as operações do banco
import { dbOperations } from './src/lib/database.js';

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

// Middleware para logs de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// --- ROTAS DA API ---

// --- Autenticação (SQLite) ---

// Função para criar hash da senha
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Função para verificar senha
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

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
    const isBlocked = await dbOperations.isUserBlocked(email);
    if (isBlocked) {
      return res.status(423).json({ 
        success: false, 
        error: 'Usuário temporariamente bloqueado. Tente novamente em alguns minutos.' 
      });
    }

    // Buscar usuário no banco
    const user = await dbOperations.getUserByEmail(email);
    if (!user) {
      await dbOperations.incrementLoginAttempts(email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Verificar senha
    if (!verifyPassword(password, user.senha_hash)) {
      await dbOperations.incrementLoginAttempts(email);
      
      // Bloquear após 5 tentativas
      if (user.tentativas_login >= 4) {
        await dbOperations.blockUser(email, 15);
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Login bem-sucedido
    await dbOperations.updateLastLogin(user.id);

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
      token: `token-${user.id}-${Date.now()}` // Token simples para compatibilidade
    });

  } catch (error) {
    console.error('Erro no login:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// GET /api/auth/users → listar usuários (apenas admin)
app.get('/api/auth/users', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Acesso não autorizado' 
      });
    }

    const currentUser = await dbOperations.getUserById(userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado. Apenas administradores.' 
      });
    }

    const users = await dbOperations.getUsers();
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
app.post('/api/auth/users', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Acesso não autorizado' 
      });
    }

    const currentUser = await dbOperations.getUserById(userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado. Apenas administradores.' 
      });
    }

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
      senha_hash: hashPassword(senha),
      role,
      status: 'active'
    };

    const newUser = await dbOperations.createUser(userData);
    
    // Retornar sem senha
    const { senha_hash: _, ...userResponse } = newUser;
    
    res.status(201).json({ 
      success: true, 
      user: userResponse 
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error.message);
    if (error.message.includes('UNIQUE constraint failed')) {
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
app.put('/api/auth/users/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Acesso não autorizado' 
      });
    }

    const currentUser = await dbOperations.getUserById(userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado. Apenas administradores.' 
      });
    }

    const { id } = req.params;
    const { nome, email, role, status } = req.body;

    const updateData = {};
    if (nome) updateData.nome = nome;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const updatedUser = await dbOperations.updateUser(id, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      });
    }

    // Retornar sem senha
    const { senha_hash: _, ...userResponse } = updatedUser;
    
    res.status(200).json({ 
      success: true, 
      user: userResponse 
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// PATCH /api/auth/users/:id/toggle-status → alternar status do usuário (apenas admin)
app.patch('/api/auth/users/:id/toggle-status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Acesso não autorizado' 
      });
    }

    const currentUser = await dbOperations.getUserById(userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado. Apenas administradores.' 
      });
    }

    const { id } = req.params;
    
    const user = await dbOperations.getUserById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      });
    }

    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    const updatedUser = await dbOperations.updateUser(id, { status: newStatus });
    
    // Retornar sem senha
    const { senha_hash: _, ...userResponse } = updatedUser;
    
    res.status(200).json({ 
      success: true, 
      user: userResponse 
    });

  } catch (error) {
    console.error('Erro ao alternar status do usuário:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// --- Mentores (SQLite) ---
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

// GET /api/mentores → agora busca no SQLite
app.get('/api/mentores', async (req, res) => {
  try {
    const rows = await dbOperations.getMentores();
    const payload = rows.map(publicMentorFromDb);
    res.status(200).json({ success: true, data: payload, total: payload.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao listar mentores:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/mentores → cria mentor no SQLite
app.post('/api/mentores', async (req, res) => {
  try {
    const input = normalizeMentorDbInput(req.body);
    if (!input.nome || !input.email) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, email' });
    }
    const created = await dbOperations.createMentor(input);
    res.status(201).json({ success: true, mentor: publicMentorFromDb(created) });
  } catch (error) {
    console.error('Erro ao criar mentor:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// PUT /api/mentores/:id → atualiza mentor no SQLite
app.put('/api/mentores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbOperations.getMentorById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Mentor não encontrado' });
    const input = normalizeMentorDbInput(req.body);
    if (!input.nome || !input.email) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, email' });
    }
    await dbOperations.updateMentor(id, input);
    res.status(200).json({ success: true, mentor: publicMentorFromDb({ id: Number(id), ...input }) });
  } catch (error) {
    console.error('Erro ao atualizar mentor:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// DELETE /api/mentores/:id → remove mentor no SQLite
app.delete('/api/mentores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbOperations.getMentorById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Mentor não encontrado' });
    const result = await dbOperations.deleteMentor(id);
    res.status(200).json({ success: true, removed: publicMentorFromDb(existing), meta: result });
  } catch (error) {
    console.error('Erro ao remover mentor:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// --- SISTEMA DE EQUIPES (SQLite) ---

// Endpoints para Mentores (SQLite)
app.get('/api/sqlite/mentores', async (req, res) => {
  try {
    const mentores = await dbOperations.getMentores();
    res.json({ success: true, data: mentores });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sqlite/mentores', async (req, res) => {
  try {
    const { nome, email, telefone, bio } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ success: false, error: 'Nome e email são obrigatórios' });
    }
    const mentor = await dbOperations.createMentor({ nome, email, telefone, bio });
    res.status(201).json({ success: true, data: mentor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/sqlite/mentores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, bio } = req.body;
    const mentor = await dbOperations.updateMentor(id, { nome, email, telefone, bio });
    res.json({ success: true, data: mentor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints para Projetos (SQLite)
app.get('/api/sqlite/projetos', async (req, res) => {
  try {
    const { visivel, status } = req.query;
    const filters = {};
    if (visivel !== undefined) filters.visivel = visivel === 'true';
    if (status) filters.status = status;
    
    const projetos = await dbOperations.getProjetos(filters);
    res.json({ success: true, data: projetos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sqlite/projetos', async (req, res) => {
  try {
    const projeto = await dbOperations.createProjeto(req.body);
    res.status(201).json({ success: true, data: projeto });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sqlite/projetos/:id/mentor', async (req, res) => {
  try {
    const { id } = req.params;
    const { mentor_id } = req.body;
    if (!mentor_id) {
      return res.status(400).json({ success: false, error: 'mentor_id é obrigatório' });
    }
    const result = await dbOperations.associateMentorToProjeto(id, mentor_id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints para Crafters (SQLite)
app.get('/api/sqlite/crafters', async (req, res) => {
  try {
    const crafters = await dbOperations.getCrafters();
    res.json({ success: true, data: crafters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sqlite/crafters', async (req, res) => {
  try {
    const { nome, email, avatar_url } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ success: false, error: 'Nome e email são obrigatórios' });
    }
    const crafter = await dbOperations.createCrafter({ nome, email, avatar_url });
    res.status(201).json({ success: true, data: crafter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints para Equipes (SQLite)
app.get('/api/sqlite/equipes', async (req, res) => {
  try {
    const equipes = await dbOperations.getEquipes();
    res.json({ success: true, data: equipes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sqlite/equipes', async (req, res) => {
  try {
    const { crafter_id, mentor_id, projeto_id, status_inscricao } = req.body;
    if (!crafter_id || !projeto_id) {
      return res.status(400).json({ success: false, error: 'crafter_id e projeto_id são obrigatórios' });
    }
    const equipe = await dbOperations.createEquipe({ crafter_id, mentor_id, projeto_id, status_inscricao });
    res.status(201).json({ success: true, data: equipe });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/sqlite/equipes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status_inscricao } = req.body;
    if (!status_inscricao) {
      return res.status(400).json({ success: false, error: 'status_inscricao é obrigatório' });
    }
    const result = await dbOperations.updateEquipeStatus(id, status_inscricao);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/sqlite/equipes/crafter/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const equipes = await dbOperations.getEquipesByCrafter(id);
    res.json({ success: true, data: equipes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints para Inscrições (SQLite)
app.post('/api/sqlite/projetos/:id/inscricao', async (req, res) => {
  try {
    const { id } = req.params;
    const { crafter_id, status } = req.body;
    if (!crafter_id) {
      return res.status(400).json({ success: false, error: 'crafter_id é obrigatório' });
    }
    const inscricao = await dbOperations.createInscricao({ 
      crafter_id, 
      projeto_id: id, 
      status: status || 'pendente' 
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
      const projetos = await dbOperations.getProjetos();
      return res.status(200).json({ success: true, data: projetos, total: projetos.length, timestamp: new Date().toISOString() });
    }
    
    // Pública: aplicar filtros padrão
    const filters = {};
    
    if (visivel !== undefined) {
      filters.visivel = visivel === 'true';
    } else {
      filters.visivel = true; // Por padrão, só visíveis
    }
    
    if (status) {
      filters.status = status;
    }
    
    let projetos = await dbOperations.getProjetos(filters);
    
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
    
    // Mapear campos para SQLite
    const projetoData = {
      titulo: input.title,
      descricao: input.description || '',
      data_inicio: input.startDate || (input.status !== 'draft' ? new Date().toISOString() : null),
      status: input.status || 'rascunho',
      preco: Number(input.price || 0),
      visivel: Boolean(input.visible),
      thumb_url: input.thumbUrl || null,
      mentor_id: input.mentorId || null
    };
    
    const projeto = await dbOperations.createProjeto(projetoData);
    
    // TODO: Criar registro financeiro se necessário (quando implementarmos finanças no SQLite)
    
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
    const projeto = await dbOperations.getProjetoById(id);
    if (!projeto) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }
    
    const input = normalizeProjetoInput(req.body || {});
    if (!input.title) {
      return res.status(400).json({ success: false, error: 'Campo obrigatório: title' });
    }
    
    // Mapear campos para SQLite
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
    
    const projetoAtualizado = await dbOperations.updateProjeto(id, updates);
    
    // TODO: Sincronizar finanças vinculadas quando implementarmos no SQLite
    
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
    
    const projeto = await dbOperations.getProjetoById(id);
    if (!projeto) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }
    
    const body = req.body || {};
    const nextVisible = body.visivel !== undefined ? !!body.visivel : 
                       body.visible !== undefined ? !!body.visible : 
                       !projeto.visivel;
    
    const projetoAtualizado = await dbOperations.updateProjeto(id, { visivel: nextVisible });
    
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
    
    const projeto = await dbOperations.getProjetoById(id);
    if (!projeto) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }
    
    const projetoAtualizado = await dbOperations.updateProjeto(id, { 
      status: 'arquivado', 
      visivel: false 
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
    const projeto = await dbOperations.getProjetoById(id);
    
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
    const list = await dbOperations.getFinancas();
    res.status(200).json({ success: true, data: list, total: list.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao buscar finanças:', error);
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
    
    const updatedFinanca = await dbOperations.updateFinanca(id, updates);
    
    if (!updatedFinanca) {
      return res.status(404).json({ success: false, error: 'Registro financeiro não encontrado' });
    }
    
    // Sincroniza com projeto vinculado (bidirecional)
    if (updatedFinanca.type === 'project' && updatedFinanca.project_id) {
      const projectUpdates = {};
      if (patch.valor !== undefined) projectUpdates.preco = Number(updatedFinanca.valor);
      if (patch.progress !== undefined) {
        projectUpdates.progress = Number(updatedFinanca.progress);
        if (projectUpdates.progress === 100) projectUpdates.status = 'finalizado';
      }
      
      if (Object.keys(projectUpdates).length > 0) {
        await dbOperations.updateProjeto(updatedFinanca.project_id, projectUpdates);
      }
    }
    
    res.status(200).json({ success: true, item: updatedFinanca });
  } catch (error) {
    console.error('Erro ao atualizar finança:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.get('/api/financas/export', async (req, res) => {
  try {
    const financas = await dbOperations.getFinancas();
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
    const projetos = await dbOperations.getProjetos();
    const financas = await dbOperations.getFinancas();

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
    const rankingData = await dbOperations.getRankingData();
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json(rankingData);
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/ranking/points/:crafter_id', async (req, res) => {
  try {
    const { crafter_id } = req.params;
    const { delta, set } = req.body || {};
    const actor = req.headers['x-user-id'] || 'local-admin';
    
    let finalDelta = 0;
    if (typeof set === 'number') {
      // Se for para definir um valor absoluto, precisamos calcular o delta
      const crafters = await dbOperations.getCrafters();
      // Converter crafter_id para número se necessário para comparação
      const currentCrafter = crafters.find(c => c.id == crafter_id || c.id === parseInt(crafter_id));
      if (!currentCrafter) {
        return res.status(404).json({ success: false, error: 'Crafter não encontrado' });
      }
      finalDelta = set - (currentCrafter.points || 0);
    } else if (typeof delta === 'number') {
      finalDelta = delta;
    } else {
      return res.status(400).json({ success: false, error: 'Delta ou set deve ser fornecido' });
    }
    
    const result = await dbOperations.updateCrafterPoints(crafter_id, finalDelta, actor);
    
    // Atualizar configurações do ranking
    await dbOperations.updateRankingSettings({
      updated_at: new Date().toISOString(),
      updated_by: actor
    });
    
    notifyRealtime('ranking_changed');
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Erro ao atualizar pontos:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro interno do servidor' });
  }
});

app.put('/api/ranking/top3', async (req, res) => {
  try {
    const body = req.body || {};
    const arr = Array.isArray(body.top3) ? body.top3 : [];
    const actor = req.headers['x-user-id'] || 'local-admin';
    
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
    const crafters = await dbOperations.getCrafters();
    for (const x of arr) {
      if (!crafters.find(c => c.id === x.crafter_id)) {
        return res.status(404).json({ success: false, error: `Crafter inexistente: ${x.crafter_id}` });
      }
    }
    
    const top3Data = arr.map(x => ({ 
      crafter_id: x.crafter_id, 
      position: x.position, 
      reward: x.reward || '' 
    }));
    
    await dbOperations.updateTop3(top3Data, actor);
    
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
    const logs = await dbOperations.getRankingHistory();
    res.status(200).json({ data: logs });
  } catch (error) {
    console.error('Erro ao buscar histórico do ranking:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Ranking filters (admin state persistence)
app.put('/api/ranking/filters', async (req, res) => {
  try {
    const f = req.body || {};
    const actor = req.headers['x-user-id'] || 'local-admin';
    
    const filters = {
      min_points: typeof f.min_points === 'number' ? f.min_points : 0,
      max_points: typeof f.max_points === 'number' ? f.max_points : null,
      active_only: f.active_only !== undefined ? !!f.active_only : true,
      search: typeof f.search === 'string' ? f.search : '',
      updated_at: new Date().toISOString(),
      updated_by: actor
    };
    
    await dbOperations.updateRankingSettings(filters);
    
    // Criar histórico
    await dbOperations.createLog({
      type: 'filters_update',
      actor,
      data: { filters }
    });
    
    res.status(200).json({ success: true, filters });
  } catch (error) {
    console.error('Erro ao atualizar filtros:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Crafters CRUD
app.get('/api/crafters', async (req, res) => {
  try {
    const crafters = await dbOperations.getCrafters();
    const list = crafters.map(c => ({ 
      id: c.id, 
      name: c.nome, 
      avatar_url: c.avatar_url || null, 
      active: c.active !== 0 
    }));
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error('Erro ao buscar crafters:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.post('/api/crafters', async (req, res) => {
  try {
    const body = req.body || {};
    const actor = req.headers['x-user-id'] || 'local-admin';
    
    if (!body.name) {
      return res.status(400).json({ success: false, error: 'Campo obrigatório: name' });
    }
    
    const crafterData = {
      nome: String(body.name).trim(),
      email: body.email || '',
      avatar_url: body.avatar_url || null,
      points: Math.max(0, Number(body.points || 0)),
      active: body.active !== false ? 1 : 0
    };
    
    const crafter = await dbOperations.createCrafter(crafterData);
    
    // Criar histórico
    await dbOperations.createLog({
      type: 'crafter_create',
      actor,
      data: { crafter_id: crafter.id }
    });
    
    notifyRealtime('ranking_changed');
    res.status(201).json({ success: true, crafter });
  } catch (error) {
    console.error('Erro ao criar crafter:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/crafters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    const actor = req.headers['x-user-id'] || 'local-admin';
    
    const updates = {};
    
    if (patch.name !== undefined) {
      updates.nome = String(patch.name).trim();
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
    
    const updatedCrafter = await dbOperations.updateCrafter(id, updates);
    
    if (!updatedCrafter) {
      return res.status(404).json({ success: false, error: 'Crafter não encontrado' });
    }
    
    // Criar histórico
    await dbOperations.createLog({
      type: 'crafter_update',
      actor,
      data: { 
        crafter_id: id, 
        updates: { 
          name: updatedCrafter.nome, 
          points: updatedCrafter.points, 
          active: updatedCrafter.active 
        } 
      }
    });
    
    // Atualizar configurações do ranking
    await dbOperations.updateRankingSettings({
      updated_at: new Date().toISOString(),
      updated_by: actor
    });
    
    notifyRealtime('ranking_changed');
    res.status(200).json({ success: true, crafter: updatedCrafter });
  } catch (error) {
    console.error('Erro ao atualizar crafter:', error);
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

// --- Desafios (SQLite) ---
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
      const desafios = await dbOperations.getDesafios();
      return res.status(200).json({ success: true, data: desafios, total: desafios.length });
    }
    
    // Pública: aplicar filtros padrão
    const filters = {};
    
    if (visible !== undefined) {
      filters.visible = visible === 'true';
    } else {
      filters.visible = true; // Por padrão, só visíveis
    }
    
    if (status) {
      filters.status = status;
    } else {
      filters.status = 'active'; // Por padrão, só ativos
    }
    
    const desafios = await dbOperations.getDesafios(filters);
    
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json({ success: true, data: desafios.map(publicChallenge), total: desafios.length });
  } catch (error) {
    console.error('Erro ao buscar desafios:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.get('/api/desafios/:id', async (req, res) => {
  try {
    const desafio = await dbOperations.getDesafioById(req.params.id);
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
      criteria: Array.isArray(body.criteria) ? body.criteria : [],
      delivery_type: body.delivery_type,
      visible: Boolean(body.visible),
      difficulty: body.difficulty || 'starter',
      tags: Array.isArray(body.tags) ? body.tags : [],
      thumb_url: body.thumb_url || null,
      created_by: req.headers['x-user-id'] || 'local-admin'
    };
    
    const desafio = await dbOperations.createDesafio(desafioData);
    res.set('Cache-Control', 'no-store');
    res.status(201).json({ success: true, challenge: publicChallenge(desafio) });
  } catch (error) {
    console.error('Erro ao criar desafio:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/desafios/:id', async (req, res) => {
  try {
    const desafio = await dbOperations.getDesafioById(req.params.id);
    if (!desafio) return res.status(404).json({ success:false, error:'Desafio não encontrado' });
    
    const patch = req.body || {};
    if (patch.base_points !== undefined) {
      patch.base_points = Math.max(0, Number(patch.base_points));
    }
    
    await dbOperations.updateDesafio(req.params.id, patch);
    const updatedDesafio = await dbOperations.getDesafioById(req.params.id);
    
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, challenge: publicChallenge(updatedDesafio) });
  } catch (error) {
    console.error('Erro ao atualizar desafio:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/desafios/:id/status', async (req, res) => {
  try {
    const desafio = await dbOperations.getDesafioById(req.params.id);
    if (!desafio) return res.status(404).json({ success:false, error:'Desafio não encontrado' });
    
    const { status } = req.body || {};
    if (!['draft','active','closed','archived'].includes(status)) {
      return res.status(400).json({ success:false, error:'Status inválido' });
    }
    
    await dbOperations.updateDesafio(req.params.id, { status });
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar status do desafio:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Alterna visibilidade
app.put('/api/desafios/:id/visibility', async (req, res) => {
  try {
    const desafio = await dbOperations.getDesafioById(req.params.id);
    if (!desafio) return res.status(404).json({ success:false, error:'Desafio não encontrado' });
    
    const body = req.body || {};
    const nextVisible = body.visible !== undefined ? !!body.visible : !desafio.visible;
    
    await dbOperations.updateDesafio(req.params.id, { visible: nextVisible });
    const updatedDesafio = await dbOperations.getDesafioById(req.params.id);
    
    res.status(200).json({ success: true, challenge: publicChallenge(updatedDesafio) });
  } catch (error) {
    console.error('Erro ao atualizar visibilidade do desafio:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.post('/api/desafios/:id/inscrever', async (req, res) => {
  try {
    const { crafter_id } = req.body || {};
    const desafio = await dbOperations.getDesafioById(req.params.id);
    
    if (!desafio || !desafio.visible) {
      return res.status(404).json({ success:false, error:'Desafio não encontrado' });
    }
    if (desafio.status !== 'active') {
      return res.status(400).json({ success:false, error:'Desafio não aceita novas inscrições' });
    }
    if (isDeadlinePassed(desafio.deadline)) {
      return res.status(400).json({ success:false, error:'Prazo encerrado para novas inscrições' });
    }
    if (!crafter_id) {
      return res.status(400).json({ success:false, error:'Crafter obrigatório' });
    }
    
    // Verificar se já existe inscrição
    const existingInscricao = await dbOperations.checkInscricaoDesafio(crafter_id, req.params.id);
    if (existingInscricao) {
      return res.status(409).json({ success:false, error:'Inscrição já existente' });
    }
    
    const inscricao = await dbOperations.createInscricaoDesafio({
      crafter_id,
      desafio_id: req.params.id
    });
    
    res.set('Cache-Control', 'no-store');
    res.status(201).json({ success:true, registration: inscricao });
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
    const desafio = await dbOperations.getDesafioById(challengeId);
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
      challenge_id: challengeId,
      crafter_id,
      delivery: {
        url: delivery.url || '',
        notes: String(delivery.notes || '').trim()
      }
    };
    
    const submission = await dbOperations.createSubmission(submissionData);
    
    // Criar log da ação
    await dbOperations.createLog({
      type: 'submit',
      actor: crafter_id,
      challenge_id: challengeId,
      submission_id: submission.id
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
    const submissions = await dbOperations.getSubmissionsByChallenge(challengeId);
    res.status(200).json({ success: true, data: submissions, total: submissions.length });
  } catch (error) {
    console.error('Erro ao buscar submissions:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

app.put('/api/submissions/:id/review', async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await dbOperations.getSubmissionById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission não encontrada' });
    }
    
    const body = req.body || {};
    const allowed = ['reviewed', 'approved', 'rejected'];
    if (!allowed.includes(body.status)) {
      return res.status(400).json({ success: false, error: 'Status de review inválido' });
    }
    
    const reviewData = {
      by: req.headers['x-user-id'] || 'local-admin',
      notes: String(body.review?.notes || '').trim(),
      criteria_scores: body.review?.criteria_scores || {},
    };
    
    const updates = {
      status: body.status,
      score: typeof body.score === 'number' ? body.score : submission.score,
      review: reviewData
    };
    
    const updatedSubmission = await dbOperations.updateSubmission(submissionId, updates);
    
    // Criar log da ação
    await dbOperations.createLog({
      type: 'review',
      actor: reviewData.by,
      challenge_id: submission.challenge_id,
      submission_id: submissionId,
      data: { status: body.status }
    });
    
    // Integração Ranking opcional
    try {
      if (body.status === 'approved') {
        const desafio = await dbOperations.getDesafioById(submission.challenge_id);
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
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/feedbacks - Busca feedbacks do SQLite com filtros
app.get('/api/feedbacks', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/feedbacks`);
    try {
        const { origem, limit } = req.query;
        const filters = {};
        
        if (origem) filters.origem = origem;
        if (limit) filters.limit = limit;

        const feedbacks = await dbOperations.getFeedbacks(filters);
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
                data_criacao: new Date().toISOString()
            }
        ];
        res.status(200).json(mockFeedbacks);
    }
});

// POST /api/feedbacks - Cria um novo feedback no SQLite
app.post('/api/feedbacks', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido POST /api/feedbacks com dados:`, req.body);
    const { nome, email, mensagem, origem } = req.body;

    // Validação básica
    if (!nome || !mensagem) {
        console.warn(`[${new Date().toISOString()}] POST /api/feedbacks: Dados inválidos.`);
        return res.status(400).json({ error: 'Campos obrigatórios: nome, mensagem' });
    }

    try {
        const feedback = await dbOperations.createFeedback({
            nome,
            email,
            mensagem,
            origem: origem || 'pagina_inicial'
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
        const inscricao = await dbOperations.createInscricaoCrafter({
            nome,
            email,
            telefone,
            cidade,
            estado,
            area_interesse,
            mensagem
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
        const filters = {};
        
        if (status) filters.status = status;

        const inscricoes = await dbOperations.getInscricoesCrafters(filters);
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
        const inscricao = await dbOperations.updateInscricaoCrafterStatus(parseInt(id), status);
        
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

// GET /api/projects - Busca todos os projetos do SQLite
app.get('/api/projects', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Recebido GET /api/projects`);
    try {
        const projetos = await dbOperations.getProjetos();
        
        // Mapear dados do SQLite para o formato esperado pelo frontend
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
        // Testa operação simples no SQLite
        const mentores = await dbOperations.getMentores();
        
        console.log(`[${new Date().toISOString()}] GET /api/test-db: SQLite funcionando OK`);
        res.json({
            success: true,
            message: 'Conexão com SQLite funcionando corretamente',
            database: 'SQLite',
            mentoresCount: mentores.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro ao testar SQLite:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao conectar com SQLite',
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