# CodeCraft Gen-Z Frontend

Plataforma moderna para desenvolvedores criarem, lancarem e evoluirem apps -- com marketplace, desafios, mentorias, ranking e pagamentos integrados.

**Site:** https://codecraftgenz.com.br

---

## Tech Stack

| Tecnologia | Versao |
|------------|--------|
| React | 19 |
| Vite | 5 |
| CSS Modules | -- |
| Framer Motion | animacoes e transicoes |
| lucide-react | icones |
| PWA | via vite-plugin-pwa |

---

## Pre-requisitos

- Node.js 20+
- npm

---

## Getting Started

```bash
# Clonar o repositorio
git clone https://github.com/Ricar66/codecraft-frontend.git
cd codecraft-frontend

# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estara disponivel em `http://localhost:5173`.

---

## Variaveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variaveis:

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `VITE_API_URL` | URL base da API backend | `http://localhost:8080` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID do Google OAuth | `xxxx.apps.googleusercontent.com` |
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | Chave publica do Mercado Pago | `APP_USR-xxxx` |

Em producao, se `VITE_API_URL` nao estiver definida, o frontend usa automaticamente `https://api.codecraftgenz.com.br`.

**Nunca commite arquivos `.env` no repositorio.**

---

## Build

```bash
# Build de producao
npm run build

# Servir o build localmente para teste
npm run preview
```

---

## Deploy para Hostinger

O deploy para producao e feito via SFTP para a Hostinger:

```bash
python deploy.py
```

O script envia os arquivos da pasta `dist/` para o servidor Hostinger via SFTP.

---

## Estrutura do Projeto

```
codecraft-frontend/
├── src/
│   ├── pages/              # Paginas da aplicacao (rotas)
│   │   ├── AppsPage.jsx          # Marketplace de apps
│   │   ├── DesafiosPage.jsx      # Desafios de programacao
│   │   ├── ProjectsPage.jsx      # Projetos da comunidade
│   │   ├── MentoriaPage.jsx      # Sistema de mentorias
│   │   ├── RankingPage.jsx       # Ranking de usuarios
│   │   ├── ForCompaniesPage.jsx  # Pagina B2B para empresas
│   │   ├── FeedbacksPage.jsx     # Feedbacks da plataforma
│   │   ├── LoginPage.jsx         # Login (email + Google)
│   │   ├── RegisterPage.jsx      # Cadastro de usuarios
│   │   ├── MyAccountPage.jsx     # Perfil do usuario
│   │   └── ...
│   ├── components/         # Componentes reutilizaveis
│   │   ├── UI/                   # Componentes base (Button, Card, Modal, Toast, Input)
│   │   ├── Projects/             # Componentes de projetos
│   │   ├── Challenges/           # Componentes de desafios
│   │   ├── Feedbacks/            # Componentes de feedbacks
│   │   ├── CasesSection/         # Secao de cases
│   │   ├── Footer/               # Rodape
│   │   └── ...
│   ├── context/            # Contextos React (AuthContext)
│   ├── services/           # Chamadas a API
│   │   ├── appsAPI.js            # Apps e pagamentos
│   │   ├── projectsAPI.js        # Projetos
│   │   ├── mentorAPI.js          # Mentorias
│   │   ├── rankingAPI.js         # Ranking
│   │   ├── feedbackAPI.js        # Feedbacks
│   │   ├── proposalAPI.js        # Propostas B2B
│   │   ├── leadsAPI.js           # Leads
│   │   ├── userAPI.js            # Usuarios
│   │   └── ...
│   ├── lib/                # Utilitarios e configuracoes
│   │   ├── apiConfig.js          # Configuracao centralizada da API (apiRequest)
│   │   ├── logger.js             # Logger
│   │   └── realtime.js           # Comunicacao real-time
│   ├── admin/              # Painel administrativo
│   │   ├── components/           # Componentes do admin (AdminTable, Pagination, Filters)
│   │   └── ...
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Funcoes utilitarias
│   ├── styles/             # Tokens CSS e estilos globais
│   └── assets/             # Imagens, SVGs, logo
├── e2e/                    # Testes end-to-end (Playwright)
│   ├── navigation.spec.js
│   ├── responsive.spec.js
│   └── forms.spec.js
├── deploy.py               # Script de deploy SFTP para Hostinger
├── vite.config.js          # Configuracao do Vite
└── package.json
```

---

## Testes

Os testes E2E usam Playwright e rodam contra o site em producao:

```bash
# Instalar browsers do Playwright (primeira vez)
npx playwright install

# Rodar todos os testes
npx playwright test

# Rodar com interface visual
npx playwright test --ui

# Rodar um arquivo especifico
npx playwright test e2e/navigation.spec.js
```

---

## Funcionalidades Principais

### Autenticacao
- Login com email e senha
- Cadastro de novos usuarios
- Login com Google OAuth
- Recuperacao de senha
- JWT armazenado em localStorage (`cc_session`)
- Vinculacao com conta Discord (OAuth)

### Marketplace de Apps
- Listagem e busca de apps
- Pagina de detalhes do app
- Checkout com Mercado Pago (cartao, PIX, boleto)
- Pagina de sucesso pos-compra
- Sistema de licencas

### Desafios
- Desafios de programacao com niveis de dificuldade
- Submissao e avaliacao de solucoes
- Pontuacao e progresso
- Notificacoes no Discord via bot

### Projetos
- Vitrine de projetos da comunidade
- Detalhes e descricao dos projetos
- Colaboracao entre membros

### Mentorias
- Sistema de mentorias entre desenvolvedores
- Perfis de mentores
- Agendamento de sessoes

### Ranking
- Ranking geral de usuarios por pontos
- Gamificacao e niveis
- Exibicao em Discord via comando `/rank`

### Propostas B2B
- Pagina "Para Empresas"
- Formulario de propostas comerciais
- Captacao de leads

### Painel Administrativo
- Gerenciamento de apps, usuarios, desafios, projetos, mentorias
- Tabelas com paginacao e filtros
- Dashboard com metricas
- Gerenciamento do Discord Bot (`/admin/discord`)

### Comunidade Discord
- Integracao com servidor privado
- Bot com comandos slash (`/rank`, `/desafios`)
- Notificacoes automaticas de apps e desafios
- Boas-vindas automaticas para novos membros
- Cargo "Crafter" automaticamente atribuido

---

## Infraestrutura

| Componente | Hospedagem | Detalhes |
|------------|------------|----------|
| Frontend | Hostinger | Deploy via SFTP (`deploy.py`) |
| Backend API | VPS dedicado | `https://api.codecraftgenz.com.br` |
| Banco de dados | Hostinger | MySQL |
| Dominio | Hostinger | `codecraftgenz.com.br` |

---

## Scripts Disponiveis

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run preview` | Serve o build localmente |
| `npx playwright test` | Roda testes E2E |
| `python deploy.py` | Deploy para Hostinger via SFTP |

---

## Licenca

Proprietary - CodeCraft Gen-Z
