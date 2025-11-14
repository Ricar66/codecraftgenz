// src/components/CardDirectPayment.jsx
import { initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useRef, useState } from 'react';

import { createDirectPayment } from '../services/appsAPI.js';

const CardDirectPayment = ({ appId, amount, onStatus }) => {
  const formRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (!ready || !formRef.current) return;
    // Usa o objeto global após initMercadoPago
    const mp = window.MercadoPago ? new window.MercadoPago(
      import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || import.meta.env.MERCADO_PAGO_PUBLIC_KEY,
      { locale: 'pt-BR' }
    ) : null;

    if (!mp) {
      setError('SDK do Mercado Pago indisponível');
      return;
    }

    const cardForm = mp.cardForm({
      amount: String(Number(amount || 0).toFixed(2)),
      iframe: true,
      form: {
        id: 'form-checkout',
        cardholderName: { id: 'form-checkout__cardholderName' },
        cardholderEmail: { id: 'form-checkout__cardholderEmail' },
        cardNumber: { id: 'form-checkout__cardNumber' },
        cardExpirationMonth: { id: 'form-checkout__cardExpirationMonth' },
        cardExpirationYear: { id: 'form-checkout__cardExpirationYear' },
        securityCode: { id: 'form-checkout__securityCode' },
        installments: { id: 'form-checkout__installments' },
        identificationType: { id: 'form-checkout__identificationType' },
        identificationNumber: { id: 'form-checkout__identificationNumber' },
        issuer: { id: 'form-checkout__issuer' },
      },
      callbacks: {
        onSubmit: async (event) => {
          event.preventDefault();
          setLoading(true);
          setError('');
          try {
            const data = cardForm.getCardFormData();
            const payload = {
              token: data.token,
              payment_method_id: data.paymentMethodId, // ex.: 'visa', 'master'
              installments: Number(data.installments || 1),
              payer: {
                email: data.cardholderEmail,
                name: data.cardholderName,
                identification: data.identificationType && data.identificationNumber ? {
                  type: data.identificationType,
                  number: data.identificationNumber,
                } : undefined,
              }
            };

            const resp = await createDirectPayment(appId, payload);
            const nextStatus = resp?.status || resp?.data?.status || 'pending';
            if (typeof onStatus === 'function') onStatus(nextStatus, resp);
          } catch (err) {
            setError(err?.message || 'Falha ao processar pagamento');
          } finally {
            setLoading(false);
          }
        },
        onFetching: () => setLoading(true),
      },
    });

    return () => {
      try { cardForm?.destroy(); } catch (err) { void err; }
    };
  }, [ready, amount, appId, onStatus]);

  return (
    <div style={{ marginTop: 12 }}>
      <h3 className="title" style={{ fontSize:'1rem' }}>Pagamento com Cartão (Direto)</h3>
      {error && <p role="alert" style={{ color:'#FF6B6B' }}>❌ {error}</p>}
      <form id="form-checkout" ref={formRef} style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(220px, 1fr))', gap:8 }}>
        <label>
          Nome impresso
          <input id="form-checkout__cardholderName" />
        </label>
        <label>
          E-mail
          <input id="form-checkout__cardholderEmail" type="email" />
        </label>
        <label>
          Número do cartão
          <input id="form-checkout__cardNumber" />
        </label>
        <label>
          Mês expiração
          <input id="form-checkout__cardExpirationMonth" />
        </label>
        <label>
          Ano expiração
          <input id="form-checkout__cardExpirationYear" />
        </label>
        <label>
          Código de segurança
          <input id="form-checkout__securityCode" />
        </label>
        <label>
          Parcelas
          <select id="form-checkout__installments"></select>
        </label>
        <label>
          Emissor
          <select id="form-checkout__issuer"></select>
        </label>
        <label>
          Tipo documento
          <select id="form-checkout__identificationType"></select>
        </label>
        <label>
          Documento
          <input id="form-checkout__identificationNumber" />
        </label>
        <div style={{ gridColumn:'1 / -1', display:'flex', gap:8, marginTop:8 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processando…' : 'Pagar agora'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CardDirectPayment;