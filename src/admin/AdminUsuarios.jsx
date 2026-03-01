// src/admin/AdminUsuarios.jsx
// Gerenciamento de usuarios - extraido de AdminLayout.jsx
import React from 'react';
import { useUsers, UsersRepo } from '../hooks/useAdminRepo';

import './AdminCommon.css';

export default function AdminUsuarios() {
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
          <thead><tr><th>Nome</th><th>E-mail</th><th>Role</th><th>Status</th><th>Controle</th><th>Ações</th></tr></thead>
          <tbody>
            {pageItems.length === 0 ? (<tr><td colSpan="6">Nenhum usuário</td></tr>) : pageItems.map(u => (
              <tr key={u.id}>
                <td data-label="Nome">{u.name}</td>
                <td data-label="E-mail">{u.email}</td>
                <td data-label="Perfil">{u.role}</td>
                <td data-label="Status">
                  <span style={{
                    background: u.status==='active' ? '#00E4F2' : '#666',
                    color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8em', fontWeight: 'bold'
                  }}>
                    {u.status}
                  </span>
                </td>
                <td data-label="Controle">
                  <button className="btn btn-outline" onClick={async()=>{ const res = await UsersRepo.toggleStatus(u.id); if(!res.ok){ alert(res.error||'Falha ao alternar status'); } else { refresh(); } }}>{u.status==='active'?'Desativar':'Ativar'}</button>
                </td>
                <td data-label="Ações">
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
