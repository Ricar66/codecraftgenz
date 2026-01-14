# AUDITORIA COMPLETA - CODECRAFT GEN-Z

**Data:** 2026-01-13
**Arquiteto:** Claude (Full-Stack Senior)
**Escopo:** Cache/Deploy, Backend, Frontend, Banco de Dados

---

## 1. DIAGNÓSTICO GERAL

### Resumo Executivo
A auditoria identificou **23 problemas críticos/altos** que podem estar impedindo o site de refletir atualizações após deploys. Os principais focos de problema são:

1. **Cache do Service Worker** mal configurado (skipWaiting + clientsClaim sem reload)
2. **Falta de headers Cache-Control** tanto no frontend quanto no backend
3. **Rotas inconsistentes** entre frontend e backend (13 rotas ausentes/alteradas)
4. **Chamadas de API para endpoints não existentes** no backend atual

---

## 2. PROBLEMAS IDENTIFICADOS

### 2.1 CACHE E DEPLOY (CRÍTICO)

| # | Problema | Severidade | Arquivo | Correção |
|---|----------|------------|---------|----------|
| 1 | `skipWaiting: true` sem reload forçado | CRÍTICO | vite.config.js:85 | Mudar para false ou implementar reload |
| 2 | `clientsClaim: true` sem reload | CRÍTICO | vite.config.js:86 | Implementar reload quando SW atualiza |
| 3 | SW registrado com 3s de delay | ALTO | main.jsx:32 | Registrar imediatamente |
| 4 | Sem headers Cache-Control no .htaccess | CRÍTICO | .htaccess | Adicionar headers |
| 5 | Backend sem Cache-Control automático | CRÍTICO | app.ts | Adicionar middleware |
| 6 | index.html pode ser cacheado indefinidamente | CRÍTICO | Deploy config | Adicionar no-cache |

### 2.2 ROTAS AUSENTES NO BACKEND ATUAL

Comparando server.js antigo vs backend atual, as seguintes rotas **NÃO EXISTEM** no backend novo:

| Rota Antiga | Método | Descrição | Status |
|-------------|--------|-----------|--------|
| `/api/health/mercadopago` | GET | Health check MP | AUSENTE |
| `/api/health/mp-env` | GET | Env check MP | AUSENTE |
| `/api/auth/mfa/setup` | POST | MFA setup | AUSENTE |
| `/api/auth/mfa/enable` | POST | MFA enable | AUSENTE |
| `/api/auth/mfa/disable` | POST | MFA disable | AUSENTE |
| `/api/apps/dev/insert` | POST | Dev insert | AUSENTE (OK) |
| `/api/apps/:id/payment/direct` | POST | Pagamento direto | AUSENTE |
| `/api/test/*` | ALL | Rotas de teste | AUSENTE (OK) |
| `/api/feedbacks` | POST | Enviar feedback | AUSENTE |
| `/api/feedbacks` | GET | Buscar feedbacks | AUSENTE |
| `/api/downloads/:file` | GET | Download direto | AUSENTE |
| `/api/downloads/:file/integrity` | GET | Integridade arquivo | AUSENTE |
| `/api/mercado-livre/oauth/callback` | GET | OAuth ML | AUSENTE |
| `/api/admin/projetos` | GET | Admin projetos | REDUNDANTE |
| `/api/ranking/audit` | GET | Audit ranking | ENDPOINT DIFERENTE |
| `/api/ranking/filters` | PUT | Filtros ranking | ENDPOINT DIFERENTE |

### 2.3 CHAMADAS DO FRONTEND PARA ROTAS INEXISTENTES

| Frontend Chama | Método | Backend Atual | Status |
|----------------|--------|---------------|--------|
| `/api/apps/:id/payment/direct` | POST | NÃO EXISTE | **QUEBRADO** |
| `/api/feedbacks` | POST | NÃO EXISTE | **QUEBRADO** |
| `/api/feedbacks` | GET | NÃO EXISTE | **QUEBRADO** |
| `/api/licenses/activate` | POST | NÃO EXISTE | **QUEBRADO** |
| `/api/admin/app-payments` | GET | `/api/payments/admin/app-payments` | **PATH DIFERENTE** |
| `/api/admin/app-payments/:pid` | GET | `/api/payments/admin/app-payments/:pid` | **PATH DIFERENTE** |
| `/api/ranking/points/:crafterId` | PUT | `/api/crafters/points/:crafterId` | **PATH DIFERENTE** |
| `/api/ranking/top3` | PUT | `/api/crafters/top3` | **PATH DIFERENTE** |
| `/api/ranking/audit` | GET | `/api/crafters/audit` | **PATH DIFERENTE** |
| `/api/ranking/filters` | PUT | `/api/crafters/filters` | **PATH DIFERENTE** |

### 2.4 PROBLEMAS DE SEGURANÇA

| # | Problema | Severidade | Arquivo |
|---|----------|------------|---------|
| 1 | Admin reset password sem rate limit adequado | ALTO | users.ts |
| 2 | Webhook sem validação de assinatura MP | MÉDIO | payments.ts |

---

## 3. CORREÇÕES NECESSÁRIAS

### 3.1 CORREÇÃO DE CACHE - FRONTEND

**Arquivo: `vite.config.js`**
```javascript
// ANTES (problemático)
workbox: {
  skipWaiting: true,
  clientsClaim: true
}

// DEPOIS (correto)
workbox: {
  skipWaiting: false, // Permite transição suave
  clientsClaim: false,
  // OU mantenha true mas adicione no main.jsx:
}
```

**Arquivo: `main.jsx`** - Adicionar reload forçado:
```javascript
// Após detectar nova versão do SW
if (registration && registration.waiting) {
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

navigator.serviceWorker.addEventListener('controllerchange', () => {
  window.location.reload();
});
```

**Arquivo: `.htaccess`** - Adicionar headers:
```apache
# Assets com hash - cache longo
<FilesMatch "\.[a-f0-9]{8}\.(js|css|woff2?)$">
  Header set Cache-Control "public, immutable, max-age=31536000"
</FilesMatch>

# index.html - NUNCA cachear
<Files "index.html">
  Header set Cache-Control "public, no-cache, must-revalidate"
</Files>

# Service Worker - sempre validar
<Files "sw.js">
  Header set Cache-Control "public, no-cache, must-revalidate"
</Files>

# Workbox chunks - cache longo
<FilesMatch "workbox-[a-f0-9]+\.js$">
  Header set Cache-Control "public, immutable, max-age=31536000"
</FilesMatch>
```

### 3.2 CORREÇÃO DE CACHE - BACKEND

**Criar arquivo: `src/middlewares/cache.ts`**
```typescript
import type { Request, Response, NextFunction } from 'express';

export function cacheControl(options: { maxAge?: number; private?: boolean; noStore?: boolean } = {}) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (options.noStore) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else if (options.private) {
      res.set('Cache-Control', `private, max-age=${options.maxAge || 0}`);
    } else {
      res.set('Cache-Control', `public, max-age=${options.maxAge || 0}`);
    }
    next();
  };
}

// Middleware para APIs - sem cache
export function noCache(_req: Request, res: Response, next: NextFunction) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}
```

**Aplicar em `app.ts`:**
```typescript
import { noCache } from './middlewares/cache.js';

// Aplicar em todas as rotas de API
router.use('/api', noCache);
```

### 3.3 ROTAS FALTANTES NO BACKEND

**Criar arquivo: `src/routes/feedbacks.ts`**
```typescript
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { success } from '../utils/response.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// POST /api/feedbacks - Enviar feedback público
router.post('/', rateLimiter.sensitive, async (req, res) => {
  const { nome, email, mensagem, origem } = req.body;

  // Honeypot check (campo oculto preenchido = bot)
  if (req.body.website || req.body.phone_number) {
    return res.status(200).json(success({ id: 'honeypot' }));
  }

  const feedback = await prisma.feedback.create({
    data: {
      rating: 5, // Default para feedback de contato
      comment: `[${origem || 'site'}] ${nome} (${email}): ${mensagem}`,
    }
  });

  res.json(success(feedback));
});

// GET /api/feedbacks - Buscar feedbacks
router.get('/', async (req, res) => {
  const { limit = 20, origem } = req.query;

  const feedbacks = await prisma.feedback.findMany({
    where: origem ? { comment: { contains: `[${origem}]` } } : undefined,
    take: Number(limit),
    orderBy: { createdAt: 'desc' }
  });

  res.json(success(feedbacks));
});

export default router;
```

**Registrar em `routes/index.ts`:**
```typescript
import feedbackRoutes from './feedbacks.js';
// ...
router.use('/api/feedbacks', feedbackRoutes);
```

### 3.4 CORREÇÃO DE ENDPOINTS - FRONTEND

**Arquivo: `src/services/rankingAPI.js`** - Corrigir paths:
```javascript
// ANTES (incorreto)
export async function updateCrafterPoints(crafterId, options) {
  return apiRequest(`/api/ranking/points/${crafterId}`, { ... });
}

// DEPOIS (correto)
export async function updateCrafterPoints(crafterId, options) {
  return apiRequest(`/api/crafters/points/${crafterId}`, { ... });
}

// Aplicar mesma correção para:
// /api/ranking/top3 -> /api/crafters/top3
// /api/ranking/audit -> /api/crafters/audit
// /api/ranking/filters -> /api/crafters/filters
```

**Arquivo: `src/services/appsAPI.js`** - Corrigir admin payments:
```javascript
// ANTES
export async function adminListAppPayments(params = {}) {
  return apiRequest(`/api/admin/app-payments?${qp}`, { method: 'GET' });
}

// DEPOIS
export async function adminListAppPayments(params = {}) {
  return apiRequest(`/api/payments/admin/app-payments?${qp}`, { method: 'GET' });
}
```

### 3.5 ROTA DE PAGAMENTO DIRETO - BACKEND

**Adicionar em `src/routes/payments.ts`:**
```typescript
// POST /api/apps/:id/payment/direct - Pagamento direto MP
router.post(
  '/apps/:id/payment/direct',
  rateLimiter.sensitive,
  validate(directPaymentSchema),
  paymentController.createDirectPayment
);
```

**Adicionar em `src/controllers/payment.controller.ts`:**
```typescript
async createDirectPayment(req: Request, res: Response) {
  const appId = Number(req.params.id);
  const { token, payment_method_id, installments, payer } = req.body;
  const deviceId = req.headers['x-device-id'] as string;

  const result = await paymentService.processDirectPayment(appId, {
    token,
    payment_method_id,
    installments,
    payer,
    deviceId
  });

  res.json(success(result));
}
```

---

## 4. CHECKLIST DE VALIDAÇÃO PÓS-CORREÇÃO

### 4.1 Cache/Deploy
- [ ] Service Worker atualiza e recarrega página
- [ ] index.html não é cacheado (verificar Network tab)
- [ ] Assets com hash são cacheados por 1 ano
- [ ] API responses não são cacheadas pelo browser
- [ ] Limpar cache antigo ao fazer deploy

### 4.2 Backend
- [ ] Todas as rotas do server.js antigo têm equivalente no novo
- [ ] Middleware de Cache-Control está aplicado
- [ ] Rate limiting está funcionando
- [ ] Health checks retornam 200

### 4.3 Frontend
- [ ] Nenhuma chamada retorna 404
- [ ] Login funciona e persiste sessão
- [ ] Apps aparecem na página de compra
- [ ] Pagamentos funcionam (teste sandbox)
- [ ] Feedbacks são enviados corretamente

### 4.4 Banco de Dados
- [ ] Todas as migrations estão aplicadas
- [ ] Não há erros de constraint
- [ ] Queries retornam dados esperados

---

## 5. TABELA COMPARATIVA DE ROTAS

### Rotas Idênticas (OK)
| Rota | Método | Status |
|------|--------|--------|
| `/api/health` | GET | OK |
| `/api/health/db` | GET | OK |
| `/api/auth/login` | POST | OK |
| `/api/auth/logout` | POST | OK |
| `/api/auth/me` | GET | OK |
| `/api/auth/password-reset/request` | POST | OK |
| `/api/auth/password-reset/confirm` | POST | OK |
| `/api/auth/users` | GET | OK |
| `/api/auth/users` | POST | OK |
| `/api/auth/users/:id` | PUT | OK |
| `/api/auth/users/:id/toggle-status` | PATCH | OK |
| `/api/projetos` | GET | OK |
| `/api/projetos/:id` | GET | OK |
| `/api/projetos` | POST | OK |
| `/api/projetos/:id` | PUT | OK |
| `/api/projetos/:id` | DELETE | OK |
| `/api/projetos/:id/mentor` | POST | OK |
| `/api/mentores` | GET | OK |
| `/api/mentores/:id` | GET | OK |
| `/api/mentores` | POST | OK |
| `/api/mentores/:id` | PUT | OK |
| `/api/mentores/:id` | DELETE | OK |
| `/api/apps/public` | GET | OK |
| `/api/apps/:id` | GET | OK |
| `/api/apps` | GET | OK |
| `/api/apps` | POST | OK |
| `/api/apps/:id` | PUT | OK |
| `/api/apps/:id` | DELETE | OK |
| `/api/apps/:id/purchase` | POST | OK |
| `/api/apps/:id/purchase/status` | GET | OK |
| `/api/apps/:id/download` | POST | OK |
| `/api/apps/:id/download/by-email` | POST | OK |
| `/api/inscricoes` | GET | OK |
| `/api/inscricoes` | POST | OK |
| `/api/inscricoes/:id/status` | PUT | OK |
| `/api/inscricoes/:id` | DELETE | OK |
| `/api/desafios` | GET | OK |
| `/api/desafios/:id` | GET | OK |
| `/api/desafios` | POST | OK |
| `/api/desafios/:id` | PUT | OK |
| `/api/desafios/:id/inscrever` | POST | OK |
| `/api/desafios/:id/entregar` | POST | OK |

### Rotas com Path Diferente
| Rota Antiga | Rota Nova | Ação Frontend |
|-------------|-----------|---------------|
| `/api/ranking/points/:id` | `/api/crafters/points/:id` | Atualizar |
| `/api/ranking/top3` | `/api/crafters/top3` | Atualizar |
| `/api/ranking/audit` | `/api/crafters/audit` | Atualizar |
| `/api/ranking/filters` | `/api/crafters/filters` | Atualizar |
| `/api/admin/app-payments` | `/api/payments/admin/app-payments` | Atualizar |
| `/api/admin/app-payments/:id` | `/api/payments/admin/app-payments/:id` | Atualizar |

### Rotas Ausentes (Criar no Backend)
| Rota | Método | Prioridade |
|------|--------|------------|
| `/api/feedbacks` | POST | ALTA |
| `/api/feedbacks` | GET | MÉDIA |
| `/api/apps/:id/payment/direct` | POST | ALTA |
| `/api/licenses/activate` | POST | MÉDIA |

---

## 6. CONCLUSÃO TÉCNICA

### Causa Raiz do Cache
O problema principal de cache está na configuração do Service Worker com `skipWaiting: true` e `clientsClaim: true` sem um mecanismo de reload forçado. Isso causa:

1. SW assume controle imediatamente
2. Página continua usando JS antigo em memória
3. Estado inconsistente entre cache e código

### Causa Raiz das Rotas Quebradas
Durante a refatoração do backend (de server.js monolítico para arquitetura modular), algumas rotas foram:
1. Esquecidas (feedbacks, payment/direct)
2. Renomeadas sem atualizar frontend (ranking → crafters)
3. Movidas de prefixo (/api/admin → /api/payments/admin)

### Ações Prioritárias

**Imediato (Bloqueante):**
1. Corrigir SW para forçar reload
2. Adicionar Cache-Control headers
3. Criar rotas ausentes no backend
4. Corrigir paths no frontend

**Curto Prazo:**
1. Implementar health check para MP
2. Adicionar validação de assinatura webhook
3. Documentar política de cache

**Médio Prazo:**
1. Implementar MFA (removido na refatoração)
2. Adicionar monitoramento de cache
3. Criar testes E2E para rotas críticas

---

## 7. SCRIPTS DE VERIFICAÇÃO

### Verificar headers de cache
```bash
# Verificar se index.html não está cacheado
curl -I https://codecraftgenz.com.br/

# Deve retornar: Cache-Control: no-cache, must-revalidate
```

### Verificar rotas do backend
```bash
# Health check
curl https://api.codecraftgenz.com.br/health

# Lista de projetos
curl https://api.codecraftgenz.com.br/api/projetos

# Apps públicos
curl https://api.codecraftgenz.com.br/api/apps/public
```

### Limpar cache do browser (DevTools)
```javascript
// Console do navegador
caches.keys().then(names => names.forEach(name => caches.delete(name)));
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()));
location.reload(true);
```

---

**Relatório gerado automaticamente pela auditoria de arquitetura.**
