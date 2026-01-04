// src/pages/DesafiosPage.jsx
import React, { useEffect, useRef, useState } from 'react';

import heroBackground from '../assets/hero-background.svg';
import ChallengeCard from '../components/Challenges/ChallengeCard.jsx';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../lib/apiConfig.js';
import { realtime } from '../lib/realtime';

export default function DesafiosPage() {
  const [desafios, setDesafios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deliverUrls, setDeliverUrls] = useState({});
  const { user } = useAuth();

  const fetchDesafios = async () => {
    try {
      setLoading(true);
      setError('');
      const json = await apiRequest('/api/desafios', { method: 'GET' });
      const list = Array.isArray(json?.data) ? json.data : [];
      setDesafios(list);
    } catch (e) {
      const msg = e?.message || 'Falha ao carregar desafios';
      setError(msg);
      setDesafios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesafios();
    const unsub = realtime.subscribe('desafios_changed', () => fetchDesafios());
    return () => unsub();
  }, []);


  const participar = async (id) => {
    const crafterId = user?.id;
    if (!crafterId) {
      alert('É necessário estar autenticado para participar.');
      return;
    }
    const payload = { crafter_id: crafterId };
    try {
      await apiRequest(`/api/desafios/${id}/inscrever`, { method: 'POST', body: JSON.stringify(payload) });
      alert('Inscrição realizada!');
      realtime.publish('desafios_changed', {});
    } catch (e) {
      alert(e.message || 'Falha ao inscrever');
    }
  };

  const entregar = async (d) => {
    const url = String(deliverUrls[d.id] || '').trim();
    if ((d.delivery_type === 'link' || d.delivery_type === 'github') && !/^https?:\/\//i.test(url)) {
      alert('URL inválida.');
      return;
    }
    const crafterId = user?.id;
    if (!crafterId) {
      alert('É necessário estar autenticado para enviar a entrega.');
      return;
    }
    const payload = { crafter_id: crafterId, delivery: { url, notes: '' } };
    try {
      await apiRequest(`/api/desafios/${d.id}/entregar`, { method: 'POST', body: JSON.stringify(payload) });
      alert('Entrega enviada!');
      realtime.publish('desafios_changed', {});
      setDeliverUrls(prev => ({ ...prev, [d.id]: '' }));
    } catch (e) {
      alert(e.message || 'Falha ao enviar');
    }
  };

  const scrollerRef = useRef(null);
  const scrollBy = (dir) => {
    const el = scrollerRef.current; if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className="desafios-page" style={{
      backgroundImage: `url(${heroBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      <Navbar />

      <section className="section-block">
        <div className="section-card themed">
          <header className="section-header">
            <h1 className="title">Desafios Épicos</h1>
            <h2 className="subtitle">Desafios que moldam gigantes 💪</h2>
            <p className="lead">Cada missão CodeCraft é uma oportunidade de testar suas habilidades e crescer como desenvolvedor.</p>
          </header>

          <div className="carousel">
            <button className="nav left" onClick={()=>scrollBy(-1)} aria-label="Ver anteriores">⬅️</button>
            <div className="track" ref={scrollerRef} aria-busy={loading} aria-live="polite">
              {desafios.map((d) => (
                <div key={d.id} className="snap">
                  <ChallengeCard challenge={d} />
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <button className="cta" onClick={()=>participar(d.id)} disabled={d.status!=='active'}>
                      {d.status==='active' ? 'Quero participar!' : 'Encerrado'}
                    </button>
                    {(d.delivery_type==='link' || d.delivery_type==='github') && (
                      <div className="delivery" style={{ display:'flex', gap:8 }}>
                        <input aria-label="URL da entrega" placeholder={d.delivery_type==='github' ? 'URL do repositório' : 'URL da entrega'} value={deliverUrls[d.id]||''} onChange={e=>setDeliverUrls(prev=>({ ...prev, [d.id]: e.target.value }))} className="rank-search" />
                        <button onClick={()=>entregar(d)} disabled={d.status!=='active'}>Enviar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="nav right" onClick={()=>scrollBy(1)} aria-label="Ver próximos">➡️</button>
          </div>
            {!loading && desafios.length === 0 && (
              <div className="empty" role="status">Nenhum desafio ativo no momento. Volte em breve 🚀</div>
            )}
            {!loading && error && (
              <div className="empty" role="alert">{error}</div>
            )}
            <footer className="section-footer">
              <p className="helper-text">Nossos desafios não são apenas testes. São experiências que transformam Crafters em verdadeiros criadores do amanhã.</p>
            </footer>
          </div>
      </section>

      <style>{`
        .desafios-page { min-height: 100vh; width: 100%; }
        .section-block { padding: var(--espaco-3xl) var(--espaco-xl); }
        .section-card { max-width: 1200px; margin: 0 auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.16); border-radius: var(--raio-xl); backdrop-filter: blur(12px); box-shadow: 0 8px 28px rgba(0,0,0,0.25); padding: var(--espaco-xl); }
        .section-card { overflow: hidden; }

        /* Tema roxo escuro com contraste azul neon */
        .themed { border-color: rgba(104, 0, 123, 0.6); box-shadow: 0 6px 24px rgba(104, 0, 123, 0.35); }

        .section-header { text-align: center; margin-bottom: var(--espaco-lg); }
        .title { font-family: var(--fonte-titulos); font-size: clamp(2rem, 4vw, 3rem); color: var(--texto-branco); }
        .subtitle { font-size: clamp(1.25rem, 2.5vw, 1.5rem); color: var(--texto-gelo); margin-top: var(--espaco-xs); }
        .lead { font-size: 1.05rem; color: var(--texto-gelo); margin-top: var(--espaco-sm); }

        /* Carousel */
        .carousel { position: relative; margin-top: var(--espaco-lg); }
        .track { display: flex; gap: var(--espaco-lg); overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding: var(--espaco-sm); }
        .track::-webkit-scrollbar { height: 8px; }
        .track::-webkit-scrollbar-thumb { background: rgba(0,228,242,0.35); border-radius: 999px; }
        .snap { scroll-snap-align: start; flex: 0 0 auto; min-width: 320px; max-width: 360px; }
        .nav { position: absolute; top: 50%; transform: translateY(-50%); background: #D12BF2; color: #fff; border: none; border-radius: 999px; width: 36px; height: 36px; display: grid; place-items: center; box-shadow: 0 6px 14px rgba(0,0,0,0.2); cursor: pointer; }
        .nav.left { left: 4px; }
        .nav.right { right: 4px; }

        .icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #68007B, #00E4F2); margin-bottom: var(--espaco-xs); }
        .name { color: #00E4F2; font-weight: 700; }
        .desc { color: var(--texto-gelo); margin: var(--espaco-xs) 0; }
        .meta { display: flex; flex-wrap: wrap; gap: var(--espaco-xs); margin-bottom: var(--espaco-sm); }
        .chip { background: rgba(0, 228, 242, 0.12); border: 1px solid rgba(0, 228, 242, 0.35); color: #00E4F2; border-radius: 999px; padding: 6px 10px; }
        .cta { background: #00E4F2; color: #0A0A0F; border: none; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-weight: 700; box-shadow: 0 2px 8px rgba(0, 228, 242, 0.28); }
        .cta:hover { filter: brightness(1.1); }
        .cta[disabled] { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); cursor: not-allowed; }

        @media (max-width: 1200px) { .section-card { max-width: 1000px; } }
        @media (max-width: 992px) { .snap { min-width: 300px; max-width: 340px; } }
        @media (max-width: 768px) { .section-card { padding: var(--espaco-lg); } .snap { min-width: 280px; max-width: 320px; } }
        @media (max-width: 640px) { .section-card { padding: var(--espaco-md); } .snap { min-width: 260px; max-width: 300px; } }
        @media (prefers-reduced-motion: reduce) { .desafio-card { transition: none; } }
     `}</style>
    </div>
  );
}
