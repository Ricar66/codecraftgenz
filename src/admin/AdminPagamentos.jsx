// src/admin/AdminPagamentos.jsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchPayments, getPaymentById, updatePaymentById, adminGetAppPayment } from '../services/appsAPI.js';

export default function AdminPagamentos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = React.useState(() => {
    const now = new Date();
    const begin = new Date(now.getTime() - 30*24*60*60*1000);
    const toIso = (d) => d.toISOString().slice(0,19)+".000-00:00"; // Mercado Pago ISO with offset spec
    return {
      sort: 'date_created',
      criteria: 'desc',
      range: 'date_created',
      begin_date: toIso(begin),
      end_date: toIso(now),
      external_reference: '',
      status: '',
      payment_method_id: '',
      collectorId: '',
      payerId: ''
    };
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [errorDetails, setErrorDetails] = React.useState(null);
  const [results, setResults] = React.useState([]);
  const [paging, setPaging] = React.useState({ total: 0, limit: 0, offset: 0 });
  const [query, setQuery] = React.useState('');
  const [emailQuery, setEmailQuery] = React.useState('');
  const [limit, setLimit] = React.useState(30);
  const [page, setPage] = React.useState(1);
  const [viewRawId, setViewRawId] = React.useState(null);
  const [paymentId, setPaymentId] = React.useState('');
  const [singlePayment, setSinglePayment] = React.useState(null);
  const [updatePayloadText, setUpdatePayloadText] = React.useState('');
  const [updateMode, setUpdateMode] = React.useState('gui'); // 'gui' | 'json'
  const [jsonErrors, setJsonErrors] = React.useState([]);
  const [updateFields, setUpdateFields] = React.useState({
    capture: '', // '' | 'true' | 'false'
    status: '',
    transaction_amount: '',
    date_of_expiration: ''
  });
  // Validações client-side para campos guiados (PUT)
  const allowedStatuses = React.useMemo(() => (
    ['approved','pending','authorized','in_process','rejected','cancelled','refunded','charged_back']
  ), []);
  const isoOffsetRegex = React.useMemo(() => (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/
  ), []);
  const updateFieldErrors = React.useMemo(() => {
    const errs = {};
    if (updateFields.capture && updateFields.capture !== 'true' && updateFields.capture !== 'false') {
      errs.capture = 'Capture deve ser true ou false';
    }
    if (updateFields.status && !allowedStatuses.includes(updateFields.status)) {
      errs.status = 'Status inválido';
    }
    if (updateFields.transaction_amount !== '') {
      const n = Number(updateFields.transaction_amount);
      if (Number.isNaN(n) || n <= 0) {
        errs.transaction_amount = 'Valor deve ser número maior que 0';
      }
    }
    if (updateFields.date_of_expiration) {
      if (!isoOffsetRegex.test(updateFields.date_of_expiration)) {
        errs.date_of_expiration = "Formato ISO inválido. Use yyyy-MM-dd'T'HH:mm:ss.SSS±HH:mm";
      }
    }
    return errs;
  }, [updateFields, allowedStatuses, isoOffsetRegex]);
  const hasUpdateErrors = React.useMemo(() => Object.values(updateFieldErrors).some(Boolean), [updateFieldErrors]);
  const [dbSummary, setDbSummary] = React.useState(null);
  const [dbLoading, setDbLoading] = React.useState(false);
  const [dbError, setDbError] = React.useState('');
  const [columns, setColumns] = React.useState({
    id: true,
    status: true,
    method: true,
    amount: true,
    installments: true,
    payer: true,
    external_reference: true,
    description: true,
    created: true,
    updated: true,
    actions: true,
  });

  // Persistência de colunas (carregar)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('adminPaymentsColumns');
      if (saved && !searchParams.get('columns')) {
        const list = JSON.parse(saved);
        if (Array.isArray(list) && list.length) {
          setColumns(prev => Object.fromEntries(Object.keys(prev).map(k => [k, list.includes(k)])));
        }
      }
    } catch (err) { void err; }
  }, [searchParams]);
  // Persistência de colunas (salvar)
  React.useEffect(() => {
    try {
      const colList = Object.entries(columns).filter(([,v])=>v).map(([k])=>k);
      localStorage.setItem('adminPaymentsColumns', JSON.stringify(colList));
    } catch (err) { void err; }
  }, [columns]);

  const fetchPayments = React.useCallback(async () => {
    setLoading(true); setError(''); setErrorDetails(null);
    try {
      const params = {};
      if (filters.sort) params.sort = filters.sort;
      if (filters.criteria) params.criteria = filters.criteria;
      if (filters.range) params.range = filters.range;
      if (filters.begin_date) params.begin_date = filters.begin_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.external_reference) params.external_reference = filters.external_reference;
      if (filters.status) params.status = filters.status;
      // Nota: payment_method_id pode não ser suportado na busca; aplicamos filtro client-side
      if (filters.collectorId) params['collector.id'] = filters.collectorId;
      if (filters.payerId) params['payer.id'] = filters.payerId;
      if (limit) params.limit = String(limit);
      const offset = (Math.max(1, page) - 1) * Number(limit || 30);
      params.offset = String(offset);

      const resp = await searchPayments(params);
      const data = resp?.data?.data || resp?.data || resp; // backend retorna { success, data }
      const items = Array.isArray(data?.results) ? data.results : [];
      const clientFiltered = items.filter(p => {
        const matchQuery = !query ||
          String(p?.id||'').includes(query) ||
          String(p?.external_reference||'').toLowerCase().includes(query.toLowerCase()) ||
          String(p?.description||'').toLowerCase().includes(query.toLowerCase()) ||
          String(p?.payer?.email||'').toLowerCase().includes(query.toLowerCase());
        const matchEmail = !emailQuery || String(p?.payer?.email||'').toLowerCase().includes(emailQuery.toLowerCase());
        const matchMethod = !filters.payment_method_id || String(p?.payment_method_id||'') === String(filters.payment_method_id);
        return matchQuery && matchEmail && matchMethod;
      });
      setResults(clientFiltered);
      const apiPaging = data?.paging || { total: clientFiltered.length, limit: Number(limit||30), offset };
      setPaging(apiPaging);
    } catch (e) {
      // Mensagens amigáveis para casos comuns
      const msg = String(e?.message || '').toLowerCase();
      if (e?.status === 503 || msg.includes('no_access_token') || msg.includes('sem access token')) {
        setError('Credenciais do Mercado Pago ausentes. Configure MERCADO_PAGO_ACCESS_TOKEN ou OAuth e tente novamente.');
      } else if (e?.status === 401) {
        setError('Não autenticado. Faça login para acessar pagamentos.');
      } else if (e?.status === 403) {
        setError('Acesso restrito. Seu perfil não possui permissão de administrador.');
      } else {
        setError(e?.message || 'Erro ao buscar pagamentos');
      }
      setErrorDetails(null);
    } finally { setLoading(false); }
  }, [filters, limit, page, query, emailQuery]);

  // Validação leve para JSON avançado (PUT)
  React.useEffect(() => {
    if (updateMode !== 'json') { setJsonErrors([]); return; }
    const errs = [];
    if (!updatePayloadText) { setJsonErrors([]); return; }
    try {
      const obj = JSON.parse(updatePayloadText);
      if (obj && typeof obj === 'object') {
        if (obj.status && !allowedStatuses.includes(obj.status)) {
          errs.push('status inválido no JSON avançado');
        }
        if (Object.prototype.hasOwnProperty.call(obj, 'transaction_amount')) {
          const n = Number(obj.transaction_amount);
          if (Number.isNaN(n) || n <= 0) errs.push('transaction_amount deve ser número > 0');
        }
        if (obj.date_of_expiration && !isoOffsetRegex.test(obj.date_of_expiration)) {
          errs.push("date_of_expiration em formato ISO inválido (yyyy-MM-dd'T'HH:mm:ss.SSS±HH:mm)");
        }
      }
    } catch (e) {
      errs.push('JSON inválido: ' + String(e?.message || e));
    }
    setJsonErrors(errs);
  }, [updateMode, updatePayloadText, allowedStatuses, isoOffsetRegex]);

  // Buscar resumo do DB quando um pagamento é carregado
  React.useEffect(() => {
    const pid = String(singlePayment?.id || '').trim();
    if (!pid) { setDbSummary(null); setDbError(''); return; }
    let cancel = false;
    (async () => {
      try {
        setDbLoading(true); setDbError('');
        const resp = await adminGetAppPayment(pid);
        const data = resp?.data?.data || resp?.data || resp;
        if (!cancel) setDbSummary(data);
      } catch (e) {
        if (!cancel) setDbError(e?.message || 'Erro ao buscar resumo do DB');
      } finally { if (!cancel) setDbLoading(false); }
    })();
    return () => { cancel = true; };
  }, [singlePayment]);

  // Inicializa estado a partir da URL (evita atualizações redundantes e loops)
  React.useEffect(() => {
    try {
      const sp = Object.fromEntries([...searchParams.entries()]);
      setFilters(prev => {
        const next = { ...prev };
        let changed = false;
        for (const key of ['sort','criteria','range','begin_date','end_date','external_reference','status']) {
          if (sp[key] && sp[key] !== prev[key]) { next[key] = sp[key]; changed = true; }
        }
        const collectorId = sp['collector.id'];
        const payerId = sp['payer.id'];
        if (collectorId && collectorId !== prev.collectorId) { next.collectorId = collectorId; changed = true; }
        if (payerId && payerId !== prev.payerId) { next.payerId = payerId; changed = true; }
        return changed ? next : prev;
      });
      setQuery(prev => (sp.query && sp.query !== prev ? sp.query : prev));
      setEmailQuery(prev => (sp.email && sp.email !== prev ? sp.email : prev));
      setLimit(prev => (sp.limit && Number(sp.limit) !== Number(prev) ? Number(sp.limit) : prev));
      setPage(prev => {
        const spPage = sp.page ? Math.max(1, Number(sp.page)) : null;
        const curPage = Math.max(1, Number(prev));
        return spPage && spPage !== curPage ? spPage : prev;
      });
      if (sp.columns) {
        const parts = String(sp.columns).split(',').map(s=>s.trim()).filter(Boolean);
        const nextCols = (prev) => Object.fromEntries(Object.keys(prev).map(k => [k, parts.includes(k)]));
        // aplica somente se houver diferença real
        setColumns(prev => {
          const proposed = nextCols(prev);
          const same = Object.keys(prev).every(k => prev[k] === proposed[k]);
          return same ? prev : proposed;
        });
      }
    } catch (err) { void err; }
  }, [searchParams]);

  // Dispara busca quando filtros/página/consultas mudarem (função memoizada)
  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const syncParams = React.useCallback(() => {
    const qp = new URLSearchParams();
    qp.set('sort', filters.sort);
    qp.set('criteria', filters.criteria);
    qp.set('range', filters.range);
    if (filters.begin_date) qp.set('begin_date', filters.begin_date);
    if (filters.end_date) qp.set('end_date', filters.end_date);
    if (filters.external_reference) qp.set('external_reference', filters.external_reference);
    if (filters.status) qp.set('status', filters.status);
    if (filters.collectorId) qp.set('collector.id', filters.collectorId);
    if (filters.payerId) qp.set('payer.id', filters.payerId);
    if (query) qp.set('query', query);
    if (emailQuery) qp.set('email', emailQuery);
    qp.set('limit', String(limit));
    qp.set('page', String(page));
    const colList = Object.entries(columns).filter(([,v])=>v).map(([k])=>k).join(',');
    if (colList) qp.set('columns', colList);
    setSearchParams(qp);
  }, [filters, query, emailQuery, limit, page, columns, setSearchParams]);

  const exportCsv = () => {
    const headers = [
      'id','status','status_detail','payment_method_id','transaction_amount','installments','payer_email','external_reference','description','date_created','last_modified'
    ];
    const rows = results.map(p => [
      p.id,
      p.status,
      p.status_detail,
      p.payment_method_id,
      p.transaction_amount,
      p.installments,
      p?.payer?.email || '',
      p.external_reference || '',
      p.description || '',
      p.date_created || '',
      p.last_modified || p.last_updated || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pagamentos_mercadopago.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ s }) => (
    <span style={{ background: s==='approved'? '#00E4F2' : s==='pending'? '#FFA500' : s==='rejected'? '#FF6B6B' : '#666', color:'#fff', padding:'4px 8px', borderRadius:12, fontSize:'0.8em', fontWeight:'bold' }}>{s || '—'}</span>
  );

  const handleShowPayment = async (id) => {
    if (!id) return;
    try {
      setLoading(true); setError(''); setErrorDetails(null);
      const resp = await getPaymentById(id);
      const data = resp?.data?.data || resp?.data || resp;
      setSinglePayment(data);
      setViewRawId(String(data?.id || id));
      const qp = new URLSearchParams(searchParams);
      qp.set('paymentId', String(id));
      setSearchParams(qp);
    } catch (e) {
      setError(e?.message || 'Erro ao obter pagamento por ID');
      setErrorDetails(e?.data?.details || null);
    } finally { setLoading(false); }
  };

  const handleUpdatePayment = async () => {
    if (!paymentId && !singlePayment?.id) {
      setError('Informe o ID do pagamento');
      return;
    }
    const id = paymentId || String(singlePayment?.id || '');
    // Impede envio em caso de erro de validação nos campos guiados
    if (updateMode === 'gui' && hasUpdateErrors) {
      setError('Corrija os campos antes de atualizar');
      return;
    }
    let payload = null;
    if (updateMode === 'gui') {
      const obj = {};
      if (updateFields.capture === 'true' || updateFields.capture === 'false') {
        obj.capture = updateFields.capture === 'true';
      }
      if (updateFields.status) obj.status = updateFields.status;
      if (updateFields.transaction_amount !== '' && !Number.isNaN(Number(updateFields.transaction_amount))) {
        obj.transaction_amount = Number(updateFields.transaction_amount);
      }
      if (updateFields.date_of_expiration) obj.date_of_expiration = updateFields.date_of_expiration;
      payload = obj;
    } else {
      try {
        payload = updatePayloadText ? JSON.parse(updatePayloadText) : null;
      } catch (e) {
        setError('Payload JSON inválido');
        setErrorDetails(String(e?.message || e));
        return;
      }
    }
    if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
      setError('Payload é obrigatório para atualizar');
      return;
    }
    try {
      setLoading(true); setError(''); setErrorDetails(null);
      const resp = await updatePaymentById(id, payload);
      const data = resp?.data?.data || resp?.data || resp;
      setSinglePayment(data);
    } catch (e) {
      setError(e?.message || 'Erro ao atualizar pagamento');
      setErrorDetails(e?.data?.details || null);
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-content">
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
        <div>
          <h1 className="title">💳 Pagamentos – Mercado Pago</h1>
          <p className="muted">Liste e filtre pagamentos via proxy seguro (admin)</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-outline" onClick={exportCsv}>📤 Exportar CSV</button>
          <button className="btn btn-primary" onClick={() => { syncParams(); fetchPayments(); }} disabled={loading}>{loading? '🔄 Carregando…' : '🔁 Buscar'}</button>
        </div>
      </header>

      <section className="filters-section" style={{ marginBottom: 12 }}>
        <div className="formRow" style={{ gridTemplateColumns: '2fr 1fr auto' }}>
          <input placeholder="🔢 ID do pagamento" value={paymentId} onChange={e=>setPaymentId(e.target.value)} />
          <button className="btn btn-secondary" onClick={async ()=>{
            if (!paymentId) return;
            try {
              setLoading(true); setError(''); setSinglePayment(null);
              const resp = await getPaymentById(paymentId);
              const data = resp?.data?.data || resp?.data || resp;
              setSinglePayment(data);
              // Ajusta view para mostrar detalhe e sync na URL
              setViewRawId(String(data?.id || paymentId));
              const qp = new URLSearchParams(searchParams);
              qp.set('paymentId', String(paymentId));
              setSearchParams(qp);
            } catch (e) {
              setError(e?.message || 'Erro ao obter pagamento por ID');
            } finally { setLoading(false); }
          }}>🔍 Buscar por ID</button>
          <button className="btn btn-outline" onClick={()=>{ setPaymentId(''); setSinglePayment(null); setViewRawId(null); const qp = new URLSearchParams(searchParams); qp.delete('paymentId'); setSearchParams(qp); }}>Limpar ID</button>
        </div>
        <div className="formRow" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <input placeholder="🔍 Busca livre (ID, referência, descrição, e-mail)" value={query} onChange={e=>setQuery(e.target.value)} />
          <select value={filters.sort} onChange={e=>setFilters(s=>({ ...s, sort: e.target.value }))}>
            <option value="date_created">Ordenar por criação</option>
            <option value="last_modified">Ordenar por última modificação</option>
            <option value="date_approved">Ordenar por aprovação</option>
          </select>
          <select value={filters.criteria} onChange={e=>setFilters(s=>({ ...s, criteria: e.target.value }))}><option value="desc">Desc</option><option value="asc">Asc</option></select>
          <select value={filters.range} onChange={e=>setFilters(s=>({ ...s, range: e.target.value }))}>
            <option value="date_created">Intervalo: criação</option>
            <option value="last_modified">Intervalo: última modificação</option>
            <option value="date_approved">Intervalo: aprovação</option>
          </select>
        </div>
        <div className="formRow" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <input type="text" placeholder="external_reference" value={filters.external_reference} onChange={e=>setFilters(s=>({ ...s, external_reference: e.target.value }))} />
          <select value={filters.status} onChange={e=>setFilters(s=>({ ...s, status: e.target.value }))}>
            <option value="">Status: todos</option>
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="authorized">authorized</option>
            <option value="in_process">in_process</option>
            <option value="rejected">rejected</option>
            <option value="cancelled">cancelled</option>
            <option value="refunded">refunded</option>
            <option value="charged_back">charged_back</option>
          </select>
          <input type="text" placeholder="payment_method_id (client-side)" value={filters.payment_method_id} onChange={e=>setFilters(s=>({ ...s, payment_method_id: e.target.value }))} />
          <input type="text" placeholder="collector.id" value={filters.collectorId} onChange={e=>setFilters(s=>({ ...s, collectorId: e.target.value }))} />
        </div>
        <div className="formRow" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <input type="text" placeholder="payer.id" value={filters.payerId} onChange={e=>setFilters(s=>({ ...s, payerId: e.target.value }))} />
          <input type="text" placeholder="begin_date (ISO)" value={filters.begin_date} onChange={e=>setFilters(s=>({ ...s, begin_date: e.target.value }))} />
          <input type="text" placeholder="end_date (ISO)" value={filters.end_date} onChange={e=>setFilters(s=>({ ...s, end_date: e.target.value }))} />
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select onChange={(e)=>{
              const now = new Date();
              const sel = e.target.value;
              let begin = null; let end = null;
              if (sel === 'today') { begin = new Date(now); begin.setHours(0,0,0,0); end = new Date(now); end.setHours(23,59,59,999); }
              if (sel === '7d') { end = new Date(now); begin = new Date(now.getTime() - 7*24*60*60*1000); }
              if (sel === '30d') { end = new Date(now); begin = new Date(now.getTime() - 30*24*60*60*1000); }
              if (sel === 'month') { end = new Date(now); begin = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0); }
              const toIso = (d) => d.toISOString().slice(0,19)+".000-00:00";
              setFilters(f=>({ ...f, begin_date: begin? toIso(begin): f.begin_date, end_date: end? toIso(end): f.end_date }));
              setPage(1);
              syncParams();
              fetchPayments();
            }} defaultValue="">
              <option value="">Presets de datas…</option>
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="month">Mês atual</option>
            </select>
            <button className="btn btn-outline" onClick={()=>setFilters(f=>({ ...f, begin_date:'', end_date:'' }))}>Limpar datas</button>
            <button className="btn btn-outline" onClick={()=>setFilters(f=>({ ...f, external_reference:'', status:'', payment_method_id:'', collectorId:'', payerId:'' }))}>Limpar filtros</button>
            <button className="btn btn-primary" onClick={() => { setPage(1); syncParams(); fetchPayments(); }} disabled={loading}>{loading? 'Buscando…' : 'Aplicar filtros'}</button>
          </div>
        </div>
        <div className="formRow" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <input placeholder="📧 Filtro por e-mail (client-side)" value={emailQuery} onChange={e=>setEmailQuery(e.target.value)} />
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <label>Page size:</label>
            <select value={limit} onChange={e=>{ setLimit(Number(e.target.value)); setPage(1); syncParams(); fetchPayments(); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn btn-outline" onClick={()=>{ const next = Math.max(1, page-1); setPage(next); syncParams(); fetchPayments(); }}>◀</button>
            <span>Pag {page} / {Math.max(1, Math.ceil(Number(paging?.total||0) / Number(limit||30)))}</span>
            <button className="btn btn-outline" onClick={()=>{ const totalPages = Math.max(1, Math.ceil(Number(paging?.total||0) / Number(limit||30))); const next = Math.min(totalPages, page+1); setPage(next); syncParams(); fetchPayments(); }}>▶</button>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            {Object.keys(columns).map(k => (
              <label key={k} style={{ display:'flex', gap:6, alignItems:'center' }}>
                <input type="checkbox" checked={columns[k]} onChange={e=>{ const next = { ...columns, [k]: e.target.checked }; setColumns(next); syncParams(); }} /> {k}
              </label>
            ))}
          </div>
        </div>
      </section>

      {loading && <p>🔄 Carregando…</p>}
      {error && <p role="alert" style={{ color:'#FF6B6B' }}>❌ {error}</p>}

      <div className="table">
        <table>
          <thead>
            <tr>
              {columns.id && (<th>ID</th>)}
              {columns.status && (<th>Status</th>)}
              {columns.method && (<th>Método</th>)}
              {columns.amount && (<th>Valor</th>)}
              {columns.installments && (<th>Parcelas</th>)}
              {columns.payer && (<th>Payer</th>)}
              {columns.external_reference && (<th>Ref. Externa</th>)}
              {columns.description && (<th>Descrição</th>)}
              {columns.created && (<th>Criado</th>)}
              {columns.updated && (<th>Atualizado</th>)}
              {columns.actions && (<th>Ações</th>)}
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr><td colSpan={Object.values(columns).filter(Boolean).length || 1}>📭 Nenhum pagamento encontrado</td></tr>
            ) : results.map(p => (
              <tr key={p.id}>
                {columns.id && (
                  <td data-label="ID">
                    <button className="btn btn-link" onClick={()=>handleShowPayment(p.id)} title="Ver completo">{p.id}</button>
                  </td>
                )}
                {columns.status && (<td data-label="Status"><StatusBadge s={p.status} /></td>)}
                {columns.method && (<td data-label="Método">{p.payment_method_id || '—'}</td>)}
                {columns.amount && (<td data-label="Valor">R$ {Number(p.transaction_amount||0).toLocaleString('pt-BR')}</td>)}
                {columns.installments && (<td data-label="Parcelas">{p.installments || 1}</td>)}
                {columns.payer && (<td data-label="Payer">{p?.payer?.email || '—'}</td>)}
                {columns.external_reference && (<td data-label="Ref. Externa">{p.external_reference || '—'}</td>)}
                {columns.description && (<td data-label="Descrição">{p.description || '—'}</td>)}
                {columns.created && (<td data-label="Criado">{p.date_created ? new Date(p.date_created).toLocaleString('pt-BR') : '—'}</td>)}
                {columns.updated && (<td data-label="Atualizado">{(p.last_modified||p.last_updated) ? new Date(p.last_modified||p.last_updated).toLocaleString('pt-BR') : '—'}</td>)}
                {columns.actions && (
                  <td data-label="Ações">
                    <div className="btn-group">
                      <button className="btn btn-outline" onClick={()=>navigator.clipboard?.writeText(String(p.id))}>Copiar ID</button>
                      <button className="btn btn-secondary" onClick={()=>setViewRawId(viewRawId===p.id?null:p.id)}>{viewRawId===p.id? 'Ocultar' : 'Ver'}</button>
                      <button className="btn btn-primary" onClick={()=>handleShowPayment(p.id)}>Ver completo</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {singlePayment && (
        <section className="card" style={{ marginTop:12 }}>
          <h3>Pagamento (por ID) #{singlePayment?.id}</h3>
          <div className="btn-group" style={{ marginBottom:8 }}>
            <button className="btn btn-outline" onClick={()=>{ try { navigator.clipboard?.writeText(window.location.href); } catch (err) { void err; } }}>Copiar link</button>
            <button className="btn btn-secondary" onClick={()=>{ setSinglePayment(null); setViewRawId(null); const qp = new URLSearchParams(searchParams); qp.delete('paymentId'); setSearchParams(qp); }}>Fechar painel</button>
          </div>
          <details style={{ marginBottom:12 }}>
            <summary>Atualizar pagamento (PUT)</summary>
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8, marginTop:8 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <label style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input type="radio" name="updateMode" checked={updateMode==='gui'} onChange={()=>setUpdateMode('gui')} /> Campos guiados
                </label>
                <label style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input type="radio" name="updateMode" checked={updateMode==='json'} onChange={()=>setUpdateMode('json')} /> JSON avançado
                </label>
              </div>

              {updateMode === 'gui' ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
                  <div>
                    <div className="muted">capture</div>
                    <select value={updateFields.capture} onChange={e=>setUpdateFields(f=>({ ...f, capture: e.target.value }))}>
                      <option value="">(não enviar)</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                    {updateFieldErrors.capture && (<div className="muted" style={{ color:'#FF6B6B' }}>{updateFieldErrors.capture}</div>)}
                  </div>
                  <div>
                    <div className="muted">status</div>
                    <select value={updateFields.status} onChange={e=>setUpdateFields(f=>({ ...f, status: e.target.value }))}>
                      <option value="">(não enviar)</option>
                      <option value="approved">approved</option>
                      <option value="pending">pending</option>
                      <option value="authorized">authorized</option>
                      <option value="in_process">in_process</option>
                      <option value="rejected">rejected</option>
                      <option value="cancelled">cancelled</option>
                      <option value="refunded">refunded</option>
                      <option value="charged_back">charged_back</option>
                    </select>
                    {updateFieldErrors.status && (<div className="muted" style={{ color:'#FF6B6B' }}>{updateFieldErrors.status}</div>)}
                  </div>
                  <div>
                    <div className="muted">transaction_amount</div>
                    <input type="number" step="0.01" placeholder="ex.: 58.8" value={updateFields.transaction_amount} onChange={e=>setUpdateFields(f=>({ ...f, transaction_amount: e.target.value }))} />
                    {updateFieldErrors.transaction_amount && (<div className="muted" style={{ color:'#FF6B6B' }}>{updateFieldErrors.transaction_amount}</div>)}
                  </div>
                  <div>
                    <div className="muted">date_of_expiration</div>
                    <input type="text" placeholder="yyyy-MM-dd'T'HH:mm:ss.SSS-04:00" value={updateFields.date_of_expiration} onChange={e=>setUpdateFields(f=>({ ...f, date_of_expiration: e.target.value }))} />
                    {updateFieldErrors.date_of_expiration && (<div className="muted" style={{ color:'#FF6B6B' }}>{updateFieldErrors.date_of_expiration}</div>)}
                  </div>
                </div>
              ) : (
                <textarea
                  placeholder='Ex.: {"capture": false, "status": "cancelled", "transaction_amount": 58.8}'
                  value={updatePayloadText}
                  onChange={e=>setUpdatePayloadText(e.target.value)}
                  style={{ minHeight: 120 }}
                />
              )}
              {updateMode === 'json' && jsonErrors.length > 0 && (
                <div className="muted" style={{ color:'#FF6B6B' }}>
                  {jsonErrors.map((m,i)=>(<div key={i}>• {m}</div>))}
                </div>
              )}

              <div className="muted">
                Campos comuns: `capture` (boolean), `status` (approved|pending|authorized|in_process|rejected|cancelled|refunded|charged_back), `transaction_amount` (number), `date_of_expiration` (ISO yyyy-MM-dd'T'HH:mm:ss.SSSZ)
              </div>
              <div className="btn-group">
                <button className="btn btn-outline" onClick={()=>{
                  const amt = Number(singlePayment?.transaction_amount || 58.8);
                  if (updateMode === 'gui') {
                    setUpdateFields(f=>({ ...f, capture: 'false', status: 'cancelled', transaction_amount: String(amt) }));
                  } else {
                    setUpdatePayloadText(JSON.stringify({ capture: false, status: 'cancelled', transaction_amount: amt }, null, 2));
                  }
                }}>Preencher exemplo</button>
                <button className="btn btn-outline" onClick={()=>{
                  const now = new Date();
                  const exp = new Date(now.getTime() + 2*24*60*60*1000);
                  const iso = exp.toISOString().slice(0,23) + '-04:00';
                  setUpdateFields(f=>({ ...f, date_of_expiration: iso }));
                }}>Expira em 48h</button>
                <button className="btn btn-outline" onClick={()=>{
                  setUpdateFields({ capture:'', status:'', transaction_amount:'', date_of_expiration:'' });
                  setUpdatePayloadText('');
                }}>Limpar</button>
                <button className="btn btn-primary" onClick={handleUpdatePayment} disabled={loading || (updateMode==='gui' && hasUpdateErrors)}>{loading? 'Atualizando…' : 'Atualizar pagamento'}</button>
              </div>
            </div>
          </details>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
            <div>
              <div className="muted">Status</div>
              <div><StatusBadge s={singlePayment?.status} /></div>
            </div>
            <div>
              <div className="muted">Método</div>
              <div>{singlePayment?.payment_method_id || singlePayment?.payment_method?.id || '—'}</div>
            </div>
            <div>
              <div className="muted">Valor</div>
              <div>R$ {Number(singlePayment?.transaction_amount||0).toLocaleString('pt-BR')}</div>
            </div>
            <div>
              <div className="muted">Aprovado em</div>
              <div>{singlePayment?.date_approved ? new Date(singlePayment.date_approved).toLocaleString('pt-BR') : '—'}</div>
            </div>
            <div>
              <div className="muted">Criado em</div>
              <div>{singlePayment?.date_created ? new Date(singlePayment.date_created).toLocaleString('pt-BR') : '—'}</div>
            </div>
            <div>
              <div className="muted">Atualizado</div>
              <div>{singlePayment?.date_last_updated ? new Date(singlePayment.date_last_updated).toLocaleString('pt-BR') : (singlePayment?.last_modified? new Date(singlePayment.last_modified).toLocaleString('pt-BR') : '—')}</div>
            </div>
          </div>
          <details style={{ marginTop:12 }}>
            <summary>Ver detalhes brutos</summary>
            <pre style={{ whiteSpace:'pre-wrap', fontSize:12 }}>{JSON.stringify(singlePayment, null, 2)}</pre>
          </details>
          <details style={{ marginTop:12 }}>
            <summary>Resumo DB (app_payments)</summary>
            {dbLoading ? (
              <div className="muted">Carregando resumo do banco…</div>
            ) : dbError ? (
              <div className="muted" style={{ color:'#FF6B6B' }}>{dbError}</div>
            ) : dbSummary?.payment ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
                <div><div className="muted">payment_id</div><div>{dbSummary.payment.payment_id || '—'}</div></div>
                <div><div className="muted">app_id</div><div>{dbSummary.payment.app_id ?? '—'}</div></div>
                <div><div className="muted">preference_id</div><div>{dbSummary.payment.preference_id || '—'}</div></div>
                <div><div className="muted">status</div><div>{dbSummary.payment.status || '—'}</div></div>
                <div><div className="muted">amount</div><div>{dbSummary.payment.amount != null ? Number(dbSummary.payment.amount).toLocaleString('pt-BR') : '—'}</div></div>
                <div><div className="muted">currency</div><div>{dbSummary.payment.currency || '—'}</div></div>
                <div><div className="muted">payer_email</div><div>{dbSummary.payment.payer_email || '—'}</div></div>
                <div><div className="muted">status_detail</div><div>{dbSummary.payment.status_detail || '—'}</div></div>
                <div><div className="muted">payment_type_id</div><div>{dbSummary.payment.payment_type_id || '—'}</div></div>
                <div><div className="muted">issuer_id</div><div>{dbSummary.payment.issuer_id || '—'}</div></div>
                <div><div className="muted">net_received_amount</div><div>{dbSummary.payment.net_received_amount != null ? Number(dbSummary.payment.net_received_amount).toLocaleString('pt-BR') : '—'}</div></div>
                <div><div className="muted">installment_amount</div><div>{dbSummary.payment.installment_amount != null ? Number(dbSummary.payment.installment_amount).toLocaleString('pt-BR') : '—'}</div></div>
                <div><div className="muted">payer_document_type</div><div>{dbSummary.payment.payer_document_type || '—'}</div></div>
                <div><div className="muted">payer_document_number</div><div>{dbSummary.payment.payer_document_number || '—'}</div></div>
                <div><div className="muted">updated_at</div><div>{dbSummary.payment.updated_at ? new Date(dbSummary.payment.updated_at).toLocaleString('pt-BR') : '—'}</div></div>
              </div>
            ) : (
              <div className="muted">Nenhum registro no banco para este payment_id</div>
            )}
            {Array.isArray(dbSummary?.audit) && dbSummary.audit.length > 0 && (
              <div style={{ marginTop:12 }}>
                <div className="muted">Auditoria (últimos eventos)</div>
                <table className="table">
                  <thead><tr><th>Evento</th><th>Status</th><th>Quando</th><th>Notas</th></tr></thead>
                  <tbody>
                    {dbSummary.audit.map((ev, idx) => (
                      <tr key={idx}>
                        <td>{ev.event || ev.action || '—'}</td>
                        <td>{ev.status || ev.to_status || '—'}</td>
                        <td>{ev.created_at ? new Date(ev.created_at).toLocaleString('pt-BR') : '—'}</td>
                        <td>{ev.notes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </section>
      )}

      {viewRawId && !singlePayment && (
        <section className="card" style={{ marginTop:12 }}>
          <h3>Detalhes brutos</h3>
          <pre style={{ whiteSpace:'pre-wrap', fontSize:12 }}>
            {JSON.stringify(results.find(r=>r.id===viewRawId)||{}, null, 2)}
          </pre>
        </section>
      )}

      <section style={{ marginTop: 12 }}>
        <div className="muted">Total retornado: {paging.total} | Limit: {paging.limit} | Offset: {paging.offset}</div>
        {error && (
          <div className="muted" style={{ color:'#FF6B6B', marginTop:8 }}>
            <div>Detalhes do erro:</div>
            <pre style={{ whiteSpace:'pre-wrap', fontSize:12 }}>{typeof errorDetails === 'object' ? JSON.stringify(errorDetails, null, 2) : String(errorDetails || '')}</pre>
          </div>
        )}
      </section>
    </div>
  );
}