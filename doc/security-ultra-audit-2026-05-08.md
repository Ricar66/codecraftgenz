# Ultra Auditoria de Segurança — CodeCraft Gen-Z

**Data:** 2026-05-08
**Analista:** Alex Mercer (4 auditorias paralelas)
**Escopo:** Frontend + Backend + Discord Bot + VPS Produção + Banco MySQL Hostinger
**Risco Geral:** **ALTO**

---

## Sumário Executivo

Auditoria abrangente em 4 frentes: **Pagamentos/PCI-DSS**, **PII/LGPD**, **Threat Model + Pentest**, e **Infraestrutura VPS**. Consolidando todos os achados após deduplicação:

| Severidade | Total |
|-----------|:---:|
| CRÍTICO  | 8 |
| ALTO     | 17 |
| MÉDIO    | 16 |
| BAIXO    | 10 |

**Pontos fortes confirmados:**
- bcrypt(10), JWT HTTPOnly cookie, Helmet, CORS allowlist, Zod validation, Prisma ORM (sem SQLi), HMAC nos webhooks, fail2ban, UFW, Let's Encrypt, rate limiting, sem dangerouslySetInnerHTML.

**Pontos críticos:**
- SSH com root + senha habilitada (brute force possível)
- MySQL escutando em `0.0.0.0`
- Senha SFTP em texto plano no `.env.deploy`
- Webhook MP usa `!==` (timing attack)
- Resposta completa do MP retornada ao frontend (CPF + BIN + last4 expostos)
- Sem endpoint de exclusão de conta (LGPD violado)
- Conexão MySQL sem TLS

---

## P0 — IMEDIATO (até 1 hora)

### 1. [CRÍTICO] SSH: PermitRootLogin + PasswordAuthentication
**Local:** VPS `/etc/ssh/sshd_config.d/50-cloud-init.conf`
**Vetor:** Brute-force remoto de senha root
**Fix:**
```bash
echo 'PasswordAuthentication no' > /etc/ssh/sshd_config.d/99-hardening.conf
echo 'PermitRootLogin prohibit-password' >> /etc/ssh/sshd_config.d/99-hardening.conf
echo 'MaxAuthTries 3' >> /etc/ssh/sshd_config.d/99-hardening.conf
rm /etc/ssh/sshd_config.d/50-cloud-init.conf
systemctl reload sshd
```

### 2. [CRÍTICO] MySQL bind 0.0.0.0 + MySQLX exposto sem UFW
**Local:** `/etc/mysql/mysql.conf.d/mysqld.cnf`
**Fix:** `bind-address = 127.0.0.1` + `mysqlx-bind-address = 127.0.0.1`

### 3. [CRÍTICO] Senha SFTP Hostinger em `.env.deploy`
**Local:** `c:\Users\ricardo.moretti\Documents\codecraft-frontend\.env.deploy`
**Conteúdo:** `SFTP_PASS=MafagafaGenZ@23`
**Fix:** Trocar a senha no painel Hostinger AGORA + usar SSH key para deploy

### 4. [CRÍTICO] Webhook MP sem `timingSafeEqual`
**Local:** `backend/src/controllers/payment.controller.ts:85`
**Vetor:** Timing attack para forjar webhooks → pagamentos aprovados sem pagar
```typescript
// ANTES: if (v1 !== expectedSignature)
// DEPOIS:
import { timingSafeEqual } from 'crypto';
const a = Buffer.from(expectedSignature, 'hex');
const b = Buffer.from(v1, 'hex');
if (a.length !== b.length || !timingSafeEqual(a, b)) { /* reject */ }
```

### 5. [CRÍTICO] Resposta completa do MP retornada ao frontend
**Local:** `backend/src/services/payment.service.ts:870`
**Vetor:** `result: mpResponse` retorna CPF, BIN, last4 do cartão para o browser
**Fix:** Whitelist apenas `payment_id`, `status`, `qr_code`, `ticket_url` no retorno.

### 6. [CRÍTICO] Permissões 644 nos `.env` da VPS
```bash
chmod 600 /var/www/codecraft-backend/backend/.env
chmod 600 /var/www/codecraft-backend/discord-bot/.env
```

---

## P1 — URGENTE (24h)

### 7. [CRÍTICO] Sem endpoint de exclusão de conta (LGPD Art. 18 V)
Criar `DELETE /api/auth/account` (autenticado) que anonimiza dados financeiros e deleta o usuário.

### 8. [ALTO] PM2 rodando como root → RCE = root shell
Criar usuário `codecraft` dedicado e mover PM2 para ele.

### 9. [ALTO] 14 CVEs npm no backend (1 crítica: basic-ftp)
```bash
cd /var/www/codecraft-backend/backend && npm audit fix
```

### 10. [ALTO] DATABASE_URL sem TLS
**Fix:** `?ssl-mode=REQUIRED&sslaccept=strict` na connection string.

### 11. [ALTO] JWT role stale após demotion (7 dias)
**Local:** `backend/src/middlewares/auth.ts:69`
Buscar `role` do banco junto com `status` e usar valor atualizado em `req.user`.

### 12. [ALTO] Token JWT retornado no body além do cookie
**Local:** `backend/src/controllers/auth.controller.ts:39`
Remover `token` do JSON response — manter só no cookie HTTPOnly.

### 13. [ALTO] IDOR em `GET /purchase/status?email=`
Permite confirmar se email tem compra aprovada sem auth. Exigir `payment_id` ou auth.

### 14. [ALTO] Download de apps por email sem auth
**Local:** `backend/src/routes/downloads.ts:110`
Exigir `authenticate` e usar `req.user.email` do token.

### 15. [ALTO] Race condition em webhook MP
**Local:** `payment.service.ts:382-517` — `findUnique` + `upsert` sem transação atômica
**Fix:** Envolver em `prisma.$transaction()` com `create` antes do processamento (lock otimista).

### 16. [ALTO] `external_reference` aceito do cliente
**Local:** `backend/src/schemas/payment.schema.ts:31`
Remover do schema. Backend sempre deve gerar.

### 17. [ALTO] Sem backup do banco CodeCraft
Cron diário com `mysqldump` para `/var/backups/codecraft/`, retenção 7 dias.

### 18. [ALTO] Email exposto em `/api/crafters` público
**Local:** `crafter.service.ts:252` — remover `email` do mapeamento público.

### 19. [ALTO] MFA secret em texto plano no banco
**Local:** `User.mfaSecret` no schema.prisma — criptografar com AES-256-GCM.

---

## P2 — IMPORTANTE (1 semana)

### 20. [ALTO] CPF/dados fiscais em plaintext (`invoices.tomadorDocumento`)
Criptografar campos PII com AES-256-GCM antes de persistir.

### 21. [ALTO] Discord OAuth `DISCORD_TOKEN_ENCRYPT_KEY` opcional
Tornar obrigatório — fallback hoje armazena tokens em texto plano.

### 22. [ALTO] Cookie consent sem botão "Recusar" (LGPD inválido)
Adicionar botão "Apenas Essenciais" ao banner.

### 23. [ALTO] Logs com PII (email em dezenas de logger.info)
Função `maskEmail()` em todos os pontos com `email` no log.

### 24. [MÉDIO] Webhook MP sem validação de timestamp (replay)
Validar que `ts` do header `x-signature` é < 5 min de idade.

### 25. [MÉDIO] Console.log de dados de pagamento no frontend (dev mode)
**Local:** `CardDirectPayment.jsx:74,133`, `PaymentBrick.jsx:203,248,251`

### 26. [MÉDIO] Nginx sem rate limit + sem headers no `api.codecraftgenz.com.br`
Adicionar `limit_req_zone` + HSTS/X-Frame-Options/X-Content-Type-Options.

### 27. [MÉDIO] Node.js escuta em `0.0.0.0:8080` (bypass nginx)
**Fix:** `app.listen(PORT, '127.0.0.1')`.

### 28. [MÉDIO] FTP upload sem TLS (`secure: false`)
**Local:** `backend/src/routes/health.ts:297`

### 29. [MÉDIO] CUPS rodando em servidor de produção
`snap remove cups`

### 30. [MÉDIO] Sentry não instalado (erros não monitorados)
`npm install @sentry/node` no backend.

### 31. [MÉDIO] Referral abuse (`POST /referral/use` sem auth)
Adicionar `authenticate` e usar `req.user.id`.

### 32. [MÉDIO] Spam de guest users via apps gratuitos
Exigir auth para apps free OU CAPTCHA + limite por IP.

### 33. [MÉDIO] CPF duplicado no `metadata` do MP (frontend)
Remover de `CardDirectPayment.jsx:128-130`.

### 34. [MÉDIO] `getPurchaseStatus` sem auth expõe email + download_url
Exigir `payment_id` como prova de posse para chamadas anônimas.

### 35. [MÉDIO] `MP_WEBHOOK_SECRET` opcional em prod
**Fix:** `.refine(...)` no schema env.ts para exigir em produção.

### 36. [MÉDIO] Consentimento de termos não registrado no DB
Adicionar `termsAcceptedAt`, `privacyVersion` em `User`.

### 37. [MÉDIO] Sem endpoint de exportação de dados (LGPD Art. 18 V)
`GET /api/auth/export-data` autenticado.

---

## P3 — PLANEJADO (1 mês)

### 38. [MÉDIO] Audit logs e leads sem política de retenção
Cron de purge após 90/180 dias.

### 39. [MÉDIO] NFS-e com CPF fake `00000000000`
Tornar `payerDocument` obrigatório quando emitir NFS-e.

### 40. [MÉDIO] `console.error` no backend (substituir por `logger.error`)
**Local:** `feedbacks.ts`, `dashboard.controller.ts`, `downloads.ts`.

### 41-50. Backlog (BAIXOS)
- 9 SSH keys autorizadas no root (revisar e podar)
- Upload aceita `application/octet-stream` (validar magic bytes)
- PM2 sem log rotation (`pm2-logrotate`)
- DB host vaza em error logs
- Registro revela emails existentes (timing side-channel)
- Política de privacidade não menciona Discord/Google OAuth
- `ADMIN_RESET_TOKEN=codecraftgenz` (gerar token forte)
- `@xmldom/xmldom` CVE (atualizar)
- `getLastByApp` sem auth nem rate-limit
- Feedback admin query JSON pattern (escapar aspas)

---

## Score Pré-Remediação por Categoria

| Categoria | Score | Justificativa |
|-----------|:---:|---|
| Cryptographic Failures (A02) | 4/10 | Webhook sem timing-safe, MP response leak, MFA plaintext, DB sem TLS |
| Broken Access Control (A01) | 5/10 | IDOR em compras, JWT role stale, downloads por email |
| Vulnerable Components (A06) | 4/10 | 14 CVEs no backend, 1 crítica (basic-ftp) |
| Security Misconfiguration (A05) | 4/10 | SSH root+password, PM2 root, MySQL 0.0.0.0, .env 644 |
| Auth Failures (A07) | 6/10 | JWT no body, sem invalidação no logout, referral abuse |
| LGPD Compliance | 3/10 | Sem deleção/exportação, cookie consent inválido, PII plaintext |
| Injection (A03) | 9/10 | Prisma seguro, sem dangerouslySetInnerHTML |
| SSRF (A10) | 9/10 | URLs validadas, MP via SDK |
| Logging (A09) | 5/10 | Sentry quebrado, PII em logs, sem retenção |
| **Geral** | **5/10** | ALTO RISCO |

---

## Pontos Positivos Verificados

- bcrypt 10 rounds para senhas
- JWT HS256 explícito + HTTPOnly cookie + sameSite=lax
- HMAC nos webhooks (MP, Discord internal)
- Helmet + CSP + HSTS configurados
- CORS com allowlist explícita
- Rate limiting em rotas sensíveis (express-rate-limit)
- Zod validation em schemas
- Prisma ORM (queries parametrizadas)
- UFW ativo + fail2ban (4 IPs banidos atualmente)
- Let's Encrypt com auto-renovação
- Unattended upgrades habilitados
- `server_tokens off` no nginx
- Path traversal prevenido em downloads (`path.basename`)
- Discord tokens criptografados (quando key configurada)
- `sanitizeMpResponse` antes de persistir no DB
- Backup diário do CraftCard para Cloudflare R2 (CodeCraft falta)
- Histórico Git limpo de credenciais (purga já feita)
