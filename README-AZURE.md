# Configuração do Azure SQL Database

## Status Atual

✅ **Servidor funcionando** na porta 8080  
❌ **Erro de autenticação** no banco de dados Azure SQL

## Problema Identificado

O erro `Login failed for user 'CloudSA12565d7a'` indica um problema de autenticação com o Azure SQL Database.

## Possíveis Causas e Soluções

### 1. Credenciais Incorretas

- Verifique se o usuário `CloudSA12565d7a` e a senha `Dedecdmm1902_66` estão corretos
- Confirme no portal do Azure se essas credenciais são válidas

### 2. Firewall do Azure SQL

- Acesse o portal do Azure
- Vá para seu SQL Server `codecraftgenz`
- Em "Security" → "Networking"
- Adicione seu IP atual às regras de firewall
- Ou temporariamente habilite "Allow Azure services and resources to access this server"

### 3. Configuração de Conexão

As configurações atuais no `.env`:

```env
DB_SERVER=codecraftgenz.database.windows.net
DB_DATABASE=codecraftgenz
DB_USER=CloudSA12565d7a
DB_PASSWORD=Dedecdmm1902_66
```

### 4. Teste de Conectividade

Para testar a conexão, você pode:

1. **Via SQL Server Management Studio (SSMS)**:
   - Server: `codecraftgenz.database.windows.net`
   - Authentication: SQL Server Authentication
   - Login: `CloudSA12565d7a`
   - Password: `Dedecdmm1902_66`

2. **Via Azure Data Studio**:
   - Connection type: Microsoft SQL Server
   - Server: `codecraftgenz.database.windows.net`
   - Authentication type: SQL Login
   - User name: `CloudSA12565d7a`
   - Password: `Dedecdmm1902_66`

### 5. Próximos Passos

1. Verificar credenciais no portal do Azure
2. Configurar regras de firewall
3. Testar conexão com ferramenta externa
4. Atualizar `.env` com credenciais corretas se necessário
5. Reiniciar o servidor

## Aplicação Web

A aplicação está funcionando normalmente em [http://localhost:8080](http://localhost:8080), apenas sem acesso ao banco de dados.
