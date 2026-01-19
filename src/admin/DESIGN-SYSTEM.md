# Admin Design System - CodeCraft Gen-Z

Sistema de design padronizado para o painel administrativo.

## Sumario

1. [Tokens de Design](#tokens-de-design)
2. [Componentes](#componentes)
3. [Padroes de Layout](#padroes-de-layout)
4. [Breakpoints](#breakpoints)
5. [Guia de Uso](#guia-de-uso)

---

## Tokens de Design

Todos os tokens estao definidos em `/src/styles/tokens.css` e alias especificos do Admin em `/src/admin/AdminCommon.css`.

### Cores

```css
/* Brand */
--color-primary: #D12BF2      /* Magenta */
--color-secondary: #68007B    /* Roxo escuro */
--color-accent: #00E4F2       /* Ciano */

/* Feedback */
--color-success: #10B981      /* Verde */
--color-warning: #F59E0B      /* Amarelo */
--color-error: #EF4444        /* Vermelho */
--color-info: #3B82F6         /* Azul */

/* Admin Dark Theme */
--admin-bg: transparent
--admin-surface: rgba(255, 255, 255, 0.04)
--admin-border: rgba(255, 255, 255, 0.18)
--admin-text: #F5F5F7
--admin-text-muted: rgba(255, 255, 255, 0.75)
```

### Espacamento

```css
--admin-space-xs: 8px   /* var(--space-2) */
--admin-space-sm: 12px  /* var(--space-3) */
--admin-space-md: 16px  /* var(--space-4) */
--admin-space-lg: 24px  /* var(--space-6) */
--admin-space-xl: 32px  /* var(--space-8) */
```

### Border Radius

```css
--admin-radius-sm: 8px   /* var(--radius-md) */
--admin-radius-md: 12px  /* var(--radius-lg) */
--admin-radius-lg: 16px  /* var(--radius-xl) */
```

### Sombras

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
--shadow-glow-accent: 0 0 20px rgba(0, 228, 242, 0.3)
```

---

## Componentes

### AdminTable

Tabela responsiva com suporte a mobile (transforma em cards).

```jsx
import { AdminTable } from './components';

<AdminTable
  columns={[
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge variant={StatusBadge.getVariant(val)}>{val}</StatusBadge> },
    { key: 'actions', label: '', render: (_, row) => (
      <button onClick={() => handleEdit(row)}>Editar</button>
    )}
  ]}
  data={users}
  loading={loading}
  emptyMessage="Nenhum usuario encontrado"
  hoverable
/>
```

**Props:**
- `columns`: Array de colunas `{ key, label, width?, align?, render? }`
- `data`: Array de dados
- `loading`: Estado de carregamento
- `emptyMessage`: Mensagem quando vazio
- `hoverable`: Efeito hover nas linhas
- `onRowClick`: Callback ao clicar em linha

---

### Pagination

Componente de paginacao com selector de itens por pagina.

```jsx
import { Pagination } from './components';

<Pagination
  currentPage={page}
  totalPages={Math.ceil(total / perPage)}
  totalItems={total}
  itemsPerPage={perPage}
  onPageChange={setPage}
  onItemsPerPageChange={setPerPage}
  showItemsPerPage
  showInfo
/>
```

**Props:**
- `currentPage`: Pagina atual (1-indexed)
- `totalPages`: Total de paginas
- `totalItems`: Total de itens
- `itemsPerPage`: Itens por pagina
- `onPageChange`: Callback(newPage)
- `onItemsPerPageChange`: Callback(newPerPage)
- `itemsPerPageOptions`: Array [10, 20, 50, 100]

---

### AdminFilters

Secao de filtros responsiva.

```jsx
import { AdminFilters } from './components';

<AdminFilters onReset={resetFilters} showReset>
  <AdminFilters.Search
    value={search}
    onChange={setSearch}
    placeholder="Buscar por nome..."
    debounce={300}
  />
  <AdminFilters.Select
    label="Status"
    value={status}
    onChange={setStatus}
    options={[
      { value: '', label: 'Todos' },
      { value: 'active', label: 'Ativo' },
      { value: 'inactive', label: 'Inativo' },
    ]}
  />
  <AdminFilters.DateRange
    label="Periodo"
    startDate={startDate}
    endDate={endDate}
    onStartChange={setStartDate}
    onEndChange={setEndDate}
  />
</AdminFilters>
```

---

### StatusBadge

Badge de status com cores semanticas.

```jsx
import { StatusBadge } from './components';

// Uso direto
<StatusBadge variant="success">Ativo</StatusBadge>
<StatusBadge variant="warning" dot pulse>Pendente</StatusBadge>
<StatusBadge variant="error">Inativo</StatusBadge>

// Uso com helpers
const variant = StatusBadge.getVariant(user.status); // 'active' -> 'success'
const label = StatusBadge.translate(user.status);    // 'active' -> 'Ativo'

<StatusBadge variant={variant}>{label}</StatusBadge>
```

**Variants:** `success`, `warning`, `error`, `info`, `neutral`, `primary`, `accent`

**Props:**
- `variant`: Variante visual
- `size`: `sm` | `md` | `lg`
- `dot`: Mostrar indicador circular
- `pulse`: Animacao pulsante no dot

---

### AdminCard

Card container com compound components.

```jsx
import { AdminCard } from './components';

<AdminCard variant="elevated" hoverable>
  <AdminCard.Header
    title="Titulo do Card"
    subtitle="Descricao opcional"
    actions={<button>Acao</button>}
  />
  <AdminCard.Body>
    Conteudo principal do card
  </AdminCard.Body>
  <AdminCard.Footer align="right">
    <button>Cancelar</button>
    <button>Salvar</button>
  </AdminCard.Footer>
</AdminCard>

// Card com secoes colapsaveis
<AdminCard>
  <AdminCard.Section title="Informacoes Basicas" collapsible>
    ...
  </AdminCard.Section>
  <AdminCard.Section title="Configuracoes Avancadas" collapsible defaultOpen={false}>
    ...
  </AdminCard.Section>
</AdminCard>
```

**Variants:** `default`, `elevated`, `outlined`
**Padding:** `sm`, `md`, `lg`

---

### AdminAlert

Alertas e notificacoes.

```jsx
import { AdminAlert } from './components';

<AdminAlert variant="success" title="Sucesso!">
  Operacao realizada com sucesso.
</AdminAlert>

<AdminAlert variant="error" dismissible onDismiss={() => setError(null)}>
  {error.message}
</AdminAlert>

// Versao inline (compacta)
<AdminAlert variant="info" inline>
  Dica: Voce pode arrastar para reordenar.
</AdminAlert>
```

**Variants:** `success`, `warning`, `error`, `info`

---

### EmptyState

Estado vazio para listas/tabelas.

```jsx
import { EmptyState } from './components';

<EmptyState
  title="Nenhum usuario encontrado"
  description="Tente ajustar os filtros ou adicione um novo usuario"
  action={
    <button onClick={handleAdd}>Adicionar Usuario</button>
  }
/>
```

---

## Padroes de Layout

### Grid de Cards

```css
/* Padrao recomendado */
.cardGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--admin-space-md);
}
```

### Formularios

```jsx
// Grid responsivo
<div className="formRow" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
  <input placeholder="Campo 1" />
  <input placeholder="Campo 2" />
  <input placeholder="Campo 3" />
</div>
```

O CSS em AdminCommon.css ja trata a responsividade:
- `> 1024px`: 3+ colunas
- `768px - 1024px`: 2 colunas
- `< 768px`: 1 coluna

---

## Breakpoints

Breakpoints padronizados (de tokens.css):

| Nome | Valor | Uso |
|------|-------|-----|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Desktop grande |

```css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }

/* Desktop first (usado no Admin atual) */
@media (max-width: 1024px) { /* tablet e menor */ }
@media (max-width: 768px) { /* mobile e menor */ }
@media (max-width: 640px) { /* mobile */ }
```

---

## Guia de Uso

### Importando Componentes

```jsx
// Importar todos
import { AdminTable, Pagination, AdminFilters, StatusBadge, AdminCard, AdminAlert, EmptyState } from './components';

// Ou individualmente
import AdminTable from './components/AdminTable';
import Pagination from './components/Pagination';
```

### Exemplo Completo de Pagina

```jsx
import React, { useState } from 'react';
import { AdminTable, Pagination, AdminFilters, StatusBadge, AdminCard, EmptyState } from './components';

function UsersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const { data, loading, total } = useUsers({ search, status, page, perPage });

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <StatusBadge variant={StatusBadge.getVariant(val)}>
          {StatusBadge.translate(val)}
        </StatusBadge>
      )
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <button onClick={() => handleEdit(row)}>Editar</button>
      )
    },
  ];

  return (
    <div className="admin-content">
      <header>
        <h1 className="title">Usuarios</h1>
      </header>

      <AdminFilters showReset onReset={() => { setSearch(''); setStatus(''); }}>
        <AdminFilters.Search value={search} onChange={setSearch} placeholder="Buscar..." />
        <AdminFilters.Select
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'inactive', label: 'Inativos' },
          ]}
        />
      </AdminFilters>

      <AdminCard>
        <AdminTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="Nenhum usuario encontrado"
          hoverable
        />
      </AdminCard>

      <Pagination
        currentPage={page}
        totalPages={Math.ceil(total / perPage)}
        totalItems={total}
        itemsPerPage={perPage}
        onPageChange={setPage}
        onItemsPerPageChange={setPerPage}
      />
    </div>
  );
}
```

---

## Migração

Para migrar paginas existentes:

1. **Substituir variaveis CSS**:
   - `var(--raio-xl)` -> `var(--admin-radius-lg)`
   - `var(--espaco-xl)` -> `var(--admin-space-lg)`

2. **Usar componentes padronizados**:
   - Tabelas: trocar por `<AdminTable />`
   - Paginacao: trocar por `<Pagination />`
   - Filtros: trocar por `<AdminFilters />`
   - Badges: trocar por `<StatusBadge />`

3. **Padronizar cores**:
   - `#00E4F2` -> `var(--admin-accent)`
   - `rgba(255,255,255,0.18)` -> `var(--admin-border)`

4. **Ajustar breakpoints**:
   - Usar apenas: 640px, 768px, 1024px, 1280px
   - Remover: 480px, 560px, 880px, 992px
