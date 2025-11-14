// src/components/CardDirectPayment.jsx
import { initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useRef, useState } from 'react';

import { createDirectPayment } from '../services/appsAPI.js';

const CardDirectPayment = ({ appId, amount, onStatus }) => {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Inicializa SDK JS v2
  useEffect(() => {
    const PK = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || import.meta.env.MERCADO_PAGO_PUBLIC_KEY;
    try {
      if (PK) {
        initMercadoPago(PK, { locale: 'pt-BR' });
        setReady(true);
      } else {
        setError('Chave pública do Mercado Pago não configurada');
      }
    } catch {
      setError('Falha ao inicializar Mercado Pago');
    }
  }, []);

  // Renderiza o Brick cardPayment
  useEffect(() => {
    const PK = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || import.meta.env.MERCADO_PAGO_PUBLIC_KEY;
    if (!ready || !containerRef.current || !PK) return;

    const mp = window.MercadoPago ? new window.MercadoPago(PK, { locale: 'pt-BR' }) : null;
    if (!mp) {
      setError('SDK do Mercado Pago indisponível');
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
          const payload = {
            token: cardFormData.token,
            payment_method_id: cardFormData.paymentMethodId,
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
      try { controllerRef.current?.destroy(); } catch (err) { void err; }
    };
  }, [ready, amount, appId, onStatus]);

  return (
    <div style={{ marginTop: 12 }}>
      <h3 className="title" style={{ fontSize:'1rem' }}>Cartão de crédito / débito</h3>
      {error && <p role="alert" style={{ color:'#FF6B6B' }}>❌ {error}</p>}
      <div id="cardPaymentBrick_container" ref={containerRef} />
    </div>
  );
};

export default CardDirectPayment;