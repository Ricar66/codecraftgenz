# Autenticacao e Autorizacao

## Visao Geral

O sistema usa **JWT (JSON Web Tokens)** para autenticacao, com tokens armazenados em:
- **httpOnly cookie** (`cc_token`) - setado pelo backend
- **localStorage** (`cc_session`) - usado pelo frontend

## Fluxo de Autenticacao

### 1. Login

```
Usuario                  Frontend                   Backend
  │                         │                          │
  ├─ email + senha ────────►│                          │
  │                         ├─ POST /api/auth/login ──►│
  │                         │                          ├── Busca user por email
  │                         │                          ├── Verifica status == "ativo"
  │                         │                          ├── bcrypt.compare(senha, hash)
  │                         │                          ├── Gera JWT (id, email, role, name)
  │                         │                          ├── Seta cookie httpOnly
  │                         │◄── { token, user } ──────┤
  │                         ├── Salva em localStorage   │
  │                         ├── Atualiza AuthContext     │
  │◄── Dashboard/Home ──────┤                          │
```

### 2. Verificacao de Sessao (App Load)

```
App Init                  Frontend                   Backend
  │                         │                          │
  │                         ├── Le token localStorage  │
  │                         ├─ GET /api/auth/me ──────►│
  │                         │  (Authorization: Bearer) │
  │                         │                          ├── Verifica JWT
  │                         │                          ├── Busca user no DB
  │                         │◄── { user } ─────────────┤
  │                         ├── Atualiza AuthContext     │
  │                         │                          │
  │  (Se 401)               │                          │
  │                         ├── Limpa localStorage      │
  │                         ├── Redireciona /login      │
```

### 3. Logout

```
Usuario                  Frontend                   Backend
  │                         │                          │
  ├─ Clica "Sair" ────────►│                          │
  │                         ├─ POST /api/auth/logout ─►│
  │                         │                          ├── Limpa cookie
  │                         │◄── 200 OK ───────────────┤
  │                         ├── Limpa localStorage      │
  │                         ├── Limpa AuthContext        │
  │◄── /login ──────────────┤                          │
```

## JWT Token

### Payload

```json
{
  "id": 1,
  "email": "admin@codecraft.com",
  "role": "admin",
  "name": "Admin",
  "iat": 1700000000,
  "exp": 1700604800
}
```

### Configuracao

| Parametro | Valor | Variavel |
|-----------|-------|----------|
| Algoritmo | HS256 | - |
| Expiracao | 7 dias | `JWT_EXPIRES_IN` |
| Secret | Min 32 chars | `JWT_SECRET` |

## Roles e Permissoes (RBAC)

### Hierarquia de Roles

```
superadmin / owner
      │
    admin ─────── Acesso total
      │
    editor ────── Admin sem gestao de usuarios/licencas/pagamentos
      │
    user ──────── Compra de apps e conta pessoal
      │
    viewer ────── Somente visualizacao
```

### Matriz de Permissoes

| Recurso | admin | editor | user | viewer |
|---------|:-----:|:------:|:----:|:------:|
| Dashboard | X | X | | |
| Usuarios | X | | | |
| Projetos | X | X | | |
| Apps (CRUD) | X | X | | |
| Apps (compra) | X | X | X | X |
| Crafters | X | X | | |
| Equipes | X | X | | |
| Mentores | X | X | | |
| Ranking | X | X | | |
| Desafios | X | X | | |
| Inscricoes | X | X | | |
| Ideias | X | X | | |
| Propostas | X | X | | |
| Financas | X | X | | |
| Licencas | X | | | |
| Pagamentos | X | | | |
| NFS-e | X | | | |
| Config | X | X | | |
| Minha Conta | X | X | X | X |

### Implementacao no Backend

```typescript
// Middleware de autenticacao
router.get('/api/protected', authenticate, controller.action);

// Middleware de autorizacao por role
router.get('/api/admin', authenticate, authorize(['admin']), controller.action);

// Shortcut para admin
router.delete('/api/item/:id', authenticate, authorizeAdmin, controller.delete);
```

### Implementacao no Frontend

```jsx
// ProtectedRoute.jsx - Protecao de rota
<ProtectedRoute allowedRoles={['admin', 'editor']}>
  <AdminLayout />
</ProtectedRoute>

// Hook useAuth - Verificacao de role
const { hasRole } = useAuth();
if (hasRole(['admin'])) {
  // mostrar opcoes de admin
}
```

## Recuperacao de Senha

### Fluxo Completo

```
1. Usuario acessa /forgot-password
2. Informa email
3. Frontend: POST /api/auth/password-reset/request { email }
4. Backend:
   - Gera token aleatorio (32 bytes hex)
   - Salva SHA256(token) no DB com expiracao 1h
   - Envia email com link: /reset-password?token=<token>
   - Retorna sucesso (mesmo se email nao existe - seguranca)
5. Usuario clica no link do email
6. Acessa /reset-password com token na URL
7. Informa nova senha
8. Frontend: POST /api/auth/password-reset/confirm { token, password }
9. Backend:
   - Calcula SHA256(token)
   - Busca no DB
   - Verifica: nao expirado e nao usado
   - Hash da nova senha com bcrypt
   - Atualiza senha do usuario (transacao)
   - Marca token como usado
   - Retorna sucesso
```

## Usuario Convidado (Guest)

O sistema permite compras sem registro:

```
1. Comprador informa email na pagina de compra
2. Backend cria User com isGuest=true e senha aleatoria
3. Pagamento e licencas vinculados ao guest
4. Se depois registrar com mesmo email:
   - Backend detecta user guest existente
   - Converte isGuest=false
   - Define senha informada
   - Todas as compras anteriores ja estao vinculadas
5. Se logar com email existente de guest:
   - Merge automatico das compras
```

## Armazenamento no Frontend

### localStorage

```javascript
// Chave: 'cc_session'
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### sessionStorage

```javascript
// Chave: 'cc_user_cache'
{
  "id": 1,
  "name": "Admin",
  "email": "admin@codecraft.com",
  "role": "admin"
}
```

## Seguranca

| Medida | Implementacao |
|--------|---------------|
| Senha | bcrypt com 10 salt rounds |
| Token | JWT com secret minimo de 32 chars |
| Cookie | httpOnly, secure (prod), sameSite: lax |
| Rate Limit | 10 requests/15min em rotas de auth |
| Reset Senha | Token de uso unico, expira em 1h |
| Token Hash | SHA256 no DB (nao armazena token raw) |
| CORS | Origens permitidas configuradas |
