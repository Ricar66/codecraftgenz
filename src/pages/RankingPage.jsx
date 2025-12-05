// src/pages/RankingPage.jsx
import React, { useEffect, useState } from 'react';

import heroBackground from '../assets/hero-background.svg';
import Navbar from '../components/Navbar/Navbar';
import { realtime } from '../lib/realtime';
import { getRanking } from '../services/rankingAPI.js';


export default function RankingPage() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === '1';
  const [top3, setTop3] = useState([]);
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [areaFilter, setAreaFilter] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [minScore, setMinScore] = useState(0);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      setError('');
      const json = await getRanking();
      // Montar top3 unindo com crafters para obter nome e pontos
      const crafters = Array.isArray(json?.crafters) ? json.crafters : [];
      const t3 = Array.isArray(json?.top3) ? json.top3.map(t => {
        const c = crafters.find(c => c.id === t.crafter_id) || {};
        return {
          place: t.position,
          name: c.nome || c.name || '—',
          score: c.points ?? 0,
          reward: t.reward || '',
          avatar: c.avatar_url || null,
        };
      }) : [];
      // Tabela a partir da lista de crafters
      const tb = crafters.map(c => ({
        id: c.id,
        name: c.nome || c.name || '—',
        score: Number.isFinite(c.points) ? c.points : 0,
        area: c.area_interesse || c.area || c.stack || '',
        avatar: c.avatar_url || null,
      }));
      setTop3(t3);
      setTable(tb);
    } catch {
      setError('Ranking em processamento. Volte em instantes 🚀');
      setTop3([]);
      setTable([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
    // Agora usando a importação estática
    const unsub = realtime.subscribe('ranking_changed', () => { fetchRanking(); });
    return () => unsub();
  }, []);

  const areas = Array.from(new Set((table || []).map(r => r.area).filter(Boolean))).sort();
  const filtered = (table || [])
    .filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    .filter(r => !areaFilter || r.area === areaFilter)
    .filter(r => (r.score ?? 0) >= (Number(minScore) || 0))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'area') return (a.area || '').localeCompare(b.area || '') * dir;
      const sa = a.score ?? 0; const sb = b.score ?? 0; return (sa - sb) * dir;
    });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);

  return (
    <div className="ranking-page" style={{
      backgroundImage: `url(${heroBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      <Navbar />

      <section className="section-block">
        <div className="section-card">
          <header className="section-header">
            <h1 className="title">Ranking dos Crafters</h1>
            <h2 className="subtitle">Top Crafters 🔥</h2>
            <p className="lead">Os maiores destaques da semana nos projetos CodeCraft.</p>
          </header>

          {loading && (
            <div className="empty" role="status">Carregando ranking...</div>
          )}
          {error && (
            <div className="error" role="alert">{error}</div>
          )}
          {!loading && (top3 || []).length > 0 ? (
            <div className="podium" aria-label="Pódio dos três melhores" aria-live="polite">
              <div className="podium-item second">
                <span className="medal medal-silver" aria-hidden="true">🥈</span>
                <div className="photo" aria-hidden="true" style={{
                  backgroundImage: ((top3 || []).find(p=>p.place===2)?.avatar ? `url(${(top3 || []).find(p=>p.place===2)?.avatar})` : undefined),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} />
                <div className="label">
                  <span className="place">2º</span>
                  <span className="name">{(top3 || []).find(p=>p.place===2)?.name || '—'}</span>
                  <span className="score">{(top3 || []).find(p=>p.place===2)?.score ?? 0} pts</span>
                  {(top3 || []).find(p=>p.place===2)?.reward ? (
                    <span className="reward" title="Recompensa">🎁 {(top3 || []).find(p=>p.place===2)?.reward}</span>
                  ) : null}
                </div>
              </div>
              <div className="podium-item first">
                <div className="photo" aria-hidden="true" style={{
                  backgroundImage: ((top3 || []).find(p=>p.place===1)?.avatar ? `url(${(top3 || []).find(p=>p.place===1)?.avatar})` : undefined),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} />
                <span className="medal medal-gold" aria-hidden="true">🥇</span>
                <div className="crown" title="Campeão" />
                <div className="label">
                  <span className="place">1º</span>
                  <span className="name">{(top3 || []).find(p=>p.place===1)?.name || '—'}</span>
                  <span className="score">{(top3 || []).find(p=>p.place===1)?.score ?? 0} pts</span>
                  {(top3 || []).find(p=>p.place===1)?.reward ? (
                    <span className="reward" title="Recompensa">🎁 {(top3 || []).find(p=>p.place===1)?.reward}</span>
                  ) : null}
                </div>
              </div>
              <div className="podium-item third">
                <span className="medal medal-bronze" aria-hidden="true">🥉</span>
                <div className="photo" aria-hidden="true" style={{
                  backgroundImage: ((top3 || []).find(p=>p.place===3)?.avatar ? `url(${(top3 || []).find(p=>p.place===3)?.avatar})` : undefined),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} />
                <div className="label">
                  <span className="place">3º</span>
                  <span className="name">{(top3 || []).find(p=>p.place===3)?.name || '—'}</span>
                  <span className="score">{(top3 || []).find(p=>p.place===3)?.score ?? 0} pts</span>
                  {(top3 || []).find(p=>p.place===3)?.reward ? (
                    <span className="reward" title="Recompensa">🎁 {(top3 || []).find(p=>p.place===3)?.reward}</span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (!loading ? (
            <div className="empty" role="status">Ranking em processamento. Volte em instantes 🚀</div>
          ) : null)}

          <div className="ranking-list">
            <div className="list-header" style={{ display:'flex', gap:12, alignItems:'center' }}>
              <h3 className="list-title" style={{ margin: 0 }}>Demais participantes</h3>
              <input aria-label="Buscar por nome" placeholder="Buscar por nome" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} className="rank-search" />
              <select aria-label="Filtrar por área" value={areaFilter} onChange={e=>{setAreaFilter(e.target.value); setPage(1);}} className="rank-filter">
                <option value="">Todas as áreas</option>
                {areas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <div className="rank-min-score">
                <label htmlFor="minScore" style={{ color:'var(--texto-gelo)', marginRight:6 }}>Mín. pontos</label>
                <input id="minScore" type="number" min="0" value={minScore} onChange={e=>{setMinScore(e.target.value); setPage(1);}} className="rank-input" />
              </div>
              <select aria-label="Ordenar por" value={sortBy} onChange={e=>{setSortBy(e.target.value);}} className="rank-filter">
                <option value="score">Pontuação</option>
                <option value="name">Nome</option>
                <option value="area">Área</option>
              </select>
              <select aria-label="Direção" value={sortDir} onChange={e=>{setSortDir(e.target.value);}} className="rank-filter">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              {filtered.length > pageSize ? (
                <div className="pager" style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                  <button onClick={()=>setPage(Math.max(1, page-1))}>◀</button>
                  <span>Página {page} / {totalPages}</span>
                  <button onClick={()=>setPage(Math.min(totalPages, page+1))}>▶</button>
                </div>
              ) : null}
            </div>
            <ul aria-live="polite">
              {pageItems.length === 0 ? (
                <li className="rank-row"><span className="rank-name">Nenhum participante</span></li>
              ) : pageItems.map((o, idx) => (
                <li key={`${o.id || o.name}-${idx}`} className="rank-row">
                  <div className="rank-left">
                    <span className="rank-name">{o.name}</span>
                    {o.area ? <span className="rank-area">{o.area}</span> : null}
                  </div>
                  <span className="rank-score">{o.score} pts</span>
                </li>
              ))}
            </ul>
          </div>

          {isAdmin && (
            <aside className="admin-panel" aria-label="Área administrativa">
              <h3>Administração</h3>
              <form className="admin-form" onSubmit={(e) => { e.preventDefault(); console.log('Salvar pontuação'); }}>
                <div className="form-row">
                  <input type="text" placeholder="Nome" />
                  <input type="number" placeholder="Pontuação" />
                </div>
                <div className="form-row">
                  <select defaultValue="badge">
                    <option value="badge">Badge</option>
                    <option value="moeda">Moedas</option>
                    <option value="certificado">Certificado</option>
                  </select>
                  <input type="text" placeholder="Descrição da recompensa" />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Salvar</button>
                </div>
              </form>
              <p className="hint">Para exibir esta área: adicionar "?admin=1" à URL.</p>
            </aside>
          )}

          <footer className="section-footer">
            <p className="helper-text">Aqui celebramos esforço, criatividade e colaboração. Continue craftando e suba no topo!</p>
          </footer>
        </div>
      </section>

      <style>{`
        .ranking-page { min-height: 100vh; width: 100%; background: transparent; }
        .section-block { padding: 40px 24px; }
        .section-card { max-width: 1100px; margin: 0 auto; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); border-radius: var(--raio-xl); backdrop-filter: blur(10px); box-shadow: 0 6px 24px rgba(0,0,0,0.25); padding: 24px; overflow: hidden; }
        .section-header { text-align: center; margin-bottom: 16px; }
        .title { font-family: var(--fonte-titulos); font-size: clamp(2rem, 4vw, 3rem); color: var(--texto-branco); }
        .subtitle { font-size: clamp(1.25rem, 2.5vw, 1.5rem); color: var(--texto-gelo); margin-top: 8px; }
        .lead { font-size: 1.05rem; color: var(--texto-gelo); margin-top: 12px; }

        .podium { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; align-items: end; margin-top: 24px; position: relative; }
        .podium::before { content: ''; position: absolute; top: -8px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06)); }
        .podium-item { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.18); border-radius: var(--raio-lg); padding: 16px; text-align: center; position: relative; }
        .podium-item .medal { position:absolute; top:-10px; right:-10px; font-size: 22px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3)); }
        .medal-gold { color: #FFD700; }
        .medal-silver { color: #C0C0C0; }
        .medal-bronze { color: #CD7F32; }
        .podium-item .photo { width: 80px; height: 80px; border-radius: 999px; margin: 0 auto 10px; background: radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0.06)); border: 1px solid rgba(255,255,255,0.18); }
        .podium-item .label { display: grid; gap: 6px; }
        .podium-item .place { font-weight: 800; color: var(--texto-branco); }
        .podium-item .name { color: var(--texto-gelo); }
        .podium-item .score { color: var(--texto-branco); font-weight: 700; }
        .podium-item .reward { color: #FFD966; font-weight: 600; }

        .first { transform: translateY(-12px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); border-color: #D12BF2; }
        .first .crown { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 28px; height: 28px; background: #D12BF2; border-radius: 6px; box-shadow: 0 0 12px rgba(209,43,242,0.6); }
        .second, .third { opacity: 0.9; }

        .ranking-list { margin-top: 24px; }
        .list-title { color: var(--texto-branco); margin-bottom: 8px; }
        .rank-row { display: flex; justify-content: space-between; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
        .rank-name { color: var(--texto-gelo); }
        .rank-search { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 10px; color: var(--texto-branco); }
        .rank-filter, .rank-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 10px; color: var(--texto-branco); }
        .rank-left { display:flex; gap:8px; align-items:center; }
        .rank-area { color: var(--texto-gelo); font-size: 0.9rem; background: rgba(209,43,242,0.15); border: 1px solid rgba(209,43,242,0.4); border-radius: 6px; padding: 2px 6px; }
        .rank-score { color: var(--texto-branco); font-weight: 700; }
        .ranking-list ul { max-height: 50vh; overflow-y: auto; }

        .admin-panel { margin-top: 24px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.18); border-radius: var(--raio-lg); padding: 16px; }
        .admin-form .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .admin-form input, .admin-form select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 10px; color: var(--texto-branco); }
        .btn-primary { background: #D12BF2; color: #fff; border: none; border-radius: 8px; padding: 10px 14px; cursor: pointer; }
        .btn-primary:hover { filter: brightness(1.1); }
        .hint { color: var(--texto-gelo); margin-top: 8px; }

        @media (max-width: 768px) {
          .section-card { padding: 16px; }
          .podium { gap: 10px; }
          .admin-form .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
