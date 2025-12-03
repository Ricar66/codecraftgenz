// src/pages/AppPurchasePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import CardDirectPayment from '../components/CardDirectPayment.jsx';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/useAuth.js';
import { getAppById, getPurchaseStatus, registerDownload, submitFeedback, createPaymentPreference, downloadByEmail, activateDeviceLicense } from '../services/appsAPI.js';
import { getAppPrice } from '../utils/appModel.js';

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
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [statusDetail, setStatusDetail] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [progress] = useState(0);
  const [downloadStatus] = useState('idle'); // idle | downloading | done | error
  const [downloadError] = useState('');
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  // Checkout em duas etapas: 1 = dados do comprador, 2 = cartão
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const [payerInfo, setPayerInfo] = useState({ name: String(user?.name || ''), email: String(user?.email || ''), identification: '' });
  const [deviceId, setDeviceId] = useState('');
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

  // Fluxo simplificado: sem checkout externo

  // Removido: auto-download para evitar qualquer comportamento de download não intencional

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
      if (deviceId) return true;
      if (typeof window === 'undefined') return false;
      const mpCtor = window.MercadoPago;
      if (!mpCtor || !pk) return false;
      try {
        const mp = new mpCtor(pk);
        const id = typeof mp.getDeviceId === 'function' ? mp.getDeviceId() : (window.MP_DEVICE_SESSION_ID || '');
        if (id) {
          const val = String(id);
          setDeviceId(val);
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
      else if (Date.now() - start > 10000) { clearInterval(interval); stopped = true; }
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
            if (s?.download_url) setDownloadUrl(s.download_url);
          }
        } catch (e) {
          console.warn('Erro ao consultar status:', e);
        }
      })();
    }
  }, [id, searchParams]);

  // Fluxo Wallet (Checkout Pro)
  const startWalletCheckout = async () => {
    try {
      const pref = await createPaymentPreference(id);
      const init = pref?.init_point || pref?.data?.init_point || '';
      if (init) {
        window.open(init, '_blank', 'noopener');
      } else {
        alert('Não foi possível iniciar o checkout (Wallet)');
      }
    } catch (e) {
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
    const em = String(emailInput || '').trim();
    const rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!em || !rx.test(em)) { setEmailConfirmError('Informe um e-mail válido.'); return; }
    try {
      setConfirmingDownload(true);
      setEmailConfirmError('');
      const hwid = await computeHardwareId();
      const lic = await activateDeviceLicense({ email: em, appId: Number(id), hardwareId: hwid });
      if (!lic?.licensed) { setEmailConfirmError(lic?.message || 'Licença não validada.'); setConfirmingDownload(false); return; }
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
    }
  };

  // Pagamento direto via Pix
  // Fluxo Pix removido neste modo simplificado

  // autoDownload definido acima com useCallback

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
    <div className="purchase-page">
      <Navbar />
      <div className="purchase-card">
        {loading ? (
          <p className="muted">Carregando…</p>
        ) : error ? (
          <p role="alert" style={{ color: '#FF6B6B' }}>❌ {error}</p>
        ) : (
          <>
            <h1 className="title">{app?.name || app?.titulo}</h1>
            <p className="muted">{app?.description || app?.mainFeature}</p>
            <p className="price">Preço: {(() => { const p = getAppPrice(app||{}); return p > 0 ? `R$ ${p.toLocaleString('pt-BR')}` : 'a definir'; })()}</p>
            <p className="muted" title="Informação de preço">
              Preço final do produto. Taxas de processamento do pagamento são absorvidas pela plataforma.
            </p>

            <p className="muted" style={{ marginTop: 8 }}>
              Método disponível: Cartão de crédito/débito (via Mercado Pago).
            </p>

            <div className="btn-group" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button
                className="btn btn-outline"
                onClick={startWalletCheckout}
              >
                Pagar com Mercado Pago (Wallet)
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setStep(1);
                  const el = document.getElementById('buyer-info-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Pagar com Cartão de Crédito
              </button>
              <button className="btn btn-outline" onClick={handleDownload} disabled={!downloadUrl && status!=='approved'}>Baixar executável</button>
            </div>
            {step === 1 && (
              <div id="buyer-info-section" style={{ marginTop: 12 }}>
                <h3 className="title" style={{ fontSize:'1rem' }}>Dados do comprador</h3>
                <div className="form-grid">
                  <div className="input-wrap">
                    <label>Nome completo</label>
                    <input className="input" aria-label="Nome completo" placeholder="Ex: Ricardo Coradini" value={payerInfo.name} onChange={e=>setPayerInfo(s=>({ ...s, name: e.target.value }))} />
                  </div>
                  <div className="input-wrap">
                    <label>E-mail</label>
                    <input className="input" aria-label="E-mail" placeholder="seu@email.com" type="email" value={payerInfo.email} onChange={e=>setPayerInfo(s=>({ ...s, email: e.target.value }))} />
                  </div>
                  <div className="input-wrap">
                    <label>CPF</label>
                    <input className="input" aria-label="CPF" placeholder="000.000.000-00" value={payerInfo.identification} onChange={e=>setPayerInfo(s=>({ ...s, identification: String(e.target.value||'').replace(/[^0-9]/g,'').slice(0,11) }))} />
                  </div>
                </div>
                <div className="form-grid" style={{ marginTop:8 }}>
                  <div className="input-wrap">
                    <label>Telefone (opcional)</label>
                    <input className="input" aria-label="Telefone" placeholder="(11) 99999-9999" value={payerInfo.phone || ''} onChange={e=>setPayerInfo(s=>({ ...s, phone: String(e.target.value||'').replace(/[^0-9+\s-]/g,'') }))} />
                  </div>
                  <div className="input-wrap">
                    <label>CEP (opcional)</label>
                    <input className="input" aria-label="CEP" placeholder="00000-000" value={payerInfo.zip || ''} onChange={e=>setPayerInfo(s=>({ ...s, zip: String(e.target.value||'').replace(/[^0-9]/g,'').slice(0,8) }))} />
                  </div>
                  <div className="input-wrap">
                    <label>Endereço (rua) (opcional)</label>
                    <input className="input" aria-label="Endereço" placeholder="Rua Exemplo, 123" value={payerInfo.streetName || ''} onChange={e=>setPayerInfo(s=>({ ...s, streetName: String(e.target.value||'').replace(/<[^>]*>/g,'').trim() }))} />
                  </div>
                </div>
                <p className="muted" style={{ marginTop: 6 }}>Preencha nome, e-mail e CPF para continuar. Telefone e endereço ajudam a aprovação do pagamento.</p>
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-outline" onClick={(e)=>{
                    e.preventDefault();
                    const n = String(payerInfo.name||'').trim();
                    const em = String(payerInfo.email||'').trim();
                    const id = String(payerInfo.identification||'').trim();
                    if (!n || !em || !id) { alert('Por favor, preencha nome, e-mail e CPF.'); return; }
                    setStep(2);
                    setShowCardForm(true);
                    const el = document.getElementById('card-payment-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}>Continuar para pagamento com cartão</button>
                </div>
              </div>
            )}
            {/* Opções avançadas removidas no modo simplificado */}
            {status && <p className="muted">Status da compra: {status}</p>}

            {/* Fluxo Pix removido no modo simplificado */}

              {showCardForm && step === 2 && (
                <div id="card-payment-section" style={{ marginTop: 12 }}>
                  <CardDirectPayment
                    appId={id}
                    amount={app?.price || 0}
                    description={(app?.name || app?.titulo) ? `Compra de ${app?.name || app?.titulo}` : 'Compra de aplicativo'}
                    buyer={{ name: payerInfo.name, email: payerInfo.email, docType: 'CPF', docNumber: payerInfo.identification, phone: payerInfo.phone, zip: payerInfo.zip, streetName: payerInfo.streetName }}
                    cardholderEmail={payerInfo.email}
                    identificationType="CPF"
                    identificationNumber={payerInfo.identification}
                    deviceId={deviceId}
                    onPaymentSuccess={async (resp) => {
                      setStatus('approved');
                      const det = resp?.status_detail || resp?.data?.status_detail || '';
                      if (det) setStatusDetail(det);
                      try {
                        const json = await registerDownload(id);
                        const url = json?.download_url;
                        if (url) setDownloadUrl(url);
                      } catch (e) {
                        console.warn('Falha ao registrar download após aprovação:', e);
                      }
                    }}
                  />
                </div>
              )}

            {status === 'approved' && (
              <div className="approved-wrap" style={{ marginTop: 10, padding: '10px 12px', border:'1px solid rgba(0,228,242,0.3)', borderRadius:8 }}>
                <p className="muted" style={{ color:'#00E4F2' }}>✔ Pagamento aprovado. Você pode baixar o executável com segurança.</p>
                <ol style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>Clique em "Baixar executável" para iniciar o download.</li>
                  <li>Mantenha o arquivo salvo em um local seguro.</li>
                  <li>Em caso de dúvida, entre em contato pelo suporte informado na confirmação do pagamento.</li>
                </ol>
              </div>
            )}

            {status === 'pending' && (
              <div className="pending-wrap" style={{ marginTop: 10, padding: '10px 12px', border:'1px solid rgba(255, 193, 7, 0.3)', borderRadius:8 }}>
                <p className="muted" style={{ color:'#FFC107' }}>⏳ Pagamento pendente. Aguarde a compensação ou utilize outro método.</p>
                <p className="muted">Você poderá baixar o executável assim que o status for atualizado para aprovado.</p>
              </div>
            )}

            {status === 'rejected' && (
              <div className="rejected-wrap" style={{ marginTop: 10, padding: '10px 12px', border:'1px solid rgba(255, 107, 107, 0.3)', borderRadius:8 }}>
                <p className="muted" style={{ color:'#FF6B6B' }}>❌ Pagamento negado.</p>
                {statusDetail && (
                  <>
                    <p className="muted">{mapStatusDetail(statusDetail)}</p>
                    <p className="muted" style={{ fontSize:'0.85em' }}>Código: {statusDetail}</p>
                  </>
                )}
                <ul className="muted" style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>Verifique os dados do cartão e tente novamente.</li>
                  <li>Se persistir, contate seu banco ou use outro método.</li>
                </ul>
              </div>
            )}

            {status === 'rejected' && String(statusDetail || '').toLowerCase() === 'cc_rejected_high_risk' && (
              <div style={{ marginTop: 10, padding: '10px 12px', border:'1px solid rgba(255, 193, 7, 0.3)', borderRadius:8 }}>
                <p className="muted" style={{ color:'#FFC107' }}>⚠ Transação sinalizada como alto risco</p>
                <ul className="muted" style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>Tente outro cartão ou método de pagamento.</li>
                  <li>Confirme telefone e endereço corretamente preenchidos.</li>
                  <li>Se necessário, solicite liberação ao seu banco.</li>
                </ul>
              </div>
            )}

            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor:'pointer' }}>Ajuda</summary>
              <ul className="muted" style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Se o checkout não abrir, desative bloqueadores de pop-up e tente novamente.</li>
                <li>PIX e boleto podem levar alguns minutos para confirmação.</li>
                <li>Após aprovação, o botão de download fica ativo nesta página.</li>
              </ul>
            </details>

            {(downloadStatus === 'downloading' || downloadStatus === 'done') && (
              <div aria-live="polite" className="progress-wrap" style={{ marginTop: 12 }}>
                <div className="progress-bar"><div className="progress" style={{ width: `${progress}%` }} /></div>
                <p className="muted">{downloadStatus === 'done' ? 'Download concluído!' : `Baixando… ${progress}%`}</p>
              </div>
            )}
            {downloadError && <p role="alert" style={{ color: '#FF6B6B' }}>❌ {downloadError}</p>}

            {status === 'approved' && (
              <section style={{ marginTop: 12 }}>
                <h3 className="title" style={{ fontSize:'1rem' }}>Avalie este aplicativo</h3>
                <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center' }}>
                  <label>
                    Nota
                    <select value={feedback.rating} onChange={e=>setFeedback({ ...feedback, rating:Number(e.target.value) })} style={{ marginLeft:8 }}>
                      {[5,4,3,2,1].map(n=> <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <input placeholder="Comentário" value={feedback.comment} onChange={e=>setFeedback({ ...feedback, comment:e.target.value })} />
                </div>
                <button className="btn btn-outline" style={{ marginTop:8 }} onClick={sendFeedback}>Enviar feedback</button>
              </section>
            )}
          </>
        )}
      </div>

      {showEmailModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-email-title">
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <h3 id="confirm-email-title" className="modal-title">Confirmar e-mail da compra</h3>
            <p className="modal-desc">Usaremos este e-mail para validar sua compra e ele será necessário para ativar o software após a instalação.</p>
            <div className="modal-field">
              <label className="modal-label">E-mail</label>
              <input
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={emailInput}
                onChange={e=>setEmailInput(e.target.value)}
              />
              {emailConfirmError && <div className="modal-error" role="alert">{emailConfirmError}</div>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={()=>{ if (!confirmingDownload) { setShowEmailModal(false); setEmailConfirmError(''); } }}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmEmailAndDownload} disabled={confirmingDownload}>
                {confirmingDownload ? 'Validando…' : 'Confirmar e baixar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .purchase-page { min-height: 100vh; }
        .purchase-card { max-width: 800px; margin: 16px auto; padding: 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; }
        .title { color: var(--texto-branco); margin: 0 0 6px; }
        .muted { color: var(--texto-gelo); }
        .price { color: var(--texto-branco); font-weight: 600; }
        .btn { padding: 8px 12px; border-radius: 8px; border:1px solid rgba(255,255,255,0.18); transition: transform .12s ease, box-shadow .12s ease; }
        .btn-primary { background: #00E4F2; color: #000; }
        .btn-outline { background: transparent; color: var(--texto-branco); }
        .btn:active { transform: translateY(0px) scale(0.98); }
        .form-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
        .input-wrap { display:flex; flex-direction:column; gap:6px; }
        .input-wrap label { color: var(--texto-gelo); font-size: .85rem; }
        .input { padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background: rgba(0,0,0,0.25); color: var(--texto-branco); outline:none; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); }
        .input:focus { border-color:#00E4F2; box-shadow: 0 0 0 2px rgba(0,228,242,.25); }
        .progress-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden; }
        .progress { height: 100%; background: linear-gradient(90deg, #D12BF2, #00E4F2); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(3,6,12,0.75); display:flex; align-items:center; justify-content:center; padding:16px; z-index: 1000; }
        .modal-card { width: 100%; max-width: 520px; background: #0A0F1B; border: 1px solid rgba(0,228,242,0.35); border-radius: 12px; box-shadow: 0 0 24px rgba(209,43,242,0.18), 0 0 24px rgba(0,228,242,0.18); padding: 16px; }
        .modal-title { color: var(--texto-branco); margin: 0 0 8px; }
        .modal-desc { color: var(--texto-gelo); font-size: .95rem; margin-bottom: 12px; }
        .modal-field { display:flex; flex-direction:column; gap:6px; }
        .modal-label { color: var(--texto-gelo); font-size: .85rem; }
        .modal-error { color: #FF6B6B; font-size: .9rem; }
        .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 12px; }
      `}</style>
    </div>
  );
};

export default AppPurchasePage;
// Removido: inicialização fora de componente (causava invalid hook call)
