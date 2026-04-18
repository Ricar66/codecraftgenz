// src/pages/PerfilPage/PerfilPage.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Shield, Star, Github, Linkedin,
  Edit3, Check, X, ChevronRight, ShoppingBag,
  Download, Calendar, CheckCircle, AlertCircle, Package, Lock,
  Gift, Copy, Users,
} from 'lucide-react';
import { DiscordIcon } from '../../components/UI/BrandIcons/index.jsx';
import { Link, Navigate } from 'react-router-dom';

import Navbar from '../../components/Navbar/Navbar';
import { useAuth } from '../../context/useAuth';
import { apiRequest } from '../../lib/apiConfig.js';
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
    Promise.all([getMyReferralCode(), getReferralStats()])
      .then(([codeRes, statsRes]) => {
        if (cancelled) return;
        if (codeRes?.success) setCode(codeRes.data?.code || null);
        if (statsRes?.success) {
          setStats({
            totalReferrals: statsRes.data?.totalReferrals || 0,
            pointsEarned: statsRes.data?.pointsEarned || 0,
          });
        }
      })
      .catch(() => { /* silencia — secao opcional */ })
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
  const crafter = user.crafter || null;

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

      {/* Crafter profile or CTA */}
      {crafter ? (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Perfil Crafter</h3>
            <span className={`${styles.statusBadge} ${crafter.active ? styles.badgeActive : styles.badgeInactive}`}>
              {crafter.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div className={styles.crafterBody}>
            <div className={styles.pointsRow}>
              <Star size={18} className={styles.starIcon} />
              <span className={styles.pointsValue}>{crafter.pontos}</span>
              <span className={styles.pointsLabel}>pontos no ranking</span>
            </div>
            {crafter.bio && <p className={styles.bio}>{crafter.bio}</p>}
            {crafter.skills?.length > 0 && (
              <div className={styles.chipsRow}>
                {crafter.skills.map(s => <span key={s} className={styles.skillTagCrafter}>{s}</span>)}
              </div>
            )}
            <div className={styles.socialLinks}>
              {crafter.github_url && (
                <a href={crafter.github_url} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                  <Github size={14} /> GitHub
                </a>
              )}
              {crafter.linkedin_url && (
                <a href={crafter.linkedin_url} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                  <Linkedin size={14} /> LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`${styles.card} ${styles.cardCta}`}>
            <span className={styles.ctaIcon}>🚀</span>
            <h3 className={styles.ctaTitle}>Quer ser um Crafter?</h3>
            <p className={styles.ctaDesc}>Crafters participam do ranking, ganham pontos e são descobertos por empresas.</p>
            <Link to="/desafios/feedbacks" className={styles.ctaBtn}>
              Quero ser Crafter <ChevronRight size={15} />
            </Link>
          </div>

          <a
            href="https://discord.gg/47FUudrU"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.discordCard}
          >
            <DiscordIcon size={22} />
            <div>
              <p className={styles.discordCardTitle}>Entre na comunidade</p>
              <p className={styles.discordCardDesc}>Devs, dúvidas, projetos e oportunidades no Discord da CodeCraft.</p>
            </div>
            <ChevronRight size={16} className={styles.discordArrow} />
          </a>
        </>
      )}

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

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}><Lock size={15} /> Segurança</h3>
        </div>
        <p className={styles.emptyHint}>Para alterar sua senha, use a opção "Esqueci minha senha" na tela de login.</p>
        <Link to="/forgot-password" className={`${styles.editBtn} ${styles.linkBtn}`}>
          Redefinir senha
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────── Page ─────────────────── */
export default function PerfilPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('perfil');
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

      </div>
    </div>
  );
}
