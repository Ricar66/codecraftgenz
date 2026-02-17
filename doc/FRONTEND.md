# Frontend - Documentacao Tecnica

## Estrutura de Pastas

```
src/
├── admin/                    # Painel administrativo
│   ├── components/           # Componentes admin reutilizaveis
│   │   ├── AdminTable.jsx    # Tabela de dados generica
│   │   ├── AdminCard.jsx     # Card wrapper (Header/Body)
│   │   ├── AdminFilters.jsx  # Filtros de busca
│   │   ├── AdminAlert.jsx    # Alertas e notificacoes
│   │   ├── Pagination.jsx    # Controles de paginacao
│   │   ├── StatusBadge.jsx   # Badges de status
│   │   └── EmptyState.jsx    # Estado vazio
│   ├── AdminLayout.jsx       # Layout com sidebar
│   ├── ProtectedRoute.jsx    # Protecao de rotas por role
│   ├── SuperDashboard.jsx    # Dashboard com graficos
│   ├── AdminApps.jsx         # CRUD de aplicativos
│   ├── AdminCrafters.jsx     # CRUD de crafters
│   ├── AdminEquipes.jsx      # CRUD de equipes
│   ├── AdminMentores.jsx     # CRUD de mentores
│   ├── AdminProjetos.jsx     # CRUD de projetos
│   ├── AdminDesafios.jsx     # CRUD de desafios
│   ├── AdminRanking.jsx      # Gestao de ranking
│   ├── AdminInscricoes.jsx   # Gestao de inscricoes
│   ├── AdminIdeias.jsx       # Gestao de ideias
│   ├── AdminProposals.jsx    # Propostas B2B
│   ├── AdminFinancas.jsx     # Controle financeiro
│   ├── AdminLicencas.jsx     # Gestao de licencas
│   ├── AdminPagamentos.jsx   # Gestao de pagamentos
│   ├── AdminNFSe.jsx         # Notas fiscais
│   └── *.module.css          # Estilos por componente
│
├── components/               # Componentes publicos
│   ├── Navbar/               # Barra de navegacao
│   ├── Hero/                 # Secao hero da landing
│   ├── Footer/               # Rodape
│   ├── UI/                   # Componentes base
│   │   ├── Card/             # Card generico
│   │   ├── ErrorBoundary/    # Captura de erros React
│   │   ├── Icons/            # Icones SVG
│   │   ├── Input/            # Campos de formulario
│   │   ├── Loading/          # Spinners e skeletons
│   │   ├── Modal/            # Dialogo modal
│   │   ├── Select/           # Dropdown select
│   │   └── Toast/            # Sistema de notificacoes
│   ├── FeedbackForm/         # Formulario de feedback
│   ├── FeedbackShowcase/     # Vitrine de depoimentos
│   ├── AppCard/              # Card de aplicativo
│   ├── CrafterModal/         # Modal de perfil crafter
│   ├── PaymentBrick/         # Widget Mercado Pago
│   ├── CardDirectPayment/    # Pagamento direto cartao
│   ├── LicenseActivator/     # Ativacao de licenca
│   └── LoginIncentiveBanner/ # Banner incentivo login
│
├── context/                  # React Context
│   ├── AuthContext.jsx        # Provider de autenticacao
│   ├── AuthCore.js           # createContext
│   └── useAuth.js            # Hook useAuth()
│
├── hooks/                    # Custom Hooks
│   ├── useAdminRepo.js       # CRUD admin (useUsers, useProjects, etc)
│   ├── useAnalytics.js       # Tracking de eventos
│   ├── useFeedbacks.js       # Gestao de feedbacks
│   └── useProjects.js        # Fetch de projetos publicos
│
├── integrations/             # Integracoes terceiros
│
├── lib/                      # Bibliotecas core
│   ├── apiConfig.js          # Fetch centralizado (apiRequest)
│   ├── realtime.js           # Event emitter para atualizacoes
│   └── logger.js             # Log utilitario
│
├── pages/                    # Paginas da aplicacao
│   ├── HomePage.jsx          # Landing page
│   ├── ProjectsPage.jsx      # Galeria de projetos
│   ├── MentoriaPage.jsx      # Programa de mentoria
│   ├── FeedbacksPage.jsx     # Depoimentos
│   ├── RankingPage.jsx       # Ranking de crafters
│   ├── DesafiosPage.jsx      # Desafios/competicoes
│   ├── AppHubPage.jsx        # Hub de aplicativos
│   ├── HubDownloadPage.jsx   # Download CodeCraft Hub
│   ├── AppsPage.jsx          # Loja de apps (logado)
│   ├── AppPurchasePage.jsx   # Pagina de compra
│   ├── OrderSuccessPage.jsx  # Confirmacao de pedido
│   ├── MyAccountPage.jsx     # Minha conta
│   ├── ForCompaniesPage.jsx  # Para empresas (B2B)
│   ├── HelpPage.jsx          # Ajuda/FAQ
│   ├── LoginPage.jsx         # Login
│   ├── RegisterPage.jsx      # Registro
│   ├── ForgotPasswordPage.jsx # Esqueci a senha
│   ├── PasswordResetPage.jsx # Redefinir senha
│   ├── PrivacyPolicyPage.jsx # Politica de privacidade
│   └── TermsOfUsePage.jsx    # Termos de uso
│
├── services/                 # Camada de API
│   ├── appsAPI.js            # Apps + Pagamentos + Licencas
│   ├── userAPI.js            # Usuarios admin
│   ├── projectsAPI.js        # Projetos
│   ├── mentorAPI.js          # Mentores
│   ├── feedbackAPI.js        # Feedbacks
│   ├── rankingAPI.js         # Ranking
│   ├── dashboardAPI.js       # Dashboard
│   ├── proposalAPI.js        # Propostas
│   ├── nfseAPI.js            # NFS-e
│   └── leadsAPI.js           # Captura de leads (TrackPro)
│
├── styles/                   # Estilos globais
│   ├── globals.css           # Design tokens e variaveis CSS
│   ├── tokens.css            # Tokens adicionais
│   └── App.css               # Estilos do App root
│
├── utils/                    # Utilitarios
│   └── hooks.js              # useDebounce, usePrefersReducedMotion
│
├── App.jsx                   # Componente raiz + rotas
├── main.jsx                  # Entry point (providers)
├── index.css                 # Reset CSS global
└── polyfills.js              # Compatibilidade de browser
```

## Roteamento

### Rotas Publicas (sem autenticacao)

| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/` | HomePage | Landing page principal |
| `/projetos` | ProjectsPage | Galeria de projetos |
| `/feedbacks` | FeedbacksPage | Depoimentos de clientes |
| `/mentoria` | MentoriaPage | Programa de mentoria |
| `/ranking` | RankingPage | Ranking de crafters |
| `/desafios` | DesafiosPage | Desafios/competicoes |
| `/aplicativos` | AppHubPage | Vitrine de apps |
| `/aplicativos/hub` | HubDownloadPage | Download do CodeCraft Hub |
| `/para-empresas` | ForCompaniesPage | Pagina B2B |
| `/login` | LoginPage | Login de usuario |
| `/register` | RegisterPage | Cadastro |
| `/forgot-password` | ForgotPasswordPage | Solicitar reset de senha |
| `/reset-password` | PasswordResetPage | Redefinir senha |
| `/ajuda` | HelpPage | FAQ e suporte |
| `/politica-privacidade` | PrivacyPolicyPage | Politica de privacidade |
| `/termos-uso` | TermsOfUsePage | Termos de uso |

### Rotas Protegidas (requer login)

| Rota | Pagina | Roles |
|------|--------|-------|
| `/apps` | AppsPage | admin, user, editor, viewer |
| `/apps/:id/compra` | AppPurchasePage | admin, user, editor, viewer |
| `/apps/:id/sucesso` | OrderSuccessPage | admin, user, editor, viewer |
| `/minha-conta` | MyAccountPage | todos logados |

### Rotas Admin (requer role admin/editor)

| Rota | Pagina | Roles |
|------|--------|-------|
| `/admin` | SuperDashboard | admin, editor |
| `/admin/usuarios` | Usuarios | admin |
| `/admin/mentores` | AdminMentores | admin, editor |
| `/admin/equipes` | AdminEquipes | admin, editor |
| `/admin/crafters` | AdminCrafters | admin, editor |
| `/admin/ranking` | AdminRanking | admin, editor |
| `/admin/projetos` | AdminProjetos | admin, editor |
| `/admin/apps` | AdminApps | admin, editor |
| `/admin/desafios` | AdminDesafios | admin, editor |
| `/admin/inscricoes` | AdminInscricoes | admin, editor |
| `/admin/ideias` | AdminIdeias | admin, editor |
| `/admin/propostas` | AdminProposals | admin, editor |
| `/admin/financas` | AdminFinancas | admin, editor |
| `/admin/licencas` | AdminLicencas | admin |
| `/admin/pagamentos` | AdminPagamentos | admin |
| `/admin/nfse` | AdminNFSe | admin |
| `/admin/config` | Config | admin, editor |

## Componentes Admin

### AdminCard

Wrapper padrao para secoes do admin:

```jsx
<AdminCard>
  <AdminCard.Header title="Titulo" subtitle="Descricao">
    <button>Acao</button>
  </AdminCard.Header>
  <AdminCard.Body>
    {/* conteudo */}
  </AdminCard.Body>
</AdminCard>
```

### AdminTable

Tabela de dados com ordenacao e acoes:

```jsx
<AdminTable
  columns={[
    { key: 'nome', label: 'Nome' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
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

Componente de paginacao reutilizavel:

```jsx
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

## Hooks Principais

### useAuth()

```js
const { user, loading, isAuthenticated, login, logout, hasRole } = useAuth();

// Verificar role
if (hasRole(['admin', 'editor'])) { /* acesso admin */ }
```

### useAdminRepo

```js
// Cada funcao retorna { items, loading, error, create, update, remove, refetch }
const { items: users, create, update, remove } = useUsers();
const { items: projects, refetch } = useProjects();
const { items: mentors } = useMentors();
```

### useProjects (publico)

```js
const { projects, loading, stats, refetch } = useProjects({
  autoFetch: true,
  refetchInterval: 60000,
  publicOnly: false,
});
```

## Servico de API (apiConfig.js)

Todas as chamadas HTTP passam pelo `apiRequest()`:

```js
import { apiRequest } from '../lib/apiConfig';

// GET
const data = await apiRequest('/api/projetos');

// POST com body
const result = await apiRequest('/api/projetos', {
  method: 'POST',
  body: JSON.stringify({ nome: 'Novo Projeto' }),
});

// Multipart (upload)
const formData = new FormData();
formData.append('file', file);
const upload = await apiRequest('/api/apps/1/upload', {
  method: 'POST',
  body: formData,
  isMultipart: true,
});
```

Funcionalidades automaticas:
- Injeta token JWT do localStorage (`cc_session`)
- Header `Authorization: Bearer <token>`
- Content-Type automatico (JSON ou multipart)
- Tratamento de erros de rede
- Debug logging em desenvolvimento

## Design System

### Cores Principais

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#D12BF2` | Magenta/Violeta principal |
| `--color-secondary` | `#68007B` | Roxo escuro |
| `--color-tertiary` | `#00E4F2` | Ciano neon (Gen-Z) |
| `--color-accent` | `#00B8C4` | Hover/destaque |
| `--color-bg-dark` | `#0a0a0f` | Background principal |
| `--color-bg-medium` | `#1a1a2e` | Background cards |
| `--color-success` | `#22c55e` | Sucesso |
| `--color-error` | `#ef4444` | Erro |
| `--color-warning` | `#f59e0b` | Aviso |

### Tipografia

| Uso | Fonte | Fallback |
|-----|-------|----------|
| Titulos | Montserrat | sans-serif |
| Subtitulos | Poppins | sans-serif |
| Corpo | Inter | sans-serif |
| Codigo | Fira Code | monospace |

### Estilo Visual

- **Tema:** Dark cyberpunk com glassmorphism
- **Cards:** `backdrop-filter: blur(10px)` com bordas translucidas
- **Gradientes:** Ciano → Magenta em destaques
- **Animacoes:** Framer Motion para transicoes de pagina

## Build e Otimizacoes

### Vite Config

- **Code Splitting:** Lazy loading de todas as paginas
- **Vendor Chunks:** react, react-dom, react-router-dom, mercadopago separados
- **Minificacao:** Terser (remove console.log em prod)
- **Assets:** Inline < 4KB, hashes no nome
- **Source Maps:** Desabilitados em producao

### PWA

- Service Worker com estrategias de cache
- Atualizacao automatica ao detectar nova versao
- Suporte offline para assets criticos
