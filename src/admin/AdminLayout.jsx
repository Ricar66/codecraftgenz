// src/admin/AdminLayout.jsx
import React from 'react';
import { Link, NavLink, Routes, Route, useLocation } from 'react-router-dom';

import { useAuth } from '../context/useAuth';
import { useUsers, UsersRepo, useMentors, MentorsRepo, useProjects, ProjectsRepo, useDesafios, DesafiosRepo, useFinance, FinanceRepo, useRanking, RankingRepo, useLogs } from '../hooks/useAdminRepo';
import { adminStore } from '../lib/adminStore';

function Dashboard() {
  const { data: projects } = useProjects();
  const { data: desafios } = useDesafios();
  const { data: logs } = useLogs();
  const ranking = adminStore.getRanking();
  // const finance = adminStore.listFinance();
  const receitaPrevista = projects.filter(p => p.visible && p.status !== 'draft').reduce((acc, p) => acc + (p.price || 0), 0);

  return (
    <div className="admin-content">
      <h1 className="title">Dashboard</h1>
      <div className="cards" aria-live="polite">
        <div className="card"><h3>Projetos em andamento</h3><p>{projects.filter(p => p.status==='ongoing').length}</p><Link to="/admin/projetos" className="link">Ver lista</Link></div>
        <div className="card"><h3>Desafios ativos</h3><p>{desafios.filter(d => d.status==='ativo').length}</p></div>
        <div className="card"><h3>Crafters pontuados na semana</h3><p>{ranking.all.length + ranking.top3.length}</p></div>
        <div className="card"><h3>Receita prevista</h3><p>R$ {receitaPrevista.toLocaleString('pt-BR')}</p></div>
      </div>
      <div className="timeline" aria-live="polite">
        <h2>Últimas ações</h2>
        <ul>
          {logs.slice(0,10).map(l => (
            <li key={l.id}><span className="logType">{l.type}</span> <span className="logMsg">{l.message}</span> <span className="logAt">{new Date(l.at).toLocaleString('pt-BR')}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Usuarios() {
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

function Mentores() {
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
    React.useEffect(() => { setItems(MentorsRepo.getHistory(mentorId)); }, [mentorId, loading]);
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

function Ranking() {
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

function Projetos() {
  const { data: list, loading, error, refresh } = useProjects();
  const [form, setForm] = React.useState({ title:'', owner:'', status:'draft', price:0, tags:[], visible:false });
  const onSave = async () => { await ProjectsRepo.upsert(form); setForm({ title:'', owner:'', status:'draft', price:0, tags:[], visible:false }); refresh(); };
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 5;
  const filtered = list.filter(p =>
    (p.title||'').toLowerCase().includes(query.toLowerCase()) ||
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
      <div className="table"><table><thead><tr><th>Título</th><th>Owner</th><th>Status</th><th>Preço</th><th>Visível</th></tr></thead><tbody>{pageItems.length===0 ? (<tr><td colSpan="5">Nenhum projeto</td></tr>) : pageItems.map(p=> (<tr key={p.id}><td>{p.title}</td><td>{p.owner}</td><td>{p.status}</td><td>R$ {p.price}</td><td>{String(p.visible)}</td></tr>))}</tbody></table></div>
      <div className="formRow">
        <input aria-label="Título" placeholder="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
        <input aria-label="Owner" placeholder="Owner" value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})} />
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">rascunho</option><option value="ongoing">andamento</option><option value="concluído">concluído</option></select>
        <input aria-label="Preço" placeholder="Preço" type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})} />
        <label><input type="checkbox" checked={form.visible} onChange={e=>setForm({...form,visible:e.target.checked})} /> Visível</label>
        <button onClick={onSave}>Salvar projeto</button>
      </div>
    </div>
  );
}

function Desafios() {
  const { data: list, loading, error, refresh } = useDesafios();
  const [form, setForm] = React.useState({ name:'', objetivo:'', prazoDias:7, recompensaPts:100, status:'ativo', visible:true });
  const onSave = async () => { await DesafiosRepo.upsert(form); setForm({ name:'', objetivo:'', prazoDias:7, recompensaPts:100, status:'ativo', visible:true }); refresh(); };
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 5;
  const filtered = list.filter(d =>
    (d.name||'').toLowerCase().includes(query.toLowerCase()) ||
    (d.objetivo||'').toLowerCase().includes(query.toLowerCase()) ||
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
      <div className="table"><table><thead><tr><th>Nome</th><th>Objetivo</th><th>Prazo (dias)</th><th>Recompensa</th><th>Status</th><th>Visível</th></tr></thead><tbody>{pageItems.length===0 ? (<tr><td colSpan="6">Nenhum desafio</td></tr>) : pageItems.map(d=> (<tr key={d.id}><td>{d.name}</td><td>{d.objetivo}</td><td>{d.prazoDias}</td><td>{d.recompensaPts}</td><td>{d.status}</td><td>{String(d.visible)}</td></tr>))}</tbody></table></div>
      <div className="formRow">
        <input aria-label="Nome" placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input aria-label="Objetivo" placeholder="Objetivo" value={form.objetivo} onChange={e=>setForm({...form,objetivo:e.target.value})} />
        <input aria-label="Prazo" type="number" placeholder="Prazo (dias)" value={form.prazoDias} onChange={e=>setForm({...form,prazoDias:Number(e.target.value)})} />
        <input aria-label="Recompensa" type="number" placeholder="Recompensa (+pts)" value={form.recompensaPts} onChange={e=>setForm({...form,recompensaPts:Number(e.target.value)})} />
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="ativo">ativo</option><option value="encerrado">encerrado</option></select>
        <label><input type="checkbox" checked={form.visible} onChange={e=>setForm({...form,visible:e.target.checked})} /> Visível</label>
        <button onClick={onSave}>Salvar desafio</button>
      </div>
    </div>
  );
}

function Financas() {
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

function Config() {
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
  const location = useLocation();
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
          {/* Força remount ao trocar de rota para evitar necessidade de refresh */}
          <Routes key={location.pathname}>
            <Route index element={<Dashboard />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="mentores" element={<Mentores />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="projetos" element={<Projetos />} />
            <Route path="desafios" element={<Desafios />} />
            <Route path="financas" element={<Financas />} />
            <Route path="config" element={<Config />} />
          </Routes>
        </div>
      </main>

      <style>{`
        .admin-page { min-height: calc(100vh - 80px); display: grid; grid-template-columns: 260px 1fr; }
        .sidebar { background: #68007B; color: #F4F4F4; padding: 16px; border-right: 2px solid rgba(0,228,242,0.3); }
        .brand { font-family: 'Montserrat', system-ui, sans-serif; font-weight: 700; margin-bottom: 12px; }
        .menu { display: grid; gap: 8px; }
        .menuLink { color: #F4F4F4; text-decoration: none; padding: 10px 12px; border-radius: 10px; font-weight: 600; }
        .menuLink:hover { background: rgba(0,228,242,0.12); }
        .menuLink.active { background: rgba(0,228,242,0.22); color: #042326; }
        .main { background: transparent; }
        .topbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; }
        /* Botões modernos */
        .btn { border: none; border-radius: 10px; padding: 8px 12px; cursor: pointer; font-weight: 600; transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(0,0,0,0.18); }
        .btn:active { transform: translateY(0); box-shadow: none; }
        .btn-primary { background: #00E4F2; color: #062B31; }
        .btn-secondary { background: #7A3EF5; color: #fff; }
        .btn-outline { background: transparent; color: #F4F4F4; border: 1px solid rgba(255,255,255,0.28); }
        .btn-danger { background: #D12BF2; color: #fff; }
        .btn-group { display: flex; flex-wrap: wrap; gap: 6px; }
        .btn-icon { padding: 8px; width: 36px; height: 36px; display: grid; place-items: center; }
        .content { padding: 16px; }
        .title { font-family: 'Montserrat', system-ui, sans-serif; font-weight: 700; }
        .cards { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
        .card { background: #F4F4F4; border: 1px solid rgba(0,228,242,0.2); border-radius: 12px; padding: 12px; }
        .timeline { margin-top: 18px; }
        .logType { color: #00E4F2; margin-right: 8px; }
        .logMsg { color: #333; }
        .logAt { color: #A6A6A6; margin-left: 8px; }
        .items { list-style: none; padding: 0; display: grid; gap: 8px; }
        .item { background: #F4F4F4; border: 1px solid rgba(0,228,242,0.2); border-radius: 12px; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
        .muted { color: #666; margin-left: 8px; }
        .table table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; }
        .formRow { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 8px; margin-top: 12px; }
        .formRow input, .formRow select { padding: 8px; border: 1px solid #ccc; border-radius: 8px; }
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
        .mentorAdminCard { display: grid; grid-template-columns: 120px 1fr 220px; gap: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(0,228,242,0.25); border-radius: 12px; padding: 12px; color: #F4F4F4; transition: transform 160ms ease, box-shadow 160ms ease; }
        .mentorAdminCard:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(0,0,0,0.26); }
        .mentorAdminCard .left { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 8px; }
        .mentorAdminCard .avatar { width: 90px; height: 90px; border-radius: 12px; background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06)); border: 1px solid rgba(255,255,255,0.18); overflow: hidden; }
        .mentorAdminCard .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .mentorAdminCard .center .header { display: flex; gap: 8px; align-items: baseline; }
        .mentorAdminCard .name { font-weight: 700; }
        .mentorAdminCard .spec { color: #A6A6A6; }
        .mentorAdminCard .bio { margin-top: 6px; color: #D6D6D6; }
        .mentorAdminCard .contact { display: flex; gap: 12px; margin-top: 6px; color: #BEBEBE; flex-wrap: wrap; }
        .mentorAdminCard .right { display: grid; gap: 8px; justify-items: end; }
        .mentorAdminCard .badges { display: flex; gap: 6px; }
        .badge { font-size: 12px; padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); }
        .badgeOk { background: rgba(0,228,242,0.2); color: #00E4F2; }
        .badgeWarn { background: rgba(209,43,242,0.15); color: #D12BF2; }
        .badgeNeutral { background: rgba(255,255,255,0.08); color: #F4F4F4; }
        .mentorAdminCard .actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
        @media (max-width: 992px) { .cards { grid-template-columns: repeat(2, 1fr); } .admin-page { grid-template-columns: 220px 1fr; } .mentorAdminGrid { grid-template-columns: 1fr; } .mentorAdminCard { grid-template-columns: 100px 1fr; } .mentorAdminCard .right { justify-items: start; } }
        @media (max-width: 768px) { .admin-page { grid-template-columns: 1fr; } .sidebar { position: sticky; top: 80px; display: flex; overflow-x: auto; gap: 8px; } .menu { grid-auto-flow: column; grid-auto-columns: max-content; } }
      `}</style>
    </div>
  );
}