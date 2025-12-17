# Configuração e Migração do Ambiente

Este guia cobre como configurar o projeto em uma nova máquina ou ambiente de desenvolvimento.

## Pré-requisitos
- **Node.js**: Versão 18 ou superior.
- **Git**: Para clonar o repositório.
- **Acesso ao Banco de Dados**: Credenciais para o Azure SQL Server.

## 🚀 Passo a Passo para Migrar/Configurar em Outra Máquina

### 1. Clonar o Repositório
Baixe o código para a nova máquina:
```bash
git clone https://github.com/Ricar66/codecraftgenz.git
cd codecraftgenz
```

### 2. Instalar Dependências
Instale todas as bibliotecas listadas no `package.json`:
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente (CRÍTICO)
O arquivo `.env` **não** é baixado pelo Git por segurança. Você precisa criá-lo manualmente na raiz do projeto.
Crie um arquivo chamado `.env` e preencha com as credenciais (peça ao administrador ou copie da máquina antiga):

```ini
# Exemplo de .env (não use valores reais aqui)
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173

# Segurança
JWT_SECRET=seu_segredo_super_secreto_aqui

# Banco de Dados (Azure SQL)
DB_SERVER=codecraft-sql.database.windows.net
DB_DATABASE=codecraft_db
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=seu_token
MERCADO_PAGO_PUBLIC_KEY=sua_chave_publica
```

### 4. Executar o Projeto

**Modo Desenvolvimento (com Hot Reload):**
Abra dois terminais:
1. Terminal 1 (Frontend): `npm run dev`
2. Terminal 2 (Backend): `npm start` (ou `node server.js`)

**Modo Produção:**
```bash
npm run build
npm start
```

## Estrutura Importante
- `server.js`: Backend principal (API).
- `src/`: Frontend React.
- `.env`: Arquivo de configuração (segredos).
- `public/downloads`: Pasta onde ficam os executáveis (.exe) para download.

## Solução de Problemas Comuns

- **Erro de Conexão com Banco:** Verifique se o IP da nova máquina está liberado no Firewall do Azure SQL.
- **Erro de Dependências:** Tente rodar `npm install` novamente ou apague a pasta `node_modules` e instale de novo.
- **Imagens/Arquivos faltando:** Verifique se a pasta `public/downloads` contém os executáveis necessários (eles não costumam ir para o Git se forem muito grandes, mas neste projeto alguns estão versionados).
