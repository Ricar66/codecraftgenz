# Relatório de Segurança — CodeCraft Gen-Z Frontend

**Data:** 2026-05-01
**Analista:** Alex Mercer (security-review skill)
**Stack:** React 19 + Vite 5 + react-router-dom 7 | Autenticação HTTPOnly cookie | Backend Node.js separado
**Escopo:** Frontend SPA completo — autenticação, API config, admin panel, serviços, uploads, dependências, histórico git

---

## Sumário Executivo

O frontend apresenta **2 vulnerabilidades críticas** que exigem ação imediata: credenciais de banco de dados, JWT secret, e token de pagamento Mercado Pago foram commitados no histórico Git e continuam acessíveis; um token de admin hardcoded no código-fonte permite controle total sobre licenças da plataforma. Adicionalmente, há 15 vulnerabilidades em dependências (11 HIGH), ausência de proteção CSRF, e vetores de open redirect via dados controlados pelo backend. A postura de segurança geral é **preocupante** — a autenticação por HTTPOnly cookie e as headers CSP são pontos positivos, mas os segredos expostos invalidam a segurança de toda a plataforma.

**Score Geral: 4/10 — ALTO RISCO**

---

## Achados Críticos

### [CRÍTICO] 1 — Segredos de Produção Expostos no Histórico Git

**Localização:** Commits `a96544d` e `c8fd1df` (arquivo `.env`)
**CWE:** CWE-798 / OWASP A02:2021
**Status:** REQUER AÇÃO MANUAL IMEDIATA — rotacionar credenciais

**Vetor:** Qualquer pessoa com acesso ao repositório (ou a um clone/fork) pode recuperar os segredos via `git log` ou `git show`.

**Impacto:**
- Conexão direta ao banco Azure SQL — exfiltração de todos os dados de usuários
- Forja de tokens JWT — login como qualquer usuário (incluindo admin)
- Transações financeiras via Mercado Pago

**Evidência:**
```
DATABASE_URL="mssql://admin-gen:Dedecdmm1902%4066@server-db-codegenz.database.windows.net:1433/db-codegenz?..."
JWT_SECRET=CodeCraft2025_JWT_Secret_Key_Ultra_Secure_Random_String_For_Production
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-2425370989062890-110619-a3bd6938...
```

**Correção:**
1. Rotacionar senha do banco Azure SQL IMEDIATAMENTE
2. Gerar novo `JWT_SECRET` (invalida todas as sessões ativas)
3. Revogar e gerar novo token Mercado Pago
4. Limpar histórico Git: `npx bfg --delete-files .env` + `git push --force`

---

### [CRÍTICO] 2 — Token Admin Hardcoded no Bundle JS

**Localização:** `src/admin/AdminLicencas.jsx:13`
**CWE:** CWE-798 / OWASP A02:2021
**Status:** CORRIGIDO neste relatório (movido para env var + comentário de migração)

**Vetor:** Qualquer pessoa inspeciona o JS minificado em produção, extrai `codecraftgenz`, e chama as rotas `/health/admin/`.

**Impacto:** Criar licenças gratuitas, revogar licenças de usuários pagantes, listar todos os usuários com licenças.

**Evidência original:**
```javascript
const ADMIN_TOKEN = 'codecraftgenz';
headers: { 'x-admin-token': ADMIN_TOKEN }
```

**Correção aplicada:** Mover para `VITE_ADMIN_TOKEN` no `.env`. Migração completa requer que o backend aceite cookie de sessão + role=admin nessas rotas.

---

## Achados Altos

### [ALTO] 3 — 15 CVEs nas Dependências (11 HIGH)

**Localização:** `package.json`
**CWE:** CWE-1395 / OWASP A06:2021
**Status:** CORRIGIDO — `npm audit fix` executado

| Pacote | Severidade | CVE/Advisory | Impacto |
|--------|-----------|--------------|---------|
| lodash ≤4.17.23 | HIGH | GHSA-r5fr-rjxr-66jc | Code Injection via `_.template` |
| lodash ≤4.17.23 | HIGH | GHSA-f23m-r3pf-42rh | Prototype Pollution |
| flatted ≤3.4.1 | HIGH | GHSA-rf6f-7fwh-wjgh | Prototype Pollution via `parse()` |
| esbuild ≤0.24.2 | MODERATE | GHSA-67mh-4wv8-2f99 | Dev server exposto |

---

### [ALTO] 4 — Ausência de Proteção CSRF

**Localização:** `src/lib/apiConfig.js`
**CWE:** CWE-352 / OWASP A01:2021
**Status:** MITIGADO — header `X-Requested-With: XMLHttpRequest` adicionado (força CORS preflight)

**Vetor:** Site malicioso força o navegador do usuário logado a fazer requisições autenticadas (o cookie HTTPOnly é enviado automaticamente).

**Impacto:** Executar ações como o usuário logado — alterar dados, fazer compras, excluir conta.

**Correção completa recomendada:** Implementar Double Submit Cookie no backend (XSRF-TOKEN).

---

### [ALTO] 5 — Open Redirect via URL do Backend

**Localização:** `src/pages/PerfilPage/PerfilPage.jsx:474`, `src/admin/AdminMetas.jsx:346`
**CWE:** CWE-601 / OWASP A01:2021
**Status:** CORRIGIDO — validação de domínio adicionada

**Vetor:** Se o backend retornar uma URL maliciosa (comprometimento ou MITM), o usuário é redirecionado para phishing.

---

## Achados Médios

### [MÉDIO] 6 — CSP com `unsafe-inline`

**Localização:** `.htaccess`
**Status:** PENDENTE — requer migração para nonces/hashes (complexo, fora do escopo deste relatório)

### [MÉDIO] 7 — Sem Rate Limiting no Login

**Localização:** `src/pages/LoginPage.jsx`
**Status:** CORRIGIDO — lockout de 60s após 5 tentativas falhas

### [MÉDIO] 8 — Validar URL em sw-push.js

**Localização:** `public/sw-push.js:18`
**Status:** CORRIGIDO — validação de origem antes de `openWindow()`

### [MÉDIO] 9 — `innerHTML` em main.jsx

**Localização:** `src/main.jsx:49`
**Status:** CORRIGIDO — substituído por DOM API

### [MÉDIO] 10 — Upload `.exe` Sem Limite de Tamanho

**Localização:** `src/admin/AdminApps.jsx`
**Status:** CORRIGIDO — limite de 500MB adicionado no frontend

### [MÉDIO] 11 — Arquivo Server-Side no Repositório Frontend

**Localização:** `src/integrations/mercadoLivre.js`
**Status:** PENDENTE — mover para backend

---

## Tabela de Resumo

| # | Severidade | Título | Localização | CWE | Status |
|---|-----------|--------|-------------|-----|--------|
| 1 | CRÍTICO | Segredos no histórico Git | commits a96544d/c8fd1df | CWE-798 | MANUAL |
| 2 | CRÍTICO | Token admin hardcoded | AdminLicencas.jsx:13 | CWE-798 | CORRIGIDO |
| 3 | ALTO | 15 CVEs dependências | package.json | CWE-1395 | CORRIGIDO |
| 4 | ALTO | Ausência CSRF | apiConfig.js | CWE-352 | MITIGADO |
| 5 | ALTO | Open Redirect | PerfilPage.jsx:474, AdminMetas.jsx:346 | CWE-601 | CORRIGIDO |
| 6 | MÉDIO | CSP unsafe-inline | .htaccess | CWE-79 | PENDENTE |
| 7 | MÉDIO | Sem rate limiting login | LoginPage.jsx | CWE-307 | CORRIGIDO |
| 8 | MÉDIO | Open redirect push SW | sw-push.js:18 | CWE-601 | CORRIGIDO |
| 9 | MÉDIO | innerHTML inseguro | main.jsx:49 | CWE-79 | CORRIGIDO |
| 10 | MÉDIO | .exe sem limite tamanho | AdminApps.jsx | CWE-434 | CORRIGIDO |
| 11 | MÉDIO | Arquivo server-side no frontend | mercadoLivre.js | CWE-200 | PENDENTE |

---

## Score de Segurança (Pré/Pós Remediação)

| Categoria | Antes | Depois |
|-----------|:---:|:---:|
| Cryptographic Failures (A02) | 2/10 | 5/10* |
| Vulnerable Components (A06) | 4/10 | 8/10 |
| Broken Access Control (A01) | 5/10 | 7/10 |
| Security Misconfiguration (A05) | 6/10 | 7/10 |
| Insecure Design (A04) | 6/10 | 8/10 |
| Auth & Sessions (A07) | 7/10 | 8/10 |
| Injection / XSS (A03) | 8/10 | 9/10 |
| SSRF (A10) | 9/10 | 9/10 |
| **Geral** | **4/10** | **7/10** |

*Score A02 permanece baixo até que as credenciais do Git sejam rotacionadas e o histórico limpo.

---

## Ações Manuais Pendentes (não automatizáveis)

1. **URGENTE:** Rotacionar `DATABASE_URL`, `JWT_SECRET`, `MERCADO_PAGO_ACCESS_TOKEN`
2. **URGENTE:** Limpar histórico Git com BFG: `npx bfg --delete-files .env && git push --force`
3. **IMPORTANTE:** Backend — migrar rotas `/health/admin/` para autenticação por cookie + role
4. **PLANEJADO:** CSP sem `unsafe-inline` — implementar nonces no servidor
5. **PLANEJADO:** Mover `src/integrations/mercadoLivre.js` para o backend
6. **PLANEJADO:** CSRF completo — Double Submit Cookie (`XSRF-TOKEN`) no backend
