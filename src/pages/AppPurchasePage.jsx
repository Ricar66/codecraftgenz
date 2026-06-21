// src/pages/AppPurchasePage.jsx
// Migrado de Mercado Pago → Asaas (checkout hospedado) em 2026-06-17
// Cartão: redirect para init_point (checkout hospedado Asaas)
// PIX:    QR inline (qr_code_base64 + qr_code copia-e-cola)
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { trackFunnelStep } from '../services/analyticsAPI.js';

import { WindowsIcon, AppleIcon, LinuxIcon } from '../components/UI/BrandIcons/index.jsx';

import LoginIncentiveBanner from '../components/LoginIncentiveBanner';
import Navbar from '../components/Navbar/Navbar';
import { useToast } from '../components/UI/Toast';
import { useAuth } from '../context/useAuth.js';
import { getAppById, getPurchaseStatus, registerDownload, submitFeedback, createPurchase, createDirectPayment, downloadByEmail, activateDeviceLicense } from '../services/appsAPI.js';
import { captureAppPurchaseLead } from '../services/leadsAPI.js';
import { getAppPrice } from '../utils/appModel.js';
import { API_BASE_URL } from '../lib/apiConfig.js';

import SecuritySection from '../components/SecuritySection/SecuritySection.jsx';
import styles from './AppPurchasePage.module.css';

// Converte URL relativa para URL completa do backend
const resolveDownloadUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  if (cleanUrl.startsWith('/api/')) return `${API_BASE_URL}${cleanUrl}`;
  if (cleanUrl.startsWith('/downloads/')) return `${API_BASE_URL}/api${cleanUrl}`;
  return `${API_BASE_URL}${cleanUrl}`;
};

// --- Input masks (pure JS, no dependencies) ---
function maskCPF(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function maskCep(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

function isValidCPF(cpf) {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const calcDigit = (slice, factor) => {
    const sum = slice.split('').reduce((acc, d, i) => acc + Number(d) * (factor - i), 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  const d1 = calcDigit(digits.slice(0, 9), 10);
  if (d1 !== Number(digits[9])) return false;
  const d2 = calcDigit(digits.slice(0, 10), 11);
  if (d2 !== Number(digits[10])) return false;
  return true;
}

const parsePlatforms = (p) => {
  if (!p) return ['windows'];
  if (Array.isArray(p)) return p;
  if (typeof p === 'string') { try { return JSON.parse(p); } catch { return [p]; } }
  return ['windows'];
};

const PLATFORM_INFO = {
  windows: { icon: WindowsIcon, label: 'Windows' },
  macos: { icon: AppleIcon, label: 'macOS' },
  linux: { icon: LinuxIcon, label: 'Linux' },
};

// ---- Componente PIX inline ----
function PixQrPanel({ qrCodeBase64, qrCode, onCancel, toast }) {
  const [polling, setPolling] = useState(true);

  return (
    <div style={{
      marginTop: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      maxWidth: 480,
      margin: '24px auto 0',
      padding: '32px 24px',
      backgroundColor: 'rgba(26, 26, 46, 0.6)',
      border: '1px solid rgba(0, 228, 242, 0.15)',
      borderRadius: 16,
    }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: 4, color: '#fff', fontWeight: 600 }}>
        Pague com PIX
      </h3>
      <p style={{ color: '#00e4f2', marginBottom: 20, fontSize: '0.9rem' }}>
        Escaneie o QR Code ou copie o codigo abaixo
      </p>

      {qrCodeBase64 && (
        <div style={{
          padding: 16,
          backgroundColor: '#fff',
          borderRadius: 12,
          marginBottom: 24,
          display: 'inline-block',
        }}>
          <img
            src={`data:image/png;base64,${qrCodeBase64}`}
            alt="QR Code PIX"
            style={{ width: 220, height: 220, display: 'block' }}
          />
        </div>
      )}

      {qrCode && (
        <div style={{ width: '100%', marginBottom: 20 }}>
          <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: 8, textAlign: 'center' }}>
            Codigo PIX (Copia e Cola)
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid rgba(0, 228, 242, 0.2)',
          }}>
            <input
              readOnly
              value={qrCode}
              style={{
                flex: 1,
                padding: '12px 14px',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                backgroundColor: '#0d0d1a',
                color: '#ccc',
                border: 'none',
                outline: 'none',
                minWidth: 0,
              }}
              onClick={(e) => {
                e.target.select();
                navigator.clipboard?.writeText(qrCode);
              }}
            />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(qrCode);
                toast.success('Codigo PIX copiado!');
              }}
              style={{
                padding: '12px 20px',
                backgroundColor: '#00e4f2',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
              }}
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <div style={{
        width: '100%',
        padding: '14px 16px',
        backgroundColor: 'rgba(0, 228, 242, 0.06)',
        border: '1px solid rgba(0, 228, 242, 0.15)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 8,
      }}>
        {polling && (
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#00e4f2',
            animation: 'pixPulse 1.5s ease-in-out infinite',
            flexShrink: 0,
          }} />
        )}
        <p style={{ fontSize: '0.85rem', color: '#00e4f2', margin: 0 }}>
          Aguardando pagamento... Verificando automaticamente.
        </p>
      </div>
      <style>{`@keyframes pixPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.85); } }`}</style>
      <p style={{ fontSize: '0.78rem', color: '#555', marginTop: 4, marginBottom: 16, textAlign: 'center' }}>
        Assim que o pagamento for confirmado, voce sera redirecionado automaticamente.
      </p>

      <button
        onClick={() => { setPolling(false); onCancel(); }}
        style={{
          padding: '10px 24px',
          backgroundColor: 'transparent',
          color: 'rgba(0, 228, 242, 0.7)',
          border: '1px solid rgba(0, 228, 242, 0.25)',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: '0.85rem',
        }}
      >
        Escolher outro metodo
      </button>
    </div>
  );
}

const AppPurchasePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [statusDetail, setStatusDetail] = useState('');
  const downloadUrl = '';
  const [progress] = useState(0);
  const [downloadStatus] = useState('idle');
  const [downloadError] = useState('');
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  // Checkout em duas etapas: 1 = dados do comprador, 2 = método
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const toast = useToast();
  const [payerInfo, setPayerInfo] = useState({ name: String(user?.name || ''), email: String(user?.email || ''), identification: '', phone: '', zip: '', streetName: '', addressNumber: '', neighborhood: '', city: '', state: '' });
  const [cpfError, setCpfError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  // Método de pagamento: 'card' | 'pix'
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [licenseQuantity, setLicenseQuantity] = useState(1);
  // Estado do pagamento em andamento
  const [paymentLoading, setPaymentLoading] = useState(false);
  // PIX inline
  const [pixData, setPixData] = useState(null); // { qrCode, qrCodeBase64, paymentId }

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailConfirmError, setEmailConfirmError] = useState('');
  const [confirmingDownload, setConfirmingDownload] = useState(false);
  const downloadLockRef = useRef(false);
  const paymentCompletedRef = useRef(false);

  // Track checkout started
  useEffect(() => {
    trackFunnelStep('purchase_funnel', 'checkout_started', { app_id: id });
  }, [id]);

  // Track checkout abandoned
  useEffect(() => {
    const handleUnload = () => {
      if (step > 0 && !paymentCompletedRef.current) {
        trackFunnelStep('purchase_funnel', 'checkout_abandoned', { app_id: id, step });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [id, step]);

  const computeHardwareId = async () => {
    const src = [
      navigator.userAgent || '',
      navigator.language || '',
      navigator.platform || '',
      (screen?.width || '') + 'x' + (screen?.height || ''),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    ].join('|');
    const enc = new TextEncoder().encode(src);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    const arr = Array.from(new Uint8Array(digest));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const json = await getAppById(id);
        if (mounted) setApp(json?.data || json);
      } catch (e) { setError(e.message || 'Erro ao carregar app'); }
      finally { setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Detecta retorno de checkout hospedado (query params na URL)
  useEffect(() => {
    const prefId = searchParams.get('preference_id');
    const paymentId = searchParams.get('payment_id');
    const statusParam = searchParams.get('status');
    if (prefId || paymentId || statusParam) {
      (async () => {
        try {
          const s = await getPurchaseStatus(id, { preference_id: prefId, payment_id: paymentId, status: statusParam });
          const resolvedStatus = s?.status || statusParam || '';
          setStatus(resolvedStatus);
          setStatusDetail(s?.status_detail || '');
          // 'pending' após retorno do checkout hospedado é tratado como sucesso (webhook confirma depois)
          if (resolvedStatus === 'approved' || resolvedStatus === 'pending') {
            navigate(`/apps/${id}/sucesso?payment_id=${paymentId || s?.payment_id || ''}&status=${resolvedStatus}`);
            return;
          }
        } catch (e) {
          console.warn('Erro ao consultar status:', e);
        }
      })();
    }
  }, [id, searchParams, navigate]);

  // Polling de status PIX
  useEffect(() => {
    if (!pixData?.paymentId || !id) return;
    const interval = setInterval(async () => {
      try {
        const result = await getPurchaseStatus(id, { payment_id: pixData.paymentId });
        const s = result?.data?.status || result?.status;
        if (s === 'approved') {
          clearInterval(interval);
          setPixData(null);
          paymentCompletedRef.current = true;
          trackFunnelStep('purchase_funnel', 'payment_completed', { app_id: id, payment_id: pixData.paymentId, method: 'pix' });
          navigate(`/apps/${id}/sucesso?payment_id=${pixData.paymentId}&status=approved`);
        }
      } catch (e) {
        console.warn('[PIX] Erro ao verificar status:', e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [pixData?.paymentId, id, navigate]);

  // Lookup ViaCEP
  const handleCepBlur = async () => {
    const cep = String(payerInfo.zip || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data && !data.erro) {
        setPayerInfo(s => ({
          ...s,
          streetName: data.logradouro || s.streetName,
          neighborhood: data.bairro || s.neighborhood,
          city: data.localidade || s.city,
          state: data.uf || s.state,
        }));
      }
    } catch {
      // falha silenciosa — campo permanece como estava
    } finally {
      setCepLoading(false);
    }
  };

  // Fluxo Cartão → checkout hospedado Asaas
  const handleCardCheckout = async () => {
    if (paymentLoading) return;
    setPaymentLoading(true);
    try {
      const email = String(payerInfo.email || '').trim();
      const name = String(payerInfo.name || '').trim();
      const cpf = String(payerInfo.identification || '').trim();
      const resp = await createPurchase(id, {
        email,
        name,
        identification: cpf,
        phone: payerInfo.phone || undefined,
        zip: payerInfo.zip || undefined,
        streetName: payerInfo.streetName || undefined,
        addressNumber: payerInfo.addressNumber || undefined,
        neighborhood: payerInfo.neighborhood || undefined,
        city: payerInfo.city || undefined,
        state: payerInfo.state || undefined,
        quantity: licenseQuantity,
        payment_method_id: 'credit_card',
      });
      const initPoint =
        resp?.init_point ||
        resp?.data?.init_point ||
        resp?.sandbox_init_point ||
        resp?.data?.sandbox_init_point ||
        '';
      if (initPoint) {
        trackFunnelStep('purchase_funnel', 'checkout_redirect', { app_id: id, method: 'card' });
        window.location.href = initPoint;
      } else {
        toast.error('Não foi possível iniciar o checkout de cartão. Tente novamente.');
        console.error('[Cartão] Resposta sem init_point:', resp);
      }
    } catch (e) {
      toast.error(e?.message || 'Erro ao iniciar checkout de cartão.');
      console.error('[Cartão] Erro:', e);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Fluxo PIX → pagamento direto, exibe QR inline
  const handlePixPayment = async () => {
    if (paymentLoading) return;
    setPaymentLoading(true);
    try {
      const email = String(payerInfo.email || '').trim();
      const name = String(payerInfo.name || '').trim();
      const cpf = String(payerInfo.identification || '').trim();
      const resp = await createDirectPayment(id, {
        payment_method_id: 'pix',
        quantity: licenseQuantity,
        payer: {
          email,
          name,
          identification: { type: 'CPF', number: cpf },
          phone: payerInfo.phone || undefined,
          address: (payerInfo.zip || payerInfo.streetName) ? {
            zip_code: payerInfo.zip || '',
            street_name: payerInfo.streetName || '',
            number: payerInfo.addressNumber || '',
            neighborhood: payerInfo.neighborhood || '',
            city: payerInfo.city || '',
            state: payerInfo.state || '',
          } : undefined,
        },
      });

      const qrCodeBase64 = resp?.qr_code_base64 || resp?.data?.qr_code_base64 || '';
      const qrCode = resp?.qr_code || resp?.data?.qr_code || '';
      const paymentId = resp?.payment_id || resp?.data?.payment_id || '';
      const respStatus = resp?.status || resp?.data?.status || 'pending';

      if (qrCode || qrCodeBase64) {
        trackFunnelStep('purchase_funnel', 'pix_qr_shown', { app_id: id, payment_id: paymentId });
        setPixData({ qrCode, qrCodeBase64, paymentId });
      } else if (respStatus === 'pending' || respStatus === 'approved') {
        // Backend retornou pending mas sem QR — redireciona para sucesso
        paymentCompletedRef.current = true;
        navigate(`/apps/${id}/sucesso?payment_id=${paymentId}&status=${respStatus}`);
      } else {
        toast.error('Não foi possível gerar o QR Code PIX. Tente novamente.');
        console.error('[PIX] Resposta sem qr_code:', resp);
      }
    } catch (e) {
      toast.error(e?.message || 'Erro ao gerar pagamento PIX.');
      console.error('[PIX] Erro:', e);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      let json = null;
      try { json = await registerDownload(id); } catch { json = null; }
      const url = resolveDownloadUrl(json?.download_url || downloadUrl);
      if (url) { window.open(url, '_blank', 'noopener'); return; }
      const existingEmail = String(payerInfo.email || user?.email || '').trim();
      if (!existingEmail) {
        setEmailInput('');
        setEmailConfirmError('');
        setShowEmailModal(true);
        return;
      }
      const hwid = await computeHardwareId();
      const lic = await activateDeviceLicense({ email: existingEmail, appId: Number(id), hardwareId: hwid });
      if (!lic?.licensed) { toast.warning(lic?.message || 'Licença não validada.'); return; }
      const d = await downloadByEmail(id, existingEmail);
      const u = resolveDownloadUrl(d?.download_url || '');
      if (u) window.open(u, '_blank', 'noopener');
      else toast.warning('Download ainda não liberado para este e-mail.');
      const subject = encodeURIComponent(`Ativação de licença - ${app?.name || app?.titulo || 'Aplicativo'}`);
      const bodyLines = [
        'Olá,',
        '',
        'Concluí o download e estou ativando minha licença.',
        lic?.license_key ? `Chave: ${lic.license_key}` : undefined,
        `App: ${app?.name || app?.titulo || ''} (ID ${id})`,
        'Este e-mail será usado para ativar e validar meu software.',
        '',
        'Obrigado.',
      ].filter(Boolean);
      const body = encodeURIComponent(bodyLines.join('\n'));
      window.open(`mailto:${existingEmail}?subject=${subject}&body=${body}`, '_blank');
    } catch (e) {
      toast.error('Erro ao processar download: ' + e.message);
    }
  };

  const confirmEmailAndDownload = async () => {
    if (downloadLockRef.current) return;
    downloadLockRef.current = true;
    const em = String(emailInput || '').trim();
    const rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!em || !rx.test(em)) {
      setEmailConfirmError('Informe um e-mail válido.');
      downloadLockRef.current = false;
      return;
    }
    try {
      setConfirmingDownload(true);
      setEmailConfirmError('');
      const hwid = await computeHardwareId();
      const lic = await activateDeviceLicense({ email: em, appId: Number(id), hardwareId: hwid });
      if (!lic?.licensed) {
        setEmailConfirmError(lic?.message || 'Licença não validada.');
        setConfirmingDownload(false);
        downloadLockRef.current = false;
        return;
      }
      const d = await downloadByEmail(id, em);
      const u = resolveDownloadUrl(d?.download_url || '');
      if (u) {
        setShowEmailModal(false);
        window.open(u, '_blank', 'noopener');
        const subject = encodeURIComponent(`Ativação de licença - ${app?.name || app?.titulo || 'Aplicativo'}`);
        const bodyLines = [
          'Olá,',
          '',
          'Concluí o download e estou ativando minha licença.',
          lic?.license_key ? `Chave: ${lic.license_key}` : undefined,
          `App: ${app?.name || app?.titulo || ''} (ID ${id})`,
          'Este e-mail será usado para ativar e validar meu software.',
          '',
          'Obrigado.',
        ].filter(Boolean);
        const body = encodeURIComponent(bodyLines.join('\n'));
        window.open(`mailto:${em}?subject=${subject}&body=${body}`, '_blank');
      } else {
        setEmailConfirmError('Este e-mail não possui download liberado ainda.');
      }
    } catch (e) {
      setEmailConfirmError(e.message || 'Erro ao validar e-mail para download.');
    } finally {
      setConfirmingDownload(false);
      downloadLockRef.current = false;
    }
  };

  const sendFeedback = async () => {
    try {
      await submitFeedback(id, feedback);
      toast.success('Obrigado pelo feedback!');
      setFeedback({ rating: 5, comment: '' });
    } catch (e) {
      toast.error('Erro ao enviar feedback: ' + e.message);
    }
  };

  return (
    <div className={`${styles.purchasePage} starfield-bg`}>
      <Navbar />
      <div className={styles.purchaseCard}>
        {loading ? (
          <p className={styles.muted}>Carregando...</p>
        ) : error ? (
          <p className={styles.errorMessage} role="alert">
            <span>❌</span> {error}
          </p>
        ) : (
          <>
            <h1 className={styles.title}>{app?.name || app?.titulo}</h1>
            <p className={styles.muted}>{app?.description || app?.mainFeature}</p>

            {/* Plataformas disponíveis */}
            {(() => {
              const platforms = parsePlatforms(app?.platforms);
              if (!platforms.length) return null;
              return (
                <div className={styles.platformSection}>
                  <p className={styles.platformLabel}>Disponível para:</p>
                  <div className={styles.platformBadges}>
                    {platforms.map(p => {
                      const info = PLATFORM_INFO[p];
                      if (!info) return null;
                      const Icon = info.icon;
                      return (
                        <span key={p} className={styles.platformBadge}>
                          <Icon /> {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Seletor de quantidade de licenças */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: '#aaa' }}>
                Quantidade de licenças:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className={styles.btn}
                  onClick={() => setLicenseQuantity(q => Math.max(1, q - 1))}
                  disabled={licenseQuantity <= 1}
                  style={{ padding: '8px 16px', fontSize: '1.2rem' }}
                >
                  −
                </button>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: 40, textAlign: 'center' }}>
                  {licenseQuantity}
                </span>
                <button
                  className={styles.btn}
                  onClick={() => setLicenseQuantity(q => Math.min(10, q + 1))}
                  disabled={licenseQuantity >= 10}
                  style={{ padding: '8px 16px', fontSize: '1.2rem' }}
                >
                  +
                </button>
                <span style={{ fontSize: '0.85rem', color: '#888' }}>
                  (máx. 10 por compra)
                </span>
              </div>
              {licenseQuantity > 1 && (
                <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#00e4f2' }}>
                  Cada licença permite instalar em 1 máquina diferente.
                </p>
              )}
            </div>

            {(() => {
              const unitPrice = getAppPrice(app || {});
              const original = Number(app?.original_price ?? app?.originalPrice ?? 0);
              if (unitPrice > 0 && original > unitPrice) {
                const totalOriginal = original * licenseQuantity;
                const pct = Math.round(((original - unitPrice) / original) * 100);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ color: '#a0a0b0', fontSize: '0.95rem', textDecoration: 'line-through' }}>
                      De R$ {totalOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #d12bf2 0%, #6366f1 100%)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}>
                      −{pct}% OFF
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            <p className={styles.price}>
              {(() => {
                const unitPrice = getAppPrice(app || {});
                const total = unitPrice * licenseQuantity;
                if (unitPrice <= 0) return 'A definir';
                if (licenseQuantity === 1) return `R$ ${unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                return (
                  <>
                    <span style={{ fontSize: '0.9rem', color: '#aaa', fontWeight: 'normal' }}>
                      {licenseQuantity}x R$ {unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ={' '}
                    </span>
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </>
                );
              })()}
            </p>
            <p className={styles.muted}>
              {licenseQuantity > 1
                ? `Total para ${licenseQuantity} licenças. Parcele em até 4x sem juros!`
                : 'Preço final do produto. Parcele em até 4x sem juros!'}
            </p>

            {/* Banner de incentivo ao login */}
            <LoginIncentiveBanner />

            <p className={styles.muted} style={{ marginTop: 8 }}>
              Metodos disponiveis: Cartao de credito/debito e PIX.
            </p>

            <div className={styles.btnGroup}>
              <button
                className={`${styles.btn} ${styles.btnOutline}`}
                onClick={handleDownload}
                disabled={!downloadUrl && status !== 'approved'}
              >
                Baixar executável
              </button>
            </div>

            {/* Mini security notice */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(0, 228, 242, 0.2)',
              background: 'rgba(0, 228, 242, 0.04)',
              marginTop: 4,
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 2 }}>🛡️</span>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
                <strong style={{ color: '#00E4F2' }}>Windows pode exibir um aviso ao instalar</strong> — é esperado para softwares independentes, não indica risco.{' '}
                <a href="#security" style={{ color: '#D12BF2', fontWeight: 600, textDecoration: 'none' }}>
                  Como instalar corretamente ↓
                </a>
              </p>
            </div>

            {/* ETAPA 1: Dados do comprador */}
            {step === 1 && (
              <div id="buyer-info-section" className={styles.buyerSection}>
                <h3 className={styles.subtitle}>Dados do comprador</h3>

                <div className={styles.warningBox}>
                  <span className={styles.warningIcon}>⚠️</span>
                  <p className={styles.warningText}>
                    <strong>Importante:</strong> O e-mail informado abaixo será usado para{' '}
                    <strong>ativar sua licença</strong> assim que a compra for aprovada. Verifique se está correto.
                  </p>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.inputWrap}>
                    <label>Nome completo</label>
                    <input
                      className={styles.input}
                      aria-label="Nome completo"
                      placeholder="Ex: Ricardo Coradini"
                      value={payerInfo.name}
                      onChange={e => setPayerInfo(s => ({ ...s, name: e.target.value }))}
                    />
                  </div>
                  <div className={styles.inputWrap}>
                    <label>E-mail</label>
                    <input
                      className={styles.input}
                      aria-label="E-mail"
                      placeholder="seu@email.com"
                      type="email"
                      value={payerInfo.email}
                      onChange={e => setPayerInfo(s => ({ ...s, email: e.target.value }))}
                    />
                  </div>
                  <div className={styles.inputWrap}>
                    <label>CPF</label>
                    <input
                      className={styles.input}
                      aria-label="CPF"
                      placeholder="000.000.000-00"
                      value={maskCPF(payerInfo.identification)}
                      onChange={e => {
                        const raw = String(e.target.value || '').replace(/\D/g, '').slice(0, 11);
                        setPayerInfo(s => ({ ...s, identification: raw }));
                        if (cpfError) setCpfError('');
                      }}
                      onBlur={() => {
                        const raw = payerInfo.identification;
                        if (raw && !isValidCPF(raw)) {
                          setCpfError('CPF inválido. Verifique os dígitos informados.');
                        } else {
                          setCpfError('');
                        }
                      }}
                    />
                    {cpfError && (
                      <p style={{ color: '#ff4d4f', fontSize: '0.8rem', marginTop: 4, marginBottom: 0 }}>{cpfError}</p>
                    )}
                  </div>
                </div>

                <div className={styles.formGrid} style={{ marginTop: 12 }}>
                  <div className={styles.inputWrap}>
                    <label>Telefone (opcional)</label>
                    <input
                      className={styles.input}
                      aria-label="Telefone"
                      placeholder="(11) 99999-9999"
                      value={maskPhone(payerInfo.phone || '')}
                      onChange={e => {
                        const raw = String(e.target.value || '').replace(/\D/g, '').slice(0, 11);
                        setPayerInfo(s => ({ ...s, phone: raw }));
                      }}
                    />
                  </div>
                  <div className={styles.inputWrap}>
                    <label>CEP (opcional)</label>
                    <input
                      className={styles.input}
                      aria-label="CEP"
                      placeholder="00000-000"
                      value={maskCep(payerInfo.zip || '')}
                      onChange={e => {
                        const raw = String(e.target.value || '').replace(/\D/g, '').slice(0, 8);
                        setPayerInfo(s => ({ ...s, zip: raw }));
                      }}
                      onBlur={handleCepBlur}
                    />
                    {cepLoading && (
                      <p style={{ fontSize: '0.75rem', color: '#00e4f2', marginTop: 2 }}>Buscando endereço...</p>
                    )}
                  </div>
                  <div className={styles.inputWrap}>
                    <label>Endereço (rua) (opcional)</label>
                    <input
                      className={styles.input}
                      aria-label="Endereço"
                      placeholder="Rua Exemplo, 123"
                      value={payerInfo.streetName || ''}
                      onChange={e => setPayerInfo(s => ({ ...s, streetName: String(e.target.value || '').replace(/<[^>]*>/g, '').trim() }))}
                    />
                  </div>
                  <div className={styles.inputWrap}>
                    <label>Número</label>
                    <input
                      className={styles.input}
                      aria-label="Número"
                      placeholder="123"
                      value={payerInfo.addressNumber || ''}
                      onChange={e => setPayerInfo(s => ({ ...s, addressNumber: String(e.target.value || '').replace(/[^0-9A-Za-z/\- ]/g, '').slice(0, 20) }))}
                    />
                  </div>
                  <div className={styles.inputWrap}>
                    <label>Bairro</label>
                    <input
                      className={styles.input}
                      aria-label="Bairro"
                      placeholder="Centro"
                      value={payerInfo.neighborhood || ''}
                      onChange={e => setPayerInfo(s => ({ ...s, neighborhood: String(e.target.value || '').replace(/<[^>]*>/g, '').trim() }))}
                    />
                  </div>
                  <div className={styles.inputWrap}>
                    <label>Cidade (opcional)</label>
                    <input
                      className={styles.input}
                      aria-label="Cidade"
                      placeholder="São Paulo"
                      value={payerInfo.city || ''}
                      onChange={e => setPayerInfo(s => ({ ...s, city: e.target.value }))}
                    />
                  </div>
                  <div className={styles.inputWrap}>
                    <label>Estado (opcional)</label>
                    <input
                      className={styles.input}
                      aria-label="Estado"
                      placeholder="SP"
                      maxLength={2}
                      value={payerInfo.state || ''}
                      onChange={e => setPayerInfo(s => ({ ...s, state: e.target.value.toUpperCase().slice(0, 2) }))}
                    />
                  </div>
                </div>

                <p className={styles.muted} style={{ marginTop: 8 }}>
                  Preencha nome, e-mail e CPF para continuar. O endereço completo (CEP, número e bairro) é necessário para a emissão da nota fiscal — digite o CEP que preenchemos o resto.
                </p>

                <div style={{ marginTop: 12 }}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const n = String(payerInfo.name || '').trim();
                      const em = String(payerInfo.email || '').trim();
                      const cpf = String(payerInfo.identification || '').trim();
                      if (!n || !em || !cpf) {
                        toast.warning('Por favor, preencha nome, e-mail e CPF.');
                        return;
                      }
                      if (!isValidCPF(cpf)) {
                        setCpfError('CPF inválido. Verifique os dígitos informados.');
                        toast.warning('CPF inválido. Verifique os dígitos informados.');
                        return;
                      }
                      captureAppPurchaseLead(
                        { name: n, email: em, phone: payerInfo.phone, identification: cpf, zip: payerInfo.zip, streetName: payerInfo.streetName },
                        id,
                        app?.name || app?.titulo
                      ).catch(() => {});
                      trackFunnelStep('purchase_funnel', 'checkout_info_completed', { app_id: id, payment_method: paymentMethod });
                      setStep(2);
                      setTimeout(() => {
                        const el = document.getElementById('payment-method-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                  >
                    Continuar para pagamento
                  </button>
                </div>
              </div>
            )}

            {status && (
              <p className={styles.muted} style={{ marginTop: 12 }}>
                Status da compra: <strong>{status}</strong>
              </p>
            )}

            {/* ETAPA 2: Escolha do método de pagamento */}
            {step === 2 && !pixData && (
              <div id="payment-method-section" className={styles.cardPaymentSection}>
                <h3 className={styles.subtitle}>Escolha como deseja pagar</h3>

                {/* Seletor de método */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  <button
                    className={`${styles.btn} ${paymentMethod === 'card' ? styles.btnPrimary : styles.btnOutline}`}
                    onClick={() => setPaymentMethod('card')}
                    style={{ flex: '1 1 auto', minWidth: 140 }}
                  >
                    Cartao de Credito/Debito
                  </button>
                  <button
                    className={`${styles.btn} ${paymentMethod === 'pix' ? styles.btnPrimary : styles.btnOutline}`}
                    onClick={() => setPaymentMethod('pix')}
                    style={{ flex: '1 1 auto', minWidth: 140 }}
                  >
                    PIX
                  </button>
                </div>

                {/* Cartão: redirect para checkout hospedado */}
                {paymentMethod === 'card' && (
                  <div style={{ textAlign: 'center' }}>
                    <p className={styles.muted} style={{ marginBottom: 16 }}>
                      Voce sera redirecionado para a pagina segura de pagamento para inserir os dados do cartao.
                    </p>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={handleCardCheckout}
                      disabled={paymentLoading}
                      style={{ fontSize: '1rem', padding: '14px 32px', minWidth: 280 }}
                    >
                      {paymentLoading ? 'Aguarde...' : 'Pagar com Cartao'}
                    </button>
                    <p style={{ marginTop: 10, fontSize: '0.78rem', color: '#666' }}>
                      Ambiente seguro — seus dados de cartao nao passam pelo nosso servidor.
                    </p>
                  </div>
                )}

                {/* PIX: gera QR inline */}
                {paymentMethod === 'pix' && (
                  <div style={{ textAlign: 'center' }}>
                    <p className={styles.muted} style={{ marginBottom: 16 }}>
                      Gere o QR Code PIX e pague pelo aplicativo do seu banco.
                    </p>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={handlePixPayment}
                      disabled={paymentLoading}
                      style={{ fontSize: '1rem', padding: '14px 32px', minWidth: 280 }}
                    >
                      {paymentLoading ? 'Gerando QR Code...' : 'Gerar QR Code PIX'}
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <button
                    className={`${styles.btn} ${styles.btnOutline}`}
                    onClick={() => setStep(1)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Voltar e editar dados
                  </button>
                </div>
              </div>
            )}

            {/* PIX QR inline */}
            {step === 2 && pixData && (
              <PixQrPanel
                qrCodeBase64={pixData.qrCodeBase64}
                qrCode={pixData.qrCode}
                onCancel={() => setPixData(null)}
                toast={toast}
              />
            )}

            {status === 'approved' && (
              <div className={`${styles.statusBox} ${styles.statusApproved}`}>
                <p>✔ Pagamento aprovado. Você pode baixar o executável com segurança.</p>
                <ol>
                  <li>Clique em "Baixar executável" para iniciar o download.</li>
                  <li>Mantenha o arquivo salvo em um local seguro.</li>
                  <li>Em caso de dúvida, entre em contato pelo suporte informado na confirmação do pagamento.</li>
                </ol>
              </div>
            )}

            {status === 'pending' && (
              <div className={`${styles.statusBox} ${styles.statusPending}`}>
                <p>⏳ Pagamento pendente. Aguarde a compensação ou utilize outro método.</p>
                <p className={styles.muted}>
                  Você poderá baixar o executável assim que o status for atualizado para aprovado.
                </p>
              </div>
            )}

            {status === 'rejected' && (
              <div className={`${styles.statusBox} ${styles.statusRejected}`}>
                <p>❌ Pagamento negado.</p>
                {statusDetail && (
                  <>
                    <p className={styles.muted} style={{ fontSize: '0.85em' }}>
                      Detalhe: {statusDetail}
                    </p>
                  </>
                )}
                <ul>
                  <li>Verifique os dados e tente novamente.</li>
                  <li>Se persistir, contate seu banco ou use outro método.</li>
                </ul>
              </div>
            )}

            <details className={styles.helpDetails}>
              <summary>Ajuda</summary>
              <ul>
                <li>Para cartão, você será redirecionado para uma página segura de pagamento.</li>
                <li>PIX pode levar alguns minutos para confirmação.</li>
                <li>Após aprovação, o botão de download fica ativo nesta página.</li>
              </ul>
            </details>

            {(downloadStatus === 'downloading' || downloadStatus === 'done') && (
              <div aria-live="polite" className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progress} style={{ width: `${progress}%` }} />
                </div>
                <p className={styles.muted}>
                  {downloadStatus === 'done' ? 'Download concluído!' : `Baixando... ${progress}%`}
                </p>
              </div>
            )}

            {downloadError && (
              <p className={styles.errorMessage} role="alert">
                <span>❌</span> {downloadError}
              </p>
            )}

            {status === 'approved' && (
              <section className={styles.feedbackSection}>
                <h3 className={styles.subtitle}>Avalie este aplicativo</h3>
                <div className={styles.feedbackGrid}>
                  <label>
                    Nota
                    <select
                      value={feedback.rating}
                      onChange={e => setFeedback({ ...feedback, rating: Number(e.target.value) })}
                      style={{ marginLeft: 8 }}
                    >
                      {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <input
                    className={styles.input}
                    placeholder="Comentário"
                    value={feedback.comment}
                    onChange={e => setFeedback({ ...feedback, comment: e.target.value })}
                  />
                </div>
                <button
                  className={`${styles.btn} ${styles.btnOutline}`}
                  style={{ marginTop: 12 }}
                  onClick={sendFeedback}
                >
                  Enviar feedback
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {/* Security & Installation */}
      <div id="security">
        <SecuritySection />
      </div>

      {showEmailModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-email-title"
          onClick={() => { if (!confirmingDownload) { setShowEmailModal(false); setEmailConfirmError(''); } }}
        >
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 id="confirm-email-title" className={styles.modalTitle}>
              Confirmar e-mail da compra
            </h3>
            <p className={styles.modalDesc}>
              Usaremos este e-mail para validar sua compra e ele será necessário para ativar o software após a instalação.
            </p>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>E-mail</label>
              <input
                className={styles.input}
                type="email"
                placeholder="seu@email.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
              />
              {emailConfirmError && (
                <div className={styles.modalError} role="alert">{emailConfirmError}</div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={`${styles.btn} ${styles.btnOutline}`}
                onClick={() => { if (!confirmingDownload) { setShowEmailModal(false); setEmailConfirmError(''); } }}
              >
                Cancelar
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={confirmEmailAndDownload}
                disabled={confirmingDownload}
              >
                {confirmingDownload ? 'Validando...' : 'Confirmar e baixar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppPurchasePage;
