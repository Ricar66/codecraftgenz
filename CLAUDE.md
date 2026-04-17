# CLAUDE.md - Contexto para Claude Code

## Agentes Especializados

Este projeto tem agentes especializados em `.claude/agents/`. Use-os para trabalho profundo:

- **`codecraft-fullstack`** — Engenheiro sênior do projeto. Use para qualquer tarefa técnica: novas features, bugs, endpoints, páginas, jobs do bot, migrações de banco. Conhece toda a arquitetura.
- **`codecraft-product`** — PM e estrategista. Use para decisões de produto, novas features a priorizar, copies do site, estratégia de crescimento, engajamento da comunidade.

**Como usar:** `/agents:codecraft-fullstack` ou `/agents:codecraft-product`

---

## Visao Geral

Este repositorio e o frontend SPA (Single Page Application) da plataforma CodeCraft Gen-Z. E uma aplicacao React que serve como marketplace de apps, plataforma de desafios de programacao, mentorias, ranking e propostas B2B para desenvolvedores.

**URL de producao:** https://codecraftgenz.com.br
**URL da API:** https://api.codecraftgenz.com.br

**Repositórios relacionados (monorepo):**
- Backend: `c:\Users\ricardo.moretti\Documents\codecraftgenz-monorepo\backend`
- Discord Bot: `c:\Users\ricardo.moretti\Documents\codecraftgenz-monorepo\discord-bot`
- VPS: `root@187.77.229.205` | PM2: `codecraft-backend`, `codecraft-bot`

---

## Convencoes de Codigo

### Estilizacao
- Usar **CSS Modules** para estilos de paginas e componentes (`.module.css`). Nao usar Tailwind para estilos de pagina.
- Icones: usar **lucide-react** exclusivamente.
- Animacoes: usar **framer-motion** para transicoes e animacoes de entrada/saida.
- O tema e **dark** com fundo de constelacao (starfield). Nao usar temas claros.

### Paleta de Cores
- Primary (magenta): `#D12BF2`
- Tertiary (ciano): `#00E4F2`
- Indigo: `#6366f1` / `#a78bfa`
- Background: `#0a0a0f`
- Surface: `#1a1a2e`, `#0d0d1a`
- Text primary: `#F5F5F7`
- Text secondary: `#a0a0b0`

Os tokens CSS estao definidos em `src/styles/tokens.css`.

### Componentes UI
- Componentes base reutilizaveis estao em `src/components/UI/` (Button, Card, Modal, Toast, Input, Select, Loading, ErrorBoundary).
- Sempre usar o sistema de Toast para notificacoes. **Nunca usar `alert()`**.
- Validar formularios no evento `blur`, nao apenas no submit.

---

## Chamadas a API

Todas as chamadas ao backend sao feitas via `apiRequest()` exportada de `src/lib/apiConfig.js`.

```javascript
import { apiRequest } from '../lib/apiConfig.js';
```

A URL base e automaticamente configurada:
- Desenvolvimento: `http://localhost:8080` (ou `VITE_API_URL`)
- Producao: `https://api.codecraftgenz.com.br`

Os servicos de API estao organizados em `src/services/`:
- `appsAPI.js` - Apps e pagamentos
- `projectsAPI.js` - Projetos
- `mentorAPI.js` - Mentorias
- `rankingAPI.js` - Ranking
- `feedbackAPI.js` - Feedbacks
- `proposalAPI.js` - Propostas B2B
- `leadsAPI.js` - Leads
- `userAPI.js` - Usuarios
- `dashboardAPI.js` - Dashboard admin

---

## Autenticacao

O sistema de autenticacao usa `AuthContext` (definido em `src/context/`):

- JWT armazenado em `localStorage` com a chave `cc_session`.
- Login por email/senha e Google OAuth.
- O hook `useAuth()` (`src/context/useAuth.js`) fornece dados do usuario e funcoes de login/logout.
- A logica principal esta em `src/context/AuthCore.js`.

---

## Deploy

### Build e deploy para producao

```bash
npm run build
python deploy.py
```

O `deploy.py` faz upload da pasta `dist/` via SFTP para o servidor Hostinger.

### Problemas conhecidos de build
- O plugin PWA do Vite (`vite-plugin-pwa`) as vezes falha com um erro de `html-proxy`. Basta rodar `npm run build` novamente que funciona.

---

## Testes

Testes E2E com Playwright estao na pasta `e2e/`:
- `navigation.spec.js` - Testes de navegacao
- `responsive.spec.js` - Testes de responsividade
- `forms.spec.js` - Testes de formularios

```bash
npx playwright test
```

Os testes rodam contra o site em producao.

---

## Estrutura de Pastas

- `src/pages/` - Paginas (rotas) da aplicacao
- `src/components/` - Componentes reutilizaveis
- `src/context/` - Contextos React (Auth)
- `src/services/` - Servicos de API
- `src/lib/` - Configuracoes e utilitarios centrais
- `src/admin/` - Painel administrativo
- `src/hooks/` - Custom hooks
- `src/utils/` - Funcoes utilitarias
- `src/styles/` - Tokens CSS e estilos globais
- `e2e/` - Testes Playwright

---

## Regras Importantes

1. **Nunca commitar arquivos `.env`** -- eles contem chaves secretas.
2. **Usar Toast para notificacoes** -- nunca `alert()` ou `confirm()`.
3. **Validar formularios no blur** -- nao esperar o submit para mostrar erros.
4. **CSS Modules para estilos** -- nao usar inline styles extensivos nem Tailwind para paginas.
5. **lucide-react para icones** -- nao importar outros pacotes de icones.
6. **Manter o tema dark** -- todas as paginas devem seguir a paleta escura com o fundo starfield.
