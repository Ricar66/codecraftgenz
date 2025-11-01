# Configuração do Ambiente de Desenvolvimento

## Pré-requisitos
- Node.js 18 ou superior
- npm ou yarn

## Configuração Inicial

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` conforme necessário para seu ambiente local.

### 3. Inicializar Banco de Dados
O banco SQLite será criado automaticamente na primeira execução:
```bash
npm run db:init
```

### 4. Executar em Desenvolvimento
```bash
npm run dev    # Frontend (Vite)
npm start      # Backend + Frontend (Produção)
```

## Estrutura de Arquivos Importantes

- `.env` - Variáveis de ambiente (não versionado)
- `.env.example` - Template das variáveis de ambiente
- `database.sqlite` - Banco de dados SQLite (não versionado)
- `server.js` - Servidor principal
- `src/` - Código fonte da aplicação

## Comandos Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm start` - Servidor de produção
- `npm test` - Executar testes
- `npm run lint` - Verificar código

## Notas de Segurança

- Nunca commite arquivos `.env*` (exceto `.env.example`)
- Nunca commite arquivos de banco de dados (`*.sqlite`, `*.db`)
- Mantenha suas chaves de API e senhas seguras