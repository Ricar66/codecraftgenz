// src/pages/PerfilPage/PerfilPage.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Shield, Star, Github, Linkedin,
  Edit3, Check, X, ChevronRight, ShoppingBag,
  Download, Calendar, CheckCircle, AlertCircle, Package, Lock,
  Gift, Copy, Users, Bell,
} from 'lucide-react';
import { DiscordIcon } from '../../components/UI/BrandIcons/index.jsx';
import { Link, Navigate } from 'react-router-dom';

import Navbar from '../../components/Navbar/Navbar';
import { useAuth } from '../../context/useAuth';
import { apiRequest } from '../../lib/apiConfig.js';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import { getDiscordStatus, getDiscordAuthUrl, unlinkDiscord } from '../../services/discordAPI.js';
import { getMyReferralCode, getReferralStats } from '../../services/referralAPI.js';
import { useToast } from '../../components/UI/Toast';
import { sanitizeImageUrl } from '../../utils/urlSanitize.js';
import styles from './PerfilPage.module.css';

const AREAS = ['Front-end', 'Back-end', 'Mobile', 'Dados', 'Design', 'DevOps', 'Full Stack'];
const SKILLS = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Node.js',
  'Python', 'Java', 'Go', 'Docker', 'SQL', 'AWS', 'Figma', 'Flutter', 'Kotlin', 'Next.js',
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '')).toUpperCase();
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPrice(v) {
  if (!v || Number(v) === 0) return 'Gratuito';
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/* ─────────────────── Secao: Indique um amigo ─────────────────── */
function ReferralSection() {
  const toast = useToast();
  const [code, setCode] = useState(null);
  const [stats, setStats] = useState({ totalReferrals: 0, pointsEarned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getMyReferralCode(), getReferralStats()])
      .then(([codeResult, statsResult]) => {
        if (cancelled) return;
        const codeRes = codeResult.status === 'fulfilled' ? codeResult.value : null;
        const statsRes = statsResult.status === 'fulfilled' ? statsResult.value : null;
        if (codeRes?.success) setCode(codeRes.data?.code || null);
        if (statsRes?.success) {
          setStats({
            totalReferrals: statsRes.data?.totalReferrals || 0,
            pointsEarned: statsRes.data?.pointsEarned || 0,
          });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const shareLink = code ? `https://codecraftgenz.com.br/register?ref=${code}` : '';

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copiado! Compartilhe com seus amigos.');
    } catch {
      toast.error('Nao foi possivel copiar. Copie manualmente.');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}><Gift size={16} /> Indique um amigo</h3>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
      ) : (
        <>
          <p className={styles.emptyHint} style={{ marginBottom: 16 }}>
            Compartilhe seu codigo e ganhe <strong style={{ color: '#f59e0b' }}>50 pontos</strong> a cada amigo que se cadastrar.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            background: 'rgba(129,140,248,0.08)',
            border: '1px solid rgba(129,140,248,0.25)',
            borderRadius: 10,
            marginBottom: 16,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#a0a0b0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Seu codigo
              </p>
              <p style={{
                margin: '4px 0 0',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#f5f5f7',
                fontFamily: 'monospace',
                letterSpacing: '0.08em',
              }}>
                {code || '—'}
              </p>
            </div>
            <button
              type="button"
              className={styles.editBtn}
              onClick={handleCopy}
              disabled={!code}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Copy size={14} /> Copiar link
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              flex: 1,
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              textAlign: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#00E4F2', marginBottom: 4 }}>
                <Users size={14} />
                <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalReferrals}</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#a0a0b0' }}>Indicacoes</span>
            </div>
            <div style={{
              flex: 1,
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              textAlign: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#f59e0b', marginBottom: 4 }}>
                <Star size={14} />
                <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.pointsEarned}</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#a0a0b0' }}>Pontos ganhos</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────── Aba: Interesses ─────────────────── */
function TabInteresses({ user, onSaved }) {
  const toast = useToast();
  const interests = user.interests || {};

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editArea, setEditArea] = useState(interests.area || '');
  const [editSkills, setEditSkills] = useState(interests.skills || []);
  // Local copy so UI updates instantly after save
  const [localInterests, setLocalInterests] = useState(interests);

  // Sync if user prop changes (e.g. after AuthContext refresh)
  useEffect(() => {
    if (!editing) {
      setLocalInterests(user.interests || {});
    }
  }, [user.interests, editing]);

  const startEdit = () => {
    setEditArea(localInterests.area || '');
    setEditSkills(localInterests.skills || []);
    setEditing(true);
  };

  const toggleSkill = (skill) =>
    setEditSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest('/api/auth/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ area: editArea || undefined, skills: editSkills }),
      });
      const newInterests = {};
      if (editArea) newInterests.area = editArea;
      if (editSkills.length > 0) newInterests.skills = editSkills;
      setLocalInterests(newInterests);
      setEditing(false);
      toast.success('Interesses salvos!');
      if (onSaved) onSaved(newInterests);
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.tabContent}>
      {/* Interesses */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Meus Interesses</h3>
          {!editing && (
            <button className={styles.editBtn} onClick={startEdit}>
              <Edit3 size={14} /> Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className={styles.editSection}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Área principal</label>
              <div className={styles.chipsRow}>
                {AREAS.map(a => (
                  <button key={a} type="button"
                    className={`${styles.chip} ${editArea === a ? styles.chipActive : ''}`}
                    onClick={() => setEditArea(prev => prev === a ? '' : a)}
                  >{a}</button>
                ))}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Tecnologias</label>
              <div className={styles.chipsRow}>
                {SKILLS.map(s => (
                  <button key={s} type="button"
                    className={`${styles.chip} ${editSkills.includes(s) ? styles.chipActive : ''}`}
                    onClick={() => toggleSkill(s)}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div className={styles.editActions}>
              <button className={styles.btnCancel} onClick={() => setEditing(false)} disabled={saving}>
                <X size={14} /> Cancelar
              </button>
              <button className={styles.btnSave} onClick={save} disabled={saving}>
                {saving ? 'Salvando...' : <><Check size={14} /> Salvar</>}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.interestsView}>
            {localInterests.area
              ? <div className={styles.areaTag}>{localInterests.area}</div>
              : <p className={styles.emptyHint}>Nenhuma área selecionada</p>
            }
            {localInterests.skills?.length > 0
              ? <div className={styles.chipsRow}>{localInterests.skills.map(s => <span key={s} className={styles.skillTag}>{s}</span>)}</div>
              : <p className={styles.emptyHint}>Nenhuma tecnologia selecionada</p>
            }
          </div>
        )}
      </div>

      {/* Discord — comunidade da empresa segue ativa */}
      <a
        href="https://discord.gg/jKcuM5u6Qa"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.discordCard}
      >
        <DiscordIcon size={22} />
        <div>
          <p className={styles.discordCardTitle}>Entre na comunidade</p>
          <p className={styles.discordCardDesc}>Discord da CodeCraft Gen-Z: notícias tech, vagas, tutoriais e papo direto.</p>
        </div>
        <ChevronRight size={16} className={styles.discordArrow} />
      </a>

      {/* Indique um amigo — sempre visível */}
      <ReferralSection />
    </div>
  );
}

/* ─────────────────── Aba: Compras ─────────────────── */
function TabCompras({ user }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.email) return;
    apiRequest(`/api/purchases/by-email?email=${encodeURIComponent(user.email)}`)
      .then(r => { setPurchases(r.success ? (r.data || []) : []); })
      .catch(e => { setError(e.message); })
      .finally(() => setLoading(false));
  }, [user?.email]);

  const totalSpent = purchases.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  if (loading) return (
    <div className={styles.tabContent}>
      <div className={styles.card}>
        <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
      </div>
    </div>
  );

  return (
    <div className={styles.tabContent}>
      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{purchases.length}</span>
          <span className={styles.statLabel}>Compras</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{purchases.filter(p => p.executable_url).length}</span>
          <span className={styles.statLabel}>Downloads</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatPrice(totalSpent)}</span>
          <span className={styles.statLabel}>Investido</span>
        </div>
      </div>

      {error ? (
        <div className={`${styles.card} ${styles.errorBox}`}>
          <AlertCircle size={20} /> {error}
        </div>
      ) : purchases.length === 0 ? (
        <div className={`${styles.card} ${styles.emptyBox}`}>
          <Package size={36} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nenhuma compra encontrada</p>
          <Link to="/aplicativos" className={styles.ctaBtn}>Ver Aplicativos</Link>
        </div>
      ) : (
        <div className={styles.purchasesList}>
          {purchases.map(p => {
            const thumb = sanitizeImageUrl(p.app_thumb);
            return (
              <div key={p.payment_id} className={styles.purchaseCard}>
                {thumb
                  ? <img src={thumb} alt={p.app_name} className={styles.purchaseThumb} loading="lazy" onError={e => e.currentTarget.style.display = 'none'} />
                  : <div className={styles.purchasePlaceholder}><Package size={20} /></div>
                }
                <div className={styles.purchaseBody}>
                  <div className={styles.purchaseTop}>
                    <span className={styles.purchaseName}>{p.app_name || `App #${p.app_id}`}</span>
                    <span className={styles.purchasePrice}>{formatPrice(p.amount)}</span>
                  </div>
                  <div className={styles.purchaseMeta}>
                    <span className={styles.purchaseDate}><Calendar size={12} /> {formatDate(p.purchased_at)}</span>
                    <span className={styles.purchaseStatus}><CheckCircle size={12} /> Aprovado</span>
                  </div>
                </div>
                <button
                  className={styles.downloadBtn}
                  disabled={!p.executable_url}
                  onClick={() => p.executable_url && window.open(p.executable_url, '_blank')}
                  title={p.executable_url ? 'Download' : 'Indisponível'}
                >
                  <Download size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Aba: Conta ─────────────────── */
function TabConta({ user }) {
  const toast = useToast();
  const [editName, setEditName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Discord link state
  const [discord, setDiscord] = useState(null);
  const [discordLoading, setDiscordLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    getDiscordStatus()
      .then(data => setDiscord(data))
      .catch(() => setDiscord(null))
      .finally(() => setDiscordLoading(false));
  }, []);

  // Detectar query params de retorno do OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordParam = params.get('discord');
    if (discordParam === 'linked') {
      toast.success('Discord vinculado com sucesso!');
      // Recarregar status
      getDiscordStatus().then(data => setDiscord(data)).catch(() => {});
      // Limpar query params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (discordParam === 'error') {
      const reason = params.get('reason') || 'Erro desconhecido';
      toast.error(`Falha ao vincular Discord: ${reason}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnectDiscord = async () => {
    try {
      const data = await getDiscordAuthUrl();
      if (data?.url) {
        try {
          const parsed = new URL(data.url);
          if (!parsed.hostname.endsWith('discord.com')) throw new Error('domínio inválido');
        } catch {
          toast.error('URL de autorização inválida.');
          return;
        }
        window.location.href = data.url;
      } else {
        toast.error('Falha ao gerar URL de autorização.');
      }
    } catch (err) {
      toast.error(err?.message || 'Erro ao conectar Discord.');
    }
  };

  const handleUnlinkDiscord = async () => {
    setUnlinking(true);
    try {
      await unlinkDiscord();
      setDiscord(null);
      toast.success('Discord desvinculado.');
    } catch (err) {
      toast.error(err?.message || 'Erro ao desvincular.');
    } finally {
      setUnlinking(false);
    }
  };

  const saveName = async () => {
    if (!editName.trim()) { toast.error('Nome não pode ficar vazio.'); return; }
    setSaving(true);
    try {
      await apiRequest('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ name: editName }) });
      toast.success('Nome atualizado!');
      setEditing(false);
      window.location.reload();
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const discordAvatarUrl = discord?.linked && discord.discordId && discord.discordAvatar
    ? `https://cdn.discordapp.com/avatars/${discord.discordId}/${discord.discordAvatar}.png?size=64`
    : null;

  return (
    <div className={styles.tabContent}>
      {/* Discord Connect */}
      <div className={styles.discordConnect}>
        <div className={styles.discordConnectAvatar}>
          {discordAvatarUrl
            ? <img src={discordAvatarUrl} alt="Discord" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
            : <DiscordIcon size={18} />
          }
        </div>
        <div className={styles.discordConnectInfo}>
          <p className={styles.discordConnectTitle}>
            {discord?.linked ? discord.discordUsername : 'Discord'}
          </p>
          <p className={styles.discordConnectDesc}>
            {discordLoading
              ? 'Verificando...'
              : discord?.linked
                ? 'Conta vinculada'
                : 'Vincule sua conta Discord para acessar cargos e beneficios na comunidade.'
            }
          </p>
        </div>
        {!discordLoading && (
          discord?.linked ? (
            <button className={styles.btnDiscordUnlink} onClick={handleUnlinkDiscord} disabled={unlinking}>
              {unlinking ? 'Removendo...' : 'Desconectar'}
            </button>
          ) : (
            <button className={styles.btnDiscord} onClick={handleConnectDiscord}>
              <DiscordIcon size={14} /> Conectar
            </button>
          )
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Dados da conta</h3>
        </div>
        <div className={styles.formSection}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Nome</label>
            {editing
              ? <input className={styles.fieldInput} value={editName} onChange={e => setEditName(e.target.value)} />
              : <div className={styles.fieldReadOnly}>{user?.name}</div>
            }
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}><Mail size={12} /> E-mail</label>
            <div className={`${styles.fieldReadOnly} ${styles.fieldMuted}`}>{user?.email}</div>
            <span className={styles.fieldHint}>O e-mail não pode ser alterado por segurança.</span>
          </div>
          <div className={styles.formActions}>
            {editing ? (
              <>
                <button className={styles.btnCancel} onClick={() => { setEditing(false); setEditName(user?.name || ''); }} disabled={saving}>
                  <X size={14} /> Cancelar
                </button>
                <button className={styles.btnSave} onClick={saveName} disabled={saving}>
                  {saving ? 'Salvando...' : <><Check size={14} /> Salvar</>}
                </button>
              </>
            ) : (
              <button className={styles.editBtn} onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Editar nome
              </button>
            )}
          </div>
        </div>
      </div>

      <SecuritySection />
    </div>
  );
}

/* ─────────────────── Bloco: Senha (define ou altera) ─────────────────── */
function SecuritySection() {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });

  const pwdError = (() => {
    if (!touched.password) return '';
    if (password.length < 8) return 'Mínimo 8 caracteres.';
    if (!/\d/.test(password)) return 'Inclua pelo menos um número.';
    return '';
  })();
  const confirmError = touched.confirm && confirm !== password ? 'As senhas não conferem.' : '';

  const canSubmit = password.length >= 8 && /\d/.test(password) && confirm === password && !saving;

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (!canSubmit) return;
    setSaving(true);
    try {
      await apiRequest('/api/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      toast.success('Senha definida! Agora você pode entrar com email/senha ou Google.');
      setPassword('');
      setConfirm('');
      setTouched({ password: false, confirm: false });
      setOpen(false);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar a senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}><Lock size={15} /> Senha de acesso</h3>
        {!open && (
          <button type="button" className={styles.editBtn} onClick={() => setOpen(true)}>
            <Edit3 size={14} /> Definir / alterar senha
          </button>
        )}
      </div>

      {!open ? (
        <p className={styles.emptyHint}>
          Defina uma senha para entrar também com email/senha — sem perder o login pelo Google.
          A vinculação acontece automaticamente pelo seu e-mail.
        </p>
      ) : (
        <form onSubmit={submit} className={styles.formSection}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Nova senha</label>
            <input
              className={styles.fieldInput}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="Mínimo 8 caracteres com 1 número"
            />
            {pwdError
              ? <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: 4 }}>{pwdError}</span>
              : <span className={styles.fieldHint}>Mínimo 8 caracteres, incluindo pelo menos 1 número.</span>}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Confirmar senha</label>
            <input
              className={styles.fieldInput}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              placeholder="Repita a senha"
            />
            {confirmError && <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: 4 }}>{confirmError}</span>}
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => { setOpen(false); setPassword(''); setConfirm(''); setTouched({ password: false, confirm: false }); }}
              disabled={saving}
            >
              <X size={14} /> Cancelar
            </button>
            <button type="submit" className={styles.btnSave} disabled={!canSubmit}>
              {saving ? 'Salvando...' : <><Check size={14} /> Salvar senha</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─────────────────── Aba: Notificações ─────────────────── */
function TabNotificacoes() {
  const toast = useToast();
  const { isSupported, isSubscribed, permission, loading, requestPermission, unsubscribe } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success('Notificações push desativadas.');
    } else {
      if (permission === 'denied') {
        toast.error('Permissão negada pelo navegador. Ative nas configurações do site.');
        return;
      }
      const ok = await requestPermission();
      if (ok) {
        toast.success('Notificações push ativadas!');
      } else if (permission === 'denied') {
        toast.error('Permissão negada. Ative nas configurações do navegador.');
      } else {
        toast.error('Não foi possível ativar as notificações.');
      }
    }
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}><Bell size={16} /> Notificações</h3>
        </div>

        {!isSupported ? (
          <p className={styles.emptyHint}>
            Seu navegador não suporta notificações push. Tente no Chrome ou Firefox.
          </p>
        ) : (
          <>
            <p className={styles.emptyHint} style={{ marginBottom: 20 }}>
              Receba avisos sobre novos desafios, atualizações de apps e novidades da plataforma diretamente no seu dispositivo.
            </p>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              background: isSubscribed ? 'rgba(0,228,242,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isSubscribed ? 'rgba(0,228,242,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Bell size={18} style={{ color: isSubscribed ? '#00E4F2' : '#64748b' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#f5f5f7' }}>
                    Notificações push
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#a0a0b0' }}>
                    {isSubscribed
                      ? 'Ativadas neste dispositivo'
                      : permission === 'denied'
                        ? 'Bloqueadas pelo navegador'
                        : 'Desativadas'
                    }
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={isSubscribed ? styles.btnCancel : styles.btnSave}
                onClick={handleToggle}
                disabled={loading || permission === 'denied'}
                style={{ minWidth: 110 }}
              >
                {loading
                  ? 'Aguarde...'
                  : isSubscribed
                    ? <><X size={14} /> Desativar</>
                    : <><Bell size={14} /> Ativar</>
                }
              </button>
            </div>

            {permission === 'denied' && (
              <p className={styles.emptyHint} style={{ marginTop: 12, color: '#f87171' }}>
                As notificações estão bloqueadas. Para ativar, vá em Configurações do navegador e permita notificações para este site.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Page ─────────────────── */
export default function PerfilPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    return ['perfil', 'compras', 'conta', 'notificacoes'].includes(tabParam) ? tabParam : 'perfil';
  });
  // Track local interests to survive without page reload
  const [localUserInterests, setLocalUserInterests] = useState(null);

  if (!loading && !user) return <Navigate to="/login" replace />;

  if (loading) return (
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />
      <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
    </div>
  );

  // Merge local interests update with user object
  const enrichedUser = localUserInterests
    ? { ...user, interests: localUserInterests }
    : user;

  const crafter = enrichedUser.crafter || null;
  const roleLabel = { admin: 'Admin', administrator: 'Admin', superadmin: 'Super Admin', owner: 'Owner', editor: 'Editor', viewer: 'Membro' }[user.role] || user.role;

  const TABS = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'compras', label: 'Compras', icon: ShoppingBag },
    { id: 'conta', label: 'Conta', icon: Shield },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />
      <div className={styles.container}>

        {/* Hero */}
        <motion.div className={styles.hero} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className={styles.avatarCircle}>{getInitials(user.name)}</div>
          <div className={styles.heroInfo}>
            <h1 className={styles.userName}>{user.name}</h1>
            <div className={styles.userMeta}>
              <span className={styles.metaBadge}><Mail size={12} /> {user.email}</span>
              <span className={styles.metaBadge}><Shield size={12} /> {roleLabel}</span>
              {crafter && (
                <span className={styles.metaBadgeCrafter}><Star size={12} /> {crafter.pontos} pts — Crafter</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className={styles.tabsBar}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`${styles.tabBtn} ${tab === id ? styles.tabBtnActive : ''}`} onClick={() => setTab(id)}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {tab === 'perfil' && <TabInteresses user={enrichedUser} onSaved={setLocalUserInterests} />}
        {tab === 'compras' && <TabCompras user={user} />}
        {tab === 'conta' && <TabConta user={user} />}
        {tab === 'notificacoes' && <TabNotificacoes />}

      </div>
    </div>
  );
}
