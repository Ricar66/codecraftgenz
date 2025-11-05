# Esquema do Banco de Dados (Parte 1)

Conteúdo enviado pelo usuário para referência e consulta futura nas integrações do projeto. Esta é a primeira etapa; aguardando a segunda parte para complementar.

## SQL recebido

```sql
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'dbo') 
BEGIN 
  EXEC('CREATE SCHEMA dbo'); 
END 
GO 

-- Usuários (mínimo necessário para owner de apps e auditorias) 
IF OBJECT_ID('dbo.users', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.users ( 
    id           INT IDENTITY(1,1) PRIMARY KEY, 
    name         NVARCHAR(120) NOT NULL, 
    email        NVARCHAR(255) NOT NULL UNIQUE, 
    avatar_url   NVARCHAR(512) NULL, 
    created_at   DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    updated_at   DATETIME2(0) NULL 
  ); 
END 
GO 

-- Mentores 
IF OBJECT_ID('dbo.mentores', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.mentores ( 
    id           INT IDENTITY(1,1) PRIMARY KEY, 
    nome         NVARCHAR(120) NOT NULL, 
    email        NVARCHAR(255) NOT NULL UNIQUE, 
    telefone     NVARCHAR(40) NULL, 
    bio          NVARCHAR(MAX) NULL, 
    visible      BIT NOT NULL DEFAULT 1, 
    avatar_url   NVARCHAR(512) NULL, 
    created_at   DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    updated_at   DATETIME2(0) NULL 
  ); 
END 
GO 

-- Auditoria básica de mentores (opcional, para revertHistory etc.) 
IF OBJECT_ID('dbo.mentores_history', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.mentores_history ( 
    id           INT IDENTITY(1,1) PRIMARY KEY, 
    mentor_id    INT NOT NULL, 
    action       NVARCHAR(100) NOT NULL,  -- ex: 'upsert','delete','toggle_visible','bulk_status' 
    payload      NVARCHAR(MAX) NULL, 
    actor_id     INT NULL,                -- usuário que fez a ação 
    created_at   DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_mentores_history_mentor FOREIGN KEY (mentor_id) REFERENCES dbo.mentores(id) ON DELETE CASCADE, 
    CONSTRAINT fk_mentores_history_actor FOREIGN KEY (actor_id) REFERENCES dbo.users(id) 
  ); 
END 
GO 

-- Crafters 
IF OBJECT_ID('dbo.crafters', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.crafters ( 
    id           INT IDENTITY(1,1) PRIMARY KEY, 
    nome         NVARCHAR(120) NOT NULL,          -- usado em AdminEquipes/AdminInscricoes 
    email        NVARCHAR(255) NULL UNIQUE,       -- opcional 
    avatar_url   NVARCHAR(512) NULL, 
    pontos       INT NOT NULL DEFAULT 0,          -- mapeado para 'points' no ranking 
    nivel        NVARCHAR(50) NULL,               -- 'Starter','Intermediário','Avançado' etc. 
    ativo        BIT NOT NULL DEFAULT 1, 
    created_at   DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    updated_at   DATETIME2(0) NULL 
  ); 
END 
GO 

-- Projetos 
IF OBJECT_ID('dbo.projetos', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.projetos ( 
    id            INT IDENTITY(1,1) PRIMARY KEY, 
    titulo        NVARCHAR(200) NULL,             -- alguns serviços usam 'titulo' 
    nome          NVARCHAR(200) NULL,             -- server.js usa 'nome' 
    descricao     NVARCHAR(MAX) NOT NULL, 
    status        NVARCHAR(50) NOT NULL DEFAULT 'desenvolvimento', -- 'ativo','desenvolvimento','pausado' etc. 
    tecnologias   NVARCHAR(MAX) NULL,             -- JSON ou CSV de tecnologias 
    data_inicio   DATETIME2(0) NULL, 
    thumb_url     NVARCHAR(512) NULL, 
    mentor_id     INT NULL,                       -- associação direta opcional 
    created_at    DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    updated_at    DATETIME2(0) NULL, 
    CONSTRAINT fk_projetos_mentor FOREIGN KEY (mentor_id) REFERENCES dbo.mentores(id) 
  ); 
END 
GO 

-- Associação Mentores<->Projetos (para múltiplos por projeto, se necessário) 
IF OBJECT_ID('dbo.projetos_mentores', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.projetos_mentores ( 
    id            INT IDENTITY(1,1) PRIMARY KEY, 
    projeto_id    INT NOT NULL, 
    mentor_id     INT NOT NULL, 
    associated_at DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_proj_ment_projeto FOREIGN KEY (projeto_id) REFERENCES dbo.projetos(id) ON DELETE CASCADE, 
    CONSTRAINT fk_proj_ment_mentor  FOREIGN KEY (mentor_id)  REFERENCES dbo.mentores(id) ON DELETE CASCADE, 
    CONSTRAINT uq_proj_mentor UNIQUE (projeto_id, mentor_id) 
  ); 
END 
GO 

-- Equipes (mentor + crafter + projeto) 
IF OBJECT_ID('dbo.equipes', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.equipes ( 
    id               INT IDENTITY(1,1) PRIMARY KEY, 
    projeto_id       INT NOT NULL, 
    mentor_id        INT NOT NULL, 
    crafter_id       INT NOT NULL, 
    status_inscricao NVARCHAR(50) NOT NULL DEFAULT 'inscrito', 
    created_at       DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_equipes_projeto FOREIGN KEY (projeto_id) REFERENCES dbo.projetos(id) ON DELETE CASCADE, 
    CONSTRAINT fk_equipes_mentor  FOREIGN KEY (mentor_id)  REFERENCES dbo.mentores(id) ON DELETE CASCADE, 
    CONSTRAINT fk_equipes_crafter FOREIGN KEY (crafter_id) REFERENCES dbo.crafters(id) ON DELETE CASCADE, 
    CONSTRAINT uq_equipe_triplet UNIQUE (projeto_id, mentor_id, crafter_id) 
  ); 
END 
GO 

-- Inscrições (Quero ser um Crafter) 
IF OBJECT_ID('dbo.inscricoes', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.inscricoes ( 
    id             INT IDENTITY(1,1) PRIMARY KEY, 
    nome           NVARCHAR(120) NOT NULL, 
    email          NVARCHAR(255) NOT NULL, 
    cidade         NVARCHAR(120) NULL, 
    estado         NVARCHAR(80)  NULL, 
    area_interesse NVARCHAR(80)  NULL, 
    data_inscricao DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    status         NVARCHAR(50) NOT NULL DEFAULT 'pendente', -- pendente, contato_realizado, confirmado, rejeitado 
    telefone       NVARCHAR(40) NULL, 
    observacoes    NVARCHAR(MAX) NULL 
  ); 
END 
GO
```

## Notas iniciais
- Tabelas incluídas nesta parte: `users`, `mentores`, `mentores_history`, `crafters`, `projetos`, `projetos_mentores`, `equipes`, `inscricoes`.
- `dbo.projetos.status` tem default `'desenvolvimento'` e `tecnologias` aceita JSON/CSV.
- Chaves estrangeiras configuradas para integridade (algumas com `ON DELETE CASCADE`).

Quando você enviar a segunda etapa, adiciono aqui em sequência e crio um índice por tabela com mapeamento para os serviços do frontend/backend.

---

## SQL recebido (Parte 2)

```sql
-- Ideias 
IF OBJECT_ID('dbo.ideias', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.ideias ( 
    id            INT IDENTITY(1,1) PRIMARY KEY, 
    titulo        NVARCHAR(200) NOT NULL, 
    descricao     NVARCHAR(MAX) NOT NULL, 
    autor         NVARCHAR(120) NOT NULL, 
    data_criacao  DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    votos         INT NOT NULL DEFAULT 0 
  ); 
END 
GO 

-- Comentários das Ideias 
IF OBJECT_ID('dbo.ideias_comentarios', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.ideias_comentarios ( 
    id         INT IDENTITY(1,1) PRIMARY KEY, 
    ideia_id   INT NOT NULL, 
    autor      NVARCHAR(120) NOT NULL, 
    texto      NVARCHAR(MAX) NOT NULL, 
    data       DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_comentarios_ideia FOREIGN KEY (ideia_id) REFERENCES dbo.ideias(id) ON DELETE CASCADE 
  ); 
END 
GO 

-- Ranking: Top 3 
IF OBJECT_ID('dbo.ranking_top3', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.ranking_top3 ( 
    id          INT IDENTITY(1,1) PRIMARY KEY, 
    crafter_id  INT NOT NULL, 
    position    TINYINT NOT NULL,          -- 1, 2, 3 
    reward      NVARCHAR(200) NULL, 
    created_at  DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_rank_top3_crafter FOREIGN KEY (crafter_id) REFERENCES dbo.crafters(id) ON DELETE CASCADE, 
    CONSTRAINT uq_rank_position UNIQUE (position) 
  ); 
END 
GO 

-- Ranking: Filtros globais 
IF OBJECT_ID('dbo.ranking_filters', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.ranking_filters ( 
    id               INT IDENTITY(1,1) PRIMARY KEY, 
    active_only      BIT NOT NULL DEFAULT 0, 
    order_by         NVARCHAR(100) NULL, 
    order_direction  NVARCHAR(10)  NULL,  -- 'asc'/'desc' 
    updated_at       DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME() 
  ); 
  INSERT INTO dbo.ranking_filters (active_only, order_by, order_direction) VALUES (0, 'pontos', 'desc'); 
END 
GO 

-- Ranking: Auditoria 
IF OBJECT_ID('dbo.ranking_audit', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.ranking_audit ( 
    id         INT IDENTITY(1,1) PRIMARY KEY, 
    action     NVARCHAR(100) NOT NULL,     -- ex: 'update_points','update_top3','update_filters' 
    payload    NVARCHAR(MAX) NULL, 
    actor_id   INT NULL, 
    created_at DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_rank_audit_actor FOREIGN KEY (actor_id) REFERENCES dbo.users(id) 
  ); 
END 
GO 

-- Apps 
IF OBJECT_ID('dbo.apps', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.apps ( 
    id             INT NOT NULL PRIMARY KEY,  -- usa ID de projeto quando vem de /from-project 
    owner_id       INT NULL, 
    name           NVARCHAR(120) NOT NULL, 
    main_feature   NVARCHAR(400) NULL, 
    description    NVARCHAR(MAX) NULL, 
    status         NVARCHAR(50) NOT NULL DEFAULT 'finalizado', 
    price          DECIMAL(10,2) NOT NULL DEFAULT 0, 
    thumbnail      NVARCHAR(512) NULL, 
    executable_url NVARCHAR(512) NULL, 
    created_at     DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_apps_owner FOREIGN KEY (owner_id) REFERENCES dbo.users(id) 
  ); 
END 
GO
```

## Notas (Parte 2)
- `ideias` e `ideias_comentarios` com relação 1:N e `ON DELETE CASCADE` para comentários.
- Ranking dividido em: `ranking_top3` (posições únicas 1–3), `ranking_filters` (configuração global com default inserido), e `ranking_audit` (auditoria de ações).
- `apps` referenciam `users` via `owner_id`; `id` pode reutilizar o ID de projeto quando derivado.

---

## SQL recebido (Parte 3)

```sql
-- Apps: Feedbacks 
IF OBJECT_ID('dbo.app_feedbacks', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.app_feedbacks ( 
    id         INT IDENTITY(1,1) PRIMARY KEY, 
    app_id     INT NOT NULL, 
    user_id    INT NULL, 
    rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5), 
    comment    NVARCHAR(MAX) NULL, 
    date       DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_app_fb_app   FOREIGN KEY (app_id)  REFERENCES dbo.apps(id)   ON DELETE CASCADE, 
    CONSTRAINT fk_app_fb_user  FOREIGN KEY (user_id) REFERENCES dbo.users(id) 
  ); 
END 
GO 

-- Apps: Histórico (compras/downloads) 
IF OBJECT_ID('dbo.app_history', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.app_history ( 
    id        INT IDENTITY(1,1) PRIMARY KEY, 
    type      NVARCHAR(30) NOT NULL,         -- 'purchase' | 'download' 
    app_id    INT NOT NULL, 
    app_name  NVARCHAR(200) NULL, 
    status    NVARCHAR(30) NOT NULL,         -- 'pending' | 'approved' | 'done' | etc. 
    date      DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_app_hist_app FOREIGN KEY (app_id) REFERENCES dbo.apps(id) ON DELETE CASCADE 
  ); 
END 
GO 

-- Apps: Pagamentos (Mercado Pago) 
IF OBJECT_ID('dbo.app_payments', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.app_payments ( 
    payment_id NVARCHAR(64) NOT NULL PRIMARY KEY, 
    app_id     INT NOT NULL, 
    user_id    INT NULL, 
    status     NVARCHAR(30) NOT NULL,        -- 'pending','approved', etc. 
    created_at DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    CONSTRAINT fk_app_pay_app  FOREIGN KEY (app_id)  REFERENCES dbo.apps(id)   ON DELETE CASCADE, 
    CONSTRAINT fk_app_pay_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) 
  ); 
END 
GO 

-- Feedbacks gerais (site) 
IF OBJECT_ID('dbo.site_feedbacks', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.site_feedbacks ( 
    id         INT IDENTITY(1,1) PRIMARY KEY, 
    nome       NVARCHAR(120) NOT NULL, 
    email      NVARCHAR(255) NOT NULL, 
    feedback   NVARCHAR(MAX) NOT NULL, 
    rating     INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5), 
    created_at DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME() 
  ); 
END 
GO 

-- Desafios (AdminLayout -> useDesafios) 
IF OBJECT_ID('dbo.desafios', 'U') IS NULL 
BEGIN 
  CREATE TABLE dbo.desafios ( 
    id            INT IDENTITY(1,1) PRIMARY KEY, 
    name          NVARCHAR(200) NOT NULL, 
    objective     NVARCHAR(400) NULL, 
    description   NVARCHAR(MAX) NULL, 
    deadline      DATETIME2(0) NULL, 
    difficulty    NVARCHAR(30) NOT NULL DEFAULT 'starter', 
    tags          NVARCHAR(MAX) NULL,           -- JSON ou CSV 
    reward        NVARCHAR(200) NULL, 
    base_points   INT NOT NULL DEFAULT 0, 
    delivery_type NVARCHAR(30) NOT NULL DEFAULT 'link', 
    thumb_url     NVARCHAR(512) NULL, 
    status        NVARCHAR(30) NOT NULL DEFAULT 'draft', 
    visible       BIT NOT NULL DEFAULT 1, 
    created_at    DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), 
    updated_at    DATETIME2(0) NULL 
  ); 
END 
GO 

-- Índices úteis 
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_crafters_nome' AND object_id = OBJECT_ID('dbo.crafters')) 
BEGIN 
  CREATE INDEX ix_crafters_nome ON dbo.crafters (nome); 
END 

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_mentores_nome' AND object_id = OBJECT_ID('dbo.mentores')) 
BEGIN 
  CREATE INDEX ix_mentores_nome ON dbo.mentores (nome); 
END 

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_projetos_status' AND object_id = OBJECT_ID('dbo.projetos')) 
BEGIN 
  CREATE INDEX ix_projetos_status ON dbo.projetos (status); 
END 

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_equipes_status' AND object_id = OBJECT_ID('dbo.equipes')) 
BEGIN 
  CREATE INDEX ix_equipes_status ON dbo.equipes (status_inscricao); 
END 
GO
```

## Notas (Parte 3)
- `app_feedbacks`: vínculo com `apps` (cascade) e `users` (opcional), `rating` validado 1–5.
- `app_history`: log de compras/downloads com `status`; cascade ao remover app.
- `app_payments`: pagamentos (Mercado Pago) com `payment_id` como PK; cascade ao remover app.
- `site_feedbacks`: feedbacks gerais do site com `rating` default 5 e validação 1–5.
- `desafios`: campos para uso em Admin/`useDesafios` (status default `draft`, `tags` JSON/CSV, visibilidade).
- Índices criados para melhorar consultas por `nome`, `status` e `status_inscricao`.