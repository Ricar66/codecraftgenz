# Discord Bot - CodeCraft Gen-Z

Documentação completa do Discord Bot integrado à plataforma CodeCraft Gen-Z.

---

## Visão Geral

O **CodeCraftBot** é um bot Discord com automação completa que integra a comunidade do Discord com a plataforma CodeCraft Gen-Z. Funciona de forma autônoma com jobs automáticos, comandos slash interativos e webhooks de comunicação bidirecional.

- **Nome do Bot:** CodeCraftBot
- **ID da Aplicação:** <DISCORD_CLIENT_ID>
- **Guild (Servidor):** CodeCraftGenZ (ID: <DISCORD_GUILD_ID>)
- **Stack:** discord.js v14 + node-cron + rss-parser
- **Deploy:** VPS Ubuntu (PM2) - mesmo servidor da API backend
- **Repositório:** `codecraftgenz-monorepo/discord-bot/`

### Comunidade Discord

**Link:** https://discord.gg/uK6Ufuy9gc

---

## Estrutura do Servidor Discord

### Canais

#### 📍 INÍCIO
- **#boas-vindas** - Mensagem de boas-vindas automática
- **#regras** - Regras da comunidade
- **#anúncios** - Anúncios gerais (novos apps postados pelo bot)
- **#como-funciona** - Guia de uso da plataforma

#### 👥 COMUNIDADE
- **#apresentações** - Membros novos se apresentam (evento automático `guildMemberAdd`)
- **#geral** - Canal de discussão geral
- **#humor-e-memes** - Conteúdo leve
- **#tire-suas-duvidas** - Dúvidas técnicas

#### 💻 DESENVOLVIMENTO
- **#code-review** - Revisão de código entre pares
- **#mostre-seu-projeto** - Compartilhamento de projetos
- **#ferramentas-e-recursos** - Recursos úteis
- **#vagas-e-freelas** - Oportunidades de emprego (bot posta vagas)
- **#desafios-codecraft** - Novos desafios criados (bot posta automaticamente)

#### 🎖️ ÁREA VIP
- Canal privado com acesso exclusivo para membros com cargo **"Crafter"**

#### 🎤 VOICE
- **Geral** - Canal de voz para conversas

---

## Funcionalidades do Bot

### 1. Comandos Slash

#### `/rank`
Exibe o ranking dos top 5 crafters com pontos atualizados.

```
/rank
```

**Resposta:** Embed mostrando top 5 crafters com:
- Posição (🥇 🥈 🥉)
- Nome e avatar
- Pontos totais

#### `/desafios`
Lista os desafios ativos da plataforma com dificuldade e deadline.

```
/desafios
```

**Resposta:** Embeds com até 5 desafios mostrando:
- Título
- Dificuldade (🟢 Fácil / 🟡 Médio / 🔴 Difícil)
- Deadline
- Link para participar

---

### 2. Eventos Automáticos

#### Membro Novo Entra no Servidor
**Evento:** `guildMemberAdd`

Ao um novo membro entrar:
1. Mensagem automática de boas-vindas é postada em **#apresentações**
2. Embed contém:
   - Boas-vindas personalizado com nome do membro
   - Instruções de como funciona a plataforma
   - Link para a aplicação principal

**Configuração:** Pode ser desativada via `BotConfig.welcome_enabled = false`

---

### 3. Jobs Automáticos (Cron)

#### News Job - Notícias de Tech
**Cronograma:** 9h e 18h (diariamente)  
**Canal:** `#desafios-codecraft` (configurável via `DISCORD_CHANNEL_NEWS`)

```typescript
cron.schedule('0 9,18 * * *', () => runNewsJob())
```

**Funcionamento:**
- Busca RSS feeds: TabNews e dev.to (Portuguese)
- Posta até 2 artigos novos por execução
- Evita duplicatas via bot_logs (últimas 24h)
- Delay de 1,5s entre posts (evitar rate limit)

**Dados capturados em bot_logs:**
- `action: "news_posted"`
- `link`, `title`, `source` (JSON em details)
- `messageId` e `channelId`

#### Vagas Job - Oportunidades de Emprego
**Cronograma:** 10h (diariamente)  
**Canal:** `#vagas-e-freelas`

```typescript
cron.schedule('0 10 * * *', () => runVagasJob())
```

**Funcionamento:**
- Busca feedbacks de propostas recentes
- Posta oportunidades em formato embed
- Registra em bot_logs com ação `vagas_posted`

#### Ranking Job - Top Crafters Semanal
**Cronograma:** 12h de segunda-feira  
**Canal:** Postado em canal configurável

```typescript
cron.schedule('0 12 * * 1', () => runRankingJob())
```

**Funcionamento:**
- Busca top 10 crafters do banco de dados
- Posta ranking em embed formatado
- Atualiza job_state com `lastSuccess`

---

### 4. Integração com Plataforma (Webhooks)

O backend comunica com o bot via **webhooks internos** em `localhost:3001`:

#### POST `/hook/crafter-role`
Atribui cargo "Crafter" ao usuário que vinculou Discord.

**Request:**
```json
{
  "discordId": "123456789"
}
```

**Header obrigatório:** `X-Internal-Secret: <INTERNAL_WEBHOOK_SECRET>`

#### POST `/hook/new-challenge`
Posta novo desafio em `#desafios-codecraft`.

**Request:**
```json
{
  "id": 1,
  "nome": "Desafio Algoritmo",
  "dificuldade": "medio",
  "deadline": "2026-05-01T23:59:59Z",
  "recompensa": 500
}
```

#### POST `/hook/new-app`
Posta novo app em `#anúncios`.

**Request:**
```json
{
  "id": 1,
  "name": "Meu App",
  "description": "Descrição do app",
  "price": 29.90,
  "thumbUrl": "https://..."
}
```

#### POST `/hook/trigger/[news|vagas|ranking]`
Executa job manualmente (para testes/admin).

**Resposta:**
```json
{
  "success": true,
  "message": "Job de notícias iniciado"
}
```

---

## Configuração

### Variáveis de Ambiente

Arquivo `.env` no diretório `discord-bot/`:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DISCORD_TOKEN` | Token do bot (Discord Developer Portal) | `<YOUR_SECRET_HERE>` |
| `DISCORD_CLIENT_ID` | ID da aplicação do bot | `<DISCORD_CLIENT_ID>` |
| `DISCORD_GUILD_ID` | ID do servidor | `<DISCORD_GUILD_ID>` |
| `DISCORD_CHANNEL_NEWS` | ID do canal #notícias | `<DISCORD_CHANNEL_ID>` |
| `DISCORD_CHANNEL_VAGAS` | ID do canal #vagas-e-freelas | `<DISCORD_CHANNEL_ID>` |
| `DISCORD_CHANNEL_DESAFIOS` | ID do canal #desafios-codecraft | `<DISCORD_CHANNEL_ID>` |
| `DISCORD_CHANNEL_ANUNCIOS` | ID do canal #anúncios | `<DISCORD_CHANNEL_ID>` |
| `DISCORD_CHANNEL_APRESENTACOES` | ID do canal #apresentações | `<DISCORD_CHANNEL_ID>` |
| `DISCORD_ROLE_CRAFTER` | ID do cargo "Crafter" | `<DISCORD_ROLE_ID>` |
| `INTERNAL_WEBHOOK_SECRET` | Secret para webhooks internos | (string segura de 32+ chars) |
| `DATABASE_URL` | URL de conexão MySQL | `mysql://user:pass@host/db` |
| `NODE_ENV` | Ambiente | `production` |
| `INTERNAL_PORT` | Porta do servidor webhook | `3001` |

### Como Obter IDs do Discord

1. Ativar "Modo de Desenvolvedor" em Discord (User Settings > Advanced > Developer Mode)
2. Clicar com botão direito em canal/cargo/membro → "Copiar ID"
3. Ou usar comando de inspeção no servidor

### PM2 em Produção

Arquivo `ecosystem.config.js` no VPS:

```javascript
module.exports = {
  apps: [{
    name: 'codecraftgenz-bot',
    script: 'dist/index.js',
    cwd: '/app/codecraftgenz-monorepo/discord-bot',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://...',
      DISCORD_TOKEN: '...',
      // ... demais variáveis
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
  }],
};
```

**Comandos PM2:**

```bash
# Status
pm2 status

# Logs
pm2 logs codecraftgenz-bot

# Restart
pm2 restart codecraftgenz-bot

# Stop
pm2 stop codecraftgenz-bot

# Start
pm2 start ecosystem.config.js
```

---

## Banco de Dados do Bot

### discord_links
Vinculação entre conta de usuário e Discord.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | ID único |
| userId | Int (FK → User) | Usuário da plataforma |
| discordId | String (unique) | ID do membro Discord |
| discordUsername | String | Nome de usuário Discord |
| discordAvatar | String? | URL do avatar |
| accessToken | String? | OAuth access token (AES-256 criptografado) |
| refreshToken | String? | OAuth refresh token |
| tokenExpiresAt | DateTime? | Expiração do token OAuth |
| crafterRoleAssigned | Boolean | Se cargo "Crafter" foi atribuído |
| linkedAt | DateTime | Data da vinculação |
| updatedAt | DateTime | Última atualização |

**Índices:** `@@index([discordId])`

### bot_config
Configurações do bot (toggles, canais, cargos).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | ID único |
| key | String (unique) | Chave de configuração |
| value | String | Valor da config |
| updatedAt | DateTime | Última atualização |

**Valores conhecidos:**
- `news_enabled` → "true" / "false"
- `welcome_enabled` → "true" / "false"
- `vagas_enabled` → "true" / "false"

### bot_logs
Histórico de ações do bot para auditoria.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | ID único |
| action | String | Tipo de ação |
| status | String | "ok" ou "error" |
| details | String? | Dados JSON (título da notícia, etc) |
| guildId | String? | ID do servidor |
| channelId | String? | ID do canal |
| messageId | String? | ID da mensagem postada |
| userId | Int? | ID do usuário (se aplicável) |
| discordId | String? | ID Discord (se aplicável) |
| createdAt | DateTime | Data/hora do log |

**Índices:** `@@index([action])`, `@@index([createdAt])`

**Ações registradas:**
- `welcome_sent` - Mensagem de boas-vindas
- `news_posted` - Notícia postada
- `vagas_posted` - Vaga postada
- `challenge_posted` - Desafio postado
- `app_posted` - App postado
- `crafter_role_assigned` - Cargo atribuído
- `ranking_posted` - Ranking semanal

### job_states
Controle de execução dos cron jobs.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | ID único |
| jobName | String (unique) | Nome do job |
| lastRunAt | DateTime? | Última execução |
| lastSuccess | DateTime? | Última execução bem-sucedida |
| lastError | String? | Mensagem do último erro |
| runCount | Int | Contador total de execuções |
| updatedAt | DateTime | Última atualização |

**Jobs rastreados:**
- `news` - Job de notícias
- `vagas` - Job de vagas
- `ranking` - Job de ranking

---

## Arquitetura

### Fluxo de Autenticação Discord OAuth

1. **Frontend** clica em "Conectar Discord"
2. **Backend** inicia fluxo OAuth do Discord
3. **Usuário** autoriza a aplicação
4. **Backend** recebe `code` e troca por token
5. **Backend** cria registro em `discord_links`
6. **Backend** chama webhook interno: `POST /hook/crafter-role`
7. **Bot** atribui cargo "Crafter" ao membro
8. **Discord** mostra cargo no perfil do membro

### Fluxo de Webhook de Novo Desafio

1. **Admin** cria novo desafio no `/admin/desafios`
2. **Backend** valida e salva em `desafios`
3. **Backend** chama webhook: `POST http://localhost:3001/hook/new-challenge`
4. **Bot** recebe payload com dados do desafio
5. **Bot** monta embed com título, dificuldade, deadline
6. **Bot** posta em `#desafios-codecraft`
7. **Bot** registra em `bot_logs` com `messageId`

---

## Estrutura de Código

```
discord-bot/
├── src/
│   ├── index.ts              # Ponto de entrada (client.login, jobs, webhook)
│   ├── client.ts             # Configuração do Client Discord.js
│   ├── config/
│   │   └── env.ts            # Validação de variáveis de ambiente
│   ├── db/
│   │   └── prisma.ts         # Inicialização do Prisma Client
│   ├── events/
│   │   ├── ready.ts          # Bot ready (log + setup)
│   │   ├── guildMemberAdd.ts # Novo membro entra
│   │   └── interactionCreate.ts # Slash commands
│   ├── commands/
│   │   ├── rank.ts           # Comando /rank
│   │   ├── desafios.ts       # Comando /desafios
│   │   └── deploy-commands.ts # Registra slash commands
│   ├── jobs/
│   │   ├── news.job.ts       # Job de notícias (RSS)
│   │   ├── vagas.job.ts      # Job de vagas
│   │   └── ranking.job.ts    # Job de ranking semanal
│   ├── services/
│   │   ├── embeds.service.ts # Funções de criação de embeds
│   │   └── discord-roles.service.ts # Manipulação de cargos
│   ├── hooks/
│   │   └── webhook.ts        # Express app para webhooks internos
│   └── utils/
│       └── logger.ts         # Pino logger
├── prisma/
│   └── schema.prisma         # Schema compartilhado (symlink para ../backend/prisma)
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Deploy

### Build

```bash
cd discord-bot
npm install
npm run build
```

Gera pasta `dist/` com código compilado.

### Deploy para VPS

1. **SSH no servidor:**
   ```bash
   ssh root@<VPS_IP>
   ```

2. **Atualizar código:**
   ```bash
   cd /app/codecraftgenz-monorepo
   git pull origin main
   ```

3. **Instalar dependências:**
   ```bash
   cd discord-bot
   npm install
   ```

4. **Build:**
   ```bash
   npm run build
   ```

5. **Restart com PM2:**
   ```bash
   pm2 restart codecraftgenz-bot
   ```

---

## Debugging e Monitoramento

### Logs

Verificar logs do bot em produção:

```bash
pm2 logs codecraftgenz-bot --lines 100
```

Ou ver arquivo de log:

```bash
tail -f /app/codecraftgenz-monorepo/discord-bot/logs/out.log
```

### Testar Webhook Local

Para desenvolvimento local, pode testar webhooks com curl:

```bash
curl -X POST http://localhost:3001/hook/new-challenge \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: seu-secret-aqui" \
  -d '{
    "id": 1,
    "nome": "Test Challenge",
    "dificuldade": "medio",
    "deadline": "2026-05-01T23:59:59Z",
    "recompensa": 500
  }'
```

### Verificar Status do Bot

```bash
curl http://localhost:3001/health
```

**Resposta:**
```json
{
  "status": "ok",
  "uptime": 86400,
  "ping": 45
}
```

---

## Integração com Frontend

### Seção "Conectar Discord" (MyAccountPage)

Localização: `src/pages/MyAccountPage.jsx`

Botão que inicia fluxo OAuth:

1. Clica em "Conectar Discord"
2. Redireciona para `https://discord.com/api/oauth2/authorize?client_id=...&response_type=code&scope=...`
3. Backend recebe `code` e troca por token
4. Resposta de sucesso: `{ success: true, discordLink: { ... } }`
5. Frontend mostra Discord username e cargo "Crafter"

### Página Admin de Discord (`/admin/discord`)

Localização: `src/admin/pages/DiscordAdminPage.jsx`

**Funcionalidades:**
- Status do bot (online/offline)
- Toggles para features (news, welcome, vagas)
- Triggers manuais (news, vagas, ranking)
- Histórico de ações (bot_logs)
- Total de discord_links vinculados

---

## Troubleshooting

### Bot não conecta ao Discord

1. Verificar `DISCORD_TOKEN` válido
2. Verificar `DISCORD_GUILD_ID` correto
3. Verificar permissões da aplicação no Discord Developer Portal
4. Logs: `pm2 logs codecraftgenz-bot`

### Webhook retorna 401

1. Verificar `INTERNAL_WEBHOOK_SECRET` configurado corretamente em `.env`
2. Backend enviando header correto: `X-Internal-Secret: ...`
3. Secret está vazio? Gerar novo: `openssl rand -base64 32`

### Jobs não executam no horário

1. Verificar fuso horário do servidor: `date -R`
2. Verificar PM2 está rodando o app
3. Logs do cron: `pm2 logs codecraftgenz-bot | grep "job"`

### Mensagens não postam em canal

1. Verificar `DISCORD_CHANNEL_*` IDs corretos
2. Verificar bot tem permissão `Send Messages` no canal
3. Verificar bot tem permissão `Embed Links` para embeds
4. Verificar canal existe e não foi deletado

---

## Segurança

### Criptografia de Tokens OAuth

Os `accessToken` e `refreshToken` são armazenados criptografados com AES-256-GCM no banco de dados. Chave de criptografia é derivada do `JWT_SECRET`.

### Rate Limiting

- Jobs inserem `delay(1500ms)` entre posts para evitar rate limit do Discord
- Webhook interno usa `crypto.timingSafeEqual` para comparação segura de secrets

### Permissões do Bot

O bot requer as seguintes permissões no servidor Discord:

- `Send Messages` - Postar mensagens
- `Embed Links` - Enviar embeds
- `Manage Roles` - Atribuir cargos (Crafter)
- `Read Message History` - Para moderação futura

---

## Roadmap Futuro

- [ ] Sistema de invites (ganhar convites ao trazer amigos)
- [ ] Ponte com voice (audio notifications)
- [ ] Dashboard de stats do bot em `/admin/discord`
- [ ] Sistema de reações para votação
- [ ] Análise de engagement de membros
- [ ] Logs formatados com timestamps
- [ ] Rate limiting por usuário
- [ ] Sistema de tickets/support
