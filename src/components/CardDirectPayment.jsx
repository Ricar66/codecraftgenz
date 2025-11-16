// src/components/CardDirectPayment.jsx
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../context/useAuth.js';
import { createDirectPayment } from '../services/appsAPI.js';

const CardDirectPayment = ({ appId, amount, description = 'Compra de aplicativo', onStatus, buyer = {}, cardholderEmail, identificationType, identificationNumber, cardholderName }) => {
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

  const onSubmit = (cardFormData) => {
    
    setError('');
    const txAmount = Number(amount || 0);
    if (!Number.isFinite(txAmount) || txAmount <= 0) {
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
            setError('Preencha os dados do cartão e use o botão do formulário para enviar');
            throw new Error('missing payment_method_id');
    }
    if (!cardFormData?.token) {
            setError('Token do cartão não foi gerado. Verifique os dados e tente novamente.');
            throw new Error('missing card token');
    }
    const payerEmail = (
      cardFormData?.payer?.email ??
      cardFormData?.cardholderEmail ??
      buyerInfo.email ??
      user?.email ??
      undefined
    );
    const payerIdentification = (() => {
      const idObj = cardFormData?.payer?.identification;
      const type = idObj?.type ?? cardFormData?.identificationType;
      const number = idObj?.number ?? cardFormData?.identificationNumber;
      const fallbackType = buyerInfo.docType;
      const fallbackNumber = buyerInfo.docNumber;
      const t = type || fallbackType;
      const n = number || fallbackNumber;
      return (t && n) ? { type: t, number: n } : undefined;
    })();
    const payerNameRaw = (
      cardFormData?.payer?.first_name ??
      cardFormData?.cardholder?.name ??
      buyerInfo.name ??
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
      binary_mode: false,
      capture: true,
      transaction_amount: txAmount,
      description: String(description || ''),
      ...(payerEmail || payerIdentification || payerFirstName ? { payer: { ...(payerEmail ? { email: payerEmail } : {}), ...(payerFirstName ? { first_name: payerFirstName } : {}), ...(payerLastName ? { last_name: payerLastName } : {}), ...(payerIdentification ? { identification: payerIdentification } : {}) } } : {}),
      additional_info: {
        items: [{ id: String(appId || ''), title: String(description || ''), quantity: 1, unit_price: txAmount }],
        payer: {
          phone: buyerInfo.phone ? { number: String(buyerInfo.phone) } : undefined,
          address: (buyerInfo.zip || buyerInfo.streetName) ? { zip_code: String(buyerInfo.zip || ''), street_name: String(buyerInfo.streetName || '') } : undefined,
        }
      },
      metadata: {
        cardholder_name: (cardFormData?.cardholder?.name || undefined),
        cardholder_identification_type: ((payerIdentification && payerIdentification.type) ? String(payerIdentification.type) : undefined),
        cardholder_identification_number: ((payerIdentification && payerIdentification.number) ? String(payerIdentification.number) : undefined),
      }
    };
    return createDirectPayment(appId, payload)
      .then((resp) => {
        try { console.log('Pagamento direto (resp):', resp); } catch (e) { console.debug('Falha ao logar resposta de pagamento', e); }
        const nextStatus = resp?.status || resp?.data?.status || 'pending';
        const friendly = resp?.friendly_message || resp?.normalized?.mensagem_usuario || '';
        if (typeof onStatus === 'function') onStatus(nextStatus, resp);
        if (!onStatus && nextStatus !== 'approved' && friendly) {
          setError(friendly);
        }
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
        if (import.meta.env.MODE !== 'test') {
          throw err;
        }
      });
  };

  const customization = {
    texts: {
      formTitle: 'Dados do Cartão',
      installmentsSectionTitle: 'Escolha as parcelas',
      formSubmit: 'Pagar Agora',
    },
    visual: { style: { theme: 'dark' } },
    paymentMethods: { maxInstallments: 1 },
  };

  const payerInit = (() => {
    const email = buyerInfo.email;
    const idType = buyerInfo.docType;
    const idNum = buyerInfo.docNumber;
    const ident = (idType && idNum) ? { type: idType, number: idNum } : undefined;
    return (email || ident) ? { email, ...(ident ? { identification: ident } : {}) } : undefined;
  })();

  return (
    <div style={{ marginTop: 12 }}>
      <h3 className="title" style={{ fontSize:'1rem' }}>Cartão de crédito / débito</h3>
      {error && <p role="alert" style={{ color:'#FF6B6B' }}>❌ {error}</p>}
      {ready && (
        <CardPayment
          initialization={{ amount: Number(amount || 0), ...(payerInit ? { payer: payerInit } : {}) }}
          customization={customization}
          onSubmit={onSubmit}
          onReady={() => {}}
          onError={(err) => setError(err?.message || 'Erro no componente de pagamento')}
        />
      )}
    </div>
  );
};

export default CardDirectPayment;