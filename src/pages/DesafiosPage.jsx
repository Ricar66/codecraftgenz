// src/pages/DesafiosPage.jsx
// Desafios Epicos - Cyberpunk/Glassmorphism Design
import React, { useEffect, useRef, useState } from 'react';

import ChallengeCard from '../components/Challenges/ChallengeCard.jsx';
import ChallengesSubNav from '../components/ChallengesSubNav/ChallengesSubNav.jsx';
import Navbar from '../components/Navbar/Navbar';
import Modal from '../components/UI/Modal/Modal.jsx';
import { useToast } from '../components/UI/Toast';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../lib/apiConfig.js';
import { realtime } from '../lib/realtime';
import {
  submitChallenge,
  getMySubmission,
} from '../services/challengeSubmissionsAPI.js';

import styles from './DesafiosPage.module.css';

// Valida URL de github.com ou gitlab.com. Sem ambiguidade: cada alternação é literal/segmento fixo.
const REPO_URL_REGEX = /^https?:\/\/(?:www\.)?(?:github|gitlab)\.com\/[\w.-]+\/[\w.-]+\/?$/i;

const STATUS_LABEL = {
  pending: { emoji: '🟡', label: 'Pendente', color: '#F59E0B' },
  approved: { emoji: '✅', label: 'Aprovada', color: '#10B981' },
  rejected: { emoji: '❌', label: 'Rejeitada', color: '#EF4444' },
};

export default function DesafiosPage() {
  const [desafios, setDesafios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deliverUrls, setDeliverUrls] = useState({});
  const { user } = useAuth();
  const toast = useToast();

  // Submissão (fluxo GitHub/GitLab)
  const [submitModal, setSubmitModal] = useState({ open: false, desafio: null });
  const [submitForm, setSubmitForm] = useState({ repoUrl: '', description: '' });
  const [submitFormErrors, setSubmitFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [mySubmissions, setMySubmissions] = useState({}); // { [desafioId]: submission | null }

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

  // Carrega submissões do usuário para cada desafio visível
  useEffect(() => {
    if (!user?.id || desafios.length === 0) {
      setMySubmissions({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        desafios.map(async (d) => {
          try {
            const sub = await getMySubmission(d.id);
            return [d.id, sub];
          } catch {
            return [d.id, null];
          }
        })
      );
      if (!cancelled) {
        setMySubmissions(Object.fromEntries(entries));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, desafios]);

  const participar = async (id) => {
    const crafterId = user?.id;
    if (!crafterId) {
      toast.warning('É necessário estar autenticado para participar.');
      return;
    }
    const payload = { crafter_id: crafterId };
    try {
      await apiRequest(`/api/desafios/${id}/inscrever`, { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Inscrição realizada!');
      realtime.publish('desafios_changed', {});
    } catch (e) {
      toast.error(e.message || 'Falha ao inscrever');
    }
  };

  const entregar = async (d) => {
    const url = String(deliverUrls[d.id] || '').trim();
    if ((d.delivery_type === 'link' || d.delivery_type === 'github') && !/^https?:\/\//i.test(url)) {
      toast.warning('URL invalida.');
      return;
    }
    const crafterId = user?.id;
    if (!crafterId) {
      toast.warning('É necessário estar autenticado para enviar a entrega.');
      return;
    }
    const payload = { crafter_id: crafterId, delivery: { url, notes: '' } };
    try {
      await apiRequest(`/api/desafios/${d.id}/entregar`, { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Entrega enviada!');
      realtime.publish('desafios_changed', {});
      setDeliverUrls(prev => ({ ...prev, [d.id]: '' }));
    } catch (e) {
      toast.error(e.message || 'Falha ao enviar');
    }
  };

  // ===== Submissão (fluxo GitHub/GitLab) =====

  const openSubmitModal = (desafio) => {
    if (!user?.id) {
      toast.warning('É necessário estar autenticado para submeter uma solução.');
      return;
    }
    setSubmitForm({ repoUrl: '', description: '' });
    setSubmitFormErrors({});
    setSubmitModal({ open: true, desafio });
  };

  const closeSubmitModal = () => {
    if (submitting) return;
    setSubmitModal({ open: false, desafio: null });
  };

  const validateSubmitField = (name, value) => {
    if (name === 'repoUrl') {
      if (!value.trim()) return 'URL do repositório é obrigatória';
      if (!REPO_URL_REGEX.test(value.trim())) return 'URL deve ser do GitHub ou GitLab';
    }
    return '';
  };

  const handleSubmitBlur = (e) => {
    const { name, value } = e.target;
    const err = validateSubmitField(name, value);
    setSubmitFormErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmitSolution = async (e) => {
    e.preventDefault();
    const desafio = submitModal.desafio;
    if (!desafio) return;

    const errs = {
      repoUrl: validateSubmitField('repoUrl', submitForm.repoUrl),
    };
    setSubmitFormErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      toast.warning('Corrija os campos destacados.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await submitChallenge(desafio.id, {
        repoUrl: submitForm.repoUrl.trim(),
        description: submitForm.description.trim() || undefined,
      });
      toast.success('Solução submetida! Aguarde a avaliação.');
      setMySubmissions((prev) => ({ ...prev, [desafio.id]: created }));
      setSubmitModal({ open: false, desafio: null });
      realtime.publish('desafios_changed', {});
    } catch (err) {
      toast.error(err?.message || 'Falha ao submeter a solução.');
    } finally {
      setSubmitting(false);
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
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />
      <ChallengesSubNav />

      {/* Hero Section */}
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Desafios Épicos</h1>
        <h2 className={styles.heroSubtitle}>Desafios que moldam gigantes</h2>
        <p className={styles.heroLead}>
          Cada missão CodeCraft é uma oportunidade de testar suas habilidades
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
            Não foi possível carregar os desafios. Tente novamente mais tarde.
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
              {desafios.map((d) => {
                const mySub = mySubmissions[d.id];
                const statusInfo = mySub?.status ? STATUS_LABEL[mySub.status] : null;
                const isActive = d.status === 'active' || d.status === 'ativo';
                return (
                  <div key={d.id} className={styles.challengeSnap}>
                    <ChallengeCard challenge={d} />

                    <div className={styles.challengeActions}>
                      <button
                        className={styles.participateBtn}
                        onClick={() => participar(d.id)}
                        disabled={!isActive}
                      >
                        {isActive ? 'Quero participar!' : 'Encerrado'}
                      </button>

                      {(d.delivery_type === 'link' || d.delivery_type === 'github') && (
                        <div className={styles.deliveryForm}>
                          <input
                            type="text"
                            placeholder={d.delivery_type === 'github' ? 'URL do repositório' : 'URL da entrega'}
                            value={deliverUrls[d.id] || ''}
                            onChange={e => setDeliverUrls(prev => ({ ...prev, [d.id]: e.target.value }))}
                            className={styles.deliveryInput}
                            aria-label="URL da entrega"
                          />
                          <button
                            className={styles.deliveryBtn}
                            onClick={() => entregar(d)}
                            disabled={!isActive}
                          >
                            Enviar
                          </button>
                        </div>
                      )}

                      {/* Novo fluxo: Submeter Solução (GitHub/GitLab) */}
                      {isActive && !mySub && (
                        <button
                          type="button"
                          className={styles.submitSolutionBtn}
                          onClick={() => openSubmitModal(d)}
                        >
                          Submeter Solução
                        </button>
                      )}

                      {/* Badge com status da minha submissão */}
                      {mySub && statusInfo && (
                        <div
                          className={styles.submissionStatus}
                          style={{ borderColor: statusInfo.color, color: statusInfo.color }}
                          role="status"
                        >
                          <span className={styles.submissionBadge}>
                            <span aria-hidden="true">{statusInfo.emoji}</span>{' '}
                            <strong>{statusInfo.label}</strong>
                          </span>
                          {mySub.feedback && (
                            <p className={styles.submissionFeedback}>{mySub.feedback}</p>
                          )}
                          {mySub.status === 'approved' && mySub.points > 0 && (
                            <p className={styles.submissionPoints}>+{mySub.points} pontos</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className={`${styles.navBtn} ${styles.navBtnRight}`}
              onClick={() => scrollBy(1)}
              aria-label="Ver próximos"
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
            Nossos desafios não são apenas testes. São experiências que transformam
            Crafters em verdadeiros criadores do amanhã.
          </p>
        </div>
      </section>

      {/* Modal de Submissão */}
      <Modal
        isOpen={submitModal.open}
        onClose={closeSubmitModal}
        title={submitModal.desafio ? `Submeter: ${submitModal.desafio.name}` : 'Submeter Solução'}
        size="md"
        footer={
          <>
            <button
              type="button"
              className={styles.modalBtnGhost}
              onClick={closeSubmitModal}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={handleSubmitSolution}
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Enviar Solução'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitSolution} className={styles.modalForm}>
          <div className={styles.modalField}>
            <label htmlFor="repoUrl" className={styles.modalLabel}>
              URL do repositório <span className={styles.required}>*</span>
            </label>
            <input
              id="repoUrl"
              name="repoUrl"
              type="url"
              className={`${styles.modalInput} ${submitFormErrors.repoUrl ? styles.modalInputError : ''}`}
              placeholder="https://github.com/seu-usuario/projeto"
              value={submitForm.repoUrl}
              onChange={(e) => setSubmitForm((p) => ({ ...p, repoUrl: e.target.value }))}
              onBlur={handleSubmitBlur}
              disabled={submitting}
              required
            />
            {submitFormErrors.repoUrl && (
              <p className={styles.modalFieldError}>{submitFormErrors.repoUrl}</p>
            )}
          </div>

          <div className={styles.modalField}>
            <label htmlFor="description" className={styles.modalLabel}>
              Descrição <span className={styles.optional}>(opcional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              className={styles.modalTextarea}
              placeholder="Explique brevemente sua solução, tecnologias utilizadas, etc."
              value={submitForm.description}
              onChange={(e) => setSubmitForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              maxLength={4000}
              disabled={submitting}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
