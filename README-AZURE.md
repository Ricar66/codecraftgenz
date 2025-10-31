# Azure Web App – OIDC (AADSTS700213), Deploy Node.js e Service Worker

## 1) Corrigir azure/login AADSTS700213 (OIDC)

Erro no GitHub Actions:

```
AADSTS700213: No matching federated identity record found for presented assertion subject 'repo:Ricar66/codecraftgenz:environment:Production'.
```

Isso ocorre quando a credencial federada (OIDC) do Azure não corresponde ao `subject` enviado pelo GitHub.

### Passo a passo no Portal do Azure

1. Identifique o App Registration (client-id)
   - O workflow usa `client-id`, `tenant-id`, `subscription-id` em `azure/login@v2`.
   - No Azure, vá em: Microsoft Entra ID → App registrations → encontre o app cujo `Application (client) ID` corresponde ao secret `client-id` do GitHub.

2. Adicione a Federated Credential
   - No App registration: Certificates & secrets → Federated credentials → Add credential.
   - Template: GitHub Actions.
   - Organization: `Ricar66`.
   - Repository: `codecraftgenz`.
   - Environment: `Production` (para combinar com o subject do workflow).
   - Audience: `api://AzureADTokenExchange`.
   - Subject identifier: `repo:Ricar66/codecraftgenz:environment:Production` (exatamente igual).

3. Conceda RBAC no App Service
   - Portal Azure → App Service `codecraftgenz` → Access control (IAM) → Add role assignment.
   - Role: `Contributor` (ou `Web App Contributor` equivalente).
   - Principal: selecione o mesmo App registration (Service Principal) do `client-id`.

4. Validar
   - Re-execute o workflow no GitHub (`Re-run jobs`).
   - O passo `azure/login@v2` deve autenticar com sucesso.

Observação: Federated credentials são configuradas no App registration (não na Managed Identity). O subject acima inclui `environment:Production` porque o job `deploy` usa `environment: Production` no YAML.

---

## 2) Confirmar Deploy como Node.js

O arquivo `.github/workflows/main_codecraftgenz.yml` está preparado para aplicação Node.js:

- `startup-command: 'npm start'` (App Service Linux) para rodar `server.js` via `npm start`.
- Geração de `web.config` (App Service Windows) para iisnode apontar para `server.js`.
- `package: .` envia o projeto completo.
- `server.js` serve `dist/` e responde `/api/**`.

Checklist:

- `package.json`: `start: "node server.js"`.
- `server.js`: serve estáticos de `dist/` e contém fallback SPA excluindo `/api/**`.
- `vite build`: gera `dist/` com assets e `index.html`.

---

## 3) Service Worker – ignorar `/api/**`

Foi adicionado `vite-plugin-pwa` e configurado para nunca cachear chamadas de API:

No `vite.config.js`:

```js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: { cacheName: 'api-network-only', networkTimeoutSeconds: 15 }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!.*\/api\/).*/]
      }
    })
  ]
})
```

Se você não quiser PWA/Service Worker:

- Não registre SW em `main.jsx` ou `index.html`.
- No navegador: DevTools → Application → Service Workers → Unregister e limpar storage.

---

## 4) Dicas de Troubleshooting

- App Service Linux: use `startup-command: 'npm start'` no deploy.
- App Service Windows: mantenha `web.config` ao lado de `server.js`.
- OIDC: confirme o subject e RBAC do Service Principal.
- SW: confirme que `/api/**` usa `NetworkOnly` e não há cache.
