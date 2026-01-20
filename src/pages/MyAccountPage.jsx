// src/pages/MyAccountPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FaUser, FaShoppingBag, FaDownload, FaCalendar, FaCheckCircle, FaClock, FaExclamationCircle } from 'react-icons/fa';

import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth';
import { apiRequest } from '../services/api';

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
      const response = await apiRequest(`/api/licenses/user?email=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        setPurchases(response.data || []);
      } else {
        setError('Erro ao carregar compras');
      }
    } catch (err) {
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

  const getStatusBadge = (license) => {
    if (license.activatedAt) {
      return { icon: <FaCheckCircle />, text: 'Ativada', className: 'statusActive' };
    }
    return { icon: <FaClock />, text: 'Pendente', className: 'statusPending' };
  };

  // Redireciona para login se nao autenticado
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="my-account-page page-with-background">
      <Navbar />
      <section className="section-block" aria-label="Minha Conta">
        <div className="account-container">
          {/* Header do Perfil */}
          <header className="profile-header">
            <div className="profile-avatar">
              <FaUser />
            </div>
            <div className="profile-info">
              <h1 className="profile-name">{user?.name || 'Usuario'}</h1>
              <p className="profile-email">{user?.email}</p>
            </div>
          </header>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'purchases' ? 'tabActive' : ''}`}
              onClick={() => setActiveTab('purchases')}
            >
              <FaShoppingBag /> Minhas Compras
            </button>
            <button
              className={`tab ${activeTab === 'profile' ? 'tabActive' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <FaUser /> Meu Perfil
            </button>
          </div>

          {/* Conteudo das Tabs */}
          <div className="tab-content">
            {activeTab === 'purchases' && (
              <div className="purchases-section">
                {loading ? (
                  <div className="loading">
                    <div className="spinner" />
                    <p>Carregando compras...</p>
                  </div>
                ) : error ? (
                  <div className="error-message">
                    <FaExclamationCircle />
                    <p>{error}</p>
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="empty-state">
                    <FaShoppingBag className="empty-icon" />
                    <h3>Nenhuma compra encontrada</h3>
                    <p>Voce ainda nao realizou nenhuma compra.</p>
                    <Link to="/aplicativos" className="browse-btn">
                      Ver Aplicativos
                    </Link>
                  </div>
                ) : (
                  <div className="purchases-list">
                    {purchases.map((license) => {
                      const status = getStatusBadge(license);
                      return (
                        <div key={license.id} className="purchase-card">
                          <div className="purchase-info">
                            <h3 className="purchase-name">{license.appName || `App #${license.appId}`}</h3>
                            <div className="purchase-details">
                              <span className="purchase-date">
                                <FaCalendar /> {formatDate(license.createdAt)}
                              </span>
                              <span className={`purchase-status ${status.className}`}>
                                {status.icon} {status.text}
                              </span>
                            </div>
                            {license.licenseKey && (
                              <div className="license-key">
                                <span className="license-label">Chave:</span>
                                <code className="license-code">{license.licenseKey}</code>
                              </div>
                            )}
                          </div>
                          <div className="purchase-actions">
                            <button className="download-btn" title="Download">
                              <FaDownload />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="profile-section">
                <div className="profile-form">
                  <div className="form-group">
                    <label>Nome</label>
                    <input type="text" value={user?.name || ''} readOnly className="input-readonly" />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" value={user?.email || ''} readOnly className="input-readonly" />
                  </div>
                  <p className="profile-note">
                    Para alterar seus dados, entre em contato com o suporte.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <style>{`
        .my-account-page { min-height: 100vh; }
        .section-block { padding: var(--espaco-3xl) var(--espaco-xl); }

        .account-container {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(20, 20, 25, 0.9);
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 12px 32px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 32px;
          background: linear-gradient(135deg, rgba(0,228,242,0.1) 0%, rgba(209,43,242,0.1) 100%);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .profile-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00E4F2 0%, #D12BF2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0a0a0f;
          font-size: 1.8rem;
        }

        .profile-name {
          font-family: 'Montserrat', system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: #f1f5f9;
          margin: 0;
        }

        .profile-email {
          font-family: 'Inter', system-ui, sans-serif;
          color: #94a3b8;
          margin: 4px 0 0;
          font-size: 0.95rem;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          background: none;
          border: none;
          color: #94a3b8;
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
          border-bottom: 2px solid transparent;
        }

        .tab:hover {
          color: #f1f5f9;
          background: rgba(255,255,255,0.03);
        }

        .tabActive {
          color: #00E4F2;
          border-bottom-color: #00E4F2;
        }

        .tab-content {
          padding: 24px;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 48px;
          color: #94a3b8;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #00E4F2;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .error-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #f87171;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
        }

        .empty-icon {
          font-size: 3rem;
          color: #475569;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-family: 'Montserrat', system-ui, sans-serif;
          color: #f1f5f9;
          margin: 0 0 8px;
        }

        .empty-state p {
          color: #94a3b8;
          margin: 0 0 24px;
        }

        .browse-btn {
          display: inline-block;
          padding: 12px 28px;
          background: linear-gradient(135deg, #00E4F2 0%, #D12BF2 100%);
          color: #0a0a0f;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .browse-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,228,242,0.3);
        }

        .purchases-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .purchase-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          transition: border-color 0.2s;
        }

        .purchase-card:hover {
          border-color: rgba(0,228,242,0.3);
        }

        .purchase-name {
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 8px;
        }

        .purchase-details {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .purchase-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .purchase-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .statusActive {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .statusPending {
          background: rgba(234, 179, 8, 0.15);
          color: #eab308;
        }

        .license-key {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .license-label {
          font-size: 0.8rem;
          color: #64748b;
        }

        .license-code {
          font-family: 'Fira Code', monospace;
          font-size: 0.8rem;
          background: rgba(0,0,0,0.3);
          padding: 4px 10px;
          border-radius: 6px;
          color: #00E4F2;
        }

        .purchase-actions {
          display: flex;
          gap: 8px;
        }

        .download-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,228,242,0.1);
          border: 1px solid rgba(0,228,242,0.3);
          border-radius: 8px;
          color: #00E4F2;
          cursor: pointer;
          transition: all 0.2s;
        }

        .download-btn:hover {
          background: rgba(0,228,242,0.2);
          transform: translateY(-1px);
        }

        .profile-section {
          max-width: 500px;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.9rem;
          color: #94a3b8;
        }

        .input-readonly {
          padding: 12px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.95rem;
        }

        .profile-note {
          margin-top: 8px;
          font-size: 0.85rem;
          color: #64748b;
        }

        @media (max-width: 600px) {
          .section-block { padding: var(--espaco-xl) var(--espaco-md); }

          .profile-header {
            flex-direction: column;
            text-align: center;
            padding: 24px;
          }

          .profile-avatar {
            width: 64px;
            height: 64px;
            font-size: 1.5rem;
          }

          .profile-name { font-size: 1.25rem; }

          .tab { font-size: 0.85rem; padding: 12px; }

          .tab-content { padding: 16px; }

          .purchase-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .purchase-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
