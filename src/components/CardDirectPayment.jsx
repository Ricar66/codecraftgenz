// src/components/CardDirectPayment.jsx
import { CardPayment, initMercadoPago, getPaymentMethods } from '@mercadopago/sdk-react';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../context/useAuth.js';
import { apiRequest } from '../lib/apiConfig.js';
import { createDirectPayment } from '../services/appsAPI.js';
import { loadMercadoPagoSDK } from '../utils/loadMercadoPagoSDK.js';

const CardDirectPayment = ({ appId, amount, description = 'Compra de aplicativo', onPaymentSuccess, onStatus, buyer = {}, cardholderEmail, identificationType, identificationNumber, cardholderName, deviceId }) => {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
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

  // Inicializa SDK React apenas uma vez - agora com lazy loading do SDK JS
  useEffect(() => {
    const envFlag = String(import.meta.env.VITE_MP_ENV || import.meta.env.MP_ENV || '').toLowerCase();
    const PK = (
      import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
      (envFlag === 'production' ? import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_PROD : import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_SANDBOX)
    );
    if (import.meta.env.MODE === 'test') { setReady(true); setLoading(false); return; }

    (async () => {
      try {
        // Primeiro, carrega o SDK JS do MercadoPago de forma lazy
        await loadMercadoPagoSDK();

        let key = PK;
        if (!key) {
          try {
            const json = await apiRequest('/api/config/mp-public-key', { method: 'GET' });
            key = json?.public_key || json?.data?.public_key || '';
          } catch { /* fallback: sem chave */ }
        }
        if (key) {
          if (!window.__MP_INIT_DONE) { initMercadoPago(key, { locale: 'pt-BR' }); window.__MP_INIT_DONE = true; }
          setReady(true);
        } else {
          setError('Chave pública do Mercado Pago não configurada');
        }
      } catch (err) {
        setError(err?.message || 'Falha ao inicializar Mercado Pago');
      } finally {
        setLoading(false);
      }
    })();
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
      const dev = import.meta.env.MODE !== 'production';
      if (dev) { try { console.log('MP CardPayment formData', formData); } catch { /* noop */ } }
      setError('');
      const txAmount = Number(amount || 0);
      if (!Number.isFinite(txAmount) || txAmount <= 0) throw new Error('Valor de pagamento inválido.');
      const payerEmail = formData?.payer?.email || formData?.cardholderEmail || buyerInfo.email || cardholderEmail || undefined;
      const idObj = formData?.payer?.identification || {};
      const type = idObj?.type || formData?.identificationType || buyerInfo.docType || identificationType || 'CPF';
      const number = idObj?.number || formData?.identificationNumber || buyerInfo.docNumber || identificationNumber || undefined;
      const holderNameRaw = (formData?.cardholder?.name || buyerInfo.name || '').trim();
      const holderParts = holderNameRaw ? holderNameRaw.split(/\s+/) : [];
      const firstName = holderParts[0] || undefined;
      const lastName = holderParts.length > 1 ? holderParts.slice(1).join(' ') : undefined;
      let paymentMethodId = formData?.payment_method_id || formData?.paymentMethodId || formData?.paymentMethod?.id;
      if (!paymentMethodId) {
        const bin = formData?.bin || (formData?.card?.bin);
        if (bin && String(bin).length >= 6) {
          const methods = await getPaymentMethods({ bin: String(bin).slice(0, 6) });
          if (Array.isArray(methods) && methods[0]?.id) paymentMethodId = methods[0].id;
        }
      }
      if (!paymentMethodId) throw { status: 400, details: { message: 'payment_method_id é obrigatório (ex.: master, visa, pix, ticket)' } };
      if (!payerEmail) throw { status: 400, details: { message: 'E-mail do pagador é obrigatório' } };
      if (!firstName) throw { status: 400, details: { message: 'Nome do titular do cartão é obrigatório' } };
      if (!number) throw { status: 400, details: { message: 'CPF/CNPJ do titular é obrigatório' } };

      const payload = {
        token: formData?.token,
        payment_method_id: paymentMethodId,
        ...(formData?.issuer_id ? { issuer_id: formData.issuer_id } : {}),
        installments: Number(formData?.installments || 1),
        binary_mode: false,
        capture: true,
        transaction_amount: txAmount,
        description: String(description || ''),
        payer: {
          email: payerEmail,
          first_name: firstName,
          ...(lastName ? { last_name: lastName } : {}),
          identification: { type, number },
        },
        additional_info: {
          items: [{ id: String(appId || ''), title: String(description || ''), quantity: 1, unit_price: txAmount }],
          payer: {
            phone: buyerInfo.phone ? { number: String(buyerInfo.phone) } : undefined,
            address: (buyerInfo.zip || buyerInfo.streetName) ? { zip_code: String(buyerInfo.zip || ''), street_name: String(buyerInfo.streetName || '') } : undefined,
          }
        },
        metadata: {
          cardholder_name: holderNameRaw || undefined,
          cardholder_identification_type: (type ? String(type) : undefined),
          cardholder_identification_number: (number ? String(number) : undefined),
        }
      };
      if (dev) { try { console.log('Direct payment payload', payload); } catch { /* noop */ } }
      const extra = deviceId ? { deviceId } : (typeof window !== 'undefined' && (window.MP_DEVICE_SESSION_ID || window.__MP_DEVICE_ID)) ? { deviceId: (window.MP_DEVICE_SESSION_ID || window.__MP_DEVICE_ID) } : undefined;
      const resp = await createDirectPayment(appId, payload, extra);
      const nextStatus = resp?.status || resp?.data?.status || 'pending';
      if (typeof onStatus === 'function') onStatus(resp);
      if (nextStatus === 'approved' && typeof onPaymentSuccess === 'function') onPaymentSuccess(resp);
      else if (nextStatus !== 'approved') {
        const friendly = resp?.friendly_message || resp?.normalized?.mensagem_usuario || '';
        const det = resp?.status_detail || resp?.data?.status_detail || '';
        if (String(nextStatus) === 'rejected') setError(`Pagamento rejeitado${det ? ` (${det})` : ''}`);
        else if (friendly) setError(friendly);
        else setError('Dados incompletos do cartão. Verifique e reenvie.');
      }
    } catch (error) {
      const dev = import.meta.env.MODE !== 'production';
      if (dev) { try { console.error('Direct payment error', error); } catch { /* noop */ } }
      const status = error?.status;
      const details = error?.details || {};
      if (status === 503 && (details?.error === 'NO_ACCESS_TOKEN')) setError('Configuração do Mercado Pago ausente. Contate o suporte.');
      else if (status === 502 && details?.error === 'NETWORK_ERROR') setError('Falha de rede ao contatar o Mercado Pago. Tente novamente.');
      else if (status === 502 && (details?.mp_status || details?.message)) setError(`Pagamento não foi criado (${details?.mp_status || 'erro'}: ${String(details?.message || '')})`);
      else if (status === 400 && Array.isArray(details?.cause) && details.cause.find(c => String(c?.code) === '2056')) setError('Ajustamos o modo binário. Tente novamente.');
      else if (status === 400) {
        const causeMsg = Array.isArray(details?.cause) ? (details.cause[0]?.message || details.cause[0]?.description) : '';
        setError(String(details?.message || causeMsg || 'Dados incompletos do cartão. Verifique e reenvie.'));
      }
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
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          <p>Carregando formulário de pagamento...</p>
        </div>
      )}
      {ready && !loading && (
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
