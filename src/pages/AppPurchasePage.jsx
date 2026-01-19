// src/pages/AppPurchasePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

import CardDirectPayment from '../components/CardDirectPayment.jsx';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth.js';
import { getAppById, getPurchaseStatus, registerDownload, submitFeedback, createPaymentPreference, downloadByEmail, activateDeviceLicense } from '../services/appsAPI.js';
import { captureAppPurchaseLead } from '../services/leadsAPI.js';
import { getAppPrice } from '../utils/appModel.js';

import styles from './AppPurchasePage.module.css';

// Mapeia códigos de status_detail do Mercado Pago para mensagens amigáveis
function mapStatusDetail(detail) {
  const d = String(detail || '').toLowerCase();
  const dict = {
    // Preenchimento incorreto
    'cc_rejected_bad_filled_card_number': 'Número do cartão inválido. Verifique os dígitos.',
    'cc_rejected_bad_filled_date': 'Data de validade inválida. Corrija mês/ano.',
    'cc_rejected_bad_filled_other': 'Dados do cartão incompletos ou inválidos.',
    'cc_rejected_bad_filled_security_code': 'Código de segurança (CVV) inválido.',

    // Limite / saldo
    'cc_rejected_insufficient_amount': 'Saldo/limite insuficiente no cartão.',

    // Autorização obrigatória
    'cc_rejected_call_for_authorize': 'Banco exige autorização prévia. Ligue para autorizar a compra.',

    // Antifraude
    'cc_rejected_high_risk': 'Transação considerada de alto risco. Tente outro cartão/método.',

    // Método/token
    'invalid_payment_method': 'Método de pagamento inválido para este cartão.',
    'invalid_token': 'Token do cartão inválido. Reenvie os dados.',

    // Duplicidade
    'cc_rejected_duplicated_payment': 'Pagamento duplicado. Aguarde a confirmação do primeiro.',

    // Outros comuns
    'payment_attempt_failed': 'Tentativa de pagamento falhou. Tente novamente.',
  };
  return dict[d] || (detail ? `Motivo: ${detail}` : 'Pagamento negado. Verifique os dados e tente novamente.');
}

const AppPurchasePage = () => {
  // Fluxo simplificado: apenas Cartão (Brick)
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
  const [downloadStatus] = useState('idle'); // idle | downloading | done | error
  const [downloadError] = useState('');
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  // Checkout em duas etapas: 1 = dados do comprador, 2 = cartão
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const [payerInfo, setPayerInfo] = useState({ name: String(user?.name || ''), email: String(user?.email || ''), identification: '' });
  const [deviceId, setDeviceId] = useState('');
  const [deviceIdReady, setDeviceIdReady] = useState(false);
  // Controla visibilidade do formulário de cartão via flag de ambiente
  const initialShowCard = (
    import.meta.env.VITE_ENABLE_CARD_PAYMENT_UI === 'true' ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('showCard') === '1')
  );
  const [showCardForm, setShowCardForm] = useState(initialShowCard);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailConfirmError, setEmailConfirmError] = useState('');
  const [confirmingDownload, setConfirmingDownload] = useState(false);
  // Ref para prevenir múltiplos cliques (mutex)
  const downloadLockRef = React.useRef(false);

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

  useEffect(() => {
    let stopped = false;
    const pk = (
      import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
      import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_PROD ||
      import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_SANDBOX ||
      ''
    );
    const tryGenerateId = () => {
      if (stopped) return false;
      if (deviceId) {
        setDeviceIdReady(true);
        return true;
      }
      if (typeof window === 'undefined') return false;
      const mpCtor = window.MercadoPago;
      if (!mpCtor || !pk) return false;
      try {
        const mp = new mpCtor(pk);
        const id = typeof mp.getDeviceId === 'function' ? mp.getDeviceId() : (window.MP_DEVICE_SESSION_ID || '');
        if (id) {
          const val = String(id);
          setDeviceId(val);
          setDeviceIdReady(true);
          try { window.__MP_DEVICE_ID = val; } catch (e) { void e }
          return true;
        }
      } catch (e) { void e }
      return false;
    };
    const okNow = tryGenerateId();
    if (okNow) return () => { stopped = true; };
    const start = Date.now();
    const interval = setInterval(() => {
      const ok = tryGenerateId();
      if (ok) { clearInterval(interval); stopped = true; }
      else if (Date.now() - start > 10000) {
        clearInterval(interval);
        stopped = true;
        // Mesmo sem device ID, permitimos continuar (fallback)
        setDeviceIdReady(true);
      }
    }, 500);
    return () => { stopped = true; try { clearInterval(interval); } catch (e) { void e } };
  }, [deviceId]);

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
          if (resolvedStatus === 'approved') {
            navigate(`/apps/${id}/sucesso?payment_id=${paymentId || s?.payment_id || ''}&status=approved`);
            return;
          }
        } catch (e) {
          console.warn('Erro ao consultar status:', e);
        }
      })();
    }
  }, [id, searchParams, navigate]);

  // Fluxo Wallet (Checkout Pro)
  const startWalletCheckout = async () => {
    try {
      const email = String(payerInfo.email || user?.email || '').trim();
      const name = String(payerInfo.name || user?.name || '').trim();

      if (!email) {
        // Scroll para o formulário de dados do comprador
        setStep(1);
        setTimeout(() => {
          const el = document.getElementById('buyer-info-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        alert('Por favor, preencha seu e-mail antes de continuar com o Mercado Pago.');
        return;
      }

      const pref = await createPaymentPreference(id, { email, name });
      const init = pref?.init_point || pref?.data?.init_point || pref?.sandbox_init_point || pref?.data?.sandbox_init_point || '';
      if (init) {
        window.open(init, '_blank', 'noopener');
      } else {
        console.error('Resposta sem init_point:', pref);
        alert('Não foi possível iniciar o checkout (Wallet). Verifique os logs ou tente o pagamento direto.');
      }
    } catch (e) {
      console.error('Erro ao criar preferência:', e);
      alert(e.message || 'Erro ao iniciar checkout (Wallet)');
    }
  };

  const handleDownload = async () => {
    try {
      let json = null;
      try { json = await registerDownload(id); } catch { json = null; }
      const url = json?.download_url || downloadUrl;
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
      if (!lic?.licensed) { alert(lic?.message || 'Licença não validada.'); return; }
      const d = await downloadByEmail(id, existingEmail);
      const u = d?.download_url || '';
      if (u) window.open(u, '_blank', 'noopener');
      else alert('Download ainda não liberado para este e-mail.');
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
      alert('Erro ao processar download: ' + e.message);
    }
  };

  const confirmEmailAndDownload = async () => {
    // Previne múltiplos cliques usando lock
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
      const u = d?.download_url || '';
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
      alert('Obrigado pelo feedback!');
      setFeedback({ rating: 5, comment: '' });
    } catch (e) {
      alert('Erro ao enviar feedback: ' + e.message);
    }
  };

  return (
    <div className={`${styles.purchasePage} page-with-background`}>
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
            <p className={styles.price}>
              {(() => {
                const p = getAppPrice(app || {});
                return p > 0 ? `R$ ${p.toLocaleString('pt-BR')}` : 'A definir';
              })()}
            </p>
            <p className={styles.muted}>
              Preço final do produto. Taxas de processamento do pagamento são absorvidas pela plataforma.
            </p>

            <p className={styles.muted} style={{ marginTop: 8 }}>
              Método disponível: Cartão de crédito/débito (via Mercado Pago).
            </p>

            <div className={styles.btnGroup}>
              <button
                className={`${styles.btn} ${styles.btnOutline}`}
                onClick={startWalletCheckout}
              >
                Pagar com Mercado Pago (Wallet)
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => {
                  setStep(1);
                  const el = document.getElementById('buyer-info-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Pagar com Cartão de Crédito
              </button>
              <button
                className={`${styles.btn} ${styles.btnOutline}`}
                onClick={handleDownload}
                disabled={!downloadUrl && status !== 'approved'}
              >
                Baixar executável
              </button>
            </div>

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
                      value={payerInfo.identification}
                      onChange={e => setPayerInfo(s => ({ ...s, identification: String(e.target.value || '').replace(/[^0-9]/g, '').slice(0, 11) }))}
                    />
                  </div>
                </div>

                <div className={styles.formGrid} style={{ marginTop: 12 }}>
                  <div className={styles.inputWrap}>
                    <label>Telefone (opcional)</label>
                    <input
                      className={styles.input}
                      aria-label="Telefone"
                      placeholder="(11) 99999-9999"
                      value={payerInfo.phone || ''}
                      onChange={e => setPayerInfo(s => ({ ...s, phone: String(e.target.value || '').replace(/[^0-9+\s-]/g, '') }))}
                    />
                  </div>
                  <div className={styles.inputWrap}>
                    <label>CEP (opcional)</label>
                    <input
                      className={styles.input}
                      aria-label="CEP"
                      placeholder="00000-000"
                      value={payerInfo.zip || ''}
                      onChange={e => setPayerInfo(s => ({ ...s, zip: String(e.target.value || '').replace(/[^0-9]/g, '').slice(0, 8) }))}
                    />
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
                </div>

                <p className={styles.muted} style={{ marginTop: 8 }}>
                  Preencha nome, e-mail e CPF para continuar. Telefone e endereço ajudam a aprovação do pagamento.
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
                        alert('Por favor, preencha nome, e-mail e CPF.');
                        return;
                      }
                      // Captura lead quando usuário avança para pagamento
                      captureAppPurchaseLead(
                        { name: n, email: em, phone: payerInfo.phone, identification: cpf, zip: payerInfo.zip, streetName: payerInfo.streetName },
                        id,
                        app?.name || app?.titulo
                      ).catch(() => {});
                      setStep(2);
                      setShowCardForm(true);
                      setTimeout(() => {
                        const el = document.getElementById('card-payment-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                  >
                    Continuar para pagamento com cartão
                  </button>
                </div>
              </div>
            )}

            {status && (
              <p className={styles.muted} style={{ marginTop: 12 }}>
                Status da compra: <strong>{status}</strong>
              </p>
            )}

            {showCardForm && step === 2 && (
              <div id="card-payment-section" className={styles.cardPaymentSection}>
                <CardDirectPayment
                  appId={id}
                  amount={app?.price || 0}
                  description={(app?.name || app?.titulo) ? `Compra de ${app?.name || app?.titulo}` : 'Compra de aplicativo'}
                  buyer={{
                    name: payerInfo.name,
                    email: payerInfo.email,
                    docType: 'CPF',
                    docNumber: payerInfo.identification,
                    phone: payerInfo.phone,
                    zip: payerInfo.zip,
                    streetName: payerInfo.streetName
                  }}
                  cardholderEmail={payerInfo.email}
                  identificationType="CPF"
                  identificationNumber={payerInfo.identification}
                  deviceId={deviceId}
                  onPaymentSuccess={async (resp) => {
                    setStatus('approved');
                    // O backend retorna payment_id (interno) e mp_payment_id (do MP)
                    const payId = resp?.payment_id || resp?.mp_payment_id || resp?.data?.payment_id || resp?.id || resp?.data?.id || '';
                    navigate(`/apps/${id}/sucesso?payment_id=${payId}&status=approved`);
                  }}
                />
              </div>
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
                    <p>{mapStatusDetail(statusDetail)}</p>
                    <p className={styles.muted} style={{ fontSize: '0.85em' }}>
                      Código: {statusDetail}
                    </p>
                  </>
                )}
                <ul>
                  <li>Verifique os dados do cartão e tente novamente.</li>
                  <li>Se persistir, contate seu banco ou use outro método.</li>
                </ul>
              </div>
            )}

            {status === 'rejected' && String(statusDetail || '').toLowerCase() === 'cc_rejected_high_risk' && (
              <div className={`${styles.statusBox} ${styles.statusPending}`}>
                <p style={{ color: '#FFC107' }}>⚠ Transação sinalizada como alto risco</p>
                <ul>
                  <li>Tente outro cartão ou método de pagamento.</li>
                  <li>Confirme telefone e endereço corretamente preenchidos.</li>
                  <li>Se necessário, solicite liberação ao seu banco.</li>
                </ul>
              </div>
            )}

            <details className={styles.helpDetails}>
              <summary>Ajuda</summary>
              <ul>
                <li>Se o checkout não abrir, desative bloqueadores de pop-up e tente novamente.</li>
                <li>PIX e boleto podem levar alguns minutos para confirmação.</li>
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
