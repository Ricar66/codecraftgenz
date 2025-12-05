# CodeCraftGenz — Frontend + API

Aplicação web do CodeCraftGenz composta por:
- Frontend em React (Vite)
- API em Node.js/Express (mesmo repositório)
- Integrações: Mercado Pago, Azure SQL

## Stack
- React `^19`
- Vite `^5`
- Node.js `>=18` (CI usa `22.x`)
- Express, Helmet, CORS, JWT
- Mercado Pago SDK
- MSSQL (Azure SQL)

## Requisitos
- Node.js `>=18`
- npm `>=9`

## Como rodar em desenvolvimento
```bash
npm install
npm run dev       # frontend em http://localhost:5173
npm start         # API em http://localhost:8080 (requer .env)
```

## Variáveis de ambiente
Crie um arquivo `.env` (ou `.env.development`/`.env.production`) na raiz. Nunca commite segredos.

```ini
# Frontend
VITE_APP_ENV=development
VITE_DEBUG=true
VITE_WP_API_URL=https://cms.codecraftgenz.com.br/wp-json

# API / Server
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173
JWT_SECRET=troque-por-um-segredo-forte
ADMIN_RESET_TOKEN=defina-um-token-admin

# Banco de Dados (Azure SQL)
DB_SERVER=seu-servidor.database.windows.net
DB_USER=usuario
DB_PASSWORD=senha
DB_DATABASE=banco

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=<seu-token>
MERCADO_PAGO_PUBLIC_KEY=<sua-chave-publica>
MERCADO_PAGO_SUCCESS_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_FAILURE_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_PENDING_URL=https://codecraftgenz.azurewebsites.net/apps/:id/compra
MERCADO_PAGO_WEBHOOK_URL=https://codecraftgenz.azurewebsites.net/api/apps/webhook
```

## Scripts
- `npm run dev`: inicia o frontend (Vite)
- `npm run build`: build de produção do frontend
- `npm run preview`: serve o build localmente
- `npm start`: inicia a API (Express)
- `npm run test`: executa testes (Vitest)
- `npm run test:ui`: interface dos testes
- `npm run test:coverage`: cobertura

## Testes
```bash
npm run test
```

## Build e Preview
```bash
npm run build
npm run preview
```

## Deploy (Azure Web App)
- O CI faz deploy do artefato e usa `npm run start:azure`.
- Variáveis sensíveis são configuradas via GitHub Secrets.

## Segurança
- Não commitar `.env` com segredos reais.
- Gere um `JWT_SECRET` forte. Exemplo (Node):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Contato
Para dúvidas ou suporte, abra uma issue neste repositório.
