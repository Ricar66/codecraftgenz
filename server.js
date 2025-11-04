import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

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

// --- Dados Mock para Demonstração ---
const mockData = {
  projetos: [
    {
      id: 1,
      nome: "CodeCraft Platform",
      descricao: "Plataforma de desenvolvimento colaborativo",
      status: "ativo",
      tecnologias: ["React", "Node.js", "Express"],
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      nome: "API Gateway",
      descricao: "Gateway para microserviços",
      status: "desenvolvimento",
      tecnologias: ["Node.js", "Docker", "Kubernetes"],
      created_at: new Date().toISOString()
    }
  ],
  mentores: [
    {
      id: 1,
      nome: "João Silva",
      email: "joao@codecraft.dev",
      especialidade: "Full Stack Development",
      bio: "Desenvolvedor com 10+ anos de experiência",
      ativo: true
    },
    {
      id: 2,
      nome: "Maria Santos",
      email: "maria@codecraft.dev",
      especialidade: "DevOps",
      bio: "Especialista em infraestrutura e CI/CD",
      ativo: true
    }
  ],
  crafters: [
    {
      id: 1,
      nome: "Ana Costa",
      email: "ana@example.com",
      pontos: 1250,
      nivel: "Avançado"
    },
    {
      id: 2,
      nome: "Pedro Lima",
      email: "pedro@example.com",
      pontos: 890,
      nivel: "Intermediário"
    }
  ]
};

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

// Rotas de Projetos
app.get('/api/projetos', (req, res) => {
  res.json(mockData.projetos);
});

app.get('/api/projetos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const projeto = mockData.projetos.find(p => p.id === id);
  
  if (!projeto) {
    return res.status(404).json({ error: 'Projeto não encontrado' });
  }
  
  res.json(projeto);
});

app.post('/api/projetos', (req, res) => {
  const { nome, descricao, tecnologias } = req.body;
  
  if (!nome || !descricao) {
    return res.status(400).json({ error: 'Nome e descrição são obrigatórios' });
  }
  
  const novoProjeto = {
    id: mockData.projetos.length + 1,
    nome,
    descricao,
    status: 'desenvolvimento',
    tecnologias: tecnologias || [],
    created_at: new Date().toISOString()
  };
  
  mockData.projetos.push(novoProjeto);
  res.status(201).json(novoProjeto);
});

// Rotas de Mentores
app.get('/api/mentores', (req, res) => {
  res.json(mockData.mentores);
});

app.get('/api/mentores/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const mentor = mockData.mentores.find(m => m.id === id);
  
  if (!mentor) {
    return res.status(404).json({ error: 'Mentor não encontrado' });
  }
  
  res.json(mentor);
});

// Rotas de Crafters
app.get('/api/crafters', (req, res) => {
  res.json(mockData.crafters);
});

app.get('/api/ranking', (req, res) => {
  const ranking = [...mockData.crafters]
    .sort((a, b) => b.pontos - a.pontos)
    .map((crafter, index) => ({
      ...crafter,
      posicao: index + 1
    }));
  
  res.json(ranking);
});

// Rota de feedbacks (mock)
app.get('/api/feedbacks', (req, res) => {
  const feedbacks = [
    {
      id: 1,
      nome: "Carlos Silva",
      email: "carlos@example.com",
      feedback: "Excelente plataforma! Muito intuitiva.",
      rating: 5,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      nome: "Lucia Oliveira",
      email: "lucia@example.com",
      feedback: "Ótima para aprender e colaborar.",
      rating: 4,
      created_at: new Date().toISOString()
    }
  ];
  
  res.json(feedbacks);
});

app.post('/api/feedbacks', (req, res) => {
  const { nome, email, feedback, rating } = req.body;
  
  if (!nome || !email || !feedback) {
    return res.status(400).json({ error: 'Nome, email e feedback são obrigatórios' });
  }
  
  const novoFeedback = {
    id: Date.now(),
    nome,
    email,
    feedback,
    rating: rating || 5,
    created_at: new Date().toISOString()
  };
  
  res.status(201).json({
    message: 'Feedback enviado com sucesso!',
    feedback: novoFeedback
  });
});

// Rota de estatísticas (mock)
app.get('/api/stats', (req, res) => {
  res.json({
    totalProjetos: mockData.projetos.length,
    totalMentores: mockData.mentores.length,
    totalCrafters: mockData.crafters.length,
    projetosAtivos: mockData.projetos.filter(p => p.status === 'ativo').length,
    timestamp: new Date().toISOString()
  });
});

// --- Servir Arquivos Estáticos ---
app.use(express.static(path.join(__dirname, 'dist')));

// Rota catch-all para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Middleware de Tratamento de Erros ---
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`⚡ Servidor simplificado sem banco de dados`);
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