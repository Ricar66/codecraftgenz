// src/pages/DesafiosPage.jsx
// Desafios Epicos - Cyberpunk/Glassmorphism Design
import React, { useEffect, useRef, useState } from 'react';

import ChallengeCard from '../components/Challenges/ChallengeCard.jsx';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../lib/apiConfig.js';
import { realtime } from '../lib/realtime';
import styles from './DesafiosPage.module.css';

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
      alert('E necessario estar autenticado para participar.');
      return;
    }
    const payload = { crafter_id: crafterId };
    try {
      await apiRequest(`/api/desafios/${id}/inscrever`, { method: 'POST', body: JSON.stringify(payload) });
      alert('Inscricao realizada!');
      realtime.publish('desafios_changed', {});
    } catch (e) {
      alert(e.message || 'Falha ao inscrever');
    }
  };

  const entregar = async (d) => {
    const url = String(deliverUrls[d.id] || '').trim();
    if ((d.delivery_type === 'link' || d.delivery_type === 'github') && !/^https?:\/\//i.test(url)) {
      alert('URL invalida.');
      return;
    }
    const crafterId = user?.id;
    if (!crafterId) {
      alert('E necessario estar autenticado para enviar a entrega.');
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
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Desafios Epicos</h1>
        <h2 className={styles.heroSubtitle}>Desafios que moldam gigantes</h2>
        <p className={styles.heroLead}>
          Cada missao CodeCraft e uma oportunidade de testar suas habilidades
          e crescer como desenvolvedor. Aceite o desafio!
        </p>
      </header>

      {/* Challenges Section */}
      <section className={styles.challengesSection}>
        {/* Loading State */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Carregando desafios...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className={styles.errorState} role="alert">
            {error}
          </div>
        )}

        {/* Carousel */}
        {!loading && !error && desafios.length > 0 && (
          <div className={styles.carouselContainer}>
            <button
              className={`${styles.navBtn} ${styles.navBtnLeft}`}
              onClick={() => scrollBy(-1)}
              aria-label="Ver anteriores"
            >
              ◀
            </button>

            <div
              className={styles.carouselTrack}
              ref={scrollerRef}
              aria-live="polite"
            >
              {desafios.map((d) => (
                <div key={d.id} className={styles.challengeSnap}>
                  <ChallengeCard challenge={d} />

                  <div className={styles.challengeActions}>
                    <button
                      className={styles.participateBtn}
                      onClick={() => participar(d.id)}
                      disabled={d.status !== 'active'}
                    >
                      {d.status === 'active' ? 'Quero participar!' : 'Encerrado'}
                    </button>

                    {(d.delivery_type === 'link' || d.delivery_type === 'github') && (
                      <div className={styles.deliveryForm}>
                        <input
                          type="text"
                          placeholder={d.delivery_type === 'github' ? 'URL do repositorio' : 'URL da entrega'}
                          value={deliverUrls[d.id] || ''}
                          onChange={e => setDeliverUrls(prev => ({ ...prev, [d.id]: e.target.value }))}
                          className={styles.deliveryInput}
                          aria-label="URL da entrega"
                        />
                        <button
                          className={styles.deliveryBtn}
                          onClick={() => entregar(d)}
                          disabled={d.status !== 'active'}
                        >
                          Enviar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              className={`${styles.navBtn} ${styles.navBtnRight}`}
              onClick={() => scrollBy(1)}
              aria-label="Ver proximos"
            >
              ▶
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && desafios.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <h3 className={styles.emptyTitle}>Nenhum desafio ativo</h3>
            <p className={styles.emptyText}>
              Volte em breve para conferir novos desafios e testar suas habilidades!
            </p>
          </div>
        )}
      </section>

      {/* Footer Section */}
      <section className={styles.footerSection}>
        <div className={styles.footerCard}>
          <p className={styles.footerText}>
            Nossos desafios nao sao apenas testes. Sao experiencias que transformam
            Crafters em verdadeiros criadores do amanha.
          </p>
        </div>
      </section>
    </div>
  );
}
