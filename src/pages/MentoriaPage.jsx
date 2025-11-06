// src/pages/MentoriaPage.jsx
import React, { useEffect, useState } from 'react';

import Navbar from '../components/Navbar/Navbar';
import { API_BASE_URL } from '../lib/apiConfig';
import { realtime } from '../lib/realtime';

export default function MentoriaPage() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchMentors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentores`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      // Normaliza campos vindos do endpoint (foto_url → photo)
      const normalized = list.map(m => ({
        ...m,
        // normalização de nomes de campo banco -> UI
        photo: m.foto_url || m.photo || null,
        name: m.nome || m.name || '',
        phone: m.telefone || m.phone || '',
        specialty: m.especialidade || m.specialty || '',
        cargo: m.cargo || m.role || '',
        bio: m.bio || m.descricao || '',
        email: m.email || '',
        visible: m.visible !== undefined ? !!m.visible : true,
      }));
      setMentors(normalized.filter(m => m.visible));
    } catch (error) {
      console.error('Erro ao carregar mentores:', error);
      setMentors([]); // Em caso de erro, lista vazia
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true; // Flag para verificar se o componente ainda está montado
    
    fetchMentors();

    const unsub = realtime.subscribe('mentors_changed', () => {
      // Quando o admin publicar mudanças, refaz fetch do endpoint
      if (isMounted) {
        fetchMentors();
      }
    });

    // Em ambiente de teste, evitamos polling para reduzir warnings de act
    const isTest = !!import.meta.env?.VITEST_WORKER_ID;
    const pollMs = Number(import.meta.env.VITE_MENTORS_POLL_MS || (isTest ? 0 : 5000));
    let iv = null;
    if (pollMs > 0) {
      iv = setInterval(() => {
        if (!isMounted) return; // Evita fetch se componente foi desmontado
        
        fetch(`${API_BASE_URL}/api/mentores`)
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(json => {
            if (!isMounted) return; // Evita setState se componente foi desmontado
            
            const list = Array.isArray(json?.data) ? json.data : [];
            const normalized = list.map(m => ({
              ...m,
              photo: m.foto_url || m.photo || null,
              name: m.nome || m.name || '',
              phone: m.telefone || m.phone || '',
              specialty: m.especialidade || m.specialty || '',
              cargo: m.cargo || m.role || '',
              bio: m.bio || m.descricao || '',
              email: m.email || '',
              visible: m.visible !== undefined ? !!m.visible : true,
            }));
            setMentors(normalized.filter(m => m.visible));
          })
          .catch(() => {
            if (!isMounted) return; // Evita setState se componente foi desmontado
            // If API fails, set empty array
            setMentors([]);
          });
      }, pollMs);
    }
    
    return () => { 
      isMounted = false; // Marca como desmontado
      unsub(); 
      if (iv) {
        clearInterval(iv);
        iv = null;
      }
    };
  }, []); // Sem dependências para evitar re-execução desnecessária

  return (
    <div className="mentoria-page">
      <Navbar />

      <section className="section-block">
        <div className="section-card">
          <header className="section-header">
            <h1 className="title">Mentoria CodeCraft</h1>
            <h2 className="subtitle">Aprenda com quem já está construindo o futuro 🚀</h2>
            <p className="lead">
              Nosso programa de mentoria conecta você a profissionais experientes que vão guiar sua jornada de crescimento.
            </p>
          </header>

          <div className="mentors-grid" aria-busy={loading}>
            {mentors.map((m) => (
              <article key={m.id || m.email || m.name} className="mentor-card">
                <div className="avatar" aria-hidden={!!m.photo}>
                  {m.photo ? (<img src={m.photo} alt={`Foto de ${m.name}`} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />) : null}
                </div>
                <div className="info">
                  <div className="header">
                    <h3 className="name">{m.name}</h3>
                    <p className="role">{m.cargo || m.specialty}</p>
                  </div>
                  <div className="details">
                    <div className="contact">
                      {m.phone ? (<span className="contact-item" title={m.phone}>📞 {m.phone}</span>) : null}
                      {m.email ? (<span className="contact-item" title={m.email}>📧 {m.email}</span>) : null}
                    </div>
                    <p className="bio">{m.bio}</p>
                  </div>
                </div>
              </article>
            ))}
            {!loading && mentors.length === 0 && (
              <div className="empty" role="status">Nenhum mentor cadastrado no momento. Em breve, novos profissionais inspiradores estarão aqui 🚀</div>
            )}
          </div>

          <div className="section-footer">
            <p className="helper-text">
              A mentoria CodeCraft é um espaço de troca e aprendizado contínuo. Nossos mentores compartilham experiências reais de mercado,
              te ajudam a definir metas claras e a transformar ideias em projetos de impacto.
            </p>
          </div>
        </div>
      </section>

      <style>{`
        .mentoria-page {
          min-height: 100vh;
          width: 100%;
          background-color: transparent;
        }

        .section-block { padding: var(--espaco-3xl) var(--espaco-xl); }

        .section-card {
          max-width: 1200px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: var(--raio-xl);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.25);
          padding: var(--espaco-xl);
          overflow: hidden; /* garante que pseudo-elementos e conteúdos não escapem do container */
        }

        .section-header { text-align: center; margin-bottom: var(--espaco-lg); }
        .title { font-family: var(--fonte-titulos); font-size: clamp(2rem, 4vw, 3rem); color: var(--texto-branco); }
        .subtitle { font-size: clamp(1.25rem, 2.5vw, 1.5rem); color: var(--texto-gelo); margin-top: var(--espaco-xs); }
        .lead { font-size: 1.05rem; color: var(--texto-gelo); margin-top: var(--espaco-sm); }

        .mentors-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: var(--espaco-lg);
          margin-top: var(--espaco-lg);
          padding-top: var(--espaco-md);
          align-items: start; /* não força a altura dos itens */
          /* remove altura forçada das linhas para evitar conteúdo desalinhado */
        }

        /* linha de conexão minimalista */
        .mentors-grid::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06));
          margin: 0 var(--espaco-md); /* respeita o padding interno e evita tocar bordas arredondadas */
        }

        .mentor-card {
          display: grid;
          grid-template-columns: 120px 1fr; /* dá mais espaço para texto */
          gap: var(--espaco-md);
          align-items: start; /* conteúdo começa no topo, permitindo descer com margem */
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: var(--raio-lg);
          padding: var(--espaco-md);
          box-shadow: 0 4px 18px rgba(0,0,0,0.22);
          transition: transform 180ms ease, box-shadow 180ms ease;
          /* não força altura do card para evitar empurrar conteúdo */
          overflow: hidden; /* previne que conteúdos internos ultrapassem os limites do card */
        }

        .mentor-card:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(0,0,0,0.26); }
        .mentor-card:focus-within { outline: 2px solid rgba(139, 92, 246, 0.6); outline-offset: 2px; }

        .avatar {
          width: 100px;
          height: 100px; /* foto ajustada para liberar espaço */
          border-radius: 50%;
          background: linear-gradient(135deg, #D12BF2 0%, #68007B 100%);
          border: 2px solid rgba(244,244,244,0.6);
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          overflow: hidden;
        }

        .info { display: flex; flex-direction: column; gap: var(--espaco-xs); min-width: 0; }
        .header { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .details { margin-top: var(--espaco-xs); text-align: left; }
        .details .bio { margin-top: var(--espaco-sm); }
        .contact { justify-content: flex-start; min-width: 0; }

        .name { font-weight: 700; color: var(--texto-branco); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .role { color: var(--texto-gelo); font-size: 0.95rem; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .contact { display: flex; flex-wrap: wrap; gap: var(--espaco-sm); margin-top: var(--espaco-xs); color: var(--texto-gelo); }
        .contact-item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 6px 10px; max-width: 100%; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mentor-card:hover .contact-item { border-color: #00E4F2; }
        .bio { margin-top: var(--espaco-sm); color: var(--texto-gelo); line-height: 1.5; word-break: break-word; hyphens: auto; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }

        .section-footer { margin-top: 20px; }
        .helper-text { color: var(--texto-gelo); text-align: center; }

        /* Responsividade */
        @media (max-width: 1200px) {
          .section-card { max-width: 1000px; }
        }
        @media (max-width: 992px) {
          .mentors-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
          .mentors-grid::before { left: 8%; right: 8%; }
        }
        @media (max-width: 768px) {
          .section-card { padding: var(--espaco-lg); }
          .mentors-grid { gap: var(--espaco-md); }
          .mentor-card { grid-template-columns: 100px 1fr; }
          .avatar { width: 95px; height: 95px; }
        }
        @media (max-width: 640px) {
          .section-card { padding: var(--espaco-md); }
          .mentors-grid { grid-template-columns: 1fr; }
          .mentors-grid::before { display: none; }
          .mentor-card { grid-template-columns: 90px 1fr; }
          .avatar { width: 90px; height: 90px; }
          .bio { -webkit-line-clamp: 5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mentor-card { transition: none; }
        }
      `}</style>
    </div>
  );
}