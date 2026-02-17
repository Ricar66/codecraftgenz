# CodeCraft Gen-Z - Documentacao Completa

> Plataforma SaaS de marketplace de software, gestao de projetos, gamificacao e mentoria.

## Indice da Documentacao

| Documento | Descricao |
|-----------|-----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Visao geral da arquitetura, tecnologias e fluxo de dados |
| [FRONTEND.md](FRONTEND.md) | Estrutura do frontend, componentes, paginas e hooks |
| [BACKEND.md](BACKEND.md) | Estrutura do backend, controllers, services e repositories |
| [API.md](API.md) | Referencia completa de todos os endpoints da API |
| [DATABASE.md](DATABASE.md) | Schema do banco de dados, modelos e relacionamentos |
| [AUTH.md](AUTH.md) | Sistema de autenticacao, autorizacao e RBAC |
| [PAYMENTS.md](PAYMENTS.md) | Integracao Mercado Pago, fluxo de compra e licencas |
| [NFSE.md](NFSE.md) | Sistema de emissao de Nota Fiscal de Servico Eletronica |
| [ADMIN.md](ADMIN.md) | Painel administrativo, dashboard e gestao |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy, ambiente, CI/CD e configuracao |

---

## Visao Geral do Projeto

**CodeCraft Gen-Z** e uma plataforma completa que combina:

- **Marketplace de Apps** - Venda de aplicativos desktop com pagamento via Mercado Pago
- **Gestao de Projetos** - Acompanhamento de projetos da empresa
- **Sistema de Gamificacao** - Ranking de crafters com pontuacao e desafios
- **Mentoria** - Programa de mentores para desenvolvedores
- **Painel Admin** - Dashboard completo com KPIs, financas e gestao

## Stack Tecnologico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 5 + CSS Modules |
| Backend | Node.js + Express + TypeScript |
| Banco de Dados | MySQL (Hostinger) + Prisma ORM |
| Pagamentos | Mercado Pago SDK |
| Hospedagem | Render.com (backend) + Vercel/Render (frontend) |
| PWA | vite-plugin-pwa + Service Worker |

## Repositorios

| Repo | Descricao |
|------|-----------|
| `codecraft-frontend` | SPA React - interface do usuario e painel admin |
| `codecraftgenz-monorepo/backend` | API REST Express - toda logica de negocio |
