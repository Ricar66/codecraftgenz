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

## Tema Visual

O admin usa tema dark com as cores do design system:

```javascript
const COLORS = {
  bg: '#0B0B1A',
  cardBg: '#12122A',
  cardBorder: '#1E1E3F',
  primary: '#6C5CE7',
  secondary: '#A29BFE',
  success: '#00D68F',
  danger: '#FF6B6B',
  warning: '#FFD93D',
  text: '#E8E8FF',
  textMuted: '#8888AA',
};
```

Estilos via CSS Modules (*.module.css) + estilos inline para componentes dinamicos.
