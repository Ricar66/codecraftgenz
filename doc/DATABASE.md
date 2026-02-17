# Banco de Dados - Schema e Modelos

## Visao Geral

- **SGBD:** MySQL (Hostinger)
- **ORM:** Prisma 5.22.0
- **Migracoes:** Prisma Migrate

## Diagrama de Relacionamentos

```
User ─────────── 1:N ──── Payment
  │                          │
  │                          │
  ├── 1:N ──── License       │ N:1
  │               │          │
  │               │        App ──── 1:N ──── Feedback
  │               │          │
  │           LicenseActivation    1:N
  │                          │
  ├── 1:1 ──── Crafter    License
  │               │
  │            N:1
  │               │
  ├── 1:N ─── Equipe
  │
  ├── 1:N ─── ChallengeSubmission
  │               │
  │            N:1
  │               │
  └────────── Desafio

Mentor ──── 1:N ──── Project
                        │
                     1:1 (opcional)
                        │
                       App

Project ── N:N (implícito) ── Crafter
```

## Modelos Detalhados

### User (usuarios)

Conta de usuario do sistema.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID unico |
| name | String | Nome completo |
| email | String (unique) | Email (login) |
| passwordHash | String | Senha bcrypt |
| role | String (default: "user") | admin, editor, user, viewer |
| status | String (default: "ativo") | ativo, inativo |
| avatarUrl | String? | URL do avatar |
| mfaEnabled | Boolean (default: false) | MFA ativado |
| isGuest | Boolean (default: false) | Usuario convidado (compra sem registro) |
| createdAt | DateTime | Data de criacao |
| updatedAt | DateTime | Ultima atualizacao |

**Relacoes:** apps[], payments[], licenses[], feedbacks[], submissions[], crafter?, passwordResets[]

---

### PasswordReset (password_resets)

Tokens de recuperacao de senha.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK) | ID unico |
| userId | Int (FK -> User) | Usuario |
| tokenHash | String | SHA256 do token |
| expiresAt | DateTime | Expiracao (1 hora) |
| usedAt | DateTime? | Quando foi usado |
| createdAt | DateTime | Criacao |

---

### App (apps)

Aplicativos no marketplace.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID unico |
| name | String | Nome do app |
| description | String? (Text) | Descricao longa |
| price | Decimal(10,2) (default: 0) | Preco em R$ |
| category | String? | Categoria |
| tags | Json? | Tags como array JSON |
| thumbUrl | String? (Text) | URL da thumbnail |
| screenshots | Json? | Array de URLs de screenshots |
| downloadUrl | String? (Text) | URL do executavel |
| downloadSize | String? | Tamanho do download |
| version | String? | Versao atual |
| platforms | Json? | { windows: bool, mac: bool, linux: bool } |
| status | String (default: "draft") | draft, published, archived |
| featured | Boolean (default: false) | Destaque na loja |
| downloads | Int (default: 0) | Contador de downloads |
| creatorId | Int? (FK -> User) | Criador |
| projectId | Int? (FK -> Project, unique) | Projeto associado |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

**Relacoes:** creator?, project?, purchases[], licenses[], feedbacks[]

---

### Payment (payments)

Transacoes de pagamento (Mercado Pago).

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID interno |
| appId | Int (FK -> App) | App comprado |
| userId | Int? (FK -> User) | Comprador |
| email | String | Email do comprador |
| name | String? | Nome do comprador |
| amount | Decimal(10,2) | Valor total |
| quantity | Int (default: 1) | Quantidade de licencas |
| status | String (default: "pending") | pending, approved, rejected, refunded, cancelled |
| preferenceId | String? (unique) | ID da preferencia MP |
| mpPaymentId | String? | ID do pagamento MP |
| paymentMethod | String? | visa, pix, boleto, etc |
| externalReference | String? (unique) | Referencia para webhook |
| mpResponseJson | Json? | Resposta completa do MP |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

**Indices:** `@@index([appId, status])`, `@@index([email])`

---

### License (licenses)

Licencas de software vinculadas a hardware.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID unico |
| appId | Int (FK -> App) | App licenciado |
| userId | Int? (FK -> User) | Proprietario |
| email | String | Email do proprietario |
| licenseKey | String (unique) | Chave de licenca |
| hardwareId | String? | ID do dispositivo |
| status | String (default: "active") | active, revoked, expired |
| activatedAt | DateTime? | Data de ativacao |
| createdAt | DateTime | Criacao |

**Indices:** `@@index([appId, email])`, `@@index([hardwareId])`

---

### LicenseActivation (license_activations)

Log de audit de ativacoes.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| licenseId | Int (FK -> License) | Licenca ativada |
| hardwareId | String | ID do dispositivo |
| ipAddress | String? | IP do request |
| userAgent | String? | User-Agent |
| activatedAt | DateTime | Quando |

---

### Project (projetos)

Projetos da empresa.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID unico |
| nome | String | Nome do projeto |
| descricao | String? (Text) | Descricao |
| status | String (default: "rascunho") | rascunho, ongoing, finalizado |
| progresso | Int (default: 0) | 0-100% |
| thumbUrl | String? (Text) | Thumbnail |
| tecnologias | Json? | Array de techs |
| mentorId | Int? (FK -> Mentor) | Mentor responsavel |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

**Relacoes:** mentor?, app?

---

### Crafter (crafters)

Perfil de desenvolvedor/participante.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| nome | String | Nome |
| email | String? | Email |
| avatarUrl | String? (Text) | Avatar |
| bio | String? (Text) | Biografia |
| skills | Json? | Array de habilidades |
| pontos | Int (default: 0) | Pontuacao no ranking |
| equipeId | Int? (FK -> Equipe) | Equipe |
| userId | Int? (FK -> User, unique) | Conta vinculada |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

---

### Equipe (equipes)

Times de trabalho.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| nome | String | Nome da equipe |
| descricao | String? (Text) | Descricao |
| avatarUrl | String? (Text) | Icone/avatar |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

**Relacoes:** membros[] (Crafter)

---

### Mentor (mentores)

Mentores do programa.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| nome | String | Nome completo |
| email | String? | Email |
| telefone | String? | Telefone |
| bio | String? (Text) | Biografia |
| especialidade | String? | Area de atuacao |
| avatarUrl | String? (Text) | Foto |
| linkedinUrl | String? | LinkedIn |
| githubUrl | String? | GitHub |
| disponivel | Boolean (default: true) | Disponivel para mentoria |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

**Relacoes:** projetos[]

---

### Desafio (desafios)

Desafios/competicoes de codigo.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| nome | String | Titulo |
| objetivo | String? (Text) | Objetivo |
| descricao | String? (Text) | Descricao completa |
| dificuldade | String? | Facil, Medio, Dificil |
| tags | Json? | Tags |
| recompensa | String? | Premiacao |
| deadline | DateTime? | Prazo |
| status | String (default: "aberto") | aberto, encerrado |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

**Relacoes:** submissions[]

---

### ChallengeSubmission (challenge_submissions)

Submissoes de solucoes para desafios.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| challengeId | Int (FK -> Desafio) | Desafio |
| userId | Int (FK -> User) | Participante |
| deliveryUrl | String? | URL da entrega |
| deliveryText | String? (Text) | Texto da entrega |
| notes | String? (Text) | Notas |
| score | Int? | Pontuacao (0-100) |
| status | String (default: "pending") | pending, approved, rejected |
| reviewedAt | DateTime? | Data da avaliacao |
| createdAt | DateTime | Criacao |

---

### RankingTop3 (ranking_top3)

Top 3 do ranking destacados.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| crafterId | Int (FK -> Crafter) | Crafter |
| posicao | Int | 1, 2 ou 3 |
| motivo | String? | Motivo do destaque |
| updatedAt | DateTime | Atualizacao |

---

### RankingAudit (ranking_audit)

Log de alteracoes no ranking.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| crafterId | Int | Crafter afetado |
| pontosAntes | Int | Pontos antes |
| pontosDepois | Int | Pontos depois |
| motivo | String? | Justificativa |
| createdAt | DateTime | Quando |

---

### RankingSettings (ranking_settings)

Configuracoes de filtro do ranking.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| filtroAtivo | String (default: "todos") | Filtro ativo |
| updatedAt | DateTime | Atualizacao |

---

### Inscricao (inscricoes)

Inscricoes em eventos/programas.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| nome | String | Nome do inscrito |
| email | String | Email |
| telefone | String? | Telefone |
| projeto | String? | Projeto de interesse |
| status | String (default: "pendente") | pendente, aprovado, rejeitado |
| createdAt | DateTime | Criacao |

---

### Finance (financas)

Registros financeiros manuais.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| item | String | Descricao do item |
| valor | Decimal(10,2) | Valor em R$ |
| status | String (default: "pendente") | pago, pendente, desconto |
| tipo | String? | receita, despesa |
| categoria | String? | Categoria |
| observacao | String? (Text) | Observacoes |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

---

### Feedback (feedbacks)

Avaliacoes e depoimentos.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| userId | Int? (FK -> User) | Autor |
| appId | Int? (FK -> App) | App avaliado |
| nome | String | Nome do autor |
| rating | Int | 1-5 estrelas |
| comentario | String? (Text) | Texto |
| aprovado | Boolean (default: false) | Moderacao |
| createdAt | DateTime | Criacao |

---

### Invoice (invoices)

Notas Fiscais de Servico Eletronica (NFS-e).

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| paymentId | Int? (FK -> Payment) | Pagamento vinculado |
| rpsNumero | Int? | Numero do RPS |
| rpsSerie | String? | Serie do RPS |
| nfseNumero | String? | Numero da NFS-e |
| protocolo | String? | Protocolo da prefeitura |
| status | String (default: "pending") | pending, submitted, approved, cancelled, error |
| xmlEnvio | String? (LongText) | XML enviado |
| xmlRetorno | String? (LongText) | XML de resposta |
| pdfUrl | String? | URL do PDF |
| errorMessage | String? (Text) | Mensagem de erro |
| valorServico | Decimal(10,2)? | Valor do servico |
| descricaoServico | String? (Text) | Descricao |
| tomadorDoc | String? | CPF/CNPJ do tomador |
| tomadorNome | String? | Nome do tomador |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

---

### Proposal (proposals)

Propostas B2B de empresas.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | Int (PK, auto) | ID |
| companyName | String | Nome da empresa |
| contactName | String | Nome do contato |
| email | String | Email |
| phone | String? | Telefone |
| projectType | String | Tipo de projeto |
| description | String (Text) | Descricao |
| budgetRange | String? | Faixa de orcamento |
| deadline | String? | Prazo desejado |
| status | String (default: "nova") | nova, em_analise, aceita, rejeitada |
| createdAt | DateTime | Criacao |
| updatedAt | DateTime | Atualizacao |

---

## Comandos Uteis

```bash
# Gerar Prisma Client apos alterar schema
npx prisma generate

# Criar nova migracao
npx prisma migrate dev --name nome_da_migracao

# Aplicar migracoes em producao
npx prisma migrate deploy

# Abrir Prisma Studio (GUI)
npx prisma studio

# Resetar banco (CUIDADO: apaga tudo)
npx prisma migrate reset --force
```
