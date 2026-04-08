// src/admin/AdminMetas.jsx
// Team Goals Calendar — powered by FullCalendar + Google Calendar integration

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  { value: 'milestone', label: 'Milestone', color: '#6366f1' },
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
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Modal state
  const [modal, setModal] = useState({ open: false, meta: null, creating: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Observation input
  const [obsInput, setObsInput] = useState('');
  const [obsLoading, setObsLoading] = useState(false);

  // ── Data loading ────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      const [metasData, membersData] = await Promise.all([getMetas(), getTeamMembers()]);
      setMetas(metasData);
      setTeamMembers(membersData);
    } catch {
      toast.error('Falha ao carregar metas');
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
    if (!window.confirm(`Remover a meta "${modal.meta?.title}"?`)) return;
    setDeleting(true);
    try {
      await deleteMeta(modal.meta.id);
      toast.success('Meta removida');
      await loadAll();
      closeModal();
    } catch (err) {
      toast.error(err?.message ?? 'Falha ao remover meta');
    } finally {
      setDeleting(false);
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
      if (url) window.location.href = url;
    } catch {
      toast.error('Falha ao obter link de conexão');
      setCalendarLoading(false);
    }
  }

  async function handleDisconnectCalendar() {
    if (!window.confirm('Desconectar o Google Calendar da equipe?')) return;
    try {
      await disconnectCalendar();
      setCalendarConnected(false);
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
            <button
              className={`btn ${calendarConnected ? 'btn-outline' : 'btn-primary'} ${styles.calendarBtn}`}
              onClick={calendarConnected ? handleDisconnectCalendar : handleConnectCalendar}
              disabled={calendarLoading}
              title={calendarConnected ? 'Google Calendar conectado — clique para desconectar' : 'Conectar Google Calendar'}
            >
              <span className={`${styles.calendarDot} ${calendarConnected ? styles.dotConnected : styles.dotDisconnected}`} />
              {calendarConnected ? 'Google Calendar' : 'Conectar Calendar'}
            </button>
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
          <span className={styles.legendDot} style={{ background: 'rgba(99,102,241,0.5)', border: '1px solid #6366f1' }} />
          Feriado nacional
        </span>
      </div>

      {/* Calendar */}
      <div className={styles.calendarWrapper}>
        {loading ? (
          <div className={styles.loadingBox}>Carregando metas...</div>
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
            editable={false}
            selectable
            selectMirror
            dayMaxEvents={3}
            height="auto"
            select={info => openCreate(info.startStr.slice(0, 10))}
            eventClick={info => {
              if (info.event.extendedProps.isHoliday) return;
              openEdit(info.event.extendedProps.meta);
            }}
            eventContent={renderEventContent}
          />
        )}
      </div>

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
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Removendo...' : 'Remover meta'}
                </button>
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
