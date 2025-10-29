// src/admin/AdminLayout.jsx
import React from 'react';
import { Link, Routes, Route } from 'react-router-dom';

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
  const [form, setForm] = React.useState({ name: '', specialty: '', bio: '', email: '', phone: '', photo: '', status: 'draft', visible: false });
  const [editingId, setEditingId] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [filterSpec, setFilterSpec] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  const filtered = list.filter(m =>
    (m.name||'').toLowerCase().includes(query.toLowerCase()) &&
    (!filterSpec || (m.specialty||'').toLowerCase().includes(filterSpec.toLowerCase())) &&
    (!filterStatus || (m.status||'') === filterStatus)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);

  const validate = (data) => {
    const required = ['name','specialty','bio'];
    for (const k of required) { if (!data[k] || String(data[k]).trim() === '') return `Campo obrigatório: ${k}`; }
    return null;
  };
  const onSave = async () => {
    const err = validate(form);
    if (err) { alert(err); return; }
    if (editingId) {
      await MentorsRepo.upsert({ ...form, id: editingId });
    } else {
      await MentorsRepo.upsert(form);
    }
    setForm({ name: '', specialty: '', bio: '', email: '', phone: '', photo: '', status: 'draft', visible: false });
    setEditingId(null);
    refresh();
  };
  const toggleVisible = async (m) => { await MentorsRepo.toggleVisible(m); refresh(); };
  const onEdit = (m) => { setEditingId(m.id); setForm({ name:m.name, specialty:m.specialty, bio:m.bio, email:m.email, phone:m.phone, photo:m.photo||'', status:m.status||'draft', visible: !!m.visible }); };
  const onDelete = async (id) => { await MentorsRepo.delete(id); refresh(); };
  const onUndo = async (id) => { await MentorsRepo.undo(id); refresh(); };
  return (
    <div className="admin-content">
      <h1 className="title">Mentores</h1>
      <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto auto' }}>
        <input aria-label="Buscar" placeholder="Buscar por nome" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
        <input aria-label="Filtrar especialidade" placeholder="Especialidade" value={filterSpec} onChange={e=>{setFilterSpec(e.target.value); setPage(1);}} />
        <select aria-label="Status" value={filterStatus} onChange={e=>{setFilterStatus(e.target.value); setPage(1);}}>
          <option value="">Todos</option>
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
        </select>
        <button onClick={()=>setPage(Math.max(1, page-1))}>◀</button>
        <span style={{ alignSelf:'center' }}>Página {page} / {totalPages}</span>
        <button onClick={()=>setPage(Math.min(totalPages, page+1))}>▶</button>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p role="alert">{error}</p>}
      <ul className="items">
        {pageItems.length===0 ? (<li className="item">Nenhum mentor</li>) : pageItems.map(m => (
          <li key={m.id} className="item">
            <span>{m.name}</span>
            <span className="muted">{m.specialty}</span>
            <div>
              <button onClick={()=>onEdit(m)}>Editar</button>
              <button onClick={()=>onDelete(m.id)}>Remover</button>
              <button onClick={()=>onUndo(m.id)}>Reverter</button>
              <button onClick={()=>toggleVisible(m)} aria-label={`Visibilidade ${m.name}`}>{m.visible ? 'Ocultar' : 'Exibir'}</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="formRow" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <input aria-label="Nome" placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input aria-label="Especialidade" placeholder="Especialidade" value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})} />
        <input aria-label="Bio" placeholder="Descrição" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} />
        <input aria-label="E-mail" placeholder="E-mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input aria-label="Telefone" placeholder="Telefone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
        <input aria-label="Foto (URL)" placeholder="Foto (URL)" value={form.photo} onChange={e=>setForm({...form,photo:e.target.value})} />
        <label style={{ alignSelf:'center' }}><input type="checkbox" checked={form.visible} onChange={e=>setForm({...form,visible:e.target.checked})} /> Visível</label>
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Rascunho</option><option value="published">Publicado</option></select>
        <button onClick={onSave}>{editingId ? 'Atualizar' : 'Adicionar'} mentor</button>
      </div>

      {/* Pré-visualização */}
      <div style={{ marginTop: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, padding: 12, maxWidth: 600 }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap: 12 }}>
            <div style={{ width: 100, height: 100, borderRadius: 12, background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.18)' }} />
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
  return (
    <div className="admin-page">
      <aside className="sidebar">
        <div className="brand">CodeCraft Gen-Z</div>
        <nav className="menu">
          <Link to="/admin" className="menuLink">Dashboard</Link>
          <Link to="/admin/usuarios" className="menuLink">Usuários</Link>
          <Link to="/admin/mentores" className="menuLink">Mentores</Link>
          <Link to="/admin/ranking" className="menuLink">Ranking</Link>
          <Link to="/admin/projetos" className="menuLink">Projetos</Link>
          <Link to="/admin/desafios" className="menuLink">Desafios</Link>
          <Link to="/admin/financas" className="menuLink">Finanças</Link>
          <Link to="/admin/config" className="menuLink">Config</Link>
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="welcome">Olá, {user?.name}</div>
          <button className="logout" onClick={logout}>Sair</button>
        </header>
        <div className="content">
          <Routes>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/usuarios" element={<Usuarios />} />
            <Route path="/admin/mentores" element={<Mentores />} />
            <Route path="/admin/ranking" element={<Ranking />} />
            <Route path="/admin/projetos" element={<Projetos />} />
            <Route path="/admin/desafios" element={<Desafios />} />
            <Route path="/admin/financas" element={<Financas />} />
            <Route path="/admin/config" element={<Config />} />
          </Routes>
        </div>
      </main>

      <style>{`
        .admin-page { min-height: calc(100vh - 80px); display: grid; grid-template-columns: 260px 1fr; }
        .sidebar { background: #68007B; color: #F4F4F4; padding: 16px; border-right: 2px solid rgba(0,228,242,0.3); }
        .brand { font-family: 'Montserrat', system-ui, sans-serif; font-weight: 700; margin-bottom: 12px; }
        .menu { display: grid; gap: 8px; }
        .menuLink { color: #F4F4F4; text-decoration: none; padding: 8px 10px; border-radius: 8px; }
        .menuLink:hover { background: rgba(0,228,242,0.12); }
        .main { background: transparent; }
        .topbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; }
        .logout { background: #D12BF2; color: white; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
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
        .formRow button { background: #00E4F2; border: none; border-radius: 8px; padding: 8px; cursor: pointer; }
        @media (max-width: 992px) { .cards { grid-template-columns: repeat(2, 1fr); } .admin-page { grid-template-columns: 220px 1fr; } }
        @media (max-width: 768px) { .admin-page { grid-template-columns: 1fr; } .sidebar { position: sticky; top: 80px; display: flex; overflow-x: auto; gap: 8px; } .menu { grid-auto-flow: column; grid-auto-columns: max-content; } }
      `}</style>
    </div>
  );
}