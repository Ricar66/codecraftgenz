# Crafters · Arquivo Histórico

**Decisão (2026-06-27):** removida toda a vertical "Comunidade Craft" do produto público. A CodeCraft foca em **software house B2B + apps próprios**. Comunidade de devs (Crafters, desafios, mentorias, ranking) pode ser reavaliada no futuro — quando isso acontecer, este documento descreve tudo o que existia para reativação informada.

**O que permanece em produção (NÃO foi removido):**

- Bot Discord (`codecraft-bot` no PM2) — jobs de notícias, vagas, tutoriais, enquetes
- Servidor Discord CodeCraftGenZ inteiro (comunidade existente)
- Frontend público B2B + Loja + CraftCard + sistema de avaliação
- Painel interno (`painel.codecraftgenz.com.br`)
- Backend de Auth, Apps, Payments, NFSe, Feedback de contato, Site Reviews, Panel, etc

---

## O que foi removido (capítulos da Comunidade Craft)

### 1. Frontend público — páginas (`codecraft-frontend/src/pages/`)

| Arquivo | O que era |
|---|---|
| `DesafiosPage.jsx` + `.module.css` | Listagem de desafios ativos com cards (stack, prazo, prêmio); modal de submissão (URL GitHub/GitLab + descrição); status "inscrito"/"submetido"/"avaliado" |
| `MentoriaPage.jsx` + `.module.css` | Galeria de mentores com avatar, especialidade, bio, links sociais |
| `RankingPage.jsx` + `.module.css` | Ranking público de Crafters por pontos acumulados (top N, filtros semanais/mensais) |
| `RankingPage/` (pasta) | Variante "community" do ranking (mais social, top 3 destacado) |
| `FeedbacksPage.jsx` + `.module.css` | Cards de depoimentos de Crafters com formulário de novo depoimento |
| `CrafterProfilePage.jsx` + `.module.css` | Perfil público do Crafter (avatar, skills, equipe, projetos, pontos, badges) |
| `OnboardingPage/` (pasta) | Wizard de onboarding após cadastro como Crafter (área + skills + intro) |
| `RegisterPage.jsx` + `.module.css` | Cadastro como Crafter (auth + dados iniciais). **REMOVIDO** porque o site B2B não tem mais cadastro público de devs. |

### 2. Frontend público — componentes (`codecraft-frontend/src/components/`)

| Pasta | O que era |
|---|---|
| `CrafterModal/` | Modal "Ser Crafter" — captação inicial via popup (nome/email/área) |
| `Challenges/` | Carrossel de desafios na Home (era usado em DesafiosPage também) |
| `ChallengesSubNav/` | Sub-navegação interna dos desafios (Todos / Inscritos / Concluídos) |
| `Onboarding/` | Componente de wizard de boas-vindas (passos animados framer-motion) |

### 3. Frontend admin (`codecraft-frontend/src/admin/`)

| Arquivo | O que era |
|---|---|
| `AdminCrafters.jsx` + CSS | CRUD de Crafters: lista, edição manual, equipe, pontos, ativação |
| `AdminDesafios.jsx` + CSS | CRUD de desafios: criar/editar/desativar; setup de prêmio, prazo, tags |
| `AdminSubmissions.jsx` + CSS | Aprovação/rejeição de submissões com nota e feedback |
| `AdminRanking.jsx` + CSS | Vista admin do ranking + ajuste manual de pontos + audit log |
| `AdminInscricoes.jsx` + CSS | Inscrições gerais (form do site → lead Crafter) |
| `AdminMentores.jsx` + CSS | CRUD de mentores; vinculação a projetos |
| `AdminEquipes.jsx` + CSS | CRUD de equipes (grupos de Crafters trabalhando juntos) |
| `AdminIdeias.jsx` + CSS | **NÃO removido — sistema de Ideias é geral, pode ser reaproveitado.** |

### 4. Frontend — services (`codecraft-frontend/src/services/`)

- `mentorAPI.js` — chama `/api/mentores/*`
- `rankingAPI.js` — chama `/api/ranking/*`
- *(challenges/inscrições/equipes inline em outros arquivos — removidos junto)*

### 5. Backend (`codecraftgenz-monorepo/backend/`)

| Caminho | O que era |
|---|---|
| `src/routes/crafters.ts` | GET/POST/PUT/DELETE /api/crafters; alias /api/ranking |
| `src/routes/challenges.ts` | GET/POST /api/desafios + /api/challenges + submissions + review |
| `src/routes/mentors.ts` | CRUD /api/mentores |
| `src/routes/teams.ts` | CRUD /api/equipes |
| `src/routes/inscricoes.ts` | POST público + GET admin /api/inscricoes |
| `src/controllers/{crafter,challenge,mentor,team,inscricao}.controller.ts` | Lógica HTTP |
| `src/services/{crafter,challenge,mentor,team,inscricao,ranking}.service.ts` | Regras de negócio (cálculo de pontos, audit, ranking top 3) |
| `src/schemas/{crafter,challenge,mentor,team,inscricao}.schema.ts` | Zod validators |
| `src/repositories/{crafter,challenge,mentor}.repository.ts` (se existirem) | Acesso ao banco |

### 6. Prisma — models removidos (schema.prisma)

```prisma
model Crafter {              // tabela "crafters"
  id, userId, nome, bio, avatarUrl, githubUrl, linkedinUrl,
  skillsJson, pontos, active, equipeId, createdAt, updatedAt
  relations: equipe (Equipe), user (User), rankingTop3 (RankingTop3[])
}

model Equipe {               // tabela "equipes"
  id, nome, descricao, logoUrl, status, createdAt, updatedAt
  relations: membros (Crafter[])
}

model RankingTop3 {          // tabela "ranking_top3"
  id, crafterId, position, createdAt
}

model RankingAudit {         // tabela "ranking_audit"
  id, action, crafterId, userId, oldValue, newValue, details, createdAt
}

model RankingSettings {      // tabela "ranking_settings"
  id, filtersJson, settingsJson, updatedAt
}

model Mentor {               // tabela "mentores"
  id, nome, email, telefone, bio, especialidade, avatarUrl,
  linkedinUrl, githubUrl, disponivel, createdAt, updatedAt
  relations: projetos (Project[]) — relação removida do Project também
}

model Inscricao {            // tabela "inscricoes"
  id, nome, email, telefone, redeSocial, cep, cidade, estado,
  areaInteresse, mensagem, projetoId, tipo, status, notas, timestamps
}

model Desafio {              // tabela "desafios"
  id, name, objective, description, difficulty, deadline, reward,
  basePoints, tagsJson, deliveryType, thumbUrl, status, visible,
  createdBy, timestamps
  relations: submissions (ChallengeSubmission[])
}

model ChallengeSubmission {  // tabela "challenge_submissions"
  id, desafioId, userId, repoUrl, description, deliveryUrl,
  deliveryText, notes, status, score, points, feedback,
  reviewFeedback, submittedAt, reviewedAt, timestamps
  unique: [desafioId, userId]
}
```

**Campos no `User` que serão removidos junto:**
- `crafter Crafter?` (relação)
- `challengeSubmissions ChallengeSubmission[]` (relação)
- `points Int @default(0)` — *avaliar se mantém para feature futura*

### 7. Tabelas MySQL que serão DROPADAS

```sql
DROP TABLE challenge_submissions;  -- depende de desafios
DROP TABLE desafios;
DROP TABLE ranking_top3;            -- depende de crafters
DROP TABLE ranking_audit;
DROP TABLE ranking_settings;
DROP TABLE crafters;                -- depende de equipes
DROP TABLE equipes;
DROP TABLE mentores;
DROP TABLE inscricoes;
```

**ATENÇÃO:** dados perdidos permanentemente. Antes do drop, **backup é feito** em `crafters-backup-YYYYMMDD.sql` via mysqldump.

### 8. Bot Discord — jobs desativados (mas arquivos preservados)

Bot continua online (PM2 `codecraft-bot`). Apenas os jobs que dependem das APIs removidas são desligados.

| Arquivo | Ação | Motivo |
|---|---|---|
| `commands/rank.ts` | **comentar registro** | Ranking de Crafters não existe mais |
| `commands/meu-rank.ts` | **comentar registro** | idem |
| `commands/desafios.ts` | **comentar registro** | Desafios removidos |
| `jobs/desafio-semanal.job.ts` | **comentar agendamento** | Postava desafio toda segunda |
| `jobs/ranking.job.ts` | **comentar agendamento** | Postava ranking semanal |
| `jobs/snapshot.job.ts` | **comentar agendamento** | Snapshot do ranking pra audit |
| `jobs/promotion.job.ts` | **comentar agendamento** | Promovia membro a "Crafter Elite" role |
| `commands/vagas-cmd.ts` | **MANTÉM** | Vagas continuam |
| `jobs/news.job.ts` | **MANTÉM** | Notícias tech 2x/dia |
| `jobs/vagas.job.ts` | **MANTÉM** | Vagas diárias |
| `jobs/tutorial.job.ts` | **MANTÉM** | Tutoriais |
| `jobs/enquete.job.ts` | **MANTÉM** | Enquetes |

Os arquivos `.ts` ficam no repo (não deletados) com import comentado no `client.ts` / `deploy-commands.ts` — facilita reativar copiando 1 linha quando voltar.

### 9. Discord — canais e cargos

**Mantidos:** todos os canais e cargos existentes do servidor continuam intactos (`#📌boas-vindas`, `#💬geral`, `#📰noticias-tech`, `#💼vagas-e-freelas`, `#📚recursos-gratuitos`, etc).

**Esvaziados de conteúdo automático (mas não deletados):**
- `#🏆desafios-codecraft` — não recebe mais o desafio semanal
- `#🎖ranking-semanal` — não recebe mais o ranking
- `#💎elite-lounge` + `#🧪acesso-antecipado` — cargos não são mais promovidos automaticamente

Quando reativarmos a comunidade, basta reativar os jobs do bot.

---

## Stack visual reaproveitável (já preservado)

Já existe um sistema de design pronto pra retomar marketing Crafter no futuro:

- **Marketing Stories** (`marketing/stories/`) — 4 stories Instagram na direção "Software Box" com selo numerado `#0001-#0004`. Tokens, tipografia (Archivo + Fraunces + JetBrains Mono + Caveat), texturas SVG inline. Ver [[project_marketing_stories]] na memória.

Quando criar `crafters.codecraftgenz.com.br`:
- Pode reaproveitar o design system (trocar cor de acento pra diferenciar do B2B)
- Continuar a numeração `#0005+` mantendo continuidade visual

---

## Como reverter este archive (futuro)

Quando decidir reativar Crafters:

1. **Subdomínio dedicado:** `crafters.codecraftgenz.com.br` (Hostinger DNS + Nginx vhost na VPS)
2. **Auth compartilhada:** mudar `COOKIE_DOMAIN=.codecraftgenz.com.br` (já está assim) — SSO entre principal e crafters
3. **Repo separado:** `codecraft-crafters-frontend` (Vite + React, igual o painel)
4. **Backend:** restaurar models do Prisma a partir deste documento + rodar `prisma migrate dev`
5. **Discord:** descomentar imports/jobs no `client.ts` do bot
6. **Pontos:** decidir se importa dados antigos (`crafters-backup-YYYYMMDD.sql` está no backup) ou começa do zero

**Esforço estimado (full restore):** 10–14 horas.

---

## Commits desta operação

Esta seção é populada após cada etapa do clean-up. Atualizar conforme avança.

- [ ] Commit 1: Documentação + memory update
- [ ] Commit 2: Frontend público — deletar páginas Crafter + components
- [ ] Commit 3: Frontend público — limpar imports, rotas, services
- [ ] Commit 4: Admin — deletar páginas + menu items
- [ ] Commit 5: Backend — deletar routes + controllers + services
- [ ] Commit 6: Bot Discord — comentar jobs Crafter
- [ ] Commit 7: Prisma — remover models + migration de drop
- [ ] Backup MySQL feito: `crafters-backup-YYYYMMDD.sql`
- [ ] Migration aplicada na VPS
- [ ] Build + deploy frontend + backend
