// src/components/StatusScreenBrick.jsx
// Status Screen Brick - mostra o status visual do pagamento
import { StatusScreen, initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useState } from 'react';

import { apiRequest } from '../lib/apiConfig.js';
import { loadMercadoPagoSDK } from '../utils/loadMercadoPagoSDK.js';

const StatusScreenBrick = ({
  paymentId,
  onReady: onReadyCallback,
  onError: onErrorCallback,
}) => {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      setReady(true);
      setLoading(false);
      return;
    }

    if (!paymentId) {
      setError('ID do pagamento não fornecido');
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        // Carrega o SDK JS do MercadoPago
        await loadMercadoPagoSDK();

        // Obtém a public key
        const envFlag = String(import.meta.env.VITE_MP_ENV || '').toLowerCase();
        let publicKey = (
          import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
          (envFlag === 'production'
            ? import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_PROD
            : import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_SANDBOX)
        );

        if (!publicKey) {
          try {
            const json = await apiRequest('/api/config/mp-public-key', { method: 'GET' });
            publicKey = json?.public_key || json?.data?.public_key || '';
          } catch {
            // fallback: sem chave
          }
        }

        if (!publicKey) {
          setError('Chave pública do Mercado Pago não configurada');
          setLoading(false);
          return;
        }

        // Inicializa SDK React apenas uma vez
        if (!window.__MP_INIT_DONE) {
          initMercadoPago(publicKey, { locale: 'pt-BR' });
          window.__MP_INIT_DONE = true;
        }

        setReady(true);
      } catch (err) {
        setError(err?.message || 'Falha ao inicializar Status Screen');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [paymentId]);

  const initialization = {
    paymentId: String(paymentId),
  };

  const customization = {
    visual: {
      style: {
        theme: 'dark',
      },
      hideStatusDetails: false,
      hideTransactionDate: false,
      showExternalReference: true,
    },
  };

  const onReady = () => {
    if (typeof onReadyCallback === 'function') onReadyCallback();
  };

  const onError = (err) => {
    const msg = err?.message || 'Erro no Status Screen';
    setError(msg);
    if (typeof onErrorCallback === 'function') onErrorCallback(err);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
        <p>Carregando status do pagamento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#FF6B6B' }}>❌ {error}</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      {ready && paymentId && (
        <StatusScreen
          initialization={initialization}
          customization={customization}
          onReady={onReady}
          onError={onError}
        />
      )}
    </div>
  );
};

export default StatusScreenBrick;
