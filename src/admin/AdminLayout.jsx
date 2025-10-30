// src/admin/AdminLayout.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
 
import ChallengeCard from '../components/Challenges/ChallengeCard.jsx';
import ProjectCard from '../components/Projects/ProjectCard.jsx';
import { useAuth } from '../context/useAuth';
import { useUsers, UsersRepo, useMentors, MentorsRepo, useProjects, ProjectsRepo, useDesafios, DesafiosRepo, useFinance, FinanceRepo, useRanking, RankingRepo, useLogs } from '../hooks/useAdminRepo';
import { adminStore } from '../lib/adminStore';
import { realtime } from '../lib/realtime';

export function Dashboard() {
  const [periodo, setPeriodo] = React.useState('30d');
  const [tipo, setTipo] = React.useState('all');
  const [statusFiltro, setStatusFiltro] = React.useState('');
  const pagamentoFiltro = '';
  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState('');
  const [resumo, setResumo] = React.useState({ totais: {}, evolucao_mensal: [] });
  const [projects, setProjects] = React.useState([]);
  const fetchAll = React.useCallback(async () => {
    try {
      setLoading(true);
      setErro('');
      const rResumo = await fetch(`/api/dashboard/resumo?periodo=${encodeURIComponent(periodo)}&type=${encodeURIComponent(tipo)}`);
      if (!rResumo.ok) throw new Error(`HTTP ${rResumo.status}`);
      const jsonResumo = await rResumo.json();
      setResumo(jsonResumo);

      const rProj = await fetch(`/api/projetos?all=1`);
      const jsonProj = await rProj.json().catch(()=>({ data: [] }));
      setProjects(Array.isArray(jsonProj?.data) ? jsonProj.data : (Array.isArray(jsonProj?.projects) ? jsonProj.projects : []));
    } catch {
      setErro('Erro ao sincronizar com o dashboard');
    } finally { setLoading(false); }
  }, [periodo, tipo]);

  React.useEffect(() => { fetchAll(); }, [fetchAll]);
  React.useEffect(() => {
    const unsub1 = realtime.subscribe('projects_changed', () => fetchAll());
    const unsub2 = realtime.subscribe('finance_changed', () => fetchAll());
    return () => { unsub1(); unsub2(); };
  }, [fetchAll]);

  const toLower = (s) => String(s || '').toLowerCase();
  const statusMap = (s) => {
    const v = toLower(s);
    if (v==='ongoing' || v==='andamento') return 'Ativo';
    if (v==='completed' || v==='concluído' || v==='concluido' || v==='finalizado') return 'Finalizado';
    if (v==='draft' || v==='rascunho') return 'Rascunho';
    return '—';
  };
  const withinPeriodo = (dateIso) => {
    if (!dateIso) return false;
    const now = new Date();
    const days = String(periodo).endsWith('d') ? Number(String(periodo).replace('d','')) : 30;
    const from = new Date(now.getTime() - days*24*60*60*1000);
    const dt = new Date(dateIso);
    return dt >= from && dt <= now;
  };
  const filteredProjects = projects
    .filter(p => withinPeriodo(p.startDate))
    .filter(p => !statusFiltro || statusMap(p.status) === statusFiltro);

  const kpis = resumo?.totais || {};
  const pieBase = [
    { key: 'paid', label: 'Paid', value: Number(kpis.receita_paga || 0), color: '#00E4F2' },
    { key: 'pending', label: 'Pending', value: Number(kpis.receita_pendente || 0), color: '#D12BF2' },
    { key: 'discount', label: 'Discount', value: Number(kpis.descontos || 0), color: '#68007B' },
  ];
  const pieData = pagamentoFiltro ? pieBase.filter(s => s.key === pagamentoFiltro) : pieBase;
  const barData = [
    { label: 'Ativos', value: Number(kpis.projetos_ativos || 0), color: '#00E4F2' },
    { label: 'Finalizados', value: Number(kpis.projetos_finalizados || 0), color: '#D12BF2' },
    { label: 'Rascunhos', value: Number(kpis.projetos_rascunho || 0), color: '#68007B' },
  ];
  const lineSeries = Array.isArray(resumo?.evolucao_mensal) ? resumo.evolucao_mensal : [];

  const exportCsv = () => {
    const cols = ['Projeto','Status','Valor','Progresso','UltimaAtualizacao'];
    const rows = filteredProjects.map(p => [
      p.title,
      statusMap(p.status),
      Number(p.price || 0),
      Number(p.progress || 0),
      p.startDate || ''
    ]);
    const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `dashboard_${periodo}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-content">
      <header className="dashboard-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h1 className="title">Painel CodeCraft Gen-Z – Visão Geral</h1>
          <p className="muted">{loading ? '🔄 Carregando informações do período…' : (erro ? '❌ Erro ao sincronizar com as finanças.' : '✅ Dados atualizados com sucesso.')}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={periodo} onChange={e=>setPeriodo(e.target.value)} aria-label="Período">
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
          </select>
          <select value={tipo} onChange={e=>setTipo(e.target.value)} aria-label="Tipo">
            <option value="all">Todos</option>
            <option value="projects">Projetos</option>
          </select>
          <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)} aria-label="Status projeto">
            <option value="">Status: Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Rascunho">Rascunho</option>
          </select>
          <button className="btn btn-outline" onClick={exportCsv}>Exportar CSV</button>
        </div>
      </header>

      <section className="kpis" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
        <div className="card" style={{ background:'#F4F4F4', color:'#000' }}><h3>🧩 Projetos Ativos</h3><p>{kpis.projetos_ativos || 0}</p></div>
        <div className="card" style={{ background:'#F4F4F4', color:'#000' }}><h3>🏁 Projetos Finalizados</h3><p>{kpis.projetos_finalizados || 0}</p></div>
        <div className="card" style={{ background:'#F4F4F4', color:'#000' }}><h3>💰 Receita Total</h3><p>R$ {(kpis.receita_total || 0).toLocaleString('pt-BR')}</p></div>
        <div className="card" style={{ background:'#F4F4F4', color:'#000' }}><h3>⏳ Receita Pendente</h3><p>R$ {(kpis.receita_pendente || 0).toLocaleString('pt-BR')}</p></div>
        <div className="card" style={{ background:'#F4F4F4', color:'#000' }}><h3>📈 Progresso Médio</h3><p>{kpis.media_progresso || 0}%</p></div>
        <div className="card" style={{ background:'#F4F4F4', color:'#000' }}><h3>💳 Receita Paga</h3><p>R$ {(kpis.receita_paga || 0).toLocaleString('pt-BR')}</p></div>
      </section>

      <section className="graficos" style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginTop:16 }}>
        {/* Linha – evolução mensal */}
        <div className="chart card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', borderRadius:12, padding:12 }}>
          <h3 style={{ marginBottom:8 }}>Evolução de Receita</h3>
          <svg width="100%" height="160" viewBox="0 0 400 160">
            {(() => {
              const max = Math.max(1, ...lineSeries.map(s => s.valor));
              const points = lineSeries.map((s, i) => {
                const x = (i/(lineSeries.length-1)) * 380 + 10;
                const y = 150 - (s.valor / max) * 120;
                return `${x},${y}`;
              }).join(' ');
              return (
                <>
                  <polyline points={points} fill="none" stroke="#00E4F2" strokeWidth="3" />
                  {lineSeries.map((s, i) => {
                    const x = (i/(lineSeries.length-1)) * 380 + 10;
                    const y = 150 - (s.valor / max) * 120;
                    return <circle key={i} cx={x} cy={y} r="3" fill="#D12BF2" />;
                  })}
                  {lineSeries.map((s, i) => (
                    <text key={`lbl-${i}`} x={(i/(lineSeries.length-1)) * 380 + 10} y={155} fontSize="10" fill="#fff" textAnchor="middle">{s.mes}</text>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
        {/* Pizza – status financeiro */}
        <div className="chart card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', borderRadius:12, padding:12 }}>
          <h3 style={{ marginBottom:8 }}>Status Financeiro</h3>
          {(() => {
            const total = pieData.reduce((acc, s) => acc + Math.abs(s.value), 0);
            let acc = 0; const cx=60, cy=60, r=50;
            return (
              <svg width="120" height="120" viewBox="0 0 120 120">
                {pieData.map((s, i) => {
                  const frac = total>0 ? Math.abs(s.value)/total : 0;
                  const start = (acc/total) * 2*Math.PI; acc += Math.abs(s.value);
                  const end = (acc/total) * 2*Math.PI;
                  const x1 = cx + r*Math.cos(start), y1 = cy + r*Math.sin(start);
                  const x2 = cx + r*Math.cos(end), y2 = cy + r*Math.sin(end);
                  const largeArc = frac > 0.5 ? 1 : 0;
                  const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  return <path key={i} d={d} fill={s.color} opacity="0.9" />;
                })}
              </svg>
            );
          })()}
          <div style={{ display:'grid', gap:6, marginTop:8 }}>
            {pieData.map((s, i) => (<div key={i} style={{ display:'flex', gap:6, alignItems:'center' }}><span style={{ width:12, height:12, background:s.color, display:'inline-block' }} /> <span>{s.label}</span> <strong style={{ marginLeft:'auto' }}>R$ {s.value.toLocaleString('pt-BR')}</strong></div>))}
          </div>
        </div>
      </section>

      {/* Barras – status projeto + Termômetro progresso */}
      <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16 }}>
        <div className="chart card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', borderRadius:12, padding:12 }}>
          <h3>Distribuição de Projetos</h3>
          <div style={{ display:'grid', gap:8, marginTop:8 }}>
            {barData.map((b, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'120px 1fr auto', gap:8, alignItems:'center' }}>
                <span>{b.label}</span>
                <div style={{ height:12, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.16)', borderRadius:8 }}>
                  <div style={{ width:`${Math.min(100, b.value*20)}%`, height:'100%', background:b.color, borderRadius:8, transition:'width 300ms ease' }} />
                </div>
                <strong>{b.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="chart card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', borderRadius:12, padding:12 }}>
          <h3>Média de Progresso</h3>
          <div style={{ height:18, background:'#F4F4F4', borderRadius:10 }}>
            <div style={{ width:`${kpis.media_progresso || 0}%`, height:'100%', background:'#D12BF2', borderRadius:10, transition:'width 300ms ease' }} />
          </div>
          <p style={{ marginTop:8 }}>{kpis.media_progresso || 0}%</p>
        </div>
      </section>

      {/* Tabela Resumo */}
      <section style={{ marginTop:16 }}>
        <h3>Tabela Resumo</h3>
        <div className="table">
          <table>
            <thead><tr><th>Projeto</th><th>Status</th><th>Valor</th><th>Progresso</th><th>Última Atualização</th></tr></thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr><td colSpan="5">⚠️ Sem registros para os filtros aplicados.</td></tr>
              ) : filteredProjects.map(p => (
                <tr key={p.id}><td>{p.title}</td><td>{statusMap(p.status)}</td><td>R$ {Number(p.price||0).toLocaleString('pt-BR')}</td><td>{Number(p.progress||0)}%</td><td>{p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR') : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function Usuarios() {
  const { data: list, loading, error, refresh } = useUsers();
  const [form, setForm] = React.useState({ name: '', email: '', password: '', role: 'viewer' });
  const [busy, setBusy] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 5;
  const filtered = list.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase()) ||
    u.role.toLowerCase().includes(query.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);
  const onCreate = async () => {
    setBusy(true);
    const res = await UsersRepo.create(form);
    setBusy(false);
    if (res.ok) refresh(); else alert(res.error);
  };
  return (
    <div className="admin-content">
      <h1 className="title">Usuários</h1>
      <div className="formRow" style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
        <input aria-label="Buscar" placeholder="Buscar (nome/e-mail/role)" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
        <button onClick={()=>setPage(Math.max(1, page-1))}>◀</button>
        <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
        <button onClick={()=>setPage(Math.min(totalPages, page+1))}>▶</button>
        <button onClick={()=>{
          const csv = adminStore.exportUsersCsv();
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'usuarios.csv'; a.click(); URL.revokeObjectURL(url);
        }}>Exportar CSV</button>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="table" aria-busy={loading}>
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {pageItems.length === 0 ? (<tr><td colSpan="4">Nenhum usuário</td></tr>) : pageItems.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.status}</td>
                <td>
                  <button onClick={()=>{UsersRepo.toggleStatus(u.id); refresh();}}>{u.status==='active'?'Desativar':'Ativar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="formRow">
        <input aria-label="Nome" placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input aria-label="E-mail" placeholder="E-mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input aria-label="Senha" placeholder="Senha" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
        <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
          <option value="admin">admin</option>
          <option value="editor">editor</option>
          <option value="viewer">viewer</option>
        </select>
        <button onClick={onCreate} disabled={busy}>{busy?'Criando...':'Criar usuário'}</button>
      </div>
    </div>
  );
}

export function Mentores() {
  const { data: list, loading, error, refresh } = useMentors();
  const [form, setForm] = React.useState({ name: '', specialty: '', bio: '', email: '', phone: '', photo: '', status: 'published', visible: true });
  const [editingId, setEditingId] = React.useState(null);
  const [errors, setErrors] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState('');
  const MAX_PHOTO_BYTES = 256 * 1024; // ~256KB para armazenar com segurança em localStorage
  const ACCEPT_TYPES = ['image/jpeg','image/png','image/webp'];
  const [query, setQuery] = React.useState('');
  const [filterSpec, setFilterSpec] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 5;
  const [selected, setSelected] = React.useState(new Set());
  const [historyOpen, setHistoryOpen] = React.useState(null);

  const filtered = list.filter(m =>
    (m.name||'').toLowerCase().includes(query.toLowerCase()) &&
    (!filterSpec || (m.specialty||'').toLowerCase().includes(filterSpec.toLowerCase())) &&
    (!filterStatus || (m.status||'') === filterStatus)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);

  const validate = (data) => {
    const next = {};
    if (!data.name || String(data.name).trim().length < 2) next.name = 'Informe um nome válido';
    if (!data.specialty || String(data.specialty).trim().length < 2) next.specialty = 'Informe a especialidade';
    if (!data.bio || String(data.bio).trim().length < 5) next.bio = 'Descrição muito curta';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) next.email = 'E-mail inválido';
    if (data.phone && String(data.phone).trim().length < 8) next.phone = 'Telefone incompleto';
    return next;
  };
  React.useEffect(()=>{ setErrors(validate(form)); }, [form]);
  const onSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setBusy(true);
    try {
      if (editingId) {
        await MentorsRepo.upsert({ ...form, id: editingId });
      } else {
        await MentorsRepo.upsert(form);
      }
      setForm({ name: '', specialty: '', bio: '', email: '', phone: '', photo: '', status: 'published', visible: true });
      setEditingId(null);
      setToast('Mentor salvo com sucesso');
      setTimeout(()=> setToast(''), 1800);
      refresh();
    } finally {
      setBusy(false);
    }
  };
  const onPhotoFile = async (file) => {
    if (!file) return;
    if (!ACCEPT_TYPES.includes(file.type)) { alert('Formato inválido. Use JPEG, PNG ou WEBP.'); return; }
    if (file.size > MAX_PHOTO_BYTES) { alert('Imagem muito grande. Máximo de ~256KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setForm(prev => ({ ...prev, photo: String(dataUrl) }));
    };
    reader.readAsDataURL(file);
  };
  const toggleVisible = async (m) => { await MentorsRepo.toggleVisible(m); refresh(); };
  const onEdit = (m) => { setEditingId(m.id); setForm({ name:m.name, specialty:m.specialty, bio:m.bio, email:m.email, phone:m.phone, photo:m.photo||'', status:m.status||'draft', visible: !!m.visible }); };
  const onDelete = async (id) => { if (!window.confirm('Confirma remover este mentor?')) return; await MentorsRepo.delete(id); refresh(); };
  const onUndo = async (id) => { await MentorsRepo.undo(id); refresh(); };
  const onToggleSelect = (id, checked) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const onSelectAllPage = (checked) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const m of pageItems) { if (checked) next.add(m.id); else next.delete(m.id); }
      return next;
    });
  };
  const applyBulkStatus = async (status) => {
    if (selected.size === 0) return;
    if (!window.confirm(`Aplicar status "${status}" a ${selected.size} mentor(es)?`)) return;
    await MentorsRepo.bulkSetStatus(Array.from(selected), status);
    refresh();
  };
  const applyBulkVisibility = async (visible) => {
    if (selected.size === 0) return;
    if (!window.confirm(`${visible?'Exibir':'Ocultar'} ${selected.size} mentor(es)?`)) return;
    await MentorsRepo.bulkSetVisibility(Array.from(selected), visible);
    refresh();
  };
  const HistoryList = ({ mentorId }) => {
    const [items, setItems] = React.useState([]);
    React.useEffect(() => { setItems(MentorsRepo.getHistory(mentorId)); }, [mentorId]);
    return (
      <div className="history" style={{ marginTop: 8 }}>
        {items.length === 0 ? (<div className="muted">Sem histórico</div>) : (
          <ul style={{ display:'grid', gap:6 }}>
            {items.map(h => (
              <li key={h.id} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8 }}>
                <span className="muted">{h.type}</span>
                <span>{new Date(h.at).toLocaleString('pt-BR')}</span>
                <button onClick={async()=>{ if (!window.confirm(`Reverter evento ${h.id}?`)) return; const res = await MentorsRepo.revertHistory(h.id); if (!res.ok) alert(res.error); refresh(); }}>Reverter este</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  return (
    <div className="admin-content">
      <h1 className="title">Mentores</h1>
      {toast && (<div role="status" aria-live="polite" className="saveToast">{toast}</div>)}
      <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto auto' }}>
        <input aria-label="Buscar" placeholder="Buscar por nome" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
        <input aria-label="Filtrar especialidade" placeholder="Especialidade" value={filterSpec} onChange={e=>{setFilterSpec(e.target.value); setPage(1);}} />
        <select aria-label="Status" value={filterStatus} onChange={e=>{setFilterStatus(e.target.value); setPage(1);}}>
          <option value="">Todos</option>
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
        </select>
        <button className="btn btn-outline btn-icon" onClick={()=>setPage(Math.max(1, page-1))}>◀</button>
        <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
        <button className="btn btn-outline btn-icon" onClick={()=>setPage(Math.min(totalPages, page+1))}>▶</button>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="formRow" style={{ gridTemplateColumns: 'auto auto auto auto auto' }}>
        <label style={{ alignSelf:'center' }}><input type="checkbox" onChange={e=>onSelectAllPage(e.target.checked)} /> Selecionar página</label>
        <button className="btn btn-primary" onClick={()=>applyBulkStatus('published')}>Status: Publicado</button>
        <button className="btn btn-outline" onClick={()=>applyBulkStatus('draft')}>Status: Rascunho</button>
        <button className="btn btn-secondary" onClick={()=>applyBulkVisibility(true)}>Exibir selecionados</button>
        <button className="btn btn-outline" onClick={()=>applyBulkVisibility(false)}>Ocultar selecionados</button>
      </div>

      <div className="mentorAdminGrid" aria-live="polite">
        {pageItems.length===0 ? (
          <div className="empty">Nenhum mentor</div>
        ) : pageItems.map(m => (
          <article key={m.id} className="mentorAdminCard">
            <div className="left">
              <input type="checkbox" aria-label={`Selecionar ${m.name}`} checked={selected.has(m.id)} onChange={e=>onToggleSelect(m.id, e.target.checked)} />
              <div className="avatar">
                {m.photo ? (<img src={m.photo} alt={`Foto de ${m.name}`} />) : null}
              </div>
            </div>
            <div className="center">
              <div className="header">
                <span className="name">{m.name}</span>
                <span className="spec">{m.specialty}</span>
              </div>
              <div className="bio">{m.bio}</div>
              <div className="contact">
                <span>📱 {m.phone || '(00) 00000-0000'}</span>
                <span>✉️ {m.email || 'email@exemplo.com'}</span>
              </div>
            </div>
            <div className="right">
              <div className="badges">
                <span className={`badge ${m.status==='published'?'badgeOk':'badgeNeutral'}`}>{m.status || 'draft'}</span>
                <span className={`badge ${m.visible?'badgeOk':'badgeWarn'}`}>{m.visible ? 'visível' : 'oculto'}</span>
              </div>
              <div className="actions btn-group">
                <button className="btn btn-secondary" onClick={()=>onEdit(m)}>Editar</button>
                <button className="btn btn-danger" onClick={()=>onDelete(m.id)}>Remover</button>
                <button className="btn btn-outline" onClick={()=>onUndo(m.id)}>Reverter</button>
                <button className="btn btn-outline" onClick={()=>toggleVisible(m)} aria-label={`Visibilidade ${m.name}`}>{m.visible ? 'Ocultar' : 'Exibir'}</button>
                <button className="btn btn-outline" onClick={()=>setHistoryOpen(historyOpen===m.id?null:m.id)}>{historyOpen===m.id?'Fechar histórico':'Histórico'}</button>
              </div>
              {historyOpen===m.id ? (<HistoryList mentorId={m.id} />) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="formRow" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <input aria-label="Nome" placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} aria-invalid={!!errors.name} />
        <input aria-label="Especialidade" placeholder="Especialidade" value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})} aria-invalid={!!errors.specialty} />
        <input aria-label="Bio" placeholder="Descrição" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} aria-invalid={!!errors.bio} />
        <input aria-label="E-mail" placeholder="E-mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} aria-invalid={!!errors.email} />
        <input aria-label="Telefone" placeholder="Telefone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} aria-invalid={!!errors.phone} />
        <input aria-label="Foto (URL)" placeholder="Foto (URL)" value={form.photo} onChange={e=>setForm({...form,photo:e.target.value})} />
        <input aria-label="Enviar foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onPhotoFile(e.target.files?.[0])} />
        <label style={{ alignSelf:'center' }}><input type="checkbox" checked={form.visible} onChange={e=>setForm({...form,visible:e.target.checked})} /> Visível</label>
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Rascunho</option><option value="published">Publicado</option></select>
        <button className="btn btn-primary" onClick={onSave} disabled={busy || Object.keys(errors).length>0} aria-busy={busy}>{editingId ? 'Atualizar' : 'Adicionar'} mentor</button>
      </div>
      <div className="errorRow" aria-live="polite">
        {Object.values(errors).length>0 && (
          <div className="errorList">{Object.values(errors).map((msg, i)=> (<span key={i} className="errorItem">{msg}</span>))}</div>
        )}
      </div>

      {/* Pré-visualização */}
      <div style={{ marginTop: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, padding: 12, maxWidth: 600 }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap: 12 }}>
            <div style={{ width: 100, height: 100, borderRadius: 12, background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.18)', overflow: 'hidden' }}>
              {form.photo ? (<img src={form.photo} alt="Prévia da foto" style={{ width:'100%', height:'100%', objectFit:'cover' }} />) : null}
            </div>
            <div>
              <div style={{ color:'#fff', fontWeight:700 }}>{form.name || 'Nome do mentor'}</div>
              <div style={{ color:'#A6A6A6' }}>{form.specialty || 'Especialidade'}</div>
              <div style={{ marginTop:8, color:'#A6A6A6' }}>{form.bio || 'Descrição curta'}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, display:'flex', gap:8, color:'#A6A6A6' }}>
            <span>{form.phone || '(00) 00000-0000'}</span>
            <span>{form.email || 'email@exemplo.com'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Ranking() {
  const { data: rk, refresh } = useRanking();
  const change = (id, delta) => { RankingRepo.updatePoints(id, delta); refresh(); };
  const [top3, setTop3] = React.useState(rk.top3);
  const onSaveTop3 = () => { RankingRepo.setTop3(top3); refresh(); };
  return (
    <div className="admin-content">
      <h1 className="title">Ranking</h1>
      <h3>Top 3</h3>
      <ul className="items">
        {top3.map((c, idx) => (
          <li key={c.id}
              className="item"
              draggable
              onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', String(idx)); }}
              onDragOver={(e)=> e.preventDefault()}
              onDrop={(e)=>{
                const from = Number(e.dataTransfer.getData('text/plain'));
                const to = idx;
                if (Number.isNaN(from)) return;
                const next = [...top3];
                const [moved] = next.splice(from,1);
                next.splice(to,0,moved);
                setTop3(next);
              }}
          >
            <span>{c.name}</span>
            <span>{c.points} pts</span>
            <div><button onClick={()=>change(c.id, +10)}>+10</button><button onClick={()=>change(c.id, -10)}>-10</button></div>
          </li>
        ))}
      </ul>
      <div className="formRow">
        {rk.all.slice(0,3).map((c, i) => (
          <select key={i} value={top3[i]?.id || ''} onChange={e=>{
            const selected = [...rk.top3, ...rk.all].find(x=>x.id===e.target.value);
            const next = [...top3]; next[i] = selected; setTop3(next);
          }} aria-label={`Posição ${i+1}`}>
            {[...rk.top3, ...rk.all].map(x => (<option key={x.id} value={x.id}>{x.name}</option>))}
          </select>
        ))}
        <button onClick={onSaveTop3}>Salvar Top 3</button>
      </div>
      <h3>Tabela geral</h3>
      <ul className="items">
        {[...rk.all].map(c => (<li key={c.id} className="item"><span>{c.name}</span><span>{c.points} pts</span><div><button onClick={()=>change(c.id, +10)}>+10</button><button onClick={()=>change(c.id, -10)}>-10</button></div></li>))}
      </ul>
    </div>
  );
}

export function Projetos() {
  const { data: list, loading, error, refresh } = useProjects();
  const [form, setForm] = React.useState({ titulo:'', owner:'', descricao:'', data_inicio:'', status:'rascunho', preco:0, progresso:0, visivel:false, thumb_url:'', tags:[] });
  const onSave = async () => { await ProjectsRepo.upsert(form); setForm({ titulo:'', owner:'', descricao:'', data_inicio:'', status:'rascunho', preco:0, progresso:0, visivel:false, thumb_url:'', tags:[] }); refresh(); };
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 5;
  const filtered = list.filter(p =>
    (p.title||p.titulo||'').toLowerCase().includes(query.toLowerCase()) ||
    (p.owner||'').toLowerCase().includes(query.toLowerCase()) ||
    (p.status||'').toLowerCase().includes(query.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);
  return (
    <div className="admin-content"><h1 className="title">Projetos</h1>
      <div className="formRow" style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
        <input aria-label="Buscar" placeholder="Buscar (título/owner/status)" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
        <button onClick={()=>setPage(Math.max(1, page-1))}>◀</button>
        <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
        <button onClick={()=>setPage(Math.min(totalPages, page+1))}>▶</button>
        <button onClick={()=>{
          const csv = adminStore.exportProjectsCsv();
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'projetos.csv'; a.click(); URL.revokeObjectURL(url);
        }}>Exportar CSV</button>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="table"><table><thead><tr><th>Título</th><th>Owner</th><th>Status</th><th>Preço</th><th>Progresso</th><th>📝</th><th>Visível</th><th>Ações</th></tr></thead><tbody>{pageItems.length===0 ? (<tr><td colSpan="8">Nenhum projeto</td></tr>) : pageItems.map(p=> (
        <tr key={p.id}>
          <td>{p.title || p.titulo}</td>
          <td>{p.owner}</td>
          <td>{p.status}</td>
          <td>R$ {p.price ?? p.preco ?? 0}</td>
          <td>{p.progress ?? p.progresso ?? 0}%</td>
          <td title={(p.description || p.descricao || '').slice(0, 200)}>{String(p.description || p.descricao || '').slice(0, 80) || '—'}</td>
          <td>{String(p.visible ?? p.visivel)}</td>
          <td>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={()=>setForm({ id:p.id, titulo:p.title||p.titulo||'', owner:p.owner||'', descricao:p.description||p.descricao||'', data_inicio:p.startDate||p.data_inicio||'', status:p.status||'rascunho', preco:p.price??0, progresso:p.progress??0, visivel:p.visible??false, thumb_url:p.thumb_url||'', tags:p.tags||[] })}>Editar</button>
              <button className="btn btn-outline" onClick={()=>ProjectsRepo.publish(p.id, !(p.visible ?? p.visivel))}>{(p.visible ?? p.visivel) ? 'Ocultar' : 'Publicar'}</button>
              <button className="btn btn-danger" onClick={async()=>{ if(!window.confirm('Arquivar este projeto?')) return; await fetch(`/api/projetos/${p.id}`, { method:'DELETE' }); refresh(); }}>Arquivar</button>
            </div>
          </td>
        </tr>
      ))}</tbody></table></div>
      <div className="formRow" style={{ gridTemplateColumns: 'repeat(6, minmax(0,1fr))' }}>
        <input aria-label="Título" placeholder="Título" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} />
        <input aria-label="Owner" placeholder="Owner" value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})} />
        <input aria-label="Thumb URL" placeholder="Thumb URL" value={form.thumb_url} onChange={e=>setForm({...form,thumb_url:e.target.value})} />
        <input aria-label="Data de início" type="date" value={form.data_inicio} onChange={e=>setForm({...form,data_inicio:e.target.value})} />
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="rascunho">rascunho</option><option value="ongoing">andamento</option><option value="finalizado">finalizado</option><option value="arquivado">arquivado</option></select>
        <input aria-label="Preço" placeholder="Preço" type="number" value={form.preco} onChange={e=>setForm({...form,preco:Number(e.target.value)})} />
        <input aria-label="Progresso" type="range" min="0" max="100" value={form.progresso} onChange={e=>setForm({...form,progresso:Number(e.target.value)})} />
        <textarea aria-label="Descrição do Projeto" placeholder="Descreva brevemente o objetivo e escopo do projeto..." maxLength={500} required value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} style={{ gridColumn: '1 / -1', minHeight: 80, resize: 'vertical' }} />
        <label><input type="checkbox" checked={form.visivel} onChange={e=>setForm({...form,visivel:e.target.checked})} /> Visível</label>
        <button onClick={onSave}>Salvar projeto</button>
      </div>
      {/* Preview de Card idêntico ao público */}
      <div style={{ marginTop: 12 }}>
        <div style={{ maxWidth: 600 }}>
          <ProjectPreviewCard form={form} />
        </div>
      </div>
    </div>
  );
}

function ProjectPreviewCard({ form }) {
  const project = {
    id: 'preview',
    titulo: form.titulo,
    owner: form.owner,
    descricao: form.descricao,
    data_inicio: form.data_inicio,
    status: form.status,
    progresso: form.progresso,
    thumb_url: form.thumb_url,
  };
  // Usa o mesmo componente público para garantir paridade visual
  return <ProjectCard project={project} />;
}

export function Desafios() {
  const { data: list, loading, error, refresh } = useDesafios();
  const [form, setForm] = React.useState({ name:'', objective:'', description:'', deadline:'', difficulty:'starter', tags:[], reward:'', base_points:0, delivery_type:'link', thumb_url:'', status:'draft', visible:true });
  const [editingId, setEditingId] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(null);
  const [details, setDetails] = React.useState(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState('');

  const onEdit = (d) => {
    setEditingId(d.id);
    setForm({
      id: d.id,
      name: d.name,
      objective: d.objective || '',
      description: d.description || '',
      deadline: d.deadline || '',
      difficulty: d.difficulty || 'starter',
      tags: Array.isArray(d.tags)?d.tags:[],
      reward: d.reward || '',
      base_points: Number(d.base_points ?? 0),
      delivery_type: d.delivery_type || 'link',
      thumb_url: d.thumb_url || '',
      status: d.status || 'draft',
      visible: !!d.visible,
    });
  };

  const toggleVisible = async (d) => {
    setBusy(true);
    try {
      await fetch(`/api/desafios/${d.id}/visibility`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ visible: !d.visible }) });
      refresh();
    } finally { setBusy(false); }
  };

  const toggleStatus = async (d) => {
    setBusy(true);
    try {
      const next = d.status === 'closed' ? 'active' : 'closed';
      await DesafiosRepo.setStatus(d.id, next);
      refresh();
    } finally { setBusy(false); }
  };

  const fetchDetails = async (id) => {
    setDetailsLoading(true);
    setDetailsError('');
    try {
      const r = await fetch(`/api/desafios/${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setDetails(json?.challenge || json);
    } catch {
      setDetailsError('Falha ao carregar detalhes');
    } finally { setDetailsLoading(false); }
  };

  const openDetails = async (d) => {
    const next = detailsOpen === d.id ? null : d.id;
    setDetailsOpen(next);
    setDetails(null);
    setDetailsError('');
    if (next) await fetchDetails(next);
  };

  React.useEffect(() => {
    const unsub = realtime.subscribe('desafios_changed', () => {
      refresh();
      if (detailsOpen) fetchDetails(detailsOpen);
    });
    return () => unsub();
  }, [detailsOpen, refresh]);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 5;
  const filtered = list.filter(d =>
    (d.name||'').toLowerCase().includes(query.toLowerCase()) ||
    (d.objective||'').toLowerCase().includes(query.toLowerCase()) ||
    (d.status||'').toLowerCase().includes(query.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);
  return (
    <div className="admin-content"><h1 className="title">Desafios</h1>
      <div className="formRow" style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
        <input aria-label="Buscar" placeholder="Buscar (nome/objetivo/status)" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
        <button onClick={()=>setPage(Math.max(1, page-1))}>◀</button>
        <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
        <button onClick={()=>setPage(Math.min(totalPages, page+1))}>▶</button>
        <button onClick={()=>{
          const csv = adminStore.exportDesafiosCsv();
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'desafios.csv'; a.click(); URL.revokeObjectURL(url);
        }}>Exportar CSV</button>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="table"><table><thead><tr><th>Nome</th><th>Status</th><th>Deadline</th><th>Base points</th><th>Visível</th><th>Ações</th></tr></thead><tbody>{pageItems.length===0 ? (<tr><td colSpan="6">Nenhum desafio</td></tr>) : pageItems.map(d=> (
        <React.Fragment key={d.id}>
          <tr>
            <td>{d.name}</td>
            <td>{d.status}</td>
            <td>{d.deadline ? new Date(d.deadline).toLocaleString('pt-BR') : '—'}</td>
            <td>{d.base_points ?? 0}</td>
            <td>{String(d.visible)}</td>
            <td>
              <div className="btn-group">
                <button className="btn btn-secondary" onClick={()=>onEdit(d)}>Editar</button>
                <button className="btn btn-outline" onClick={()=>toggleVisible(d)} aria-label={`Visibilidade ${d.name}`} disabled={busy}>{d.visible ? 'Ocultar' : 'Exibir'}</button>
                <button className="btn btn-danger" onClick={()=>toggleStatus(d)} disabled={busy}>{d.status==='closed'?'Reabrir':'Encerrar'}</button>
                <button className="btn btn-outline" onClick={()=>openDetails(d)}>{detailsOpen===d.id?'Fechar detalhes':'Detalhes'}</button>
              </div>
            </td>
          </tr>
          {detailsOpen===d.id && (
            <tr>
              <td colSpan="6">
                {detailsLoading && (<p>Carregando detalhes...</p>)}
                {detailsError && (<p role="alert">{detailsError}</p>)}
                {details && (
                  <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', borderRadius:12, padding:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <h4>Inscrições</h4>
                        {Array.isArray(details.registrations) && details.registrations.length>0 ? (
                          <ul className="items">
                            {details.registrations.map(r => (<li key={r.id} className="item"><span>{r.crafter_id}</span><span>{new Date(r.at).toLocaleString('pt-BR')}</span></li>))}
                          </ul>
                        ) : (<p>Nenhuma inscrição</p>)}
                      </div>
                      <div>
                        <h4>Entregas</h4>
                        {Array.isArray(details.submissions) && details.submissions.length>0 ? (
                          <ul className="items">
                            {details.submissions.map(s => (
                              <li key={s.id} className="item" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8 }}>
                                <span>
                                  <div><strong>{s.crafter_id}</strong></div>
                                  <div style={{ color:'#A6A6A6' }}>{s.delivery?.url || '-'}</div>
                                </span>
                                <span>{s.status || 'submitted'}</span>
                                <span>{s.score ?? 0} pts</span>
                                <span>
                                  <select aria-label={`Status submissão ${s.id}`} defaultValue={s.status || 'submitted'} id={`status-${s.id}`}>
                                    <option value="approved">aprovar</option>
                                    <option value="rejected">reprovar</option>
                                  </select>
                                  <input aria-label={`Pontos ${s.id}`} type="number" placeholder="+pts" defaultValue={s.score ?? details.base_points ?? 0} id={`pts-${s.id}`} style={{ width:80, marginLeft:6 }} />
                                  <button className="btn btn-primary" style={{ marginLeft:6 }} onClick={async()=>{
                                    const statusSel = document.getElementById(`status-${s.id}`);
                                    const ptsInput = document.getElementById(`pts-${s.id}`);
                                    const status = statusSel?.value || 'approved';
                                    const pts = Number(ptsInput?.value || 0);
                                    setBusy(true);
                                    try {
                                      await DesafiosRepo.reviewSubmission(s.id, { status, score: pts, review: { notes: '', criteria_scores: {} } });
                                      await fetchDetails(detailsOpen);
                                    } finally { setBusy(false); }
                                  }}>Revisar</button>
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (<p>Nenhuma entrega</p>)}
                      </div>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          )}
        </React.Fragment>
      ))}</tbody></table></div>
      <div className="formRow" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <input aria-label="Nome" placeholder="Nome" value={form?.name||''} onChange={e=>setForm({...form,name:e.target.value})} />
        <input aria-label="Objetivo" placeholder="Objetivo" value={form?.objective||''} onChange={e=>setForm({...form,objective:e.target.value})} />
        <input aria-label="Descrição" placeholder="Descrição" value={form?.description||''} onChange={e=>setForm({...form,description:e.target.value})} />
        <input aria-label="Deadline" type="datetime-local" value={form?.deadline||''} onChange={e=>setForm({...form,deadline:e.target.value})} />
        <select value={form?.difficulty||'starter'} onChange={e=>setForm({...form,difficulty:e.target.value})}><option value="starter">Starter</option><option value="intermediate">Intermediário</option><option value="pro">Pro</option></select>
        <input aria-label="Tags (vírgula)" placeholder="Tags" value={Array.isArray(form.tags)?form.tags.join(','):''} onChange={e=>setForm({...form,tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
        <input aria-label="Recompensa" placeholder="Recompensa" value={form?.reward||''} onChange={e=>setForm({...form,reward:e.target.value})} />
        <input aria-label="Base points" type="number" min="0" value={Number(form?.base_points||0)} onChange={e=>setForm({...form,base_points:Number(e.target.value)})} />
        <select value={form?.delivery_type||'link'} onChange={e=>setForm({...form,delivery_type:e.target.value})}><option value="link">Link</option><option value="github">GitHub</option><option value="file">File</option></select>
        <input aria-label="Thumb URL" placeholder="Thumb URL" value={form?.thumb_url||''} onChange={e=>setForm({...form,thumb_url:e.target.value})} />
        <select value={form?.status||'draft'} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Rascunho</option><option value="active">Ativo</option><option value="closed">Encerrado</option><option value="archived">Arquivado</option></select>
        <label><input type="checkbox" checked={!!form?.visible} onChange={e=>setForm({...form,visible:e.target.checked})} /> Visível</label>
        <button className="btn btn-primary" onClick={async()=>{ setBusy(true); try { const payload = editingId?{ ...form, id: editingId }: form; await DesafiosRepo.upsert(payload); setEditingId(null); setForm({ name:'', objective:'', description:'', deadline:'', difficulty:'starter', tags:[], reward:'', base_points:0, delivery_type:'link', thumb_url:'', status:'draft', visible:true }); refresh(); } finally { setBusy(false); } }} disabled={busy} aria-busy={busy}>{editingId ? 'Atualizar' : 'Salvar'} desafio</button>
        {editingId && (<button className="btn btn-outline" onClick={()=>{ setEditingId(null); setForm({ name:'', objective:'', description:'', deadline:'', difficulty:'starter', tags:[], reward:'', base_points:0, delivery_type:'link', thumb_url:'', status:'draft', visible:true }); }}>Cancelar edição</button>)}
      </div>
      {/* Pré-visualização */}
      <div style={{ marginTop: 12 }}>
        <div style={{ maxWidth: 600 }}>
          <ChallengePreviewCard form={form} />
        </div>
      </div>
    </div>
  );
}

function ChallengePreviewCard({ form }) {
  const challenge = {
    id: 'preview',
    name: form.name,
    objective: form.objective,
    description: form.description,
    deadline: form.deadline,
    base_points: form.base_points,
    reward: form.reward,
    status: form.status,
    visible: form.visible,
    difficulty: form.difficulty,
    tags: form.tags,
    delivery_type: form.delivery_type,
    thumb_url: form.thumb_url,
    created_by: 'preview',
    updated_at: new Date().toISOString(),
  };
  return <ChallengeCard challenge={challenge} />;
}

export function Financas() {
  const { data: list, loading, error, refresh } = useFinance();
  const onUpdate = async (f, patch) => { await FinanceRepo.update(f.id, patch); refresh(); };
  const onExport = () => {
    const csv = FinanceRepo.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'finance.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="admin-content"><h1 className="title">Finanças</h1>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <button className="btn" onClick={onExport}>Exportar CSV</button>
      <div className="table"><table><thead><tr><th>Item</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{list.length===0 ? (<tr><td colSpan="4">Sem registros</td></tr>) : list.map(f=> (
        <tr key={f.id}><td>{f.item}</td><td>R$ {f.valor}</td><td>{f.status}</td><td>
          <button onClick={()=>onUpdate(f,{ valor: f.valor + 50 })}>+50</button>
          <button onClick={()=>onUpdate(f,{ status: 'paid' })}>Marcar como pago</button>
        </td></tr>
      ))}</tbody></table></div>
    </div>
  );
}

export function Config() {
  const cfg = adminStore.get().config;
  const { data: logs } = useLogs();
  const [query, setQuery] = React.useState('');
  const filtered = logs.filter(l =>
    (l.type || '').toLowerCase().includes(query.toLowerCase()) ||
    (l.message || '').toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="admin-content"><h1 className="title">Configurações</h1>
      <p>Nome da plataforma: {cfg.name}</p>
      <p>Paleta base bloqueada</p>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="logQuery">Filtrar Logs</label>
        <input id="logQuery" aria-label="Filtro de logs" placeholder="Digite tipo ou texto..." value={query} onChange={e=>setQuery(e.target.value)} style={{ display:'block', padding:8, border:'1px solid #ccc', borderRadius:8, marginTop:6 }} />
      </div>
      <ul className="items" aria-live="polite" style={{ marginTop: 10 }}>
        {filtered.length === 0 ? (<li className="item">Nenhum log correspondente</li>) : filtered.slice(0,50).map(l => (
          <li key={l.id} className="item"><span className="logType">{l.type}</span><span className="logMsg">{l.message}</span><span className="logAt">{new Date(l.at).toLocaleString('pt-BR')}</span></li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="admin-page">
      <aside className="sidebar">
        <div className="brand">CodeCraft Gen-Z</div>
        <nav className="menu">
          <NavLink to="/admin" className={({isActive})=>`menuLink ${isActive?'active':''}`}>Dashboard</NavLink>
          <NavLink to="/admin/usuarios" className={({isActive})=>`menuLink ${isActive?'active':''}`}>Usuários</NavLink>
          <NavLink to="/admin/mentores" className={({isActive})=>`menuLink ${isActive?'active':''}`}>Mentores</NavLink>
          <NavLink to="/admin/ranking" className={({isActive})=>`menuLink ${isActive?'active':''}`}>Ranking</NavLink>
          <NavLink to="/admin/projetos" className={({isActive})=>`menuLink ${isActive?'active':''}`}>Projetos</NavLink>
          <NavLink to="/admin/desafios" className={({isActive})=>`menuLink ${isActive?'active':''}`}>Desafios</NavLink>
          <NavLink to="/admin/financas" className={({isActive})=>`menuLink ${isActive?'active':''}`}>Finanças</NavLink>
          <NavLink to="/admin/config" className={({isActive})=>`menuLink ${isActive?'active':''}`}>Config</NavLink>
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="welcome">Olá, {user?.name}</div>
          <button className="btn btn-danger" onClick={logout}>Sair</button>
        </header>
        <div className="content">
          {/* Render das rotas aninhadas controladas pelo App.jsx */}
          <Outlet />
        </div>
      </main>

      <style>{`
        /* Global containment for admin area */
        .admin-content, .admin-content * { box-sizing: border-box; }
        .admin-page { min-height: calc(100vh - 80px); display: grid; grid-template-columns: 260px 1fr; }
        .sidebar { background: #68007B; color: #F4F4F4; padding: 16px; border-right: 2px solid rgba(0,228,242,0.3); }
        .brand { font-family: 'Montserrat', system-ui, sans-serif; font-weight: 700; margin-bottom: 12px; }
        .menu { display: grid; gap: 8px; }
        .menuLink { color: #F4F4F4; text-decoration: none; padding: 10px 12px; border-radius: 10px; font-weight: 600; }
        .menuLink:hover { background: rgba(0,228,242,0.12); }
        .menuLink.active { background: rgba(0,228,242,0.22); color: #042326; }
        .main { background: transparent; min-width: 0; }
        .topbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; }
        /* Botões modernos */
        .btn { border: none; border-radius: 10px; padding: 8px 12px; cursor: pointer; font-weight: 600; transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease; font-size: 14px; min-height: 36px; max-width: 100%; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(0,0,0,0.18); }
        .btn:active { transform: translateY(0); box-shadow: none; }
        .btn-primary { background: #00E4F2; color: #062B31; }
        .btn-secondary { background: #7A3EF5; color: #fff; }
        .btn-outline { background: transparent; color: #F4F4F4; border: 1px solid rgba(255,255,255,0.28); }
        .btn-danger { background: #D12BF2; color: #fff; }
        .btn-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .btn-group .btn { flex: 0 0 auto; }
        .btn-icon { padding: 8px; width: 36px; height: 36px; display: grid; place-items: center; }
        .content { padding: 16px; min-width: 0; }
        .title { font-family: 'Montserrat', system-ui, sans-serif; font-weight: 700; }
        .cards { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
        .card { background: #F4F4F4; border: 1px solid rgba(0,228,242,0.2); border-radius: 12px; padding: 12px; overflow: hidden; min-width: 0; }
        .timeline { margin-top: 18px; }
        .logType { color: #00E4F2; margin-right: 8px; }
        .logMsg { color: #333; }
        .logAt { color: #A6A6A6; margin-left: 8px; }
        .items { list-style: none; padding: 0; display: grid; gap: 8px; max-height: 60vh; overflow-y: auto; min-width: 0; }
        .item { background: #F4F4F4; border: 1px solid rgba(0,228,242,0.2); border-radius: 12px; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
        .muted { color: #666; margin-left: 8px; }
        .table { overflow-x: auto; max-width: 100%; }
        .table table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; }
        .formRow { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 8px; margin-top: 12px; align-items: center; }
        .formRow > * { min-width: 0; }
        .formRow input, .formRow select { padding: 8px; border: 1px solid #ccc; border-radius: 8px; height: 36px; }
        .formRow button { background: #00E4F2; color: #062B31; border: none; border-radius: 10px; padding: 8px 10px; cursor: pointer; font-weight: 600; transition: transform 120ms ease, box-shadow 120ms ease; }
        .formRow button:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(0,0,0,0.18); }
        .formRow .btn { padding: 8px 10px; }
        .formRow input[aria-invalid="true"] { border-color: #D12BF2; outline: none; box-shadow: 0 0 0 2px rgba(209,43,242,0.15); }
        .errorRow { margin-top: 8px; }
        .errorList { display: flex; flex-wrap: wrap; gap: 6px; }
        .errorItem { font-size: 12px; color: #D12BF2; background: rgba(209,43,242,0.12); border: 1px solid rgba(209,43,242,0.2); border-radius: 999px; padding: 4px 8px; }
        .saveToast { margin-top: 8px; background: rgba(0,228,242,0.15); border: 1px solid rgba(0,228,242,0.3); color: #00E4F2; padding: 6px 10px; border-radius: 8px; animation: fadeInOut 1.8s ease both; }
        @keyframes fadeInOut { 0% { opacity: 0; transform: translateY(-4px); } 12% { opacity: 1; transform: translateY(0); } 88% { opacity: 1; } 100% { opacity: 0; transform: translateY(-4px); } }
        /* Mentores - grid responsiva e cards informativos */
        .mentorAdminGrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin-top: 10px; }
        .mentorAdminCard { display: grid; grid-template-columns: 120px 1fr minmax(220px, 28%); gap: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(0,228,242,0.25); border-radius: 12px; padding: 12px; color: #F4F4F4; transition: transform 160ms ease, box-shadow 160ms ease; min-width: 0; }
        .mentorAdminCard:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(0,0,0,0.26); }
        .mentorAdminCard .left { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 8px; min-width: 0; }
        .mentorAdminCard .avatar { width: 90px; height: 90px; border-radius: 12px; background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06)); border: 1px solid rgba(255,255,255,0.18); overflow: hidden; }
        .mentorAdminCard .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .mentorAdminCard .center { min-width: 0; }
        .mentorAdminCard .center .header { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
        .mentorAdminCard .name { font-weight: 700; }
        .mentorAdminCard .spec { color: #A6A6A6; }
        .mentorAdminCard .bio { margin-top: 6px; color: #D6D6D6; overflow: hidden; text-overflow: ellipsis; }
        .mentorAdminCard .contact { display: flex; gap: 12px; margin-top: 6px; color: #BEBEBE; flex-wrap: wrap; min-width: 0; }
        .mentorAdminCard .right { display: grid; gap: 8px; justify-items: end; min-width: 0; }
        .mentorAdminCard .badges { display: flex; gap: 6px; }
        .badge { font-size: 12px; padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); }
        .badgeOk { background: rgba(0,228,242,0.2); color: #00E4F2; }
        .badgeWarn { background: rgba(209,43,242,0.15); color: #D12BF2; }
        .badgeNeutral { background: rgba(255,255,255,0.08); color: #F4F4F4; }
        .mentorAdminCard .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
        .mentorAdminCard .actions .btn { min-width: 110px; }
        @media (max-width: 992px) { 
          .cards { grid-template-columns: repeat(2, 1fr); }
          .admin-page { grid-template-columns: 220px 1fr; }
          .mentorAdminGrid { grid-template-columns: 1fr; }
          .mentorAdminCard { grid-template-columns: 100px 1fr; }
          .mentorAdminCard .right { justify-items: start; }
        }
        @media (max-width: 768px) { 
          .admin-page { grid-template-columns: 1fr; }
          .sidebar { position: sticky; top: 80px; display: flex; overflow-x: auto; gap: 8px; }
          .menu { grid-auto-flow: column; grid-auto-columns: max-content; }
          .cards { grid-template-columns: 1fr; }
          .formRow { grid-template-columns: 1fr; }
        }
        @media (max-width: 576px) {
          .mentorAdminCard { grid-template-columns: 1fr; }
          .mentorAdminCard .actions { justify-content: stretch; }
          .mentorAdminCard .actions .btn { flex: 1 1 100%; min-width: 0; }
        }
      `}</style>
    </div>
  );
}