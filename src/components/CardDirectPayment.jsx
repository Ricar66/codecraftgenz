// src/components/CardDirectPayment.jsx
import { initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useRef, useState } from 'react';

import { createDirectPayment } from '../services/appsAPI.js';

const CardDirectPayment = ({ appId, amount, onStatus, showPayButton = true, payButtonLabel = 'Pagar agora', buttonStyle }) => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const maxWaitMs = 15000; // aguarda até 15s (fallback manual pode demorar mais)
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
      // Se ainda não disponível aqui, deixa o efeito inicial cuidar do erro
      return;
    }

    const bricksBuilder = mp.bricks();
    const settings = {
      initialization: {
        amount: Number(amount || 0),
        payer: { email: '' },
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
        onReady: () => {
          // Brick pronto
        },
        onSubmit: (cardFormData) => {
          setLoading(true);
          setError('');
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
          const payload = {
            token: cardFormData.token,
            payment_method_id: paymentMethodId,
            ...(issuerId ? { issuer_id: issuerId } : {}),
            installments: Number(cardFormData.installments || 1),
            payer: { email: cardFormData.payer?.email || '' },
          };
          return createDirectPayment(appId, payload)
            .then((resp) => {
              const nextStatus = resp?.status || resp?.data?.status || 'pending';
              if (typeof onStatus === 'function') onStatus(nextStatus, resp);
            })
            .catch((err) => {
              setError(err?.message || 'Falha ao processar pagamento');
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
      try { controllerRef.current?.destroy(); } catch { /* noop */ }
    };
  }, [ready, amount, appId, onStatus]);

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
    // Alguns Bricks expõem submit(); se não existir, mostramos instrução ao usuário
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