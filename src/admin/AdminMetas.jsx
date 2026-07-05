// src/admin/AdminMetas.jsx
// Team Goals Calendar — powered by FullCalendar + Google Calendar integration

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import { useAuth } from '../context/useAuth';
import { useToast } from '../components/UI/Toast';
import {
  getMetas, createMeta, updateMeta, deleteMeta,
  addObservation, deleteObservation,
  getTeamMembers,
  getCalendarStatus, getCalendarConnectUrl, disconnectCalendar,
} from '../services/metasAPI';

import styles from './AdminMetas.module.css';
import './AdminCommon.css';

// ── Constants ──────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: 'goal',      label: 'Meta',      color: '#D12BF2' },
  { value: 'meeting',   label: 'Reunião',   color: '#00E4F2' },
  { value: 'deadline',  label: 'Deadline',  color: '#f59e0b' },
  { value: 'milestone', label: 'Milestone', color: '#D12BF2' },
];

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pendente' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'done',        label: 'Concluída' },
];

const STATUS_COLORS = {
  pending:     '#a0a0b0',
  in_progress: '#00E4F2',
  done:        '#22c55e',
};

const TYPE_COLOR_MAP = Object.fromEntries(TYPE_OPTIONS.map(t => [t.value, t.color]));

const EMPTY_FORM = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  status: 'pending',
  type: 'goal',
  callLink: '',
  color: '#D12BF2',
  assigneeIds: [],
};

// ── Helper ──────────────────────────────────────────────────

function toLocalDatetimeValue(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Main Component ─────────────────────────────────────────

export default function AdminMetas() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const calendarRef = useRef(null);
  const isAdmin = hasRole(['admin', 'editor']);

  const [metas, setMetas] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Quick-view panel (bottom slide-up)
  const [quickView, setQuickView] = useState({ open: false, meta: null });

  // Modal state
  const [modal, setModal] = useState({ open: false, meta: null, creating: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Observation input
  const [obsInput, setObsInput] = useState('');
  const [obsLoading, setObsLoading] = useState(false);

  // ── Data loading ────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [metasData, membersData] = await Promise.all([getMetas(), getTeamMembers()]);
      setMetas(metasData);
      setTeamMembers(membersData);
    } catch (err) {
      const is401 = err?.status === 401 || String(err?.message).includes('401');
      const msg = is401
        ? 'Sessão expirada — faça login novamente'
        : 'Falha ao carregar metas. Tente recarregar a página.';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCalendarStatus = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const status = await getCalendarStatus();
      setCalendarConnected(status?.connected ?? false);
    } catch { /* silent */ }
  }, [isAdmin]);

  useEffect(() => {
    loadAll();
    loadCalendarStatus();

    // Brazilian holidays via BrasilAPI (no auth needed)
    const currentYear = new Date().getFullYear();
    Promise.all([
      fetch(`https://brasilapi.com.br/api/feriados/v1/${currentYear}`).then(r => r.json()),
      fetch(`https://brasilapi.com.br/api/feriados/v1/${currentYear + 1}`).then(r => r.json()),
    ]).then(([thisYear, nextYear]) => {
      const all = [...(Array.isArray(thisYear) ? thisYear : []), ...(Array.isArray(nextYear) ? nextYear : [])];
      setHolidays(all.map(h => ({
        id: `holiday-${h.date}`,
        title: h.name,
        start: h.date,
        allDay: true,
        display: 'background',
        backgroundColor: 'rgba(99, 102, 241, 0.18)',
        extendedProps: { isHoliday: true },
      })));
    }).catch(() => { /* silent — feriados são opcionais */ });

    // Handle Google OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal') === 'connected') {
      toast.success('Google Calendar conectado com sucesso!');
      window.history.replaceState({}, '', window.location.pathname);
      loadCalendarStatus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── FullCalendar events ─────────────────────────────────

  const calendarEvents = [
    ...metas.map(m => ({
      id: String(m.id),
      title: m.title,
      start: m.startDate,
      end: m.endDate ?? m.startDate,
      backgroundColor: TYPE_COLOR_MAP[m.type] ?? '#D12BF2',
      borderColor: TYPE_COLOR_MAP[m.type] ?? '#D12BF2',
      textColor: '#fff',
      extendedProps: { meta: m },
    })),
    ...holidays,
  ];

  // ── Modal helpers ────────────────────────────────────────

  function openCreate(dateStr) {
    const startDate = dateStr ? `${dateStr}T09:00` : '';
    setForm({ ...EMPTY_FORM, startDate, color: '#D12BF2' });
    setFormErrors({});
    setObsInput('');
    setModal({ open: true, meta: null, creating: true });
  }

  function openEdit(meta) {
    setForm({
      title: meta.title ?? '',
      description: meta.description ?? '',
      startDate: toLocalDatetimeValue(meta.startDate),
      endDate: toLocalDatetimeValue(meta.endDate),
      status: meta.status ?? 'pending',
      type: meta.type ?? 'goal',
      callLink: meta.callLink ?? '',
      color: meta.color ?? '#D12BF2',
      assigneeIds: (meta.assignees ?? []).map(a => a.userId ?? a.user?.id),
    });
    setFormErrors({});
    setObsInput('');
    setModal({ open: true, meta, creating: false });
  }

  function closeModal() {
    setModal({ open: false, meta: null, creating: false });
    setObsInput('');
    setConfirmDeleteOpen(false);
  }

  // ── Form validation ──────────────────────────────────────

  function validate(f) {
    const errs = {};
    if (!f.title.trim()) errs.title = 'Título obrigatório';
    if (!f.startDate) errs.startDate = 'Data de início obrigatória';
    if (f.callLink && !/^https?:\/\//i.test(f.callLink)) errs.callLink = 'Link inválido (deve começar com http/https)';
    return errs;
  }

  // ── CRUD handlers ────────────────────────────────────────

  async function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        status: form.status,
        type: form.type,
        callLink: form.callLink.trim() || undefined,
        color: TYPE_COLOR_MAP[form.type] ?? form.color,
        assigneeIds: form.assigneeIds,
      };

      if (modal.creating) {
        await createMeta(payload);
        toast.success('Meta criada!');
      } else {
        await updateMeta(modal.meta.id, payload);
        toast.success('Meta atualizada!');
      }
      await loadAll();
      closeModal();
    } catch (err) {
      toast.error(err?.message ?? 'Falha ao salvar meta');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMeta(modal.meta.id);
      toast.success('Meta removida');
      setConfirmDeleteOpen(false);
      await loadAll();
      closeModal();
    } catch (err) {
      toast.error(err?.message ?? 'Falha ao remover meta');
    } finally {
      setDeleting(false);
    }
  }

  async function handleEventDrop(info) {
    const meta = info.event.extendedProps.meta;
    if (!meta) return;
    try {
      const newStart = info.event.start.toISOString();
      const newEnd = info.event.end ? info.event.end.toISOString() : undefined;
      await updateMeta(meta.id, { startDate: newStart, endDate: newEnd });
      setMetas(prev => prev.map(m => m.id === meta.id
        ? { ...m, startDate: newStart, endDate: newEnd ?? m.endDate }
        : m,
      ));
      toast.success('Meta reagendada');
    } catch (err) {
      info.revert();
      toast.error(err?.message ?? 'Falha ao reagendar meta');
    }
  }

  async function handleEventResize(info) {
    const meta = info.event.extendedProps.meta;
    if (!meta) return;
    try {
      const newEnd = info.event.end.toISOString();
      await updateMeta(meta.id, { endDate: newEnd });
      setMetas(prev => prev.map(m => m.id === meta.id ? { ...m, endDate: newEnd } : m));
      toast.success('Duração atualizada');
    } catch (err) {
      info.revert();
      toast.error(err?.message ?? 'Falha ao atualizar duração');
    }
  }

  // ── Observation handlers ─────────────────────────────────

  async function handleAddObs() {
    if (!obsInput.trim()) return;
    setObsLoading(true);
    try {
      const obs = await addObservation(modal.meta.id, obsInput.trim());
      setMetas(prev => prev.map(m => m.id === modal.meta.id
        ? { ...m, observations: [...(m.observations ?? []), obs] }
        : m,
      ));
      setModal(prev => ({
        ...prev,
        meta: { ...prev.meta, observations: [...(prev.meta.observations ?? []), obs] },
      }));
      setObsInput('');
    } catch {
      toast.error('Falha ao adicionar observação');
    } finally {
      setObsLoading(false);
    }
  }

  async function handleDeleteObs(obsId) {
    try {
      await deleteObservation(modal.meta.id, obsId);
      const removeObs = list => list.filter(o => o.id !== obsId);
      setMetas(prev => prev.map(m => m.id === modal.meta.id
        ? { ...m, observations: removeObs(m.observations ?? []) }
        : m,
      ));
      setModal(prev => ({
        ...prev,
        meta: { ...prev.meta, observations: removeObs(prev.meta.observations ?? []) },
      }));
    } catch {
      toast.error('Falha ao remover observação');
    }
  }

  // ── Google Calendar handlers ─────────────────────────────

  async function handleConnectCalendar() {
    setCalendarLoading(true);
    try {
      const url = await getCalendarConnectUrl();
      if (url) {
        try {
          const parsed = new URL(url);
          if (!parsed.hostname.endsWith('accounts.google.com') && !parsed.hostname.endsWith('google.com')) throw new Error('domínio inválido');
        } catch {
          toast.error('URL de conexão inválida.');
          setCalendarLoading(false);
          return;
        }
        window.location.href = url;
      }
    } catch {
      toast.error('Falha ao obter link de conexão');
      setCalendarLoading(false);
    }
  }

  const [confirmDisconnectCal, setConfirmDisconnectCal] = useState(false);

  async function handleDisconnectCalendar() {
    try {
      await disconnectCalendar();
      setCalendarConnected(false);
      setConfirmDisconnectCal(false);
      toast.success('Google Calendar desconectado');
    } catch {
      toast.error('Falha ao desconectar');
    }
  }

  // ── Assignee toggle ──────────────────────────────────────

  function toggleAssignee(userId) {
    setForm(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(userId)
        ? prev.assigneeIds.filter(id => id !== userId)
        : [...prev.assigneeIds, userId],
    }));
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="admin-content">
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className="title">Metas da Equipe</h1>
          <p className={styles.subtitle}>Planeje, acompanhe e compartilhe objetivos com o time.</p>
        </div>
        <div className={styles.headerActions}>
          {isAdmin && (
            confirmDisconnectCal ? (
              <div className={styles.confirmDelete}>
                <span>Desconectar Google Calendar?</span>
                <button className="btn btn-danger" onClick={handleDisconnectCalendar} disabled={calendarLoading}>
                  {calendarLoading ? '...' : 'Confirmar'}
                </button>
                <button className="btn btn-outline" onClick={() => setConfirmDisconnectCal(false)}>Cancelar</button>
              </div>
            ) : (
              <button
                className={`btn ${calendarConnected ? 'btn-outline' : 'btn-primary'} ${styles.calendarBtn}`}
                onClick={calendarConnected ? () => setConfirmDisconnectCal(true) : handleConnectCalendar}
                disabled={calendarLoading}
                title={calendarConnected ? 'Google Calendar conectado — clique para desconectar' : 'Conectar Google Calendar'}
              >
                <span className={`${styles.calendarDot} ${calendarConnected ? styles.dotConnected : styles.dotDisconnected}`} />
                {calendarConnected ? 'Google Calendar' : 'Conectar Calendar'}
              </button>
            )
          )}
          <button className="btn btn-primary" onClick={() => openCreate('')}>
            + Nova Meta
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {TYPE_OPTIONS.map(t => (
          <span key={t.value} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: t.color }} />
            {t.label}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'rgba(99,102,241,0.5)', border: '1px solid #D12BF2' }} />
          Feriado nacional
        </span>
      </div>

      {/* Calendar */}
      <div className={styles.calendarWrapper}>
        {loading ? (
          <div className={styles.loadingBox}>Carregando metas...</div>
        ) : loadError ? (
          <div className={styles.loadingBox}>
            <p style={{ color: '#f87171', marginBottom: '12px' }}>{loadError}</p>
            <button className="btn btn-outline" onClick={loadAll}>Tentar novamente</button>
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            locale={ptBrLocale}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
            }}
            buttonText={{
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              list: 'Lista',
            }}
            events={calendarEvents}
            editable={isAdmin}
            selectable
            selectMirror
            dayMaxEvents={3}
            height="auto"
            select={info => openCreate(info.startStr.slice(0, 10))}
            eventClick={info => {
              if (info.event.extendedProps.isHoliday) return;
              setQuickView({ open: true, meta: info.event.extendedProps.meta });
            }}
            eventDrop={isAdmin ? handleEventDrop : undefined}
            eventResize={isAdmin ? handleEventResize : undefined}
            eventContent={renderEventContent}
          />
        )}
      </div>

      {/* Quick-view — portal com inline styles, sem dependência de CSS module */}
      {quickView.open && quickView.meta && createPortal((() => {
        const m = quickView.meta;
        const typeOpt = TYPE_OPTIONS.find(t => t.value === m.type);
        const statusOpt = STATUS_OPTIONS.find(s => s.value === m.status);
        const fmt = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;
        const sc = STATUS_COLORS[m.status] ?? '#a0a0b0';
        return (
          <div
            onClick={e => e.target === e.currentTarget && setQuickView({ open: false, meta: null })}
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <div
              role="dialog"
              style={{
                width: '90vw', maxWidth: '1100px', minWidth: '360px',
                maxHeight: '90vh',
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '20px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.09)',
                gap: '16px', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: typeOpt?.color ?? '#D12BF2', flexShrink: 0 }} />
                  <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F5F5F7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, color: '#c0c0d8',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '20px', padding: '3px 12px', flexShrink: 0, textTransform: 'uppercase',
                  }}>
                    {typeOpt?.label ?? m.type}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {isAdmin && (
                    <button
                      onClick={() => { setQuickView({ open: false, meta: null }); openEdit(m); }}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                        color: '#F5F5F7', borderRadius: '8px', padding: '6px 16px',
                        fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => setQuickView({ open: false, meta: null })}
                    style={{
                      background: 'transparent', border: 'none', color: '#a0a0b0',
                      fontSize: '1.5rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
                    }}
                  >×</button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 28px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
                {/* Status + data */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.85rem', fontWeight: 700, borderRadius: '20px', padding: '5px 16px',
                    background: sc + '22', color: sc, border: `1px solid ${sc}44`,
                  }}>
                    {statusOpt?.label ?? m.status}
                  </span>
                  <span style={{ fontSize: '1.05rem', color: '#c0c0d8' }}>
                    {fmt(m.startDate)}{m.endDate && m.endDate !== m.startDate ? ` → ${fmt(m.endDate)}` : ''}
                  </span>
                </div>

                {/* Descrição */}
                {m.description && (
                  <p style={{ fontSize: '1.05rem', color: '#d0d0e8', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {m.description}
                  </p>
                )}

                {/* Call link */}
                {m.callLink && (
                  <a href={m.callLink} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.92rem', fontWeight: 600, color: '#00E4F2',
                    textDecoration: 'none', padding: '10px 20px',
                    border: '1px solid rgba(0,228,242,0.35)', borderRadius: '10px',
                    background: 'rgba(0,228,242,0.06)', width: 'fit-content',
                  }}>
                    📹 Entrar na call
                  </a>
                )}

                {/* Responsáveis */}
                {(m.assignees ?? []).length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#70708a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Responsáveis:
                    </span>
                    {m.assignees.map(a => (
                      <span key={a.userId ?? a.user?.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '20px', padding: '4px 12px', fontSize: '0.85rem', color: '#e0e0f0',
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', background: '#D12BF2',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {(a.user?.name ?? '?')[0].toUpperCase()}
                        </span>
                        {a.user?.name ?? '—'}
                      </span>
                    ))}
                  </div>
                )}

                {/* Observações */}
                {(m.observations ?? []).length > 0 && (
                  <p style={{ fontSize: '0.9rem', color: '#a0a0b0', margin: 0 }}>
                    💬 {m.observations.length} observaç{m.observations.length === 1 ? 'ão' : 'ões'}
                    {isAdmin && (
                      <> — <button
                        onClick={() => { setQuickView({ open: false, meta: null }); openEdit(m); }}
                        style={{ background: 'none', border: 'none', color: '#00E4F2', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
                      >ver tudo</button></>
                    )}
                  </p>
                )}

                {/* Concluir */}
                {isAdmin && m.status !== 'done' && (
                  <button
                    onClick={async () => {
                      try {
                        await updateMeta(m.id, { status: 'done' });
                        setMetas(prev => prev.map(x => x.id === m.id ? { ...x, status: 'done' } : x));
                        setQuickView({ open: false, meta: null });
                        toast.success('Meta marcada como concluída!');
                      } catch {
                        toast.error('Erro ao atualizar status.');
                      }
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      padding: '10px 20px', borderRadius: '10px',
                      border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)',
                      color: '#22c55e', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                      alignSelf: 'flex-start', marginTop: '4px',
                    }}
                  >
                    ✓ Marcar como concluída
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* Modal */}
      {modal.open && (
        <div className={styles.modalBackdrop} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <span
                  className={styles.typeDot}
                  style={{ background: TYPE_COLOR_MAP[form.type] ?? '#D12BF2' }}
                />
                {modal.creating ? 'Nova Meta' : 'Editar Meta'}
              </div>
              <button className={styles.modalClose} onClick={closeModal} aria-label="Fechar">×</button>
            </div>

            <div className={styles.modalBody}>
              {/* Form */}
              <div className={styles.formGrid}>
                {/* Title */}
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Título *</label>
                  <input
                    className={formErrors.title ? styles.inputError : ''}
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    onBlur={() => {
                      const e = validate(form);
                      setFormErrors(p => ({ ...p, title: e.title }));
                    }}
                    placeholder="Ex: Lançar versão 2.0"
                    maxLength={256}
                  />
                  {formErrors.title && <span className={styles.errMsg}>{formErrors.title}</span>}
                </div>

                {/* Type & Status */}
                <div className={styles.formGroup}>
                  <label>Tipo</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value, color: TYPE_COLOR_MAP[e.target.value] ?? p.color }))}
                  >
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className={styles.formGroup}>
                  <label>Início *</label>
                  <input
                    type="datetime-local"
                    className={formErrors.startDate ? styles.inputError : ''}
                    value={form.startDate}
                    onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  />
                  {formErrors.startDate && <span className={styles.errMsg}>{formErrors.startDate}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Término</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Detalhes, contexto, critérios de sucesso..."
                    rows={3}
                  />
                </div>

                {/* Call link */}
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>
                    Link da Call
                    {form.type === 'meeting' && !modal.creating && !form.callLink && calendarConnected && (
                      <span className={styles.autoMeetHint}> — será gerado automaticamente via Google Meet</span>
                    )}
                  </label>
                  <input
                    type="url"
                    className={formErrors.callLink ? styles.inputError : ''}
                    value={form.callLink}
                    onChange={e => setForm(p => ({ ...p, callLink: e.target.value }))}
                    onBlur={() => {
                      const e = validate(form);
                      setFormErrors(p => ({ ...p, callLink: e.callLink }));
                    }}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  />
                  {formErrors.callLink && <span className={styles.errMsg}>{formErrors.callLink}</span>}
                  {form.callLink && (
                    <a href={form.callLink} target="_blank" rel="noopener noreferrer" className={styles.callLinkPreview}>
                      Abrir call ↗
                    </a>
                  )}
                </div>

                {/* Assignees */}
                {teamMembers.length > 0 && (
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Responsáveis</label>
                    <div className={styles.assigneeList}>
                      {teamMembers.map(m => {
                        const selected = form.assigneeIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            className={`${styles.assigneeChip} ${selected ? styles.assigneeSelected : ''}`}
                            onClick={() => toggleAssignee(m.id)}
                          >
                            <span className={styles.assigneeAvatar}>{m.name[0]?.toUpperCase()}</span>
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Observations section (only when editing) */}
              {!modal.creating && modal.meta && (
                <div className={styles.obsSection}>
                  <h3 className={styles.obsTitle}>Observações</h3>

                  <div className={styles.obsList}>
                    {(modal.meta.observations ?? []).length === 0 && (
                      <p className={styles.obsEmpty}>Nenhuma observação ainda.</p>
                    )}
                    {(modal.meta.observations ?? []).map(obs => (
                      <div key={obs.id} className={styles.obsItem}>
                        <div className={styles.obsHeader}>
                          <span className={styles.obsAuthor}>{obs.author?.name ?? 'Usuário'}</span>
                          <span className={styles.obsDate}>
                            {new Date(obs.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          {(isAdmin || obs.author?.id === user?.id) && (
                            <button
                              className={styles.obsDelete}
                              onClick={() => handleDeleteObs(obs.id)}
                              aria-label="Remover observação"
                              title="Remover"
                            >×</button>
                          )}
                        </div>
                        <p className={styles.obsContent}>{obs.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className={styles.obsInput}>
                    <textarea
                      value={obsInput}
                      onChange={e => setObsInput(e.target.value)}
                      placeholder="Adicionar observação..."
                      rows={2}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddObs();
                      }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleAddObs}
                      disabled={!obsInput.trim() || obsLoading}
                    >
                      {obsLoading ? '...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              {!modal.creating && isAdmin && (
                confirmDeleteOpen ? (
                  <div className={styles.confirmDelete}>
                    <span>Remover esta meta?</span>
                    <button
                      className="btn btn-danger"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Removendo...' : 'Confirmar'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => setConfirmDeleteOpen(false)}
                      disabled={deleting}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-danger"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    Remover meta
                  </button>
                )
              )}
              <div className={styles.footerRight}>
                <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : modal.creating ? 'Criar meta' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Event content renderer ───────────────────────────────────

function renderEventContent(eventInfo) {
  const meta = eventInfo.event.extendedProps.meta;
  const statusColor = STATUS_COLORS[meta?.status] ?? '#a0a0b0';
  return (
    <div className={styles.eventContent} title={eventInfo.event.title}>
      <span className={styles.eventStatus} style={{ background: statusColor }} />
      <span className={styles.eventTitle}>{eventInfo.event.title}</span>
      {meta?.callLink && <span className={styles.eventCallIcon} title="Tem link de call">📹</span>}
    </div>
  );
}
