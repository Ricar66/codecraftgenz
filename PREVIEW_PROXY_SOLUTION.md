# Solução para Proxy da API no Modo Preview

## Problema Identificado

Durante o desenvolvimento, foi identificado que o modo preview do Vite (`npm run preview`) não incluía o proxy da API configurado no modo de desenvolvimento. Isso causava falhas nas requisições para `/api/*` quando a aplicação era executada em modo preview (após build).

## Soluções Implementadas

### 1. Configuração de Preview com Proxy (Solução Principal)

**Arquivo:** `vite.preview.config.js`

Criamos uma configuração específica para o modo preview que inclui o proxy da API:

```javascript
import { defineConfig } from 'vite'

// Configuração específica para preview com proxy
export default defineConfig({
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

**Atualização no package.json:**
```json
{
  "scripts": {
    "preview": "vite preview --config vite.preview.config.js",
    "preview:custom": "node preview-server.js",
    "preview:vite": "vite preview"
  }
}
```

### 2. Servidor de Preview Personalizado (Solução Alternativa)

**Arquivo:** `preview-server.js`

Criamos um servidor Express personalizado como alternativa, que serve os arquivos estáticos do build e inclui proxy para a API:

```javascript
// Principais características:
// - Usa express + http-proxy-middleware
// - Proxy para /api -> http://localhost:8080
// - Serve arquivos estáticos do diretório dist/
// - Fallback para SPA (Single Page Application)
```

### 3. Configuração de API Centralizada

**Arquivo:** `src/lib/apiConfig.js`

Criamos um módulo para centralizar a configuração da API e melhorar o tratamento de erros:

```javascript
// Principais funcionalidades:
// - Detecção automática do ambiente (dev/prod)
// - Função apiRequest() com tratamento de erro melhorado
// - Hook useApiHealth() para verificar status da API
// - Configuração via variáveis de ambiente
```

### 4. Configuração de Ambiente

**Arquivo:** `.env.production`

Adicionamos configuração para a URL da API em produção:

```
VITE_API_URL=http://localhost:8080
```

## Como Usar

### Modo Preview (Recomendado)
```bash
npm run build
npm run preview
```

### Servidor Personalizado (Alternativo)
```bash
npm run build
npm run preview:custom
```

### Modo Desenvolvimento
```bash
npm run dev
```

## Verificação da Solução

Para verificar se o proxy está funcionando:

```bash
# Teste direto da API
curl http://localhost:4173/api/desafios

# Ou usando PowerShell
Invoke-WebRequest -Uri "http://localhost:4173/api/desafios" -Method GET
```

## Dependências Adicionadas

- `http-proxy-middleware@^3.0.0` - Para o servidor personalizado

## Benefícios

1. **Consistência**: O comportamento entre desenvolvimento e preview agora é consistente
2. **Flexibilidade**: Múltiplas opções de servidor de preview
3. **Manutenibilidade**: Configuração centralizada da API
4. **Robustez**: Melhor tratamento de erros de rede

## Notas Importantes

- O servidor da API deve estar rodando na porta 8080 para que o proxy funcione
- A configuração padrão do preview agora usa a configuração personalizada
- O servidor personalizado está disponível como alternativa via `npm run preview:custom`
- As variáveis de ambiente podem ser ajustadas conforme o ambiente de deploy