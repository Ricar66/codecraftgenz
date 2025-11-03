# Deploy no Azure App Service

## Configurações Necessárias

### 1. Variáveis de Ambiente no Azure Portal

Configure as seguintes variáveis no Azure Portal > App Service > Configuration:

```
DATABASE_URL=postgresql://username:password@server.postgres.database.azure.com:5432/database?sslmode=require
NODE_ENV=production
WEBSITE_NODE_DEFAULT_VERSION=22.17.0
SCM_DO_BUILD_DURING_DEPLOYMENT=true
JWT_SECRET=seu_jwt_secret_aqui
VITE_API_URL=https://seu-app.azurewebsites.net
VITE_APP_ENV=production
```

### 2. Configurações do App Service

- **Runtime Stack**: Node.js 22 LTS
- **Startup Command**: `node server.js`
- **Always On**: Habilitado
- **HTTP Version**: 2.0
- **Minimum TLS Version**: 1.2

### 3. Arquivos de Configuração

- `.deployment`: Comando de build customizado
- `startup.sh`: Script de inicialização (opcional)
- `package.json`: Scripts otimizados para Azure

### 4. Processo de Deploy

1. **Build automático**: O Azure executará `npm ci --production=false && npx prisma generate && npm run build`
2. **Geração do Prisma Client**: Executado automaticamente no `postinstall`
3. **Inicialização**: O servidor inicia com `node server.js`

### 5. Troubleshooting

#### Erro "prisma: Permission denied"
- ✅ **Resolvido**: Removido `npx prisma db push` do script `start`
- ✅ **Solução**: Prisma Client é gerado durante o build, não na inicialização

#### Erro de módulos não encontrados
- Verificar se todas as dependências estão no `package.json`
- Verificar se o `postinstall` está executando `npx prisma generate`

#### Erro de conexão com banco
- Verificar se `DATABASE_URL` está configurada corretamente
- Verificar se o banco PostgreSQL do Azure está acessível
- Verificar se as credenciais estão corretas

### 6. Monitoramento

- **Logs**: Azure Portal > App Service > Log Stream
- **Métricas**: Azure Portal > App Service > Metrics
- **Application Insights**: Para monitoramento avançado

### 7. Comandos Úteis

```bash
# Deploy via Azure CLI
az webapp deployment source config-zip --resource-group codecraft-rg --name codecraft-app --src deploy.zip

# Verificar logs
az webapp log tail --resource-group codecraft-rg --name codecraft-app

# Reiniciar app
az webapp restart --resource-group codecraft-rg --name codecraft-app
```

## Status Atual

✅ **Configuração otimizada para Azure**
✅ **Scripts de build configurados**
✅ **Prisma Client gerado automaticamente**
✅ **Servidor configurado para produção**
✅ **Tratamento de erros robusto**