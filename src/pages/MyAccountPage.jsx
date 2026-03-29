// src/pages/MyAccountPage.jsx
import React, { useState, useEffect } from 'react';
import { User, ShoppingBag, Download, Calendar, CheckCircle, Clock, AlertCircle, Package, Shield } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { useToast } from '../components/UI/Toast';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../lib/apiConfig';
import { sanitizeImageUrl } from '../utils/urlSanitize.js';
import styles from './MyAccountPage.module.css';

export default function MyAccountPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('purchases');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchPurchases();
    }
  }, [isAuthenticated, user]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiRequest(`/api/purchases/by-email?email=${encodeURIComponent(user.email)}`);
      if (response.success) {
        setPurchases(response.data || []);
      } else {
        setPurchases([]);
      }
    } catch (err) {
      console.error('Erro ao carregar compras:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (amount) => {
    if (!amount || amount === 0) return 'Gratuito';
    return `R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const totalSpent = purchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        {/* Profile Header */}
        <header className={styles.header}>
          <div className={styles.headerBg} />
          <div className={styles.headerContent}>
            <div className={styles.avatar}>
              <User />
            </div>
            <div className={styles.userInfo}>
              <h1 className={styles.userName}>{user?.name || 'Usuario'}</h1>
              <p className={styles.userEmail}>{user?.email}</p>
              <span className={styles.userBadge}>
                <Shield /> Membro CodeCraft
              </span>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className={styles.stats}>
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

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'purchases' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            <ShoppingBag /> Minhas Compras
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User /> Meu Perfil
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'purchases' && (
          <>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando compras...</p>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <AlertCircle />
                <span>{error}</span>
              </div>
            ) : purchases.length === 0 ? (
              <div className={styles.empty}>
                <Package className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Nenhuma compra encontrada</h3>
                <p className={styles.emptyText}>Explore nossos aplicativos e encontre a ferramenta ideal para voce.</p>
                <Link to="/aplicativos" className={styles.browseBtn}>
                  Ver Aplicativos
                </Link>
              </div>
            ) : (
              <div className={styles.purchasesList}>
                {purchases.map((purchase) => {
                  const thumbUrl = sanitizeImageUrl(purchase.app_thumb);
                  const hasDownload = !!purchase.executable_url;
                  return (
                    <article key={purchase.payment_id} className={styles.purchaseCard}>
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={purchase.app_name}
                          className={styles.purchaseThumb}
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className={styles.purchasePlaceholder}>
                          <Package />
                        </div>
                      )}
                      <div className={styles.purchaseBody}>
                        <div className={styles.purchaseTopRow}>
                          <h3 className={styles.purchaseName}>
                            {purchase.app_name || `Aplicativo #${purchase.app_id}`}
                          </h3>
                          <span className={styles.purchaseAmount}>
                            {formatPrice(purchase.amount)}
                          </span>
                        </div>
                        <div className={styles.purchaseMeta}>
                          <span className={styles.purchaseDate}>
                            <Calendar /> {formatDate(purchase.purchased_at)}
                          </span>
                          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                            <CheckCircle /> Aprovado
                          </span>
                        </div>
                      </div>
                      <div className={styles.purchaseActions}>
                        <button
                          className={styles.downloadBtn}
                          title={hasDownload ? 'Download' : 'Download indisponivel'}
                          aria-label={`Download ${purchase.app_name}`}
                          disabled={!hasDownload}
                          onClick={() => {
                            if (hasDownload) window.open(purchase.executable_url, '_blank');
                          }}
                        >
                          <Download />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'profile' && (
          <div className={styles.profileSection}>
            <div className={styles.profileForm}>
              {!editMode ? (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Nome</label>
                    <input type="text" value={user?.name || ''} readOnly className={styles.formInput} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>E-mail</label>
                    <input type="email" value={user?.email || ''} readOnly className={styles.formInput} />
                  </div>
                  <button
                    className={styles.downloadBtn}
                    style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
                    onClick={() => {
                      setEditName(user?.name || '');
                      setEditEmail(user?.email || '');
                      setEditMode(true);
                    }}
                  >
                    Editar Perfil
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Nome</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={styles.formInput}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#F5F5F7',
                        padding: '12px 16px',
                        width: '100%',
                      }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>E-mail</label>
                    <input
                      type="email"
                      value={editEmail}
                      readOnly
                      className={styles.formInput}
                      title="O e-mail não pode ser alterado por segurança"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#F5F5F7',
                        padding: '12px 16px',
                        width: '100%',
                        opacity: 0.6,
                        cursor: 'not-allowed',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                      O e-mail não pode ser alterado por segurança.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button
                      className={styles.downloadBtn}
                      style={{ padding: '10px 24px' }}
                      disabled={savingProfile}
                      onClick={async () => {
                        if (!editName.trim()) {
                          toast.error('O nome não pode ficar vazio.');
                          return;
                        }
                        setSavingProfile(true);
                        try {
                          await apiRequest('/api/auth/profile', {
                            method: 'PUT',
                            body: JSON.stringify({ name: editName }),
                          });
                          toast.success('Perfil atualizado com sucesso!');
                          setEditMode(false);
                          // Reload user data by refreshing the page
                          window.location.reload();
                        } catch (err) {
                          console.error('Erro ao salvar perfil:', err);
                          toast.error(err?.message || 'Erro ao salvar perfil. Tente novamente.');
                        } finally {
                          setSavingProfile(false);
                        }
                      }}
                    >
                      {savingProfile ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      className={styles.downloadBtn}
                      style={{ padding: '10px 24px', opacity: 0.7 }}
                      onClick={() => setEditMode(false)}
                      disabled={savingProfile}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
