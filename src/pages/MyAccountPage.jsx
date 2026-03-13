// src/pages/MyAccountPage.jsx
import React, { useState, useEffect } from 'react';
import {
  FaUser, FaShoppingBag, FaDownload, FaCalendar,
  FaCheckCircle, FaClock, FaExclamationCircle, FaBoxOpen, FaShieldAlt
} from 'react-icons/fa';
import { Link, Navigate } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../lib/apiConfig';
import { sanitizeImageUrl } from '../utils/urlSanitize.js';
import styles from './MyAccountPage.module.css';

export default function MyAccountPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('purchases');

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
              <FaUser />
            </div>
            <div className={styles.userInfo}>
              <h1 className={styles.userName}>{user?.name || 'Usuario'}</h1>
              <p className={styles.userEmail}>{user?.email}</p>
              <span className={styles.userBadge}>
                <FaShieldAlt /> Membro CodeCraft
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
            <FaShoppingBag /> Minhas Compras
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FaUser /> Meu Perfil
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
                <FaExclamationCircle />
                <span>{error}</span>
              </div>
            ) : purchases.length === 0 ? (
              <div className={styles.empty}>
                <FaBoxOpen className={styles.emptyIcon} />
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
                          <FaBoxOpen />
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
                            <FaCalendar /> {formatDate(purchase.purchased_at)}
                          </span>
                          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                            <FaCheckCircle /> Aprovado
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
                          <FaDownload />
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
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nome</label>
                <input type="text" value={user?.name || ''} readOnly className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>E-mail</label>
                <input type="email" value={user?.email || ''} readOnly className={styles.formInput} />
              </div>
              <p className={styles.profileNote}>
                Para alterar seus dados, entre em contato com o suporte.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
