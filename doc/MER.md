# MER - Modelo Entidade Relacionamento

Documentação completa do Modelo Entidade Relacionamento (MER) da plataforma CodeCraft Gen-Z com todos os 34 modelos Prisma organizados por domínio.

---

## Legenda

- **PK** = Primary Key (Chave Primária)
- **FK** = Foreign Key (Chave Estrangeira)
- **1:1** = Um para Um
- **1:N** = Um para Muitos
- **N:M** = Muitos para Muitos (implícito via tabela de junção)

---

## Domínio: Autenticação e Usuarios

### User
**Tabela:** `users`  
**Descrição:** Conta de usuário do sistema com suporte a roles e MFA.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| email | String | unique, index | Email (login) |
| name | String | | Nome completo |
| passwordHash | String | | Senha bcrypt |
| role | String | default: "viewer" | admin, editor, user, viewer |
| status | String | default: "ativo" | ativo, inativo |
| mfaEnabled | Boolean | default: false | MFA ativado |
| mfaSecret | String? | | Secret TOTP |
| isGuest | Boolean | default: false | Usuário convidado (compra) |
| onboardingCompleted | Boolean | default: false | Onboarding concluído |
| interestsJson | String? | Text | Area + skills do onboarding |
| createdAt | DateTime | default: now() | Data de criação |
| updatedAt | DateTime | | Última atualização |

**Relações:**
- 1:N → App (criador)
- 1:N → Payment (comprador)
- 1:N → License (proprietário)
- 1:N → Feedback (autor)
- 1:N → ChallengeSubmission (participante)
- 1:N → PasswordReset
- 1:1 → Crafter (perfil) [opcional]
- 1:1 → DiscordLink [opcional]
- 1:N → Meta (autor)
- 1:N → MetaAssignee (atribuído)
- 1:N → MetaObservation (observador)

---

### PasswordReset
**Tabela:** `password_resets`  
**Descrição:** Tokens temporários para recuperação de senha.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| userId | Int | FK → User, cascade | Usuário |
| email | String | | Email associado |
| tokenHash | String | unique | SHA256 do token |
| expiresAt | DateTime | | Expiração (1 hora) |
| usedAt | DateTime? | | Quando foi utilizado |
| createdAt | DateTime | default: now() | Criação |

**Índices:** `@@index([userId])`

---

### DiscordLink
**Tabela:** `discord_links`  
**Descrição:** Vinculação entre usuário da plataforma e conta Discord.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| userId | Int | FK → User, unique, cascade | Usuário da plataforma |
| discordId | String | unique | ID do membro Discord |
| discordUsername | String | | Nome de usuário Discord |
| discordAvatar | String? | Text | URL do avatar |
| accessToken | String? | Text | OAuth access token (AES-256) |
| refreshToken | String? | Text | OAuth refresh token |
| tokenExpiresAt | DateTime? | | Expiração do token OAuth |
| crafterRoleAssigned | Boolean | default: false | Cargo Crafter atribuído |
| linkedAt | DateTime | default: now() | Data de vinculação |
| updatedAt | DateTime | | Última atualização |

**Índices:** `@@index([discordId])`

---

## Domínio: Marketplace de Apps

### App
**Tabela:** `apps`  
**Descrição:** Aplicativos disponíveis no marketplace.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| name | String | | Nome do app |
| description | String? | Text | Descrição longa |
| shortDescription | String? | Text | Descrição curta |
| price | Decimal | default: 0 | Preço em R$ |
| category | String? | | Categoria |
| tags | String? | | Tags (separadas por vírgula) |
| thumbUrl | String? | | URL da thumbnail |
| screenshots | String? | | URLs dos screenshots (JSON) |
| executableUrl | String? | | URL do executável |
| platforms | String? | default: "windows" | Plataformas (JSON) |
| version | String | default: "1.0.0" | Versão atual |
| status | String | default: "draft" | draft, published, archived |
| featured | Boolean | default: false | Destaque na loja |
| licenseType | String | default: "vitalicia" | Tipo de licença |
| downloadCount | Int | default: 0 | Total de downloads |
| creatorId | Int | FK → User, cascade | Criador |
| projectId | Int? | FK → Project, SetNull | Projeto associado |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Relações:**
- N:1 → User (criador)
- 1:N → Payment (compras)
- 1:N → License (licenças)
- 1:N → Feedback (avaliações)
- 1:1 → Project [opcional]

---

### Payment
**Tabela:** `app_payments`  
**Descrição:** Transações de pagamento via Mercado Pago.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | String | PK (UUID) | ID único |
| appId | Int | FK → App, cascade, index | App comprado |
| userId | Int? | FK → User, SetNull | Comprador registrado |
| preferenceId | String? | unique | ID da preferência MP |
| status | String | default: "pending", index | pending, approved, rejected, refunded, cancelled |
| amount | Decimal | | Valor total |
| unitPrice | Decimal? | | Preço unitário por licença |
| quantity | Int | default: 1 | Quantidade (1-10) |
| installments | Int | default: 1 | Parcelas (1-4) |
| currency | String | default: "BRL" | Moeda |
| payerEmail | String? | index | Email do comprador |
| payerName | String? | | Nome do comprador |
| mpResponseJson | String? | | Resposta completa MP |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Índices:** `@@index([appId, status])`, `@@index([payerEmail])`

---

### License
**Tabela:** `user_licenses`  
**Descrição:** Licenças de software ativadas em hardware.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| appId | Int | FK → App, cascade, index | App licenciado |
| userId | Int? | FK → User, SetNull | Proprietário |
| email | String | index | Email do proprietário |
| hardwareId | String? | index | ID do dispositivo |
| licenseKey | String? | unique | Chave única da licença |
| appName | String? | | Nome do app |
| activatedAt | DateTime? | | Data de ativação |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Índices:** `@@index([appId, email])`, `@@index([appId, email, hardwareId])`

---

### LicenseActivation
**Tabela:** `license_activations`  
**Descrição:** Log de auditoria de ativações de licenças.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| appId | Int | index | App ativado |
| email | String? | index | Email do usuário |
| hardwareId | String? | index | ID do dispositivo |
| licenseId | Int? | FK → License, SetNull | Licença ativada |
| action | String | | Tipo de ação |
| status | String | | Resultado da ativação |
| message | String? | | Mensagem de erro/sucesso |
| ip | String? | | IP da requisição |
| userAgent | String? | | User-Agent |
| createdAt | DateTime | default: now() | Data do evento |

**Índices:** `@@index([appId, email])`, `@@index([hardwareId])`

---

### Feedback
**Tabela:** `feedbacks`  
**Descrição:** Avaliações e depoimentos de apps.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| userId | Int? | FK → User, SetNull | Autor (pode ser anônimo) |
| appId | Int? | FK → App, SetNull | App avaliado |
| rating | Int | | Estrelas (1-5) |
| comment | String? | Text | Texto do feedback |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

---

## Domínio: Projetos

### Project
**Tabela:** `projetos`  
**Descrição:** Projetos da empresa gerenciados por mentores.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| nome | String | | Nome do projeto |
| owner | String? | | Proprietário/empresa |
| descricao | String? | Text | Descrição detalhada |
| status | String | default: "ativo" | ativo, finalizado |
| preco | Decimal | default: 0 | Orçamento em R$ |
| progresso | Int | default: 0 | Progresso (0-100%) |
| dataInicio | String? | | Data de início |
| thumbUrl | String? | | Thumbnail do projeto |
| tagsJson | String? | | Tecnologias (JSON) |
| mentorId | Int? | FK → Mentor, SetNull | Mentor responsável |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Relações:**
- N:1 → Mentor [opcional]
- 1:1 → App [opcional]
- 1:N → Inscricao
- 1:N → Finance

---

### Mentor
**Tabela:** `mentores`  
**Descrição:** Mentores do programa de mentoria.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| nome | String | | Nome completo |
| email | String? | | Email de contato |
| telefone | String? | | Telefone |
| bio | String? | Text | Biografia |
| especialidade | String? | | Área de atuação |
| avatarUrl | String? | Text | Foto (suporta Base64) |
| linkedinUrl | String? | | Perfil LinkedIn |
| githubUrl | String? | | Perfil GitHub |
| disponivel | Boolean | default: true | Disponível para mentoria |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Relações:**
- 1:N → Project

---

### Inscricao
**Tabela:** `inscricoes`  
**Descrição:** Inscrições em eventos, programas ou projetos.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| nome | String | | Nome do inscrito |
| email | String | | Email |
| telefone | String? | | Telefone |
| redeSocial | String? | | Rede social |
| cep | String? | | CEP |
| cidade | String? | | Cidade |
| estado | String? | | Estado (UF) |
| areaInteresse | String? | | Área de interesse |
| mensagem | String? | | Mensagem/observações |
| projetoId | Int? | FK → Project, SetNull | Projeto de interesse |
| tipo | String | default: "geral" | geral, mentoria, desafio |
| status | String | default: "pendente" | pendente, aprovado, rejeitado |
| notas | String? | | Notas administrativas |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

---

## Domínio: Gamificação e Ranking

### Crafter
**Tabela:** `crafters`  
**Descrição:** Perfil de desenvolvedor/participante na plataforma.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| nome | String | | Nome do crafter |
| email | String? | | Email |
| bio | String? | Text | Biografia |
| avatarUrl | String? | Text | Avatar (suporta Base64) |
| githubUrl | String? | | Perfil GitHub |
| linkedinUrl | String? | | Perfil LinkedIn |
| skillsJson | String? | Text | Habilidades (JSON array) |
| pontos | Int | default: 0 | Pontuação no ranking |
| active | Boolean | default: true | Ativo na plataforma |
| equipeId | Int? | FK → Equipe, SetNull | Equipe do crafter |
| userId | Int? | FK → User, unique, SetNull | Conta vinculada |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Relações:**
- N:1 → User [opcional]
- N:1 → Equipe [opcional]
- 1:N → RankingTop3

---

### Equipe
**Tabela:** `equipes`  
**Descrição:** Times de trabalho composto por crafters.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| nome | String | | Nome da equipe |
| descricao | String? | Text | Descrição |
| logoUrl | String? | | URL do logo |
| status | String | default: "ativo" | ativo, inativo |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Relações:**
- 1:N → Crafter (membros)

---

### RankingTop3
**Tabela:** `ranking_top3`  
**Descrição:** Ranking destacado dos 3 melhores crafters.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| crafterId | Int | FK → Crafter, cascade | Crafter no top 3 |
| position | Int | | Posição (1, 2 ou 3) |
| createdAt | DateTime | default: now() | Criação |

---

### RankingAudit
**Tabela:** `ranking_audit`  
**Descrição:** Log de alterações de pontuação no ranking.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| action | String | | Tipo de ação (add, remove, reset) |
| crafterId | Int? | | Crafter afetado |
| userId | Int? | | Usuário que fez a ação |
| oldValue | String? | | Valor anterior (JSON) |
| newValue | String? | | Valor novo (JSON) |
| details | String? | | Detalhes da mudança |
| createdAt | DateTime | default: now() | Data da alteração |

---

### RankingSettings
**Tabela:** `ranking_settings`  
**Descrição:** Configurações e filtros do ranking.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| filtersJson | String? | | Filtros ativos (JSON) |
| settingsJson | String? | | Configurações (JSON) |
| updatedAt | DateTime | | Última atualização |

---

## Domínio: Desafios

### Desafio
**Tabela:** `desafios`  
**Descrição:** Desafios de programação com gamificação.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| name | String | | Título do desafio |
| objective | String? | | Objetivo (resumido) |
| description | String? | Text | Descrição completa |
| difficulty | String | default: "medio" | facil, medio, dificil |
| deadline | DateTime? | | Prazo de submissão |
| reward | Decimal? | | Premiação em R$ |
| basePoints | Int | default: 100 | Pontos base |
| tagsJson | String? | | Tags (JSON) |
| deliveryType | String | default: "link" | link, código, arquivo |
| thumbUrl | String? | | Thumbnail/imagem |
| status | String | default: "active" | active, closed, archived |
| visible | Boolean | default: true | Visível para usuários |
| createdBy | Int? | | ID do criador |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Relações:**
- 1:N → ChallengeSubmission (submissões)

---

### ChallengeSubmission
**Tabela:** `challenge_submissions`  
**Descrição:** Submissões de soluções para desafios.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| desafioId | Int | FK → Desafio, cascade | Desafio participado |
| oderId | Int | FK → User, cascade | Participante |
| deliveryUrl | String? | | URL da entrega (link/github) |
| deliveryText | String? | Text | Código/texto da entrega |
| notes | String? | Text | Notas adicionais |
| status | String | default: "subscribed" | subscribed, submitted, approved, rejected |
| score | Int? | | Pontuação (0-100) |
| reviewFeedback | String? | | Feedback do avaliador |
| submittedAt | DateTime? | | Data da submissão |
| reviewedAt | DateTime? | | Data da avaliação |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Constraints:** `@@unique([desafioId, oderId])`

**Relações:**
- N:1 → Desafio
- N:1 → User

---

## Domínio: Financeiro

### Finance
**Tabela:** `financas`  
**Descrição:** Registros de receitas e despesas.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| item | String | | Descrição do item |
| valor | Decimal | | Valor em R$ |
| status | String? | default: "pending" | pending, pago, desconto |
| type | String? | default: "other" | receita, despesa, other |
| projectId | Int? | FK → Project, SetNull | Projeto vinculado |
| progress | Int? | default: 0 | Progresso (%) |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

---

### Invoice (NFS-e)
**Tabela:** `invoices`  
**Descrição:** Notas Fiscais de Serviço Eletrônica emitidas.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | String | PK (UUID) | ID único |
| vendaId | String? | unique | ID da venda |
| paymentId | String? | | ID do pagamento |
| rpsNumero | Int? | | Número do RPS |
| rpsSerie | String? | default: "1" | Série do RPS |
| nfseNumero | String? | | Número da NFS-e |
| codigoVerificacao | String? | | Código de verificação |
| status | String | default: "pending" | pending, submitted, approved, cancelled, error |
| dataEmissao | DateTime | | Data de emissão |
| competencia | DateTime | | Mês de competência |
| prestadorCnpj | String | | CNPJ do prestador |
| prestadorIm | String | | Inscrição Municipal |
| tomadorTipo | String | default: "PJ" | PF, PJ |
| tomadorDocumento | String | | CPF/CNPJ do tomador |
| tomadorRazaoSocial | String? | | Razão social |
| tomadorEmail | String? | | Email do tomador |
| tomadorLogradouro | String? | | Endereço |
| tomadorNumero | String? | | Número |
| tomadorBairro | String? | | Bairro |
| tomadorCodMunicipio | String? | | Código do município |
| tomadorUf | String? | | UF |
| tomadorCep | String? | | CEP |
| descricaoServico | String | Text | Descrição do serviço |
| itemListaServico | String | | Código da lista de serviço |
| codTributacao | String? | | Código de tributação |
| valorServicos | Decimal | | Valor dos serviços |
| aliquotaIss | Decimal? | | Alíquota ISS |
| valorIss | Decimal? | | Valor do ISS |
| issRetido | Boolean | default: false | ISS retido |
| simplesNacional | Boolean | default: true | Regime Simples Nacional |
| incentivoFiscal | Boolean | default: false | Incentivo fiscal |
| naturezaOperacao | Int | default: 1 | Natureza da operação |
| protocolo | String? | | Protocolo da prefeitura |
| xmlEnvio | String? | LongText | XML enviado |
| xmlRetorno | String? | LongText | XML de resposta |
| mensagemErro | String? | Text | Mensagem de erro |
| pdfUrl | String? | | URL do PDF |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Índices:** `@@index([status])`, `@@index([vendaId])`, `@@index([nfseNumero])`, `@@index([prestadorCnpj])`

---

## Domínio: B2B e Leads

### Proposal
**Tabela:** `proposals`  
**Descrição:** Propostas comerciais de empresas (B2B).

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | String | PK (UUID) | ID único |
| companyName | String | | Nome da empresa |
| contactName | String | | Nome do contato |
| email | String | index | Email |
| phone | String? | | Telefone |
| projectType | String | default: "custom" | Tipo de projeto |
| budgetRange | String? | | Faixa de orçamento |
| description | String? | Text | Descrição do projeto |
| status | String | default: "new", index | new, em_analise, aceita, rejeitada |
| notes | String? | Text | Notas internas |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Índices:** `@@index([status])`, `@@index([email])`

---

### Lead
**Tabela:** `leads`  
**Descrição:** Leads unificados capturados de diversas origens.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| nome | String? | | Nome do lead |
| email | String | index | Email |
| telefone | String? | | Telefone |
| origin | String | index | feedback, proposal, registration, challenge, crafter_signup |
| originId | Int? | | ID do registro de origem |
| originRef | String? | | Referência (nome do app, empresa) |
| status | String | default: "new", index | new, contacted, converted, lost |
| metadata | String? | Text | Dados extras (JSON) |
| utmSource | String? | | UTM source |
| utmMedium | String? | | UTM medium |
| utmCampaign | String? | | UTM campaign |
| ip | String? | | IP da requisição |
| userAgent | String? | | User-Agent |
| convertedAt | DateTime? | | Data de conversão |
| createdAt | DateTime | default: now(), index | Criação |
| updatedAt | DateTime | | Atualização |

**Índices:** `@@index([email])`, `@@index([origin])`, `@@index([status])`, `@@index([createdAt])`

---

### Partnership
**Tabela:** `partnerships`  
**Descrição:** Parcerias com empresas e organizações.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | String | PK (UUID) | ID único |
| nomeContato | String | | Nome do contato |
| email | String | index | Email |
| telefone | String? | | Telefone |
| empresa | String | | Nome da empresa |
| cargo | String? | | Cargo do contato |
| site | String? | | Website da empresa |
| tipoParceria | String | default: "tecnologia" | Tipo de parceria |
| mensagem | String? | Text | Mensagem/proposta |
| status | String | default: "novo", index | novo, em_analise, aceita, rejeitada |
| notas | String? | Text | Notas internas |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Índices:** `@@index([status])`, `@@index([email])`

---

## Domínio: Notícias e Conteúdo

### NewsArticle
**Tabela:** `news_articles`  
**Descrição:** Artigos de notícias importados via RSS feeds.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | String | PK (UUID) | ID único |
| title | String | | Título do artigo |
| link | String | unique | URL do artigo |
| source | String | | Fonte da notícia |
| sourceUrl | String? | | URL da fonte RSS |
| summary | String? | Text | Resumo/descrição |
| imageUrl | String? | | URL da imagem |
| category | String | default: "tech", index | tech, business, design, etc |
| publishedAt | DateTime | index | Data de publicação |
| createdAt | DateTime | default: now() | Data de importação |

**Índices:** `@@index([category])`, `@@index([publishedAt])`

---

## Domínio: Sistema e Configuração

### AuditLog
**Tabela:** `audit_logs`  
**Descrição:** Log automático de todas as mutações administrativas.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| userId | Int? | FK, index | Usuário que fez a ação |
| userName | String? | VarChar(256) | Nome do usuário |
| action | String | VarChar(32) | CREATE, UPDATE, DELETE |
| entity | String | VarChar(128), index | Entidade (apps, users, etc) |
| entityId | String? | VarChar(64) | ID da entidade |
| endpoint | String | VarChar(512) | URL do endpoint |
| method | String | VarChar(10) | POST, PUT, PATCH, DELETE |
| statusCode | Int? | | Status HTTP |
| oldData | String? | Text | Dados anteriores (JSON) |
| newData | String? | Text | Dados novos (JSON) |
| ip | String? | VarChar(64) | IP da requisição |
| userAgent | String? | VarChar(512) | User-Agent |
| duration | Int? | | Duração em ms |
| createdAt | DateTime | default: now(), index | Data do evento |

**Índices:** `@@index([userId])`, `@@index([entity])`, `@@index([createdAt])`

---

### SystemConfig
**Tabela:** `system_config`  
**Descrição:** Configurações gerais do sistema.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| key | String | unique, VarChar(128) | Chave de configuração |
| value | String | Text | Valor da configuração |
| updatedAt | DateTime | | Última atualização |

---

### BotConfig
**Tabela:** `bot_config`  
**Descrição:** Configurações do Discord Bot.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| key | String | unique, VarChar(128) | Chave (news_enabled, welcome_enabled) |
| value | String | Text | Valor (true/false) |
| updatedAt | DateTime | | Última atualização |

---

### BotLog
**Tabela:** `bot_logs`  
**Descrição:** Histórico de ações do Discord Bot.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| action | String | VarChar(64), index | Tipo de ação |
| status | String | default: "ok", VarChar(16) | ok ou error |
| details | String? | Text | Dados JSON |
| guildId | String? | VarChar(32) | ID do servidor |
| channelId | String? | VarChar(32) | ID do canal |
| messageId | String? | VarChar(32) | ID da mensagem |
| userId | Int? | | ID do usuário |
| discordId | String? | VarChar(32) | ID Discord |
| createdAt | DateTime | default: now(), index | Data do evento |

**Índices:** `@@index([action])`, `@@index([createdAt])`

---

### JobState
**Tabela:** `job_states`  
**Descrição:** Rastreamento de execução dos cron jobs.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| jobName | String | unique, VarChar(64) | Nome do job |
| lastRunAt | DateTime? | | Última execução |
| lastSuccess | DateTime? | | Última execução bem-sucedida |
| lastError | String? | Text | Mensagem do último erro |
| runCount | Int | default: 0 | Total de execuções |
| updatedAt | DateTime | | Última atualização |

---

## Domínio: Ideias e Comunidade

### Ideia
**Tabela:** `ideias`  
**Descrição:** Ideias de projetos com sistema de votação.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| titulo | String | VarChar(256) | Título da ideia |
| descricao | String | Text | Descrição detalhada |
| autorId | Int? | index | ID do autor |
| autorNome | String? | VarChar(256) | Nome do autor |
| votos | Int | default: 0 | Contagem de votos |
| status | String | default: "active", VarChar(32) | active, archived |
| createdAt | DateTime | default: now(), index | Criação |
| updatedAt | DateTime | | Atualização |

**Índices:** `@@index([autorId])`, `@@index([createdAt])`

**Relações:**
- 1:N → IdeiaComentario (comentários)

---

### IdeiaComentario
**Tabela:** `ideia_comentarios`  
**Descrição:** Comentários em ideias.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| ideiaId | Int | FK → Ideia, cascade, index | Ideia comentada |
| autorId | Int? | | ID do autor |
| autorNome | String? | VarChar(256) | Nome do autor |
| texto | String | Text | Texto do comentário |
| createdAt | DateTime | default: now() | Criação |

**Índices:** `@@index([ideiaId])`

**Cascade:** Comentários são deletados ao deletar ideia.

---

## Domínio: Metas e Calendário (Team Calendar)

### Meta
**Tabela:** `metas`  
**Descrição:** Metas, goals, meetings e milestones do time.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| title | String | VarChar(256) | Título |
| description | String? | Text | Descrição |
| startDate | DateTime | index | Data de início |
| endDate | DateTime? | | Data de término |
| status | String | default: "pending", VarChar(32), index | pending, in_progress, done |
| type | String | default: "goal", VarChar(32) | goal, meeting, deadline, milestone |
| callLink | String? | VarChar(1024) | Link da call (Zoom, Teams) |
| googleEventId | String? | VarChar(256) | ID do evento Google Calendar |
| color | String | default: "#D12BF2", VarChar(16) | Cor do evento |
| authorId | Int | FK → User, cascade, index | Autor/criador |
| createdAt | DateTime | default: now() | Criação |
| updatedAt | DateTime | | Atualização |

**Índices:** `@@index([startDate])`, `@@index([status])`, `@@index([authorId])`

**Relações:**
- N:1 → User (autor)
- 1:N → MetaAssignee (membros atribuídos)
- 1:N → MetaObservation (comentários)

---

### MetaAssignee
**Tabela:** `meta_assignees`  
**Descrição:** Membros atribuídos a uma meta.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| metaId | Int | PK (parte), FK → Meta, cascade | ID da meta |
| userId | Int | PK (parte), FK → User, cascade | ID do usuário |

**Constraints:** `@@id([metaId, userId])`

---

### MetaObservation
**Tabela:** `meta_observations`  
**Descrição:** Comentários/observações em uma meta.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | Int | PK, auto | ID único |
| metaId | Int | FK → Meta, cascade, index | Meta comentada |
| authorId | Int | FK → User, cascade | Autor do comentário |
| content | String | Text | Texto do comentário |
| createdAt | DateTime | default: now() | Criação |

**Índices:** `@@index([metaId])`

---

## Domínio: Analytics

### AnalyticsEvent
**Tabela:** `analytics_events`  
**Descrição:** Eventos de navegação e ações dos usuários para análise.

| Atributo | Tipo | Constraint | Descrição |
|----------|------|-----------|-----------|
| id | String | PK (CUID) | ID único |
| eventName | String | VarChar(128), index | Nome do evento |
| eventCategory | String | VarChar(64), index | Categoria (page_view, click, etc) |
| sessionId | String | VarChar(128), index | ID da sessão |
| pageUrl | String? | VarChar(1024) | URL completa da página |
| pagePath | String? | VarChar(512) | Path da página |
| referrer | String? | VarChar(1024) | Página referenciadora |
| deviceType | String? | VarChar(32) | desktop, mobile, tablet |
| utmSource | String? | VarChar(256) | UTM source |
| utmMedium | String? | VarChar(256) | UTM medium |
| utmCampaign | String? | VarChar(256) | UTM campaign |
| utmTerm | String? | VarChar(256) | UTM term |
| utmContent | String? | VarChar(256) | UTM content |
| properties | String? | Text | Propriedades customizadas (JSON) |
| timestamp | DateTime | default: now() | Data/hora do evento |

**Índices:** `@@index([eventCategory, eventName])`, `@@index([sessionId])`, `@@index([timestamp])`

---

## Sumário de Relacionamentos

### Relacionamentos Principais

| Relacionamento | Tipo | Descrição |
|---|---|---|
| User → App | 1:N | Um usuário cria múltiplos apps |
| User → Payment | 1:N | Um usuário faz múltiplas compras |
| User → Crafter | 1:1 | Um usuário tem um perfil crafter |
| User → DiscordLink | 1:1 | Um usuário vincula uma conta Discord |
| User → Meta | 1:N | Um usuário cria múltiplas metas |
| App → Payment | 1:N | Um app tem múltiplas compras |
| App → License | 1:N | Um app tem múltiplas licenças |
| App → Feedback | 1:N | Um app recebe múltiplos feedbacks |
| App → Project | 1:1 | Um app pode ser gerado de um projeto |
| Crafter → Equipe | N:1 | Múltiplos crafters em uma equipe |
| Crafter → RankingTop3 | 1:N | Um crafter pode estar no top 3 |
| Desafio → ChallengeSubmission | 1:N | Um desafio tem múltiplas submissões |
| Desafio → User | N:M | (via ChallengeSubmission) |
| Project → Mentor | N:1 | Um projeto tem um mentor |
| Project → Inscricao | 1:N | Um projeto tem múltiplas inscrições |
| Equipe → Crafter | 1:N | Uma equipe tem múltiplos membros |
| Ideia → IdeiaComentario | 1:N | Uma ideia tem múltiplos comentários |
| Meta → MetaAssignee | 1:N | Uma meta tem múltiplos atribuídos |
| Meta → MetaObservation | 1:N | Uma meta tem múltiplas observações |

---

## Índices por Tabela

Os índices existentes otimizam queries frequentes:

- **users** - nenhum (email é unique)
- **discord_links** - `[discordId]`
- **apps** - nenhum (ID é PK)
- **app_payments** - `[appId, status]`, `[payerEmail]`
- **user_licenses** - `[appId, email]`, `[appId, email, hardwareId]`
- **license_activations** - `[appId, email]`, `[hardwareId]`
- **audit_logs** - `[userId]`, `[entity]`, `[createdAt]`
- **leads** - `[email]`, `[origin]`, `[status]`, `[createdAt]`
- **proposals** - `[status]`, `[email]`
- **partnerships** - `[status]`, `[email]`
- **news_articles** - `[category]`, `[publishedAt]`
- **bot_logs** - `[action]`, `[createdAt]`
- **ideias** - `[autorId]`, `[createdAt]`
- **ideia_comentarios** - `[ideiaId]`
- **metas** - `[startDate]`, `[status]`, `[authorId]`
- **meta_observations** - `[metaId]`
- **analytics_events** - `[eventCategory, eventName]`, `[sessionId]`, `[timestamp]`
