# Auditoria de Rotas (Públicas vs Admin)

Este documento lista as rotas atuais do backend (server.js) e sua classificação quanto ao acesso.

## Saúde e Autenticação
- GET `/api/health` — público
- GET `/api/health/mercadopago` — público
- GET `/api/health/mp-env` — público
- GET `/api/health/db` — público
- POST `/api/auth/login` — público
- POST `/api/auth/admin/reset-password` — público (sensível; recomendado proteger)
- GET `/api/auth/users` — admin (authenticate + authorizeAdmin)
- POST `/api/auth/users` — admin
- PUT `/api/auth/users/:id` — admin

## Projetos
- GET `/api/projetos` — público
- GET `/api/projetos/:id` — público
- POST `/api/projetos` — admin
- PUT `/api/projetos/:id` — admin
- DELETE `/api/projetos/:id` — admin
- GET `/api/projetos/column/progresso` — admin

## Mentores
- GET `/api/mentores` — público
- GET `/api/mentores/:id` — público
- POST `/api/mentores` — admin
- PUT `/api/mentores/:id` — admin
- DELETE `/api/mentores/:id` — admin

## Crafters e Ranking
- GET `/api/crafters` — público
- POST `/api/crafters` — admin
- GET `/api/ranking` — público
- PUT `/api/ranking/points/:crafterId` — admin

## Equipes
- GET `/api/equipes` — público
- POST `/api/equipes` — admin
- DELETE `/api/equipes/:id` — admin
- PUT `/api/equipes/:id/status` — admin

## Inscrições
- GET `/api/inscricoes` — público
- POST `/api/inscricoes` — público

## Financeiro / Dashboard
- GET `/api/financas` — público (sensível; recomendado proteger)
- GET `/api/dashboard/resumo` — público (sensível; recomendado proteger)

## Apps
- GET `/api/apps/mine` — público (possivelmente deveria exigir autenticação)
- GET `/api/apps` — admin
- GET `/api/apps/public` — público
- GET `/api/apps/:id` — público
- POST `/api/apps/from-project/:projectId` — admin
- POST `/api/apps/dev/insert` — público (apenas desenvolvimento; recomendado restringir)
- PUT `/api/apps/:id` — admin
- POST `/api/apps/:id/purchase` — público
- GET `/api/apps/:id/purchase/status` — público
- POST `/api/apps/:id/download` — autenticado (usuário)
- GET `/api/apps/history` — público
- POST `/api/apps/:id/feedback` — autenticado
- POST `/api/apps/:id/payment/direct` — público
- GET `/api/apps/:id/payment/last` — público

## Pagamentos (Admin)
- GET `/api/payments/search` — admin
- GET `/api/payments/:id` — admin
- PUT `/api/payments/:id` — admin

## Webhooks
- POST `/api/apps/webhook` — público
- GET `/api/apps/webhook` — público

## Admin (Pagamentos)
- GET `/api/admin/app-payments` — público (sensível; recomendado proteger)
- GET `/api/admin/app-payments/:pid` — público (sensível; recomendado proteger)

## OAuth Mercado Livre
- GET `/api/mercado-livre/oauth/callback` — público

### Observações
- Rotas marcadas como “sensível; recomendado proteger” devem receber `authenticate` e, quando aplicável, `authorizeAdmin`.
- Em especial: `reset-password`, `financas`, `dashboard/resumo`, `admin/app-payments`.
- `apps/mine` provavelmente deveria exigir autenticação para retornar a lista do usuário.