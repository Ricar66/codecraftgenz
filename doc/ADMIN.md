# Painel Administrativo

## Visao Geral

O painel admin esta em `/admin` e e acessivel apenas por usuarios com role `admin` ou `editor`. Utiliza layout com sidebar de navegacao e tema dark cyberpunk.

## Estrutura

```
/admin
├── Dashboard (SuperDashboard)    ← Pagina inicial
├── /admin/usuarios               ← Gestao de usuarios (admin only)
├── /admin/mentores               ← CRUD de mentores
├── /admin/equipes                ← CRUD de equipes
├── /admin/crafters               ← CRUD de crafters
├── /admin/ranking                ← Gestao de ranking
├── /admin/projetos               ← CRUD de projetos
├── /admin/apps                   ← CRUD de aplicativos
├── /admin/desafios               ← CRUD de desafios
├── /admin/inscricoes             ← Gestao de inscricoes
├── /admin/ideias                 ← Gestao de ideias
├── /admin/propostas              ← Propostas B2B
├── /admin/financas               ← Controle financeiro
├── /admin/licencas               ← Gestao de licencas (admin only)
├── /admin/pagamentos             ← Gestao de pagamentos (admin only)
├── /admin/nfse                   ← Notas fiscais (admin only)
├── /admin/leads                  ← Dashboard de leads (admin only)
└── /admin/config                 ← Configuracoes
```

## Dashboard (SuperDashboard)

O dashboard principal exibe:

### KPIs (Cards Superiores)

| KPI | Dados | Fonte |
|-----|-------|-------|
| Faturamento Total | Finance + Payments (approved) | `/api/dashboard/stats` |
| Receita Paga | Finances (paid/pago) + Payments (approved) | `/api/dashboard/stats` |
| Receita Pendente | Finances (pending) + Payments (pending) | `/api/dashboard/stats` |
| Descontos | Finances (discount/desconto) | `/api/dashboard/stats` |
| Usuarios | Total de usuarios registrados | `/api/dashboard/stats` |
| Crafters | Total de crafters | `/api/dashboard/stats` |
| Projetos | Total + ativos + finalizados | `/api/dashboard/stats` |
| Apps | Total de apps no marketplace | `/api/dashboard/stats` |
| Pagamentos MP | Total + valores approved/pending | `/api/dashboard/stats` |

### Grafico de Receita (Recharts)

- **Tipo:** AreaChart
- **Periodo:** Ultimos 6 meses
- **Dados:** Receita (verde) vs Despesas (vermelho)
- **Fonte:** `chartData` do `/api/dashboard/stats`

### Vendas por Aplicativo

- **Tipo:** Tabela ranking
- **Colunas:** #, Aplicativo (thumb + nome), Vendas, Faturamento
- **Ordenacao:** Por faturamento (maior primeiro)
- **Rodape:** Totais consolidados
- **Fonte:** `salesPerApp` do `/api/dashboard/stats`

### Filtro de Periodo

Select com opcoes: 7d, 15d, 30d, 90d, 180d, 365d

## Componentes Admin Reutilizaveis

### AdminCard

```jsx
<AdminCard>
  <AdminCard.Header title="Mentores" subtitle="Gestao de mentores">
    <button onClick={openForm}>+ Novo</button>
  </AdminCard.Header>
  <AdminCard.Body>
    <AdminTable ... />
  </AdminCard.Body>
</AdminCard>
```

### AdminTable

```jsx
<AdminTable
  columns={[
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ]}
  data={items}
  actions={(item) => (
    <>
      <button onClick={() => edit(item)}>Editar</button>
      <button onClick={() => remove(item.id)}>Excluir</button>
    </>
  )}
/>
```

### Pagination

```jsx
<Pagination
  currentPage={page}
  totalPages={Math.ceil(total / perPage)}
  onPageChange={setPage}
/>
```

### StatusBadge

```jsx
<StatusBadge status="approved" />  // Verde
<StatusBadge status="pending" />   // Amarelo
<StatusBadge status="rejected" />  // Vermelho
```

### AdminFilters

Filtros de busca com campo de texto e selects.

### EmptyState

Placeholder quando nao ha dados para exibir.

## Padrao CRUD das Paginas Admin

Todas as paginas admin seguem o mesmo padrao:

```
1. Hook useAdminRepo (useProjects, useMentors, etc)
   → Retorna: { items, loading, error, create, update, remove, refetch }

2. Estado local:
   → formData: objeto com dados do formulario
   → editingId: ID do item sendo editado (null = novo)
   → showForm: boolean para exibir modal/formulario

3. Funcoes:
   → handleSubmit: create ou update baseado em editingId
   → handleEdit: preenche formData e abre formulario
   → handleDelete: confirmacao + remove(id)

4. Layout:
   → AdminCard com Header (titulo + botao "Novo")
   → Filtros (se aplicavel)
   → AdminTable com dados
   → Pagination
   → Modal/Formulario para criar/editar
```

## Paginas Especificas

### AdminApps

Funcionalidades extras alem do CRUD padrao:
- Upload de executavel (ate 512MB)
- Preview de thumbnail e screenshots
- Selecao de plataformas (Windows/Mac/Linux)
- Toggle "Destaque" (featured)
- Status: draft, published, archived
- Paginacao: 6 apps por pagina

### AdminPagamentos

- Listagem de pagamentos do Mercado Pago
- Filtros: app, status, email, data
- Detalhes completos do pagamento (MP response JSON)
- Reenvio de email de confirmacao
- Atualizacao manual de status

### AdminLicencas

- Listagem de licencas por app
- Visualizacao de hardware_id vinculado
- Historico de ativacoes
- Status: active, revoked, expired

### AdminFinancas

- Registros manuais de receitas e despesas
- Categorias personalizadas
- Status: pago, pendente, desconto
- Resumo com totais

### AdminNFSe

- Listagem de notas fiscais
- Acoes: gerar, enviar, consultar, cancelar
- Visualizacao de XML
- Status com badge colorido

### LeadsDashboard (admin only)

Dashboard dedicado para gestao de leads com:
- **KPIs** (4 cards): Total Leads, Novos no periodo, Convertidos, Taxa de Conversao %
- **Graficos Recharts**:
  - AreaChart — volume diario de leads
  - PieChart — distribuicao por origem
  - BarChart horizontal — funil por status (new → contacted → converted → lost)
- **Filtros**: dropdown Origem + dropdown Status + input Search
- **Tabela**: Nome, Email, Origem, Status (StatusBadge), Data, Acoes (mudar status)
- **Seletor de periodo**: 7d, 30d, 90d, 365d
- API: `GET /api/leads/dashboard`, `GET /api/leads`, `PUT /api/leads/:id/status`

### AdminUsuarios (admin only)

Extraido do antigo AdminLayout monolito:
- CRUD de usuarios do sistema
- Busca por nome/email
- Paginacao
- Export CSV
- Gestao de roles (admin, editor, user, viewer)
- Modal de edicao de senha

### AdminConfig

Pagina de configuracoes do sistema com 4 secoes:
- **Informacoes da Plataforma**: nome, versao, ambiente
- **Tema**: dark glassmorphism, swatches de cores do design system
- **Status do Sistema**: URL da API, health check, status do banco
- **Logs**: lista filtrada de logs do sistema

### AdminIdeias

- Listagem de ideias com votacao e comentarios
- Criar nova ideia (titulo + descricao)
- Votar em ideias (thumbs up)
- Adicionar/visualizar comentarios
- API real: `/api/ideias`

### AdminDiscord

Pagina dedicada de gerenciamento do Discord Bot com 4 secoes:

#### Status do Bot

- Card mostrando se bot está online/offline
- Uptime em horas
- Ping de latência
- Último status check

#### Toggles de Features

- `news_enabled` - Habilitar/desabilitar job de notícias
- `welcome_enabled` - Habilitar/desabilitar mensagens de boas-vindas
- `vagas_enabled` - Habilitar/desabilitar job de vagas

#### Triggers Manuais

Botões para executar jobs manualmente (útil para testes):
- **Executar News Job** → POST `/api/discord/trigger/news`
- **Executar Vagas Job** → POST `/api/discord/trigger/vagas`
- **Executar Ranking Job** → POST `/api/discord/trigger/ranking`

Cada trigger mostra resultado de sucesso/erro.

#### Histórico de Ações

Tabela com logs do bot (bot_logs):

| Coluna | Descrição |
|--------|-----------|
| Ação | Tipo: welcome_sent, news_posted, challenge_posted, etc |
| Status | ok ou error |
| Canal | ID do canal Discord |
| Data | Data/hora do evento |
| Detalhes | Dados JSON (click para expandir) |

- Paginação: 20 ações por página
- Filtro por ação
- Busca por data/canal

#### Estatísticas

- Total de discord_links (usuários vinculados)
- Total de cargo "Crafter" atribuído
- Últimas 5 ações do bot
- Data do último job bem-sucedido (por tipo)

**API usada:**
- `GET /api/discord/bot-status` - Status do bot
- `GET /api/discord/config` - Configurações
- `PUT /api/discord/config` - Salvar configurações
- `POST /api/discord/trigger/:action` - Executar jobs
- `GET /api/discord/logs` - Histórico paginado

## Tema Visual

O admin usa tema dark glassmorphism com as cores do design system:

```javascript
const COLORS = {
  primary: '#D12BF2',     // Magenta principal
  secondary: '#00E4F2',   // Ciano neon
  purple: '#7A3EF5',      // Roxo
  success: '#10B981',     // Verde
  warning: '#F59E0B',     // Amarelo
  danger: '#ef4444',      // Vermelho
};
```

Cards com `backdrop-filter: blur(12px)` e bordas translucidas (`rgba(255,255,255,0.1)`).
Estilos via CSS Modules (*.module.css).
