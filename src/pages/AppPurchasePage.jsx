// src/pages/AppPurchasePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import CardDirectPayment from '../components/CardDirectPayment.jsx';
import Navbar from '../components/Navbar/Navbar';
import { API_BASE_URL } from '../lib/apiConfig.js';
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
import { getAppById, getPurchaseStatus, registerDownload, submitFeedback } from '../services/appsAPI.js';

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
  // Controla visibilidade do formulário de cartão via flag de ambiente
  const initialShowCard = (
    import.meta.env.VITE_ENABLE_CARD_PAYMENT_UI === 'true' ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('showCard') === '1')
  );
  const [showCardForm, setShowCardForm] = useState(initialShowCard);

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

  // Fluxo simplificado: não auto-iniciar checkout externo

  // startCheckout definido acima com useCallback

  const handleDownload = async () => {
    try {
      const json = await registerDownload(id);
      const url = json?.download_url || downloadUrl;
      if (url) window.open(url, '_blank', 'noopener');
      else alert('Download ainda não liberado');
    } catch (e) { alert('Erro ao registrar download: ' + e.message); }
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
                className="btn btn-primary"
                onClick={() => {
                  setShowCardForm(true);
                  const el = document.getElementById('card-payment-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Comprar agora
              </button>
              <button className="btn btn-outline" onClick={handleDownload} disabled={!downloadUrl && status!=='approved'}>Baixar executável</button>
            </div>
            {/* Opções avançadas removidas no modo simplificado */}
            {status && <p className="muted">Status da compra: {status}</p>}

            {/* Fluxo Pix removido no modo simplificado */}

            {showCardForm && (
              <div id="card-payment-section" style={{ marginTop: 12 }}>
                <CardDirectPayment
                  appId={id}
                  amount={app?.price || 0}
                  showPayButton={false}
                  onStatus={async (s, resp) => {
                    setStatus(s);
                    const det = resp?.status_detail || resp?.data?.status_detail || '';
                    if (det) setStatusDetail(det);
                    if (s === 'approved') {
                      try {
                        const json = await registerDownload(id);
                        const url = json?.download_url;
                        if (url) setDownloadUrl(url);
                      } catch (e) {
                        console.warn('Falha ao registrar download após aprovação:', e);
                      }
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
        .progress-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden; }
        .progress { height: 100%; background: linear-gradient(90deg, #D12BF2, #00E4F2); }
      `}</style>
    </div>
  );
};

export default AppPurchasePage;
// Removido: inicialização fora de componente (causava invalid hook call)