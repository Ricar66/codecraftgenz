# 🗄️ Sistema de Migrations com Prisma

Este projeto agora utiliza **Prisma** como ORM e sistema de migrations para gerenciar o banco de dados Azure SQL de forma profissional e automatizada.

## 📋 Visão Geral

### O que são Migrations?

Migrations são arquivos que descrevem mudanças na estrutura do banco de dados de forma versionada e controlada. Em vez de executar comandos SQL manualmente, você:

1. **Descreve** as mudanças no arquivo `schema.prisma`
2. **Gera** uma migration com `npx prisma migrate dev`
3. **Aplica** automaticamente no banco de dados

### Vantagens das Migrations

- ✅ **Versionamento**: Cada mudança é rastreada e versionada
- ✅ **Colaboração**: Toda equipe aplica as mesmas mudanças
- ✅ **Rollback**: Possibilidade de reverter mudanças
- ✅ **Automação**: Deploy automático em produção
- ✅ **Consistência**: Mesmo esquema em dev, staging e produção

## 🚀 Comandos Disponíveis

### Scripts NPM Configurados

```bash
# Gerar cliente Prisma após mudanças no schema
npm run db:generate

# Criar e aplicar nova migration
npm run db:migrate

# Aplicar migrations em produção (sem prompt)
npm run db:deploy

# Resetar banco e aplicar todas migrations
npm run db:reset

# Abrir Prisma Studio (interface visual)
npm run db:studio

# Popular banco com dados de exemplo
npm run db:seed
```

### Comandos Prisma Diretos

```bash
# Criar nova migration
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations pendentes
npx prisma migrate deploy

# Gerar cliente após mudanças
npx prisma generate

# Visualizar banco de dados
npx prisma studio

# Resetar banco completamente
npx prisma migrate reset
```

## 📁 Estrutura de Arquivos

```
prisma/
├── schema.prisma          # Definição dos modelos e configuração
├── migrations/            # Pasta com todas as migrations
│   └── 20250127000000_init/
│       └── migration.sql  # SQL gerado automaticamente
├── seed.js               # Dados iniciais para popular o banco
└── prisma.config.ts      # Configuração do Prisma

src/
├── lib/
│   └── prisma.js         # Cliente Prisma configurado
└── services/
    └── prismaAPI.js      # APIs usando Prisma
```

## 🔧 Como Usar

### 1. Modificar o Schema

Edite o arquivo `prisma/schema.prisma` para adicionar/modificar tabelas:

```prisma
model Project {
  id          String   @id @default(cuid())
  title       String   @db.NVarChar(255)
  description String?  @db.NText
  status      String   @default("pending")
  // ... outros campos
}
```

### 2. Criar Migration

```bash
npm run db:migrate
# ou
npx prisma migrate dev --name add_new_field
```

### 3. Aplicar em Produção

```bash
npm run db:deploy
# ou
npx prisma migrate deploy
```

## 🏗️ Modelos Atuais

### Projects
- `id`: Identificador único
- `title`: Título do projeto
- `description`: Descrição detalhada
- `status`: Status (pending, in_progress, completed)
- `progress`: Progresso (0-100)
- `imageUrl`: URL da imagem
- `demoUrl`: URL da demonstração
- `githubUrl`: URL do repositório
- `technologies`: Array de tecnologias (JSON)
- `createdAt`: Data de criação
- `updatedAt`: Data de atualização

### Feedbacks
- `id`: Identificador único
- `name`: Nome do usuário
- `email`: Email (opcional)
- `rating`: Avaliação (1-5)
- `message`: Mensagem do feedback
- `type`: Tipo (general, technical, design)
- `isPublic`: Se é público ou privado
- `createdAt`: Data de criação
- `updatedAt`: Data de atualização

## 🔄 Fluxo de Trabalho

### Desenvolvimento Local

1. **Modificar Schema**: Edite `prisma/schema.prisma`
2. **Criar Migration**: `npm run db:migrate`
3. **Testar**: Verifique se tudo funciona
4. **Commit**: Versione as mudanças

### Deploy em Produção

1. **Pull**: Baixe as últimas mudanças
2. **Deploy**: `npm run db:deploy`
3. **Verificar**: Confirme que aplicou corretamente

## 🛠️ Configuração

### Variáveis de Ambiente

```env
# URL de conexão para Prisma
DATABASE_URL="sqlserver://servidor:1433;database=nome;user=usuario;password=senha;encrypt=true;trustServerCertificate=false;connectionTimeout=30;"
```

### Cliente Prisma

O cliente está configurado em `src/lib/prisma.js` e pode ser usado em qualquer lugar:

```javascript
import prisma from '../lib/prisma.js';

// Buscar projetos
const projects = await prisma.project.findMany();

// Criar projeto
const newProject = await prisma.project.create({
  data: { title: 'Novo Projeto', status: 'pending' }
});
```

## 🔍 Prisma Studio

Para visualizar e editar dados graficamente:

```bash
npm run db:studio
```

Abre uma interface web em `http://localhost:5555`

## 🌱 Dados Iniciais (Seed)

Para popular o banco com dados de exemplo:

```bash
npm run db:seed
```

Isso criará projetos e feedbacks de exemplo baseados no arquivo `prisma/seed.js`.

## ⚠️ Importante

### Backup
- Sempre faça backup antes de migrations em produção
- Teste migrations em ambiente de staging primeiro

### Colaboração
- Nunca edite migrations já aplicadas
- Sempre crie novas migrations para mudanças
- Commit migrations junto com código

### Produção
- Use `migrate deploy` em produção (não `migrate dev`)
- Configure CI/CD para aplicar migrations automaticamente
- Monitore logs durante deploy

## 🆘 Troubleshooting

### Erro de Conexão
```bash
# Verificar se DATABASE_URL está correta
echo $DATABASE_URL

# Testar conexão
npx prisma db pull
```

### Migration Falhou
```bash
# Ver status das migrations
npx prisma migrate status

# Marcar migration como aplicada (cuidado!)
npx prisma migrate resolve --applied "20250127000000_init"
```

### Reset Completo
```bash
# CUIDADO: Remove todos os dados!
npm run db:reset
```

## 📚 Recursos Adicionais

- [Documentação Prisma](https://www.prisma.io/docs)
- [Prisma com SQL Server](https://www.prisma.io/docs/concepts/database-connectors/sql-server)
- [Migrations Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Studio](https://www.prisma.io/studio)

---

**🎉 Parabéns!** Agora você tem um sistema de migrations profissional configurado. Suas mudanças no banco de dados são versionadas, rastreáveis e aplicáveis automaticamente em qualquer ambiente!