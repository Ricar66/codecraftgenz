# Configuração do Azure Database para CodeCraft

## Resumo das Alterações

✅ **SQLite completamente removido do projeto**
- Arquivos de backup SQLite deletados
- Referências SQLite removidas do código
- APIs atualizadas para usar rotas padrão (sem `/sqlite`)

✅ **Prisma configurado para Azure MySQL**
- `schema.prisma` atualizado para usar `env("DATABASE_URL")`
- Dependências do Prisma atualizadas (v6.18.0)

## Configuração do Azure Database

### 1. Criar Azure Database for MySQL

```bash
# Via Azure CLI
az mysql flexible-server create \
  --resource-group codecraftgenz-rg \
  --name codecraftgenz-mysql \
  --admin-user codecraft_admin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --public-access 0.0.0.0 \
  --storage-size 20 \
  --version 8.0.21
```

### 2. Configurar Firewall

```bash
# Permitir acesso do Azure
az mysql flexible-server firewall-rule create \
  --resource-group codecraftgenz-rg \
  --name codecraftgenz-mysql \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Permitir seu IP local (para desenvolvimento)
az mysql flexible-server firewall-rule create \
  --resource-group codecraftgenz-rg \
  --name codecraftgenz-mysql \
  --rule-name AllowMyIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

### 3. Atualizar Variáveis de Ambiente

No arquivo `.env`, substitua pela sua string de conexão real:

```env
DATABASE_URL="mysql://codecraft_admin:YourSecurePassword123!@codecraftgenz-mysql.mysql.database.azure.com:3306/codecraftgenz_db?sslmode=require"
```

### 4. Executar Migrações

```bash
# Gerar e aplicar migrações
npx prisma db push

# Ou se preferir usar migrações
npx prisma migrate dev --name init
```

## Alternativa: PostgreSQL

Se preferir usar PostgreSQL:

```env
DATABASE_URL="postgresql://codecraft_admin:YourSecurePassword123!@codecraftgenz-postgres.postgres.database.azure.com:5432/codecraftgenz_db?sslmode=require"
```

E atualize o `schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Verificação

Para verificar se tudo está funcionando:

```bash
# Testar conexão
npx prisma db pull

# Executar aplicação
npm start
```

## Notas Importantes

1. **Segurança**: Nunca commite senhas reais no repositório
2. **SSL**: Azure Database requer conexões SSL
3. **Firewall**: Configure as regras de firewall adequadamente
4. **Backup**: Configure backups automáticos no Azure
5. **Monitoramento**: Use Azure Monitor para acompanhar performance

## Troubleshooting

### Erro de Conexão SSL
Se houver problemas com SSL, adicione parâmetros específicos:
```
?sslmode=require&sslcert=&sslkey=&sslrootcert=
```

### Timeout de Conexão
Verifique se:
- Firewall está configurado corretamente
- IP está na lista de IPs permitidos
- Servidor não está pausado (para tier Burstable)