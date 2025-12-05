<div align="center">
  <img alt="Logo CodeCraftGenz" src="src/assets/logo-codecraft.svg" width="120" />

  <h1>CodeCraftGenz — Frontend + API</h1>

  <a href="https://github.com/Ricar66/codecraftgenz/actions/workflows/main_codecraftgenz.yml">
    <img alt="Build" src="https://github.com/Ricar66/codecraftgenz/actions/workflows/main_codecraftgenz.yml/badge.svg" />
  </a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=061A23" />
  <img alt="Vite" src="https://img.shields.io/badge/vite-5-646CFF?logo=vite&logoColor=white" />
</div>

---

Aplicação web moderna com:
- ⚛️ Frontend em React (Vite)
- 🚀 API Node.js/Express
- 💳 Integração Mercado Pago
- 🗄️ Banco Azure SQL
- 🛡️ Segurança com Helmet, CORS e JWT

## Recursos
- Performance com Vite e otimizações de build
- Roteamento no frontend e API consolidada
- Integrações de pagamento e webhooks
- Configuração via variáveis de ambiente (sem expor segredos)

## Pré-requisitos
- Node.js `>=18`
- npm `>=9`

## Comece Rápido
```bash
npm install
npm run dev       # Frontend em http://localhost:5173
npm start         # API em http://localhost:8080 (requer .env)
```

## Variáveis de Ambiente
Defina em `.env` (ou `.env.development`/`.env.production`). Não exponha valores sensíveis.

```ini
# Frontend
VITE_APP_ENV=development
VITE_DEBUG=true
VITE_WP_API_URL=https://cms.codecraftgenz.com.br/wp-json

# API / Server
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173
JWT_SECRET=<defina-um-segredo-forte>
ADMIN_RESET_TOKEN=<defina-um-token-admin>

# Banco (Azure SQL)
DB_SERVER=<servidor>
DB_USER=<usuario>
DB_PASSWORD=<senha>
DB_DATABASE=<banco>

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=<token>
MERCADO_PAGO_PUBLIC_KEY=<chave_publica>
MERCADO_PAGO_SUCCESS_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_FAILURE_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_PENDING_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_WEBHOOK_URL=https://codecraftgenz.azurewebsites.net/api/apps/webhook
```

## Scripts
- `npm run dev` – inicia o frontend
- `npm run build` – build de produção
- `npm run preview` – serve o build localmente
- `npm start` – inicia a API
- `npm run test` – executa testes

## Testes
```bash
npm run test
```

## Deploy
- CI via GitHub Actions (deploy para Azure Web App)
- Segredos via GitHub Secrets

## Segurança
- Nunca commitar segredos
- Gere um `JWT_SECRET` forte:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Contato
Abra uma issue para dúvidas e suporte
