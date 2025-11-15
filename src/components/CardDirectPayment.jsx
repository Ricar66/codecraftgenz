// src/components/CardDirectPayment.jsx
import { initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useRef, useState } from 'react';

import { useAuth } from '../context/useAuth.js';
import { createDirectPayment } from '../services/appsAPI.js';

const CardDirectPayment = ({ appId, amount, description = 'Compra de aplicativo', onStatus, showPayButton = true, payButtonLabel = 'Pagar agora', buttonStyle, buyer = {} }) => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Inicializa SDK JS v2 e aguarda disponibilidade de window.MercadoPago
  useEffect(() => {
    const PK = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || import.meta.env.MERCADO_PAGO_PUBLIC_KEY;

    let cancelled = false;

    const ensureMpSdk = () => new Promise((resolve, reject) => {
      if (cancelled) return;
      if (window.MercadoPago) return resolve();
      const existing = document.querySelector('script[src*="sdk.mercadopago.com/js/v2"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Falha ao carregar SDK do Mercado Pago')));
      } else {
        const s = document.createElement('script');
        s.src = 'https://sdk.mercadopago.com/js/v2';
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Falha ao carregar SDK do Mercado Pago'));
        document.head.appendChild(s);
      }
    });

    const waitForSDK = () => new Promise((resolve, reject) => {
      const start = Date.now();
      const maxWaitMs = 15000;
      const tick = () => {
        if (cancelled) return;
        if (window.MercadoPago) return resolve();
        if (Date.now() - start > maxWaitMs) return reject(new Error('SDK do Mercado Pago indisponível'));
        setTimeout(tick, 150);
      };
      tick();
    });

    try {
      if (PK) {
        initMercadoPago(PK, { locale: 'pt-BR' });
        ensureMpSdk()
          .then(() => waitForSDK())
          .then(() => setReady(true))
          .catch((err) => setError(err?.message || 'SDK do Mercado Pago indisponível'));
      } else {
        setError('Chave pública do Mercado Pago não configurada');
      }
    } catch {
      setError('Falha ao inicializar Mercado Pago');
    }

    return () => { cancelled = true; };
  }, []);

  // Renderiza o Brick cardPayment
  useEffect(() => {
    const PK = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || import.meta.env.MERCADO_PAGO_PUBLIC_KEY;
    if (!ready || !containerRef.current || !PK) return;

    const mp = window.MercadoPago ? new window.MercadoPago(PK, { locale: 'pt-BR' }) : null;
    if (!mp) {
      return;
    }

    const bricksBuilder = mp.bricks();
    const settings = {
      initialization: {
        amount: Number(amount || 0)
      },
      customization: {
        visual: {
          style: {
            theme: 'dark',
            customVariables: {},
          },
        },
        paymentMethods: {
          maxInstallments: 1,
        },
      },
      callbacks: {
        onReady: () => { console.debug('CardPayment brick pronto'); },
        onSubmit: (cardFormData) => {
          setLoading(true);
          setError('');
          // Validações básicas antes de enviar
          const txAmount = Number(amount || 0);
          if (!Number.isFinite(txAmount) || txAmount <= 0) {
            setLoading(false);
            setError('Valor de pagamento inválido.');
            throw new Error('invalid amount');
          }
          const paymentMethodId = (
            cardFormData?.payment_method_id ??
            cardFormData?.paymentMethodId ??
            cardFormData?.paymentMethod?.id ??
            undefined
          );
          const issuerId = (
            cardFormData?.issuer_id ??
            cardFormData?.issuerId ??
            cardFormData?.issuer?.id ??
            undefined
          );
          if (!paymentMethodId) {
            setLoading(false);
            setError('Preencha os dados do cartão e use o botão do formulário para enviar');
            throw new Error('missing payment_method_id');
          }
          if (!cardFormData?.token) {
            setLoading(false);
            setError('Token do cartão não foi gerado. Verifique os dados e tente novamente.');
            throw new Error('missing card token');
          }
          // Extrai dados do pagador, se disponíveis no Brick
          const payerEmail = (
            cardFormData?.payer?.email ??
            cardFormData?.cardholderEmail ??
            buyer?.email ??
            user?.email ??
            undefined
          );
          const payerIdentification = (() => {
            const idObj = cardFormData?.payer?.identification;
            const type = idObj?.type ?? cardFormData?.identificationType;
            const number = idObj?.number ?? cardFormData?.identificationNumber;
            const fallbackType = buyer?.docType;
            const fallbackNumber = buyer?.docNumber;
            const t = type || fallbackType;
            const n = number || fallbackNumber;
            return (t && n) ? { type: t, number: n } : undefined;
          })();
          const payerNameRaw = (
            cardFormData?.payer?.first_name ??
            cardFormData?.cardholder?.name ??
            buyer?.name ??
            ''
          );
          const nameParts = String(payerNameRaw || '').trim().split(/\s+/);
          const payerFirstName = nameParts[0] || undefined;
          const payerLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
          const payload = {
            token: cardFormData.token,
            payment_method_id: paymentMethodId,
            ...(issuerId ? { issuer_id: issuerId } : {}),
            installments: Number(cardFormData.installments || 1),
            binary_mode: true,
            capture: true,
            transaction_amount: txAmount,
            description: String(description || ''),
            ...(payerEmail || payerIdentification || payerFirstName ? { payer: { ...(payerEmail ? { email: payerEmail } : {}), ...(payerFirstName ? { first_name: payerFirstName } : {}), ...(payerLastName ? { last_name: payerLastName } : {}), ...(payerIdentification ? { identification: payerIdentification } : {}) } } : {}),
            additional_info: {
              items: [{ id: String(appId || ''), title: String(description || ''), quantity: 1, unit_price: txAmount }],
              payer: {
                phone: buyer?.phone ? { number: String(buyer.phone) } : undefined,
                address: (buyer?.zip || buyer?.streetName) ? { zip_code: String(buyer.zip || ''), street_name: String(buyer.streetName || '') } : undefined,
              }
            }
          };
          return createDirectPayment(appId, payload)
            .then((resp) => {
              try { console.log('Pagamento direto (resp):', resp); } catch (e) { console.debug('Falha ao logar resposta de pagamento', e); }
              const nextStatus = resp?.status || resp?.data?.status || 'pending';
              if (typeof onStatus === 'function') onStatus(nextStatus, resp);
            })
            .catch((err) => {
              const status = err?.status;
              const details = err?.details || {};
              if (status === 503 && (details?.error === 'NO_ACCESS_TOKEN')) {
                setError('Configuração do Mercado Pago ausente. Contate o suporte.');
              } else if (status === 502 && details?.error === 'NETWORK_ERROR') {
                setError('Falha de rede ao contatar o Mercado Pago. Tente novamente.');
              } else if (status === 502 && (details?.mp_status || details?.message)) {
                const msg = details?.message ? String(details.message) : 'Verifique os dados e tente novamente.';
                setError(`Pagamento não foi criado (${details?.mp_status || 'erro'}: ${msg})`);
              } else if (status === 400 && Array.isArray(details?.cause)) {
                const cause2056 = details.cause.find(c => String(c?.code) === '2056');
                if (cause2056) {
                  setError('Ajustamos o modo binário. Tente novamente.');
                } else {
                  setError('Dados incompletos do cartão. Verifique e reenvie.');
                }
              } else if (status === 400) {
                const msg = details?.message ? String(details.message) : 'Dados incompletos do cartão. Verifique e reenvie.';
                setError(msg);
              } else {
                setError(err?.message || 'Falha ao processar pagamento');
              }
              throw err;
            })
            .finally(() => setLoading(false));
        },
        onError: (err) => {
          setError(err?.message || 'Erro no componente de pagamento');
        },
      },
    };

    bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', settings)
      .then(ctrl => { controllerRef.current = ctrl; })
      .catch(err => setError(err?.message || 'Falha ao criar Brick de cartão'));

    return () => {
      try { controllerRef.current?.destroy(); } catch (e) { console.debug('Falha ao destruir brick de cartão', e); }
    };
  }, [ready, amount, appId, onStatus, description, user]);

  const handlePayClick = () => {
    setError('');
    if (!ready) {
      setError('Componente de pagamento ainda não está pronto');
      return;
    }
    if (!controllerRef.current) {
      setError('Brick de pagamento não inicializado');
      return;
    }
    if (typeof controllerRef.current.submit === 'function') {
      try {
        setLoading(true);
        controllerRef.current.submit();
      } catch {
        setLoading(false);
        setError('Falha ao enviar pagamento');
      }
    } else {
      setError('Use o botão dentro do formulário do cartão para pagar');
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <h3 className="title" style={{ fontSize:'1rem' }}>Cartão de crédito / débito</h3>
      {error && <p role="alert" style={{ color:'#FF6B6B' }}>❌ {error}</p>}
      <div id="cardPaymentBrick_container" ref={containerRef} />
      {showPayButton && (
        <div style={{ marginTop: 12, display:'flex', gap:8 }}>
          <button
            type="button"
            onClick={handlePayClick}
            disabled={!ready || loading || !controllerRef.current}
            style={{
              padding:'8px 12px',
              borderRadius:6,
              border:'1px solid #2f3542',
              background:'#1e272e',
              color:'#f1f2f6',
              cursor: (!ready || loading || !controllerRef.current) ? 'not-allowed' : 'pointer',
              ...(buttonStyle || {})
            }}
          >
            {loading ? 'Processando…' : payButtonLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default CardDirectPayment;