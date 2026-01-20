// src/components/WalletBrick.jsx
// Wallet Brick visual - botão estilizado para pagamento com conta Mercado Pago
import { Wallet, initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useState } from 'react';

import { apiRequest } from '../lib/apiConfig.js';
import { createPaymentPreference } from '../services/appsAPI.js';
import { loadMercadoPagoSDK } from '../utils/loadMercadoPagoSDK.js';

const WalletBrick = ({
  appId,
  amount,
  buyer = {},
  preferenceId: externalPreferenceId,
  onReady: onReadyCallback,
  onError: onErrorCallback,
  // Customização visual
  valueProp = 'practicality', // 'practicality' | 'convenience' | 'security' | 'smart_option'
  valuePropColor = 'grey', // 'grey' | 'white'
  buttonBackground = 'default', // 'default' | 'black' | 'blue' | 'white'
  buttonHeight = '48px',
  borderRadius = '6px',
}) => {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preferenceId, setPreferenceId] = useState(externalPreferenceId || '');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      setReady(true);
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

        // Cria preferência se não foi passada externamente
        if (!externalPreferenceId) {
          try {
            const pref = await createPaymentPreference(appId, {
              email: buyer?.email,
              name: buyer?.name,
            });
            const prefId = pref?.id || pref?.data?.id || pref?.preference_id || '';
            if (prefId) {
              setPreferenceId(prefId);
            } else {
              throw new Error('Não foi possível criar preferência');
            }
          } catch (prefError) {
            console.error('Erro ao criar preferência:', prefError);
            setError('Não foi possível configurar pagamento com Mercado Pago');
            setLoading(false);
            return;
          }
        }

        setReady(true);
      } catch (err) {
        setError(err?.message || 'Falha ao inicializar Wallet Brick');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [appId, buyer?.email, buyer?.name, externalPreferenceId]);

  const initialization = {
    preferenceId: preferenceId,
    redirectMode: 'modal', // 'modal' abre em popup, 'blank' abre em nova aba, 'self' redireciona na mesma página
  };

  const customization = {
    texts: {
      action: 'pay', // 'pay' | 'buy'
      valueProp: valueProp,
    },
    visual: {
      buttonBackground: buttonBackground,
      buttonHeight: buttonHeight,
      borderRadius: borderRadius,
      valuePropColor: valuePropColor,
    },
    checkout: {
      theme: {
        elementsColor: '#00e4f2',
        headerColor: '#1a1a2e',
      },
    },
  };

  const onReady = () => {
    if (typeof onReadyCallback === 'function') onReadyCallback();
  };

  const onError = (err) => {
    const msg = err?.message || 'Erro no Wallet Brick';
    setError(msg);
    if (typeof onErrorCallback === 'function') onErrorCallback(err);
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
        <p style={{ fontSize: '0.9rem' }}>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '12px', textAlign: 'center' }}>
        <p style={{ color: '#FF6B6B', fontSize: '0.9rem' }}>❌ {error}</p>
      </div>
    );
  }

  if (!preferenceId) {
    return (
      <div style={{ padding: '12px', textAlign: 'center' }}>
        <p style={{ color: '#999', fontSize: '0.9rem' }}>
          Preencha seus dados para habilitar o pagamento com Mercado Pago
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      {ready && preferenceId && (
        <Wallet
          initialization={initialization}
          customization={customization}
          onReady={onReady}
          onError={onError}
        />
      )}
    </div>
  );
};

export default WalletBrick;
