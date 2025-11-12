// src/pages/AppPurchasePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import MercadoPagoWallet from '../components/MercadoPagoWallet.jsx';
import Navbar from '../components/Navbar/Navbar';
import { API_BASE_URL } from '../lib/apiConfig.js';
import { getAppById, createPaymentPreference, getPurchaseStatus, registerDownload, submitFeedback } from '../services/appsAPI.js';

const AppPurchasePage = () => {
  const COMMON_TYPES = [
    { id: 'ticket', label: 'Boleto', title: 'ticket = boleto' },
    { id: 'atm', label: 'Caixa eletrônico', title: 'atm = caixa eletrônico' },
    { id: 'account_money', label: 'Saldo MP', title: 'account_money = saldo no Mercado Pago' },
    { id: 'bank_transfer', label: 'Transferência bancária', title: 'bank_transfer = transferência bancária' },
    { id: 'credit_card', label: 'Cartão crédito', title: 'credit_card = cartão de crédito' },
    { id: 'debit_card', label: 'Cartão débito', title: 'debit_card = cartão de débito' },
  ];
  const COMMON_METHODS = [
    { id: 'visa', label: 'Visa', title: 'visa = bandeira Visa' },
    { id: 'master', label: 'Mastercard', title: 'master = bandeira Mastercard' },
    { id: 'amex', label: 'Amex', title: 'amex = American Express' },
    { id: 'elo', label: 'Elo', title: 'elo = bandeira Elo' },
    { id: 'hipercard', label: 'Hipercard', title: 'hipercard = bandeira Hipercard' },
    { id: 'pix', label: 'PIX', title: 'pix = método PIX' },
  ];
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | downloading | done | error
  const [downloadError, setDownloadError] = useState('');
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [useWallet, setUseWallet] = useState(Boolean(searchParams.get('wallet')));
  const [mpPrefId, setMpPrefId] = useState(null);
  // Expor opções avançadas via UI quando query ?config=1
  const [showOptions, setShowOptions] = useState(Boolean(searchParams.get('config')));
  const [checkoutOptions, setCheckoutOptions] = useState({
    installments: '',
    default_installments: '',
    excluded_payment_types: '', // comma-separated ids (ex.: ticket, atm)
    excluded_payment_methods: '', // comma-separated ids (ex.: visa, master)
    statement_descriptor: '',
    expires: false,
    expiration_date_from: '',
    expiration_date_to: '',
    payer_email: '',
    payer_name: '',
    payer_id_type: '',
    payer_id_number: '',
  });

  const toggleCommaItem = (field, id) => {
    setCheckoutOptions(o => {
      const raw = (o[field] || '').split(',').map(s => s.trim()).filter(Boolean);
      const has = raw.includes(id);
      const next = has ? raw.filter(v=>v!==id) : [...raw, id];
      return { ...o, [field]: next.join(', ') };
    });
  };

  // Inicia o checkout no ML (memoizado por id)
  const startCheckout = useCallback(async () => {
    try {
      // Monta payload opcional conforme UI
      const opts = {};
      const pm = {};
      const inst = Number(checkoutOptions.installments);
      const defInst = Number(checkoutOptions.default_installments);
      if (inst > 0 && inst <= 24) pm.installments = inst;
      if (defInst > 0 && defInst <= 24) pm.default_installments = defInst;
      const toIds = (str) => (str || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map(id => ({ id }));
      const exclTypes = toIds(checkoutOptions.excluded_payment_types);
      const exclMethods = toIds(checkoutOptions.excluded_payment_methods);
      if (exclTypes.length) pm.excluded_payment_types = exclTypes;
      if (exclMethods.length) pm.excluded_payment_methods = exclMethods;
      if (Object.keys(pm).length) opts.payment_methods = pm;
      if (checkoutOptions.statement_descriptor?.trim()) opts.statement_descriptor = checkoutOptions.statement_descriptor.trim();
      if (typeof checkoutOptions.expires === 'boolean') opts.expires = checkoutOptions.expires;
      if (checkoutOptions.expiration_date_from?.trim()) opts.expiration_date_from = checkoutOptions.expiration_date_from.trim();
      if (checkoutOptions.expiration_date_to?.trim()) opts.expiration_date_to = checkoutOptions.expiration_date_to.trim();
      const payer = {};
      if (checkoutOptions.payer_email?.trim()) payer.email = checkoutOptions.payer_email.trim();
      if (checkoutOptions.payer_name?.trim()) payer.name = checkoutOptions.payer_name.trim();
      const ident = {};
      if (checkoutOptions.payer_id_type?.trim()) ident.type = checkoutOptions.payer_id_type.trim();
      if (checkoutOptions.payer_id_number?.trim()) ident.number = checkoutOptions.payer_id_number.trim();
      if (ident.type && ident.number) payer.identification = ident;
      if (Object.keys(payer).length) opts.payer = payer;

      const { init_point, preference_id } = await createPaymentPreference(id, opts);
      if (useWallet) {
        if (preference_id) setMpPrefId(preference_id);
        else alert('Não foi possível obter a preferência para Wallet');
      } else {
        if (init_point) {
          window.location.href = init_point;
        } else {
          alert('Não foi possível iniciar o checkout');
        }
      }
    } catch (e) { setError(e.message || 'Erro ao iniciar pagamento'); }
  }, [id, checkoutOptions, useWallet]);

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
          if (resolvedStatus === 'approved') {
            if (s?.download_url) setDownloadUrl(s.download_url);
          }
        } catch (e) {
          console.warn('Erro ao consultar status:', e);
        }
      })();
    }
  }, [id, searchParams]);

  // Auto-inicia o checkout ao entrar na página quando não é retorno do pagamento
  useEffect(() => {
    const hasReturnParams = !!(searchParams.get('preference_id') || searchParams.get('payment_id') || searchParams.get('status'));
    // Não auto-inicia quando estiver configurando opções (query ?config=1)
    if (!hasReturnParams && !showOptions && !useWallet) {
      startCheckout();
    }
  }, [startCheckout, searchParams, showOptions, useWallet]);

  // startCheckout definido acima com useCallback

  const handleDownload = async () => {
    try {
      const json = await registerDownload(id);
      const url = json?.download_url || downloadUrl;
      if (url) window.open(url, '_blank', 'noopener');
      else alert('Download ainda não liberado');
    } catch (e) { alert('Erro ao registrar download: ' + e.message); }
  };

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
            <p className="price">Preço: {app?.price ? `R$ ${Number(app.price).toLocaleString('pt-BR')}` : 'a definir'}</p>
            <p className="muted" title="Informação de preço">
              Preço final do produto. Taxas de processamento do pagamento são absorvidas pela plataforma.
            </p>

            <p className="muted" style={{ marginTop: 8 }}>
              Modo selecionado: {useWallet ? 'Mercado Pago Wallet (no app)' : 'Checkout Mercado Livre (redirecionamento)'}
            </p>

            <div className="btn-group" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={startCheckout} aria-label="Iniciar checkout no Mercado Livre">
                Pagar com Mercado Livre
              </button>
              <button className="btn btn-outline" onClick={() => { setUseWallet(true); startCheckout(); }} aria-label="Iniciar Wallet do Mercado Pago">
                Pagar com Mercado Pago (Wallet)
              </button>
              <button className="btn btn-outline" onClick={handleDownload} disabled={!downloadUrl && status!=='approved'}>Baixar executável</button>
            </div>
            {useWallet && mpPrefId && (
              <div style={{ marginTop: 12 }}>
                <MercadoPagoWallet preferenceId={mpPrefId} />
              </div>
            )}
            <details open={showOptions} style={{ marginTop: 10 }}>
              <summary onClick={() => setShowOptions(v=>!v)} style={{ cursor:'pointer' }}>Opções de pagamento (Mercado Pago)</summary>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(220px, 1fr))', gap:8, marginTop:8 }}>
                <label>
                  Parcelas máximas
                  <input type="number" min="1" max="24" value={checkoutOptions.installments}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, installments:e.target.value }))} />
                </label>
                <label>
                  Parcelas padrão
                  <input type="number" min="1" max="24" value={checkoutOptions.default_installments}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, default_installments:e.target.value }))} />
                </label>
                <label style={{ gridColumn:'1 / -1' }}>
                  Excluir tipos (ids separados por vírgula)
                  <input placeholder="ex.: ticket, atm" value={checkoutOptions.excluded_payment_types}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, excluded_payment_types:e.target.value }))} />
                </label>
                <div style={{ gridColumn:'1 / -1', display:'flex', gap:8, flexWrap:'wrap' }}>
                  {COMMON_TYPES.map(({ id, label, title }) => (
                    <label key={id} title={title} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                      <input type="checkbox" checked={(checkoutOptions.excluded_payment_types||'').includes(id)}
                        onChange={()=>toggleCommaItem('excluded_payment_types', id)} /> {label}
                    </label>
                  ))}
                </div>
                <label style={{ gridColumn:'1 / -1' }}>
                  Excluir métodos (ids separados por vírgula)
                  <input placeholder="ex.: visa, master, pix" value={checkoutOptions.excluded_payment_methods}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, excluded_payment_methods:e.target.value }))} />
                </label>
                <div style={{ gridColumn:'1 / -1', display:'flex', gap:8, flexWrap:'wrap' }}>
                  {COMMON_METHODS.map(({ id, label, title }) => (
                    <label key={id} title={title} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                      <input type="checkbox" checked={(checkoutOptions.excluded_payment_methods||'').includes(id)}
                        onChange={()=>toggleCommaItem('excluded_payment_methods', id)} /> {label}
                    </label>
                  ))}
                </div>
                <label>
                  Descriptor no extrato
                  <input placeholder="ex.: CODECRAFT" value={checkoutOptions.statement_descriptor}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, statement_descriptor:e.target.value }))} />
                </label>
                <label>
                  Expira?
                  <input type="checkbox" checked={checkoutOptions.expires}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, expires:e.target.checked }))} />
                </label>
                <label>
                  Início validade
                  <input type="datetime-local" value={checkoutOptions.expiration_date_from}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, expiration_date_from:e.target.value }))} />
                </label>
                <label>
                  Fim validade
                  <input type="datetime-local" value={checkoutOptions.expiration_date_to}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, expiration_date_to:e.target.value }))} />
                </label>
                <label>
                  E-mail pagador
                  <input type="email" value={checkoutOptions.payer_email}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, payer_email:e.target.value }))} />
                </label>
                <label>
                  Nome pagador
                  <input value={checkoutOptions.payer_name}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, payer_name:e.target.value }))} />
                </label>
                <label>
                  Doc. tipo
                  <input placeholder="ex.: CPF" value={checkoutOptions.payer_id_type}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, payer_id_type:e.target.value }))} />
                </label>
                <label>
                  Doc. número
                  <input placeholder="ex.: 00000000000" value={checkoutOptions.payer_id_number}
                    onChange={e=>setCheckoutOptions(o=>({ ...o, payer_id_number:e.target.value }))} />
                </label>
                <div style={{ gridColumn:'1 / -1', display:'flex', gap:8 }}>
                  <button className="btn btn-outline" onClick={startCheckout}>Iniciar checkout com opções</button>
                  <button className="btn" onClick={() => setCheckoutOptions({
                    installments: '',
                    default_installments: '',
                    excluded_payment_types: '',
                    excluded_payment_methods: '',
                    statement_descriptor: '',
                    expires: false,
                    expiration_date_from: '',
                    expiration_date_to: '',
                    payer_email: '',
                    payer_name: '',
                    payer_id_type: '',
                    payer_id_number: '',
                  })}>Limpar opções</button>
                </div>
              </div>
            </details>
            {status && <p className="muted">Status da compra: {status}</p>}

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