// src/components/CardDirectPayment.jsx
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../context/useAuth.js';
import { createDirectPayment } from '../services/appsAPI.js';

const CardDirectPayment = ({ appId, amount, description = 'Compra de aplicativo', onPaymentSuccess, buyer = {}, cardholderEmail, identificationType, identificationNumber, cardholderName }) => {
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
      const payerEmail = formData?.payer?.email || formData?.cardholderEmail || buyerInfo.email || cardholderEmail || undefined;
      const idObj = formData?.payer?.identification || {};
      const type = idObj?.type || formData?.identificationType || buyerInfo.docType || identificationType || 'CPF';
      const number = idObj?.number || formData?.identificationNumber || buyerInfo.docNumber || identificationNumber || undefined;
      const payload = {
        token: formData?.token,
        payment_method_id: formData?.payment_method_id || formData?.paymentMethodId || formData?.paymentMethod?.id,
        ...(formData?.issuer_id ? { issuer_id: formData.issuer_id } : {}),
        installments: Number(formData?.installments || 1),
        binary_mode: false,
        capture: true,
        transaction_amount: txAmount,
        description: String(description || ''),
        ...(payerEmail || (type && number) ? { payer: { ...(payerEmail ? { email: payerEmail } : {}), identification: (type && number) ? { type, number } : undefined } } : {}),
        additional_info: {
          items: [{ id: String(appId || ''), title: String(description || ''), quantity: 1, unit_price: txAmount }],
          payer: {
            phone: buyerInfo.phone ? { number: String(buyerInfo.phone) } : undefined,
            address: (buyerInfo.zip || buyerInfo.streetName) ? { zip_code: String(buyerInfo.zip || ''), street_name: String(buyerInfo.streetName || '') } : undefined,
          }
        },
      };
      const resp = await createDirectPayment(appId, payload);
      const nextStatus = resp?.status || resp?.data?.status || 'pending';
      if (nextStatus === 'approved' && typeof onPaymentSuccess === 'function') onPaymentSuccess(resp);
      else if (nextStatus !== 'approved') {
        const friendly = resp?.friendly_message || resp?.normalized?.mensagem_usuario || '';
        if (friendly) setError(friendly);
      }
    } catch (error) {
      const status = error?.status;
      const details = error?.details || {};
      if (status === 503 && (details?.error === 'NO_ACCESS_TOKEN')) setError('Configuração do Mercado Pago ausente. Contate o suporte.');
      else if (status === 502 && details?.error === 'NETWORK_ERROR') setError('Falha de rede ao contatar o Mercado Pago. Tente novamente.');
      else if (status === 502 && (details?.mp_status || details?.message)) setError(`Pagamento não foi criado (${details?.mp_status || 'erro'}: ${String(details?.message || '')})`);
      else if (status === 400) setError(String(details?.message || 'Dados incompletos do cartão. Verifique e reenvie.'));
      else setError(error?.message || 'Falha ao processar pagamento');
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