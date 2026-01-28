// src/admin/data/mockDashboardData.js
// Dados fictícios para desenvolvimento do Dashboard e Propostas B2B

/**
 * KPIs principais do dashboard
 */
export const mockKPIs = {
  faturamentoTotal: 87450.00,
  faturamentoMes: 12850.00,
  pipelineB2B: 245000.00,
  novosUsuarios30d: 47,
  crescimentoUsuarios: 12.5,
  appsVendidos: 156,
  appsVendidosMes: 23,
  mentoriasAtivas: 8,
  ticketMedio: 560.58,
};

/**
 * Dados de receita mensal (últimos 6 meses)
 */
export const mockRevenueData = [
  { mes: 'Ago', receita: 8200, apps: 5400, mentorias: 2800 },
  { mes: 'Set', receita: 9800, apps: 6200, mentorias: 3600 },
  { mes: 'Out', receita: 11200, apps: 7800, mentorias: 3400 },
  { mes: 'Nov', receita: 10500, apps: 7200, mentorias: 3300 },
  { mes: 'Dez', receita: 14800, apps: 10200, mentorias: 4600 },
  { mes: 'Jan', receita: 12850, apps: 8650, mentorias: 4200 },
];

/**
 * Distribuição de projetos por tipo
 */
export const mockProjectDistribution = [
  { name: 'Web', value: 45, color: '#00E4F2' },
  { name: 'Mobile', value: 30, color: '#D12BF2' },
  { name: 'Desktop', value: 15, color: '#68007B' },
  { name: 'API/Backend', value: 10, color: '#7A3EF5' },
];

/**
 * Funil de vendas B2B
 */
export const mockSalesFunnel = [
  { fase: 'Novas', quantidade: 24, color: '#00E4F2' },
  { fase: 'Em Análise', quantidade: 12, color: '#D12BF2' },
  { fase: 'Negociação', quantidade: 6, color: '#7A3EF5' },
  { fase: 'Fechadas', quantidade: 3, color: '#10B981' },
];

/**
 * Últimas atividades (usuários + vendas)
 */
export const mockRecentActivities = [
  { id: 1, tipo: 'venda', descricao: 'App Gestão Financeira vendido', valor: 'R$ 1.200', tempo: '5 min atrás', icon: 'cart' },
  { id: 2, tipo: 'usuario', descricao: 'João Silva se cadastrou', valor: null, tempo: '12 min atrás', icon: 'user' },
  { id: 3, tipo: 'proposta', descricao: 'Nova proposta: TechCorp', valor: 'R$ 45.000', tempo: '28 min atrás', icon: 'briefcase' },
  { id: 4, tipo: 'venda', descricao: 'Mentoria Web vendida', valor: 'R$ 350', tempo: '1h atrás', icon: 'cart' },
  { id: 5, tipo: 'usuario', descricao: 'Maria Oliveira se cadastrou', valor: null, tempo: '2h atrás', icon: 'user' },
  { id: 6, tipo: 'proposta', descricao: 'Proposta respondida: StartupXYZ', valor: 'R$ 28.000', tempo: '3h atrás', icon: 'briefcase' },
  { id: 7, tipo: 'venda', descricao: 'App Controle de Estoque vendido', valor: 'R$ 890', tempo: '4h atrás', icon: 'cart' },
  { id: 8, tipo: 'usuario', descricao: 'Pedro Santos se cadastrou', valor: null, tempo: '5h atrás', icon: 'user' },
];

/**
 * Propostas B2B (CRM)
 */
export const mockProposals = [
  {
    id: 1,
    empresa: 'TechCorp Soluções',
    contato: 'Carlos Mendes',
    email: 'carlos@techcorp.com.br',
    tipoProjeto: 'web',
    tipoProjetoLabel: 'Aplicação Web',
    orcamento: '50k-100k',
    orcamentoLabel: 'R$ 50.000 - R$ 100.000',
    orcamentoValor: 75000,
    descricao: 'Precisamos de um sistema de gestão empresarial completo com módulos de RH, financeiro, estoque e vendas. O sistema deve ser responsivo e ter integração com nosso ERP atual (TOTVS). Prazo estimado: 6 meses.',
    status: 'novo',
    dataCriacao: '2025-01-28T10:30:00',
    dataAtualizacao: '2025-01-28T10:30:00',
  },
  {
    id: 2,
    empresa: 'Startup XYZ',
    contato: 'Ana Paula Costa',
    email: 'ana@startupxyz.io',
    tipoProjeto: 'mobile',
    tipoProjetoLabel: 'App Mobile (iOS/Android)',
    orcamento: '15k-50k',
    orcamentoLabel: 'R$ 15.000 - R$ 50.000',
    orcamentoValor: 28000,
    descricao: 'App de delivery para restaurantes locais. Funcionalidades: cadastro de restaurantes, cardápio digital, carrinho, pagamento online (PIX e cartão), tracking do pedido em tempo real.',
    status: 'em_analise',
    dataCriacao: '2025-01-25T14:20:00',
    dataAtualizacao: '2025-01-27T09:15:00',
  },
  {
    id: 3,
    empresa: 'Construtora ABC',
    contato: 'Roberto Lima',
    email: 'roberto.lima@construtorabc.com.br',
    tipoProjeto: 'desktop',
    tipoProjetoLabel: 'Software Desktop',
    orcamento: '15k-50k',
    orcamentoLabel: 'R$ 15.000 - R$ 50.000',
    orcamentoValor: 35000,
    descricao: 'Software de orçamento de obras com cálculo de materiais, mão de obra e cronograma físico-financeiro. Deve funcionar offline e sincronizar quando conectar à internet.',
    status: 'respondido',
    dataCriacao: '2025-01-20T08:45:00',
    dataAtualizacao: '2025-01-26T16:30:00',
  },
  {
    id: 4,
    empresa: 'E-commerce Fashion',
    contato: 'Juliana Martins',
    email: 'juliana@fashionecomm.com.br',
    tipoProjeto: 'fullstack',
    tipoProjetoLabel: 'Solução Completa',
    orcamento: 'above100k',
    orcamentoLabel: 'Acima de R$ 100.000',
    orcamentoValor: 150000,
    descricao: 'Plataforma completa de e-commerce com marketplace, integração com marketplaces externos (Mercado Livre, Amazon), sistema de afiliados, CRM integrado e app mobile para vendedores.',
    status: 'em_analise',
    dataCriacao: '2025-01-22T11:00:00',
    dataAtualizacao: '2025-01-28T08:00:00',
  },
  {
    id: 5,
    empresa: 'Clínica Saúde+',
    contato: 'Dr. Fernando Alves',
    email: 'fernando@clinicasaudemais.com.br',
    tipoProjeto: 'web',
    tipoProjetoLabel: 'Aplicação Web',
    orcamento: '5k-15k',
    orcamentoLabel: 'R$ 5.000 - R$ 15.000',
    orcamentoValor: 12000,
    descricao: 'Sistema de agendamento online para clínica médica. Cadastro de pacientes, histórico de consultas, lembretes por WhatsApp, integração com calendário do Google.',
    status: 'arquivado',
    dataCriacao: '2025-01-10T09:30:00',
    dataAtualizacao: '2025-01-18T14:00:00',
  },
  {
    id: 6,
    empresa: 'LogiTrans Transportes',
    contato: 'Marcelo Souza',
    email: 'marcelo@logitrans.com.br',
    tipoProjeto: 'api',
    tipoProjetoLabel: 'API/Backend',
    orcamento: '15k-50k',
    orcamentoLabel: 'R$ 15.000 - R$ 50.000',
    orcamentoValor: 25000,
    descricao: 'API para integração com sistemas de rastreamento de frota. Deve consumir dados de GPS em tempo real e disponibilizar via REST API para nosso sistema interno.',
    status: 'novo',
    dataCriacao: '2025-01-27T16:45:00',
    dataAtualizacao: '2025-01-27T16:45:00',
  },
];

/**
 * Status das propostas com cores
 */
export const proposalStatusConfig = {
  novo: { label: 'Novo', variant: 'info', color: '#00E4F2' },
  em_analise: { label: 'Em Análise', variant: 'warning', color: '#F59E0B' },
  respondido: { label: 'Respondido', variant: 'success', color: '#10B981' },
  arquivado: { label: 'Arquivado', variant: 'neutral', color: '#6B7280' },
};

/**
 * Tipos de projeto
 */
export const projectTypeConfig = {
  web: { label: 'Aplicação Web', icon: 'globe' },
  mobile: { label: 'App Mobile', icon: 'smartphone' },
  desktop: { label: 'Software Desktop', icon: 'monitor' },
  api: { label: 'API/Backend', icon: 'server' },
  fullstack: { label: 'Solução Completa', icon: 'layers' },
};

export default {
  mockKPIs,
  mockRevenueData,
  mockProjectDistribution,
  mockSalesFunnel,
  mockRecentActivities,
  mockProposals,
  proposalStatusConfig,
  projectTypeConfig,
};
