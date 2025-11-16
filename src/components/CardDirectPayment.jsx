// src/components/CardDirectPayment.jsx
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../context/useAuth.js';

const CardDirectPayment = ({ amount, onPaymentSuccess, buyer = {}, cardholderEmail, identificationType, identificationNumber, cardholderName }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const buyerInfo = React.useMemo(() => ({
    email: buyer?.email || cardholderEmail || user?.email,
    docType: buyer?.docType || identificationType || 'CPF',
    docNumber: buyer?.docNumber || identificationNumber,
    name: buyer?.name || cardholderName,
    phone: buyer?.phone,
    streetName: buyer?.streetName,
    zip: buyer?.zip,
  }), [buyer?.email, buyer?.docType, buyer?.docNumber, buyer?.name, buyer?.phone, buyer?.streetName, buyer?.zip, cardholderEmail, identificationType, identificationNumber, cardholderName, user?.email]);

  // Inicializa SDK JS v2 e aguarda disponibilidade de window.MercadoPago
  useEffect(() => {
    const envFlag = String(import.meta.env.VITE_MP_ENV || import.meta.env.MP_ENV || '').toLowerCase();
    const PK = (
      import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
      (envFlag === 'production' ? import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_PROD : import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_SANDBOX)
    );

    if (import.meta.env.MODE === 'test') {
      setReady(true);
      return () => {};
    }

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

    const bootstrap = async () => {
      try {
        let key = PK;
        if (!key) {
          try {
            const resp = await fetch('/api/config/mp-public-key');
            if (resp.ok) {
              const json = await resp.json();
              key = json?.public_key || '';
            }
          } catch (e) {
            console.warn('Falha ao buscar mp-public-key do servidor:', e);
          }
        }
        if (key) {
          initMercadoPago(key, { locale: 'pt-BR' });
          await ensureMpSdk();
          await waitForSDK();
          setReady(true);
        } else {
          setError('Chave pública do Mercado Pago não configurada');
        }
      } catch {
        setError('Falha ao inicializar Mercado Pago');
      }
    };
    bootstrap();

    return () => { cancelled = true; };
  }, []);

  const initialization = {
    amount: Number(amount || 0),
    payer: {
      email: buyerInfo.email || cardholderEmail,
      identification: {
        type: identificationType || buyerInfo.docType || 'CPF',
        number: identificationNumber || buyerInfo.docNumber,
      },
    },
  };

  const onSubmit = async (formData) => {
    try {
      setError('');
      const txAmount = Number(amount || 0);
      if (!Number.isFinite(txAmount) || txAmount <= 0) throw new Error('Valor de pagamento inválido.');
      console.log('Dados do pagamento a enviar para o backend:', formData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (typeof onPaymentSuccess === 'function') onPaymentSuccess({ status: 'approved', data: { status_detail: 'approved' } });
    } catch (error) {
      setError(error?.message || 'Erro ao processar pagamento');
    }
  };

  const onError = (error) => { setError(error?.message || 'Erro no componente de pagamento'); };
  const onReady = () => {};

  const paymentBrickCustomization = {
    texts: {
      formTitle: 'Dados do Cartão',
      installmentsSectionTitle: 'Escolha as parcelas',
      cardholderName: { label: 'Nome impresso no cartão', placeholder: 'Ex: João M. da Silva' },
      cardholderIdentification: { label: 'CPF do titular do cartão' },
      cardNumber: { label: 'Número do cartão' },
      expirationDate: { label: 'Vencimento (MM/AA)' },
      securityCode: { label: 'Cód. de segurança (CVV)' },
      formSubmit: 'Pagar Agora',
    },
    visual: { style: { theme: 'dark' } },
    paymentMethods: { maxInstallments: 1 },
  };

  

  return (
    <div style={{ marginTop: 12 }}>
      <h3 className="title" style={{ fontSize:'1rem' }}>Cartão de crédito / débito</h3>
      {error && <p role="alert" style={{ color:'#FF6B6B' }}>❌ {error}</p>}
      {ready && (
        <CardPayment
          initialization={initialization}
          customization={paymentBrickCustomization}
          onSubmit={onSubmit}
          onError={onError}
          onReady={onReady}
        />
      )}
    </div>
  );
};

export default CardDirectPayment;