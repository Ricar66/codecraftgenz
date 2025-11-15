// src/admin/AdminLayout.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';


import ChallengeCard from '../components/Challenges/ChallengeCard.jsx';
import ProjectCard from '../components/Projects/ProjectCard.jsx';
import { useAuth } from '../context/useAuth';
import { useUsers, UsersRepo, useMentors, MentorsRepo, useProjects, ProjectsRepo, useDesafios, DesafiosRepo, useFinance, FinanceRepo, useRanking, RankingRepo, useLogs } from '../hooks/useAdminRepo';
import { apiRequest } from '../lib/apiConfig.js';
import { realtime } from '../lib/realtime';
import { getAllApps, updateApp } from '../services/appsAPI.js';

import AdminIdeias from './AdminIdeias.jsx';
import styles from './AdminLayout.module.css';
import './AdminCommon.css';

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
      if (import.meta.env.VITE_API_BASE) {
        const jsonResumo = await apiRequest(`/api/dashboard/resumo?periodo=${encodeURIComponent(periodo)}&type=${encodeURIComponent(tipo)}`, { method: 'GET' });
        setResumo(jsonResumo);
      }

      const jsonProj = await apiRequest(`/api/projetos?all=1`, { method: 'GET' }).catch(()=>({ data: [] }));
      setProjects(Array.isArray(jsonProj?.data) ? jsonProj.data : (Array.isArray(jsonProj?.projects) ? jsonProj.projects : []));
    } catch {
      setErro('Erro ao sincronizar com o dashboard');
    } finally { setLoading(false); }
  }, [periodo, tipo]);

  // Efeito inicial - executa apenas uma vez ou quando periodo/tipo mudam
  React.useEffect(() => { 
    fetchAll(); 
  }, [fetchAll]);

  // Efeito para realtime - usa referência estável
  React.useEffect(() => {
    const handleProjectsChange = () => fetchAll();
    const handleFinanceChange = () => fetchAll();
    
    const unsub1 = realtime.subscribe('projects_changed', handleProjectsChange);
    const unsub2 = realtime.subscribe('finance_changed', handleFinanceChange);
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
        <div className="card"><h3>🧩 Projetos Ativos</h3><p>{kpis.projetos_ativos || 0}</p></div>
        <div className="card"><h3>🏁 Projetos Finalizados</h3><p>{kpis.projetos_finalizados || 0}</p></div>
        <div className="card"><h3>💰 Receita Total</h3><p>R$ {(kpis.receita_total || 0).toLocaleString('pt-BR')}</p></div>
        <div className="card"><h3>⏳ Receita Pendente</h3><p>R$ {(kpis.receita_pendente || 0).toLocaleString('pt-BR')}</p></div>
        <div className="card"><h3>📈 Progresso Médio</h3><p>{kpis.media_progresso || 0}%</p></div>
        <div className="card"><h3>💳 Receita Paga</h3><p>R$ {(kpis.receita_paga || 0).toLocaleString('pt-BR')}</p></div>
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
            const total = pieData.reduce((acc, s) => acc + Math.abs(s.value || 0), 0);
            const cx=60, cy=60, r=50;
            if (total <= 0) {
              return (
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
                </svg>
              );
            }
            let acc = 0;
            return (
              <svg width="120" height="120" viewBox="0 0 120 120">
                {pieData.map((s, i) => {
                  const value = Math.abs(s.value || 0);
                  const start = (acc/total) * 2*Math.PI; acc += value;
                  const end = (acc/total) * 2*Math.PI;
                  const frac = total>0 ? value/total : 0;
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
      <section className="barras" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16 }}>
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
          <div style={{ height:18, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.16)', borderRadius:10 }}>
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
                <tr key={p.id}>
                  <td data-label="Projeto">{p.title}</td>
                  <td data-label="Status">{statusMap(p.status)}</td>
                  <td data-label="Valor">R$ {Number(p.price||0).toLocaleString('pt-BR')}</td>
                  <td data-label="Progresso">{Number(p.progress||0)}%</td>
                  <td data-label="Última Atualização">{p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR') : '—'}</td>
                </tr>
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
  const [pwdModal, setPwdModal] = React.useState({ open: false, userId: null, name: '', newPassword: '', confirm: '', saving: false, error: '' });
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
  const [validationErrors, setValidationErrors] = React.useState({});

  const validate = () => {
    const errors = {};
    if (!form.name) errors.name = 'Nome é obrigatório';
    if (!form.email) errors.email = 'Email é obrigatório';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Email inválido';
    if (!form.password) errors.password = 'Senha é obrigatória';
    if (form.password && form.password.length < 6) errors.password = 'Senha deve ter no mínimo 6 caracteres';
    return errors;
  };

  const handleCreateUser = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    await onCreate();
  };

  return (
    <div className="admin-content">
      <h1 className="title">Usuários</h1>
      <div className="filters-section">
        <div className="formRow" style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
          <input aria-label="Buscar" placeholder="Buscar (nome/e-mail/role)" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
          <button className="btn btn-outline" aria-label="Página anterior" onClick={()=>setPage(Math.max(1, page-1))}>◀</button>
          <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
          <button className="btn btn-outline" aria-label="Próxima página" onClick={()=>setPage(Math.min(totalPages, page+1))}>▶</button>
          <button className="btn btn-outline" onClick={()=>{
            // Gera CSV dos usuários atuais
            const headers = 'id,name,email,role,status\n';
            const rows = filtered.map(u => `${u.id},${u.name},${u.email},${u.role},${u.status}`).join('\n');
            const csv = headers + rows;
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'usuarios.csv'; a.click(); URL.revokeObjectURL(url);
          }}>Exportar CSV</button>
        </div>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="table" aria-busy={loading}>
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Role</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {pageItems.length === 0 ? (<tr><td colSpan="5">Nenhum usuário</td></tr>) : pageItems.map(u => (
              <tr key={u.id}>
                <td data-label="Nome">{u.name}</td>
                <td data-label="E-mail">{u.email}</td>
                <td data-label="Perfil">{u.role}</td>
                <td data-label="Status">{u.status}</td>
                <td data-label="Ações">
                  <button className="btn btn-secondary" onClick={()=>{UsersRepo.toggleStatus(u.id); refresh();}}>{u.status==='active'?'Desativar':'Ativar'}</button>
                  <select aria-label="Alterar perfil" value={u.role} onChange={async (e)=>{
                    const newRole = e.target.value;
                    if (newRole !== u.role) {
                      const res = await UsersRepo.update(u.id, { role: newRole });
                      if (!res.ok) { alert(res.error || 'Falha ao atualizar perfil'); } else { refresh(); }
                    }
                  }} style={{ marginLeft: 8 }}>
                    <option value="admin">admin</option>
                    <option value="editor">editor</option>
                    <option value="viewer">viewer</option>
                  </select>
                  <button
                    className="btn btn-outline"
                    style={{ marginLeft: 8 }}
                    onClick={() => setPwdModal({ open: true, userId: u.id, name: u.name, newPassword: '', confirm: '', saving: false, error: '' })}
                    aria-label={`Editar senha de ${u.name}`}
                  >
                    Editar senha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Novo Usuário</h3>
        <div className="formRow">
          <label className="sr-only" htmlFor="user-name">Nome</label>
          <input id="user-name" aria-label="Nome" placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          <label className="sr-only" htmlFor="user-email">E-mail</label>
          <input id="user-email" aria-label="E-mail" placeholder="E-mail" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
          <label className="sr-only" htmlFor="user-password">Senha</label>
          <input id="user-password" aria-label="Senha" placeholder="Senha" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
          <select aria-label="Perfil" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
          <button className="btn btn-primary" onClick={handleCreateUser} disabled={busy || Object.keys(validate()).length > 0}>{busy?'Criando...':'Criar usuário'}</button>
        </div>
      </section>
      <div className="formRow">
        {validationErrors.name && <span style={{ color: 'red' }}>{validationErrors.name}</span>}
        {validationErrors.email && <span style={{ color: 'red' }}>{validationErrors.email}</span>}
        {validationErrors.password && <span style={{ color: 'red' }}>{validationErrors.password}</span>}
      </div>

      {pwdModal.open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Editar senha de ${pwdModal.name}`}>
          <div className="modal">
            <h3 className="title">Editar senha</h3>
            <p className="muted">Usuário: {pwdModal.name}</p>
            {pwdModal.error && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {pwdModal.error}</p>}
            <div className="formRow">
              <label className="sr-only" htmlFor="new-password">Nova senha</label>
              <input
                id="new-password"
                type="password"
                placeholder="Nova senha"
                value={pwdModal.newPassword}
                onChange={(e)=>setPwdModal(s=>({ ...s, newPassword: e.target.value }))}
                aria-label="Nova senha"
              />
              <label className="sr-only" htmlFor="confirm-password">Confirmar senha</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Confirmar senha"
                value={pwdModal.confirm}
                onChange={(e)=>setPwdModal(s=>({ ...s, confirm: e.target.value }))}
                aria-label="Confirmar senha"
              />
            </div>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button
                className="btn btn-primary"
                onClick={async ()=>{
                  const npw = (pwdModal.newPassword||'').trim();
                  const cpw = (pwdModal.confirm||'').trim();
                  if (npw.length < 6) { setPwdModal(s=>({ ...s, error: 'Senha deve ter no mínimo 6 caracteres' })); return; }
                  if (npw !== cpw) { setPwdModal(s=>({ ...s, error: 'As senhas não coincidem' })); return; }
                  try {
                    setPwdModal(s=>({ ...s, saving: true, error: '' }));
                    const res = await UsersRepo.update(pwdModal.userId, { password: npw });
                    if (!res.ok) { setPwdModal(s=>({ ...s, saving: false, error: res.error || 'Falha ao atualizar senha' })); }
                    else { setPwdModal({ open: false, userId: null, name: '', newPassword: '', confirm: '', saving: false, error: '' }); refresh(); }
                  } catch (e) {
                    setPwdModal(s=>({ ...s, saving: false, error: e.message || 'Erro inesperado' }));
                  }
                }}
                disabled={pwdModal.saving}
              >
                {pwdModal.saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button className="btn btn-outline" onClick={()=>setPwdModal({ open:false, userId:null, name:'', newPassword:'', confirm:'', saving:false, error:'' })}>Cancelar</button>
            </div>
          </div>
          <style>{`
            .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; padding:16px; z-index: 50; }
            .modal { width: 100%; max-width: 520px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; }
            .title { color: var(--texto-branco); margin: 0 0 6px; }
            .muted { color: var(--texto-gelo); }
            .formRow input { padding: 10px 12px; border-radius: 10px; border:1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); color: var(--texto-branco); }
          `}</style>
        </div>
      )}
    </div>
  );
}

export function Mentores() {
  const { data: list, loading, error, refresh } = useMentors();
  const [form, setForm] = React.useState({ name: '', specialty: '', bio: '', email: '', phone: '', photo: '', avatar_url: '', status: 'published', visible: true });
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
  const onEdit = (m) => { setEditingId(m.id); setForm({ name:m.name, specialty:m.specialty, bio:m.bio, email:m.email, phone:m.phone, photo:m.photo||m.avatar_url||'', avatar_url:m.avatar_url||'', status:m.status||'draft', visible: !!m.visible }); };
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
      <div className="filters-section">
        <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto auto' }}>
          <input className="search-input" aria-label="Buscar" placeholder="Buscar por nome" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
          <input className="filter-input" aria-label="Filtrar especialidade" placeholder="Especialidade" value={filterSpec} onChange={e=>{setFilterSpec(e.target.value); setPage(1);}} />
          <select className="filter-select" aria-label="Status" value={filterStatus} onChange={e=>{setFilterStatus(e.target.value); setPage(1);}}>
            <option value="">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
          <button className="btn btn-outline btn-icon" onClick={()=>setPage(Math.max(1, page-1))}>◀</button>
          <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
          <button className="btn btn-outline btn-icon" onClick={()=>setPage(Math.min(totalPages, page+1))}>▶</button>
        </div>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="filters-section">
        <div className="formRow" style={{ gridTemplateColumns: 'auto auto auto auto auto' }}>
          <label style={{ alignSelf:'center' }}><input type="checkbox" onChange={e=>onSelectAllPage(e.target.checked)} /> Selecionar página</label>
          <button className="btn btn-primary" onClick={()=>applyBulkStatus('published')}>Status: Publicado</button>
          <button className="btn btn-outline" onClick={()=>applyBulkStatus('draft')}>Status: Rascunho</button>
          <button className="btn btn-secondary" onClick={()=>applyBulkVisibility(true)}>Exibir selecionados</button>
          <button className="btn btn-outline" onClick={()=>applyBulkVisibility(false)}>Ocultar selecionados</button>
        </div>
      </div>

      <div className="mentorAdminGrid" aria-live="polite">
        {pageItems.length===0 ? (
          <div className="empty">Nenhum mentor</div>
        ) : pageItems.map(m => (
          <article key={m.id} className="mentorAdminCard">
            <div className="left">
              <input type="checkbox" aria-label={`Selecionar ${m.name}`} checked={selected.has(m.id)} onChange={e=>onToggleSelect(m.id, e.target.checked)} />
              <div className="avatar">
                {m.photo || m.avatar_url ? (<img src={m.photo || m.avatar_url} alt={`Foto de ${m.name}`} />) : null}
              </div>
            </div>
            <div className="center">
              <div className="header">
                <span className="name">{m.name}</span>
                <span className="spec">{m.specialty}</span>
              </div>
              {m.specialty ? (
                <div className="chips" aria-label="Tags">
                  <span className="chip">{m.specialty}</span>
                </div>
              ) : null}
              <div className="bio">{m.bio}</div>
              <div className="contact">
                <span>📱 {m.phone || '(00) 00000-0000'}</span>
                <span>✉️ {m.email || 'email@exemplo.com'}</span>
              </div>
              <div className="stats">
                {m.created_at ? (<span className="stat-item">Mentor desde {new Date(m.created_at).toLocaleDateString('pt-BR', { month:'2-digit', year:'numeric' })}</span>) : null}
                {m.updated_at ? (<span className="stat-item">Atualizado {new Date(m.updated_at).toLocaleDateString('pt-BR')}</span>) : null}
              </div>
            </div>
            <div className="right">
              <div className="badges">
                <span className={`badge ${m.status==='published'?'badgeOk':'badgeNeutral'}`}>{m.status || 'draft'}</span>
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

      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{editingId ? '✏️ Editar Mentor' : '➕ Novo Mentor'}</h3>
        <div className="formRow" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <input aria-label="Nome" placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} aria-invalid={!!errors.name} aria-required="true" required />
              <input aria-label="Especialidade" placeholder="Especialidade" value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})} aria-invalid={!!errors.specialty} aria-required="true" required />
            </div>
            <div className="formRow">
              <input aria-label="Bio" placeholder="Descrição" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} aria-invalid={!!errors.bio} aria-required="true" required />
            </div>
            <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <input aria-label="E-mail" placeholder="E-mail" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} aria-invalid={!!errors.email} />
              <input aria-label="Telefone" placeholder="Telefone" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} aria-invalid={!!errors.phone} />
            </div>
            <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <input aria-label="Foto (URL)" placeholder="Foto (URL)" value={form.photo} onChange={e=>setForm({...form,photo:e.target.value})} />
              <input aria-label="Enviar foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onPhotoFile(e.target.files?.[0])} />
            </div>
            <div className="formRow">
              <input aria-label="Avatar URL (banco)" placeholder="Avatar URL (banco)" value={form.avatar_url} onChange={e=>setForm({...form,avatar_url:e.target.value})} />
            </div>
            <div className="formRow">
              <label className="checkbox-row" style={{ alignSelf:'center' }}><input type="checkbox" checked={form.visible} onChange={e=>setForm({...form,visible:e.target.checked})} /> Visível</label>
            </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            {(form.photo || form.avatar_url) && <img src={form.photo || form.avatar_url} alt="Preview" style={{maxWidth: '100px', maxHeight: '100px'}}/>}
          </div>
        </div>
        <div className="formRow">
          <button className="btn btn-primary" onClick={onSave} disabled={busy || Object.keys(errors).length > 0}>{busy?'Salvando...':(editingId?'Atualizar':'Salvar')}</button>
          {editingId && (<button className="btn btn-outline" onClick={()=>{ setEditingId(null); setForm({ name: '', specialty: '', bio: '', email: '', phone: '', photo: '', avatar_url: '', status: 'published', visible: true }); }}>Cancelar</button>)}
          <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Rascunho</option><option value="published">Publicado</option></select>
        </div>
      </section>
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
              {(form.photo || form.avatar_url) ? (<img src={form.photo || form.avatar_url} alt="Prévia da foto" style={{ width:'100%', height:'100%', objectFit:'cover' }} />) : null}
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
  const { data: rk, loading, error, refresh } = useRanking();
  const [busy, setBusy] = React.useState(false);
  const [filters, setFilters] = React.useState({ search: '', min_points: '', max_points: '', active_only: true, sort: 'points' });
  const [crafterForm, setCrafterForm] = React.useState({ name: '', avatar_url: '', points: 0, active: true });
  const [crafterErrors, setCrafterErrors] = React.useState({});
  const [isCrafterModalOpen, setCrafterModalOpen] = React.useState(false);

  // Ensure rk is an object with expected properties
  const rankingData = React.useMemo(() => {
    if (!rk || Array.isArray(rk)) {
      return { top3: [], table: [], all: [] };
    }
    return {
      top3: rk.top3 || [],
      table: rk.table || [],
      all: rk.all || rk.crafters || []
    };
  }, [rk]);

  // Utilizar listas seguras e instrumentar logs para depuração
  const allList = Array.isArray(rankingData.all) ? rankingData.all : [];
  if (typeof window !== 'undefined' && !Array.isArray(rankingData.all)) {
    console.warn('[Ranking] rankingData.all não é array:', rankingData.all);
  }

  // Podium management
  const [top3, setTop3] = React.useState(rankingData.top3 || []);
  const [podiumRewards, setPodiumRewards] = React.useState({});

  React.useEffect(() => {
    if (rankingData.top3) {
      setTop3(rankingData.top3);
      const rewards = {};
      rankingData.top3.forEach(t => rewards[t.position] = t.reward || '');
      setPodiumRewards(rewards);
    }
  }, [rankingData.top3]);

  const change = async (id, delta, reason = '') => {
    setBusy(true);
    try {
      await RankingRepo.updatePoints(id, { delta, reason: reason || `Ajuste manual ${delta > 0 ? '+' : ''}${delta}` });
      refresh();
    } finally { setBusy(false); }
  };

  const setPoints = async (id, points, reason = '') => {
    setBusy(true);
    try {
      await RankingRepo.updatePoints(id, { set: points, reason: reason || `Definir ${points} pontos` });
      refresh();
    } finally { setBusy(false); }
  };

  const onSaveTop3 = async () => {
    setBusy(true);
    try {
      const payload = (top3 || []).map((t, i) => ({
        crafter_id: t.id,
        position: i + 1,
        reward: podiumRewards[i + 1] || ''
      }));
      await RankingRepo.setTop3(payload);
      refresh();
    } finally { setBusy(false); }
  };

  const validateCrafter = (form) => {
    const errs = {};
    if (!String(form.name || '').trim()) errs.name = 'Nome é obrigatório';
    if (form.points === '' || isNaN(Number(form.points))) errs.points = 'Pontos inválidos';
    if (Number(form.points) < 0) errs.points = 'Pontos não podem ser negativos';
    if (String(form.avatar_url || '').trim()) {
      const ok = /^https?:\/\/\S+/.test(String(form.avatar_url));
      if (!ok) errs.avatar_url = 'URL do avatar inválida';
    }
    return errs;
  };

  const createCrafter = async () => {
    const errs = validateCrafter(crafterForm);
    setCrafterErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    try {
      await apiRequest('/api/crafters', { method: 'POST', body: JSON.stringify(crafterForm) });
      setCrafterForm({ name: '', avatar_url: '', points: 0, active: true });
      setCrafterModalOpen(false);
      refresh();
    } finally { setBusy(false); }
  };

  const updateCrafter = async (id, updates) => {
    setBusy(true);
    try {
      await apiRequest(`/api/crafters/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      refresh();
    } finally { setBusy(false); }
  };

  // Filter and sort crafters
  const filteredCrafters = React.useMemo(() => {
    let crafters = [...(rankingData.table || [])];
    
    if (filters.search) {
      crafters = crafters.filter(c => 
        c.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.min_points) {
      crafters = crafters.filter(c => c.points >= Number(filters.min_points));
    }
    
    if (filters.max_points) {
      crafters = crafters.filter(c => c.points <= Number(filters.max_points));
    }
    
    if (filters.active_only) {
      crafters = crafters.filter(c => c.active !== false);
    }
    
    if (filters.sort === 'points') {
      crafters.sort((a, b) => b.points - a.points);
    } else if (filters.sort === 'name') {
      crafters.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return crafters;
  }, [rankingData.table, filters]);

  const resetFilters = () => {
    setFilters({ search: '', min_points: '', max_points: '', active_only: true, sort: 'points' });
  };

  if (loading) return <div className="admin-content"><h1 className="title">Ranking</h1><p>Carregando...</p></div>;
  if (error) return <div className="admin-content"><h1 className="title">Ranking</h1><p role="alert">{error}</p></div>;

  return (
    <div className="admin-content">
      <h1 className="title">Ranking</h1>
      
      {/* Podium Editor */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <h3>Editor de Pódio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          {[1, 2, 3].map(position => {
            const crafter = (top3 || []).find(t => t.position === position) || (top3 || [])[position - 1];
            const isSelected = crafter?.id;
            const isDuplicate = isSelected && (top3 || []).filter(t => t.id === crafter.id).length > 1;
            
            return (
              <div key={position} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                padding: '1rem',
                border: `2px solid ${isDuplicate ? '#ff4444' : isSelected ? '#D12BF2' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                background: isDuplicate ? 'rgba(255,68,68,0.1)' : isSelected ? 'rgba(209,43,242,0.1)' : 'transparent'
              }}>
                <label style={{ 
                  fontWeight: 600, 
                  color: isDuplicate ? '#ff4444' : '#D12BF2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Posição {position}
                  {position === 1 && '🥇'}
                  {position === 2 && '🥈'}
                  {position === 3 && '🥉'}
                  {isDuplicate && <span style={{ color: '#ff4444', fontSize: '0.8rem' }}>⚠️ Duplicado</span>}
                </label>
                <select 
                  value={crafter?.id || ''} 
                  onChange={e => {
                    const selected = allList.find(c => c.id === e.target.value);
                    if (selected) {
                      const newTop3 = [...top3];
                      newTop3[position - 1] = { ...selected, position };
                      setTop3(newTop3);
                    } else {
                      const newTop3 = [...top3];
                      newTop3[position - 1] = null;
                      setTop3(newTop3.filter(Boolean));
                    }
                  }}
                  style={{
                    border: isDuplicate ? '2px solid #ff4444' : '1px solid rgba(255,255,255,0.2)',
                    background: isDuplicate ? 'rgba(255,68,68,0.1)' : 'rgba(0,0,0,0.3)'
                  }}
                >
                  <option value="">Selecionar crafter</option>
                  {allList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.points} pts)</option>
                  ))}
                </select>
                <input 
                  placeholder="Recompensa (opcional)"
                  value={podiumRewards[position] || ''}
                  onChange={e => setPodiumRewards(prev => ({ ...prev, [position]: e.target.value }))}
                  style={{
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'white',
                    padding: '0.5rem',
                    borderRadius: '4px'
                  }}
                />
                {isSelected && (
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                    {crafter.points} pontos
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Validação e Status */}
        <div style={{ marginBottom: '1rem' }}>
          {(() => {
            const selectedIds = (top3 || []).filter(t => t?.id).map(t => t.id);
            const hasDuplicates = selectedIds.length !== new Set(selectedIds).size;
            const isComplete = (top3 || []).length === 3 && (top3 || []).every(t => t?.id);
            const isEmpty = (top3 || []).length === 0;
            
            if (hasDuplicates) {
              return (
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'rgba(255,68,68,0.1)', 
                  border: '1px solid #ff4444', 
                  borderRadius: '6px',
                  color: '#ff4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ⚠️ <strong>Erro:</strong> Não é possível selecionar o mesmo crafter em múltiplas posições
                </div>
              );
            }
            
            if (isComplete) {
              return (
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'rgba(34,197,94,0.1)', 
                  border: '1px solid #22c55e', 
                  borderRadius: '6px',
                  color: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ✅ <strong>Pódio completo!</strong> Pronto para salvar
                </div>
              );
            }
            
            if (!isEmpty && selectedIds.length > 0) {
              return (
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'rgba(251,191,36,0.1)', 
                  border: '1px solid #fbbf24', 
                  borderRadius: '6px',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ⏳ <strong>Pódio incompleto:</strong> Selecione crafters para todas as 3 posições
                </div>
              );
            }
            
            return null;
          })()}
        </div>
        <div className="formRow">
          {(() => {
            const selectedIds = (top3 || []).filter(t => t?.id).map(t => t.id);
            const hasDuplicates = selectedIds.length !== new Set(selectedIds).size;
            const isComplete = (top3 || []).length === 3 && (top3 || []).every(t => t?.id);
            const hasSelection = selectedIds.length > 0;
            
            return (
              <>
                <button 
                  className="btn btn-primary" 
                  onClick={onSaveTop3} 
                  disabled={busy || !isComplete || hasDuplicates}
                  style={{
                    opacity: (!isComplete || hasDuplicates) ? 0.5 : 1,
                    cursor: (!isComplete || hasDuplicates) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {busy ? 'Salvando...' : 'Salvar Pódio 🚀'}
                </button>
                <button 
                  className="btn btn-outline" 
                  onClick={() => {
                    setTop3([]);
                    setPodiumRewards({});
                  }}
                  disabled={busy || !hasSelection}
                  style={{
                    opacity: !hasSelection ? 0.5 : 1,
                    cursor: !hasSelection ? 'not-allowed' : 'pointer'
                  }}
                >
                  Limpar Pódio
                </button>
              </>
            );
          })()}
        </div>
      </section>

      {/* Crafter Management */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3>Gerenciar Crafters</h3>
          <button className="btn btn-primary" onClick={() => setCrafterModalOpen(true)}>Novo Crafter</button>
        </div>

        {isCrafterModalOpen && (
          <div role="dialog" aria-modal="true" aria-label="Novo crafter" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div style={{ width:'min(560px, 92vw)', background:'rgba(20,20,20,0.95)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <h4 style={{ margin:0 }}>Novo Crafter</h4>
                <button className="btn btn-outline" onClick={() => { setCrafterModalOpen(false); setCrafterErrors({}); }}>Fechar</button>
              </div>
              <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <input aria-label="Nome" placeholder="Nome do crafter" value={crafterForm.name} onChange={e => setCrafterForm(prev => ({ ...prev, name: e.target.value }))} aria-invalid={!!crafterErrors.name} />
                <input aria-label="Avatar URL" placeholder="Avatar URL (opcional)" value={crafterForm.avatar_url} onChange={e => setCrafterForm(prev => ({ ...prev, avatar_url: e.target.value }))} aria-invalid={!!crafterErrors.avatar_url} />
              </div>
              <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <input aria-label="Pontos iniciais" type="number" placeholder="Pontos iniciais" value={crafterForm.points} onChange={e => setCrafterForm(prev => ({ ...prev, points: Number(e.target.value) }))} aria-invalid={!!crafterErrors.points} />
                <label style={{ alignSelf:'center' }}><input type="checkbox" checked={crafterForm.active} onChange={e => setCrafterForm(prev => ({ ...prev, active: e.target.checked }))} /> Ativo</label>
              </div>
              {crafterForm.avatar_url && (
                <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                  <img src={crafterForm.avatar_url} alt="Prévia do avatar" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'1px solid rgba(255,255,255,0.2)' }} />
                </div>
              )}
              <div className="errorRow" aria-live="polite">
                {Object.values(crafterErrors).length>0 && (
                  <div className="errorList">{Object.values(crafterErrors).map((msg, i)=> (<span key={i} className="errorItem">{msg}</span>))}</div>
                )}
              </div>
              <div className="formRow">
                <button className="btn btn-primary" onClick={createCrafter} disabled={busy || Object.keys(crafterErrors).length>0 || !crafterForm.name}>{busy?'Salvando...':'Salvar crafter'}</button>
                <button className="btn btn-outline" onClick={() => { setCrafterModalOpen(false); setCrafterErrors({}); }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Filters */}
      <section className="filters-section" style={{ marginBottom: '2rem' }}>
        <h3>Filtros</h3>
        <div className="formRow">
          <input 
            placeholder="Buscar por nome"
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          <input 
            type="number"
            placeholder="Pontos mín."
            value={filters.min_points}
            onChange={e => setFilters(prev => ({ ...prev, min_points: e.target.value }))}
          />
          <input 
            type="number"
            placeholder="Pontos máx."
            value={filters.max_points}
            onChange={e => setFilters(prev => ({ ...prev, max_points: e.target.value }))}
          />
          <select 
            value={filters.sort}
            onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
          >
            <option value="points">Ordenar por pontos</option>
            <option value="name">Ordenar por nome</option>
          </select>
          <label>
            <input 
              type="checkbox"
              checked={filters.active_only}
              onChange={e => setFilters(prev => ({ ...prev, active_only: e.target.checked }))}
            />
            Apenas ativos
          </label>
          <button className="btn btn-outline" onClick={resetFilters}>
            Reset Filtros
          </button>
        </div>
      </section>

      {/* Crafters Table */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <h3>Tabela Geral</h3>
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Avatar</th>
                <th>Nome</th>
                <th>Pontos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(filteredCrafters) ? filteredCrafters : []).map((c, index) => (
                <tr key={c.id}>
                  <td>{index + 1}</td>
                  <td>
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D12BF2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td>{c.name}</td>
                  <td>{c.points} pts</td>
                  <td>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: c.active !== false ? 'rgba(0, 228, 242, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: c.active !== false ? '#00E4F2' : 'rgba(255, 255, 255, 0.6)' }}>
                      {c.active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-sm" onClick={() => change(c.id, 10)} disabled={busy}>+10</button>
                      <button className="btn btn-sm" onClick={() => change(c.id, -10)} disabled={busy}>-10</button>
                      <button 
                        className="btn btn-sm btn-outline" 
                        onClick={() => {
                          const points = prompt('Definir pontos:', c.points);
                          if (points !== null && !isNaN(points)) {
                            setPoints(c.id, Number(points));
                          }
                        }}
                        disabled={busy}
                      >
                        SET
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => {
                          if (window.confirm(`Zerar pontos de ${c.name}?`)) {
                            setPoints(c.id, 0, 'Zerado pelo admin');
                          }
                        }}
                        disabled={busy}
                      >
                        Zerar
                      </button>
                      <button 
                        className="btn btn-sm btn-outline" 
                        onClick={() => updateCrafter(c.id, { active: !c.active })}
                        disabled={busy}
                      >
                        {c.active !== false ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function Projetos() {
  const { data: list, loading, error, refresh } = useProjects({ useAdminStore: true });
  const [form, setForm] = React.useState({ titulo:'', owner:'', descricao:'', data_inicio:'', status:'rascunho', preco:0, progresso:0, thumb_url:'', tags:[] });
  
  const onSave = async () => { 
    try {
      const savedProject = await ProjectsRepo.upsert(form);

      
      // Cria/atualiza card de aplicativo automaticamente quando projeto finalizado
      try {
        if ((form.status || '').toLowerCase() === 'finalizado') {
          const inferredOwnerId = String(form.owner || '').toLowerCase().includes('admin') ? 1 : 2;
          const appPayload = {
            name: form.titulo,
            mainFeature: (form.descricao || '').split('.').shift(),
            price: Number(form.preco || 0),
            thumbnail: form.thumb_url || '',
            project_id: savedProject.id || form.id,
            ownerId: inferredOwnerId
          };
          // endpoint backend para criar app a partir do projeto
          await apiRequest(`/api/apps/from-project/${savedProject.id || form.id}`, { method: 'POST', body: JSON.stringify(appPayload) });
        }
      } catch (appErr) {
        console.warn('Erro ao criar app a partir do projeto:', appErr);
      }

      setForm({ titulo:'', owner:'', descricao:'', data_inicio:'', status:'rascunho', preco:0, progresso:0, visivel:false, thumb_url:'', tags:[] }); 
      refresh(); 
    } catch (error) {
      alert('Erro ao salvar projeto: ' + error.message);
    }
  };
  
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
    <div className="admin-content">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="title">🎯 Gestão de Projetos</h1>
          <p className="muted">Gerencie projetos e integração automática com finanças</p>
        </div>
        <button onClick={()=>{
          // Gera CSV dos projetos atuais
          const headers = 'id,title,status,price,startDate,progress\n';
          const rows = filtered.map(p => `${p.id},"${p.title}",${p.status},${p.price || 0},${p.startDate || ''},${p.progress ?? p.progresso ?? 0}`).join('\n');
          const csv = headers + rows;
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'projetos.csv'; a.click(); URL.revokeObjectURL(url);
        }} className="btn btn-primary">📤 Exportar CSV</button>
      </header>
      
      <div className="filters-section">
        <div className="formRow" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
          <input aria-label="Buscar" placeholder="🔍 Buscar (título/owner/status)" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
          <button className="btn btn-outline" onClick={()=>setPage(Math.max(1, page-1))} aria-label="Página anterior">◀</button>
          <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
          <button className="btn btn-outline" onClick={()=>setPage(Math.min(totalPages, page+1))} aria-label="Página seguinte">▶</button>
        </div>
      </div>
      
      {loading && <p>🔄 Carregando...</p>}
      {error && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {error}</p>}
      
      <div className="table"><table><thead><tr><th>Título</th><th>Owner</th><th>Status</th><th>Preço</th><th>Progresso</th><th>📝</th><th>Ações</th></tr></thead><tbody>{pageItems.length===0 ? (<tr><td colSpan="7">📭 Nenhum projeto</td></tr>) : pageItems.map(p=> (
        <tr key={p.id}>
          <td data-label="Título" style={{ fontWeight: 'bold' }}>{p.title || p.titulo}</td>
          <td data-label="Owner">{p.owner}</td>
          <td data-label="Status">
            <span style={{ 
              background: p.status === 'finalizado' ? '#00E4F2' : p.status === 'ongoing' ? '#FFA500' : '#666', 
              color: '#fff', 
              padding: '4px 8px', 
              borderRadius: '12px', 
              fontSize: '0.8em',
              fontWeight: 'bold'
            }}>
              {p.status}
            </span>
          </td>
          <td data-label="Preço" style={{ fontWeight: 'bold', color: '#00E4F2' }}>R$ {(p.price ?? p.preco ?? 0).toLocaleString('pt-BR')}</td>
          <td data-label="Progresso">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 60, height: 6, background: '#E0E0E0', borderRadius: 3 }}>
                <div style={{ 
                  width: `${p.progress ?? p.progresso ?? 0}%`, 
                  height: '100%', 
                  background: '#00E4F2', 
                  borderRadius: 3 
                }} />
              </div>
              <span style={{ fontSize: '0.8em' }}>{p.progress ?? p.progresso ?? 0}%</span>
            </div>
          </td>
          <td data-label="Resumo" title={(p.description || p.descricao || '').slice(0, 200)}>{String(p.description || p.descricao || '').slice(0, 80) || '—'}</td>
          <td data-label="Ações">
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={()=>setForm({ id:p.id, titulo:p.title||p.titulo||'', owner:p.owner||'', descricao:p.description||p.descricao||'', data_inicio:p.startDate||p.data_inicio||'', status:p.status||'rascunho', preco:p.price??0, progresso:p.progress??0, thumb_url:p.thumb_url||'', tags:p.tags||[] })}>✏️</button>
              <button className="btn btn-danger" onClick={async()=>{ if(!window.confirm('Deletar este projeto?')) return; await apiRequest(`/api/projetos/${p.id}`, { method:'DELETE' }); refresh(); }}>🗑️</button>
            </div>
          </td>
        </tr>
      ))}</tbody></table></div>
      
      {/* Formulário melhorado */}
  <section className="card" style={{ padding: 20, marginTop: 20 }}>
        <h3 style={{ marginBottom: 16 }}>
          {form.id ? '✏️ Editar Projeto' : '➕ Novo Projeto'}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <input aria-label="Título" placeholder="Título do projeto" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} />
          <input aria-label="Owner" placeholder="Responsável/Owner" value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})} />
          <input aria-label="Thumb URL" placeholder="URL da imagem" value={form.thumb_url} onChange={e=>setForm({...form,thumb_url:e.target.value})} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <input aria-label="Data de início" type="date" value={form.data_inicio} onChange={e=>setForm({...form,data_inicio:e.target.value})} />
          <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
            <option value="rascunho">📝 Rascunho</option>
            <option value="ongoing">🔄 Andamento</option>
            <option value="finalizado">✅ Finalizado</option>
            {/* Removido status de arquivado para promover deleção definitiva */}
          </select>
          <input aria-label="Preço" placeholder="Preço (R$)" type="number" value={form.preco} onChange={e=>setForm({...form,preco:Number(e.target.value)})} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.9em' }}>Progresso:</label>
            <input aria-label="Progresso" type="range" min="0" max="100" value={form.progresso} onChange={e=>setForm({...form,progresso:Number(e.target.value)})} style={{ flex: 1 }} />
            <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{form.progresso}%</span>
          </div>
        </div>

        <textarea 
          aria-label="Descrição do Projeto" 
          placeholder="Descreva brevemente o objetivo e escopo do projeto..." 
          maxLength={500} 
          required 
          value={form.descricao} 
          onChange={e=>setForm({...form,descricao:e.target.value})} 
          style={{ width: '100%', minHeight: 80, resize: 'vertical', marginBottom: 16 }} 
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9em', color: '#666' }}>Dica: Controle a visibilidade usando o campo de status (rascunho/ongoing/finalizado).</span>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={onSave}>
              {form.id ? '💾 Atualizar' : '➕ Criar'} Projeto
            </button>
            {form.id && (
              <button className="btn btn-outline" onClick={() => setForm({ titulo:'', owner:'', descricao:'', data_inicio:'', status:'rascunho', preco:0, progresso:0, thumb_url:'', tags:[] })}>
                ❌ Cancelar
              </button>
            )}
          </div>
        </div>
        
        {form.preco > 0 && (
          <div style={{ marginTop: 12, padding: 12, background: '#E8F5E8', borderRadius: 8, border: '1px solid #00E4F2' }}>
            <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
              💰 <strong>Integração Financeira:</strong> Um registro financeiro será criado automaticamente com valor de R$ {form.preco.toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </section>
      
      {/* Preview de Card idêntico ao público */}
      {form.titulo && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ marginBottom: 12, color: '#666' }}>👀 Preview do Card Público:</h4>
          <div style={{ maxWidth: 600 }}>
            <ProjectPreviewCard form={form} />
          </div>
        </div>
      )}
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
      await apiRequest(`/api/desafios/${d.id}/visibility`, { method:'PUT', body: JSON.stringify({ visible: !d.visible }) });
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
      const json = await apiRequest(`/api/desafios/${id}`, { method: 'GET' });
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
      <div className="filters-section">
        <div className="formRow" style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
          <input aria-label="Buscar" placeholder="Buscar (nome/objetivo/status)" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
          <button className="btn btn-outline" onClick={()=>setPage(Math.max(1, page-1))} aria-label="Página anterior">◀</button>
          <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
          <button className="btn btn-outline" onClick={()=>setPage(Math.min(totalPages, page+1))} aria-label="Página seguinte">▶</button>
          <button className="btn btn-outline" onClick={()=>{
            // Gera CSV dos desafios atuais
            const headers = 'id,name,objective,status,visible,deadline,base_points\n';
            const rows = filtered.map(d => `${d.id},"${d.name}","${d.objective}",${d.status},${d.visible},${d.deadline || ''},${d.base_points || 0}`).join('\n');
            const csv = headers + rows;
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'desafios.csv'; a.click(); URL.revokeObjectURL(url);
          }}>Exportar CSV</button>
        </div>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="table"><table><thead><tr><th>Nome</th><th>Status</th><th>Deadline</th><th>Base points</th><th>Visível</th><th>Ações</th></tr></thead><tbody>{pageItems.length===0 ? (<tr><td colSpan="6">Nenhum desafio</td></tr>) : pageItems.map(d=> (
        <React.Fragment key={d.id}>
          <tr>
            <td data-label="Nome">{d.name}</td>
            <td data-label="Status">{d.status}</td>
            <td data-label="Deadline">{d.deadline ? new Date(d.deadline).toLocaleString('pt-BR') : '—'}</td>
            <td data-label="Base points">{d.base_points ?? 0}</td>
            <td data-label="Visível">{String(d.visible)}</td>
            <td data-label="Ações">
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
                  <div style={{ borderRadius:12, padding:12 }}>
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
      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{editingId ? '✏️ Editar Desafio' : '➕ Novo Desafio'}</h3>
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
        </div>
        <div className="btn-group" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={async()=>{ setBusy(true); try { const payload = editingId?{ ...form, id: editingId }: form; await DesafiosRepo.upsert(payload); setEditingId(null); setForm({ name:'', objective:'', description:'', deadline:'', difficulty:'starter', tags:[], reward:'', base_points:0, delivery_type:'link', thumb_url:'', status:'draft', visible:true }); refresh(); } finally { setBusy(false); } }} disabled={busy} aria-busy={busy}>{editingId ? 'Atualizar' : 'Salvar'} desafio</button>
          {editingId && (<button className="btn btn-outline" onClick={()=>{ setEditingId(null); setForm({ name:'', objective:'', description:'', deadline:'', difficulty:'starter', tags:[], reward:'', base_points:0, delivery_type:'link', thumb_url:'', status:'draft', visible:true }); }}>Cancelar edição</button>)}
        </div>
      </section>
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
  const { data: projects } = useProjects();
  const [form, setForm] = React.useState({ item: '', valor: 0, status: 'pending', type: 'other', project_id: '', progress: 0 });
  const [editingId, setEditingId] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [filter, setFilter] = React.useState({ status: '', type: '', project: '' });
  const [view, setView] = React.useState('table'); // 'table' ou 'cards'
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // Filtros e paginação
  const filtered = list.filter(f => {
    const matchQuery = !query || 
      (f.item || '').toLowerCase().includes(query.toLowerCase()) ||
      (f.status || '').toLowerCase().includes(query.toLowerCase());
    const matchStatus = !filter.status || f.status === filter.status;
    const matchType = !filter.type || f.type === filter.type;
    const matchProject = !filter.project || f.project_id === filter.project;
    return matchQuery && matchStatus && matchType && matchProject;
  });
  
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);

  // Estatísticas
  const stats = {
    total: list.reduce((acc, f) => acc + Number(f.valor || 0), 0),
    paid: list.filter(f => f.status === 'paid').reduce((acc, f) => acc + Number(f.valor || 0), 0),
    pending: list.filter(f => f.status === 'pending').reduce((acc, f) => acc + Number(f.valor || 0), 0),
    discount: list.filter(f => f.status === 'discount').reduce((acc, f) => acc + Number(f.valor || 0), 0),
    count: list.length
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const payload = { ...form };
      payload.valor = Number(payload.valor);
      payload.progress = Number(payload.progress);
      payload.date = new Date().toISOString();
      
      if (editingId) {
        await FinanceRepo.update(editingId, payload);
      } else {
        // Criar novo registro financeiro
        await apiRequest('/api/financas', { method: 'POST', body: JSON.stringify(payload) });
      }
      
      setForm({ item: '', valor: 0, status: 'pending', type: 'other', project_id: '', progress: 0 });
      setEditingId(null);
      refresh();
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setBusy(false);
    }
  };

  const onEdit = (f) => {
    setEditingId(f.id);
    setForm({
      item: f.item || '',
      valor: Number(f.valor || 0),
      status: f.status || 'pending',
      type: f.type || 'other',
      project_id: f.project_id || '',
      progress: Number(f.progress || 0)
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Confirma a exclusão deste registro financeiro?')) return;
    try {
      await apiRequest(`/api/financas/${id}`, { method: 'DELETE' });
      refresh();
    } catch (error) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const onUpdate = async (f, patch) => { 
    await FinanceRepo.update(f.id, patch); 
    refresh(); 
  };

  const onExport = () => {
    const csv = FinanceRepo.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'finance.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? (project.title || project.titulo) : 'Projeto não encontrado';
  };

  const statusColors = {
    pending: '#FFA500',
    paid: '#00E4F2',
    discount: '#D12BF2',
    cancelled: '#FF6B6B'
  };

  const typeLabels = {
    project: '🎯 Projeto',
    discount: '💸 Desconto',
    other: '📋 Outros'
  };

  return (
    <div className="admin-content">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="title">💰 Gestão Financeira</h1>
          <p className="muted">Gerencie receitas, despesas e integrações com projetos</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-outline" onClick={() => setView(view === 'table' ? 'cards' : 'table')}>
            {view === 'table' ? '📊 Cards' : '📋 Tabela'}
          </button>
          <button className="btn btn-primary" onClick={onExport}>📤 Exportar CSV</button>
        </div>
      </header>

      {/* Estatísticas */}
      <section className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
  <div className="card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', color: 'var(--texto-gelo)', textAlign: 'center' }}>
          <h3>💰 Total</h3>
          <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#00E4F2' }}>
            R$ {stats.total.toLocaleString('pt-BR')}
          </p>
        </div>
  <div className="card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', color: 'var(--texto-gelo)', textAlign: 'center' }}>
          <h3>✅ Pago</h3>
          <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#00E4F2' }}>
            R$ {stats.paid.toLocaleString('pt-BR')}
          </p>
        </div>
  <div className="card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', color: 'var(--texto-gelo)', textAlign: 'center' }}>
          <h3>⏳ Pendente</h3>
          <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#FFA500' }}>
            R$ {stats.pending.toLocaleString('pt-BR')}
          </p>
        </div>
  <div className="card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', color: 'var(--texto-gelo)', textAlign: 'center' }}>
          <h3>💸 Descontos</h3>
          <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#D12BF2' }}>
            R$ {stats.discount.toLocaleString('pt-BR')}
          </p>
        </div>
  <div className="card" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.16)', color: 'var(--texto-gelo)', textAlign: 'center' }}>
          <h3>📊 Registros</h3>
          <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#68007B' }}>
            {stats.count}
          </p>
        </div>
      </section>

      {/* Filtros */}
      <section className="filters-section" style={{ marginBottom: 20 }}>
        <div className="formRow" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <input 
            placeholder="🔍 Buscar item ou status..." 
            value={query} 
            onChange={e => { setQuery(e.target.value); setPage(1); }}
          />
          <select value={filter.status} onChange={e => { setFilter({...filter, status: e.target.value}); setPage(1); }}>
            <option value="">Todos os Status</option>
            <option value="pending">⏳ Pendente</option>
            <option value="paid">✅ Pago</option>
            <option value="discount">💸 Desconto</option>
            <option value="cancelled">❌ Cancelado</option>
          </select>
          <select value={filter.type} onChange={e => { setFilter({...filter, type: e.target.value}); setPage(1); }}>
            <option value="">Todos os Tipos</option>
            <option value="project">🎯 Projeto</option>
            <option value="discount">💸 Desconto</option>
            <option value="other">📋 Outros</option>
          </select>
          <select value={filter.project} onChange={e => { setFilter({...filter, project: e.target.value}); setPage(1); }}>
            <option value="">Todos os Projetos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title || p.titulo}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setPage(Math.max(1, page-1))}>◀</button>
            <span>Página {page}/{totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page+1))}>▶</button>
          </div>
        </div>
      </section>

      {loading && <p>🔄 Carregando...</p>}
      {error && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {error}</p>}

      {/* Visualização em Cards */}
      {view === 'cards' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
          {pageItems.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
              <p>📭 Nenhum registro encontrado</p>
            </div>
          ) : pageItems.map(f => (
  <div key={f.id} className="card" style={{ background:'rgba(255,255,255,0.06)', border: `3px solid ${statusColors[f.status] || 'rgba(255,255,255,0.16)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#000' }}>{f.item}</h3>
                  <p style={{ margin: '4px 0', color: '#666', fontSize: '0.9em' }}>
                    {typeLabels[f.type] || f.type}
                  </p>
                </div>
                <span style={{ 
                  background: statusColors[f.status] || '#ccc', 
                  color: '#fff', 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '0.8em',
                  fontWeight: 'bold'
                }}>
                  {f.status}
                </span>
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#00E4F2', margin: 0 }}>
                  R$ {Number(f.valor || 0).toLocaleString('pt-BR')}
                </p>
                {f.project_id && (
                  <p style={{ margin: '4px 0', color: '#666', fontSize: '0.9em' }}>
                    🎯 {getProjectName(f.project_id)}
                  </p>
                )}
                {f.progress > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', marginBottom: 4 }}>
                      <span>Progresso</span>
                      <span>{f.progress}%</span>
                    </div>
                    <div style={{ height: 6, background: '#E0E0E0', borderRadius: 3 }}>
                      <div style={{ 
                        width: `${f.progress}%`, 
                        height: '100%', 
                        background: '#00E4F2', 
                        borderRadius: 3,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => onEdit(f)}>✏️</button>
                <button className="btn btn-primary" onClick={() => onUpdate(f, { status: f.status === 'paid' ? 'pending' : 'paid' })}>
                  {f.status === 'paid' ? '⏳' : '✅'}
                </button>
                <button className="btn btn-danger" onClick={() => onDelete(f.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Visualização em Tabela */}
      {view === 'table' && (
        <div className="table" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Tipo</th>
                <th>Projeto</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Progresso</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40 }}>📭 Nenhum registro encontrado</td></tr>
              ) : pageItems.map(f => (
                <tr key={f.id}>
                  <td data-label="Item" style={{ fontWeight: 'bold' }}>{f.item}</td>
                  <td data-label="Tipo">{typeLabels[f.type] || f.type}</td>
                  <td data-label="Projeto">{f.project_id ? getProjectName(f.project_id) : '—'}</td>
                  <td data-label="Valor" style={{ fontWeight: 'bold', color: '#00E4F2' }}>
                    R$ {Number(f.valor || 0).toLocaleString('pt-BR')}
                  </td>
                  <td data-label="Status">
                    <span style={{ 
                      background: statusColors[f.status] || '#ccc', 
                      color: '#fff', 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.8em',
                      fontWeight: 'bold'
                    }}>
                      {f.status}
                    </span>
                  </td>
                  <td data-label="Progresso">
                    {f.progress > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: '#E0E0E0', borderRadius: 3 }}>
                          <div style={{ 
                            width: `${f.progress}%`, 
                            height: '100%', 
                            background: '#00E4F2', 
                            borderRadius: 3 
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8em' }}>{f.progress}%</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td data-label="Data">{f.date ? new Date(f.date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td data-label="Ações">
                    <div className="btn-group">
                      <button className="btn btn-secondary" onClick={() => onEdit(f)}>✏️</button>
                      <button className="btn btn-primary" onClick={() => onUpdate(f, { status: f.status === 'paid' ? 'pending' : 'paid' })}>
                        {f.status === 'paid' ? '⏳' : '✅'}
                      </button>
                      <button className="btn btn-danger" onClick={() => onDelete(f.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulário */}
  <section className="card" style={{ padding: 20 }}>
        <h3 style={{ marginBottom: 16 }}>
          {editingId ? '✏️ Editar Registro' : '➕ Novo Registro Financeiro'}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <input 
            placeholder="Nome do item/serviço" 
            value={form.item} 
            onChange={e => setForm({...form, item: e.target.value})}
          />
          <input 
            type="number" 
            placeholder="Valor (R$)" 
            value={form.valor} 
            onChange={e => setForm({...form, valor: Number(e.target.value)})}
          />
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="pending">⏳ Pendente</option>
            <option value="paid">✅ Pago</option>
            <option value="discount">💸 Desconto</option>
            <option value="cancelled">❌ Cancelado</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
            <option value="other">📋 Outros</option>
            <option value="project">🎯 Projeto</option>
            <option value="discount">💸 Desconto</option>
          </select>
          <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
            <option value="">Selecionar projeto (opcional)</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title || p.titulo}</option>
            ))}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.9em', color: '#666' }}>Progresso:</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={form.progress} 
              onChange={e => setForm({...form, progress: Number(e.target.value)})}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{form.progress}%</span>
          </div>
        </div>

        <div className="btn-group">
          <button className="btn btn-primary" onClick={onSave} disabled={busy || !form.item || !form.valor}>
            {busy ? '⏳ Salvando...' : (editingId ? '💾 Atualizar' : '➕ Criar')}
          </button>
          {editingId && (
            <button className="btn btn-outline" onClick={() => {
              setEditingId(null);
              setForm({ item: '', valor: 0, status: 'pending', type: 'other', project_id: '', progress: 0 });
            }}>
              ❌ Cancelar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export function Config() {
  // Configuração simples sem adminStore
  const cfg = { theme: 'dark', version: '1.0.0' };
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
      <section className="card" style={{ marginTop: 12 }}>
        <h3>Filtrar Logs</h3>
        <div className="formRow">
          <input id="logQuery" aria-label="Filtro de logs" placeholder="Digite tipo ou texto..." value={query} onChange={e=>setQuery(e.target.value)} />
        </div>
      </section>
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
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const [globalErr, setGlobalErr] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('admin_sidebar_open');
    return saved === null ? true : saved === 'true';
  });
  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    try { window.localStorage.setItem('admin_sidebar_open', String(next)); } catch { void 0; }
  };
  React.useEffect(() => {
    const tick = () => {
      try {
        if (typeof window !== 'undefined' && window.__global_last_error__) {
          setGlobalErr(window.__global_last_error__);
        }
      } catch { void 0; }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`${styles.adminContainer} ${sidebarOpen ? '' : styles.collapsed}`}>
      <aside className={styles.sidebar} aria-expanded={sidebarOpen}>
        <div className={styles.brand}>CodeCraft Gen-Z</div>
        <nav className={styles.menu}>
          <NavLink to="/admin" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🏠</span>
            <span className={styles.menuText}>Dashboard</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/usuarios" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
              <span className={styles.menuIcon}>👤</span>
              <span className={styles.menuText}>Usuários</span>
            </NavLink>
          )}
          <NavLink to="/admin/mentores" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🧑‍🏫</span>
            <span className={styles.menuText}>Mentores</span>
          </NavLink>
          <NavLink to="/admin/equipes" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>👥</span>
            <span className={styles.menuText}>Equipes</span>
          </NavLink>
          <NavLink to="/admin/crafters" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🛠️</span>
            <span className={styles.menuText}>Crafters</span>
          </NavLink>
          <NavLink to="/admin/ranking" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🏆</span>
            <span className={styles.menuText}>Ranking</span>
          </NavLink>
          <NavLink to="/admin/projetos" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>📁</span>
            <span className={styles.menuText}>Projetos</span>
          </NavLink>
          <NavLink to="/admin/apps" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🧱</span>
            <span className={styles.menuText}>Aplicativos</span>
          </NavLink>
          <NavLink to="/admin/desafios" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>🎯</span>
            <span className={styles.menuText}>Desafios</span>
          </NavLink>
          <NavLink to="/admin/inscricoes" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>📝</span>
            <span className={styles.menuText}>Inscrições</span>
          </NavLink>
          <NavLink to="/admin/financas" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>💳</span>
            <span className={styles.menuText}>Finanças</span>
          </NavLink>
          <NavLink to="/admin/pagamentos" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>💵</span>
            <span className={styles.menuText}>Pagamentos</span>
          </NavLink>
          <NavLink to="/admin/ideias" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>💡</span>
            <span className={styles.menuText}>Ideias</span>
          </NavLink>
          <NavLink to="/admin/config" className={({isActive})=>[styles.menuLink, isActive?styles.active:''].filter(Boolean).join(' ')}>
            <span className={styles.menuIcon}>⚙️</span>
            <span className={styles.menuText}>Config</span>
          </NavLink>
        </nav>
        <button className={styles.sidebarToggle} onClick={toggleSidebar} aria-label={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}>
          {sidebarOpen ? '⟨' : '⟩'}
        </button>
      </aside>
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.welcome}>Olá, {user?.name} {user?.role ? `(${user.role})` : ''}</div>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={logout}>Sair</button>
        </header>
        <div className={styles.content}>
          {globalErr && (
            <div className={styles.error} role="alert">
              <div className={styles.fontBold}>Aviso: erro global capturado</div>
              <div className={styles.textSm}>{globalErr.message}</div>
            </div>
          )}
          {/* Render das rotas aninhadas controladas pelo App.jsx */}
          <AdminErrorBoundary>
            <Outlet />
          </AdminErrorBoundary>
        </div>
      </main>

      {/* Estilos inline removidos: todos os estilos vivem nos CSS Modules e folhas dedicadas */}
    </div>
  );
}

// Error boundary para capturar erros em qualquer rota/admin view
class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    window.__admin_last_error__ = { message: String(error?.message || error), stack: errorInfo?.componentStack };
    console.error('AdminErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          padding: '12px',
          border: '1px solid #ff4444',
          background: 'rgba(255,68,68,0.1)',
          borderRadius: '8px',
          color: '#ff4444'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Erro ao renderizar a página admin</div>
          <div style={{ marginBottom: 6 }}>{String(this.state.error?.message || this.state.error)}</div>
          {this.state.errorInfo?.componentStack && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#aa0000' }}>{this.state.errorInfo.componentStack}</pre>
          )}
          <div style={{ marginTop: 8, fontSize: 12 }}>Consulte o console para mais detalhes.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Apps() {
  const [apps, setApps] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({ id:null, name:'', mainFeature:'', price:0, thumbnail:'', exec_url:'' });

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const json = await getAllApps({ page: 1, pageSize: 100 });
      const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      setApps(list);
    } catch (e) {
      setError(e.message || 'Erro ao carregar apps');
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const onSave = async () => {
    try {
      const payload = { name: form.name, mainFeature: form.mainFeature, price: Number(form.price||0), thumbnail: form.thumbnail, executableUrl: form.exec_url };
      await updateApp(form.id, payload);
      setForm({ id:null, name:'', mainFeature:'', price:0, thumbnail:'', exec_url:'' });
      refresh();
    } catch (e) {
      alert('Erro ao atualizar app: ' + e.message);
    }
  };

  return (
    <div className="admin-content">
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
        <div>
          <h1 className="title">🧱 Aplicativos</h1>
          <p className="muted">Edite cards de aplicativos vinculados a projetos finalizados.</p>
        </div>
        <button className="btn btn-outline" onClick={refresh}>🔄 Atualizar</button>
      </header>

      {loading && <p>🔄 Carregando…</p>}
      {error && <p role="alert" style={{ color:'#FF6B6B' }}>❌ {error}</p>}

      <div className="table">
        <table>
          <thead>
            <tr><th>Nome</th><th>Feature</th><th>Preço</th><th>Thumb</th><th>Exec URL</th><th>Ações</th></tr>
          </thead>
          <tbody>
          {apps.length === 0 ? (
            <tr><td colSpan="6">📭 Nenhum aplicativo</td></tr>
          ) : apps.map(a => (
            <tr key={a.id}>
              <td data-label="Nome">{a.name}</td>
              <td data-label="Feature" title={a.mainFeature}>{String(a.mainFeature || '').slice(0, 60)}</td>
              <td data-label="Preço">R$ {Number(a.price||0).toLocaleString('pt-BR')}</td>
              <td data-label="Thumb"><a href={a.thumbnail} target="_blank" rel="noopener noreferrer">thumbnail</a></td>
              <td data-label="Exec URL"><a href={a.executableUrl} target="_blank" rel="noopener noreferrer">exec</a></td>
              <td data-label="Ações">
                <div className="btn-group">
                  <button className="btn btn-secondary" onClick={()=>setForm({ id:a.id, name:a.name||'', mainFeature:a.mainFeature||'', price:a.price||0, thumbnail:a.thumbnail||'', exec_url:a.executableUrl||'' })}>✏️</button>
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

  <section className="card" style={{ padding:16, marginTop:16 }}>
        <h3>{form.id ? '✏️ Editar App' : 'Selecionar app para editar'}</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
          <input placeholder="Nome" value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} />
          <input placeholder="Feature principal" value={form.mainFeature} onChange={e=>setForm({ ...form, mainFeature:e.target.value })} />
          <input type="number" placeholder="Preço (R$)" value={form.price} onChange={e=>setForm({ ...form, price:Number(e.target.value) })} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
          <input placeholder="Thumbnail URL" value={form.thumbnail} onChange={e=>setForm({ ...form, thumbnail:e.target.value })} />
          <input placeholder="Exec URL (download)" value={form.exec_url} onChange={e=>setForm({ ...form, exec_url:e.target.value })} />
        </div>
        <div className="btn-group" style={{ marginTop:12, display:'flex', gap:8 }}>
          <button className="btn btn-primary" onClick={onSave} disabled={!form.id}>💾 Salvar</button>
          <button className="btn btn-outline" onClick={()=>setForm({ id:null, name:'', mainFeature:'', price:0, thumbnail:'', exec_url:'' })}>❌ Limpar</button>
        </div>
      </section>
    </div>
  );
}