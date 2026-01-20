// src/components/PaymentBrick.jsx
// Payment Brick completo - combina todos os métodos de pagamento (cartão, PIX, boleto, Mercado Pago)
import { Payment, initMercadoPago } from '@mercadopago/sdk-react';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../context/useAuth.js';
import { apiRequest } from '../lib/apiConfig.js';
import { createDirectPayment, createPaymentPreference } from '../services/appsAPI.js';
import { loadMercadoPagoSDK } from '../utils/loadMercadoPagoSDK.js';

const PaymentBrick = ({
  appId,
  amount,
  quantity = 1,
  description = 'Compra de aplicativo',
  onPaymentSuccess,
  onStatus,
  onError,
  buyer = {},
  preferenceId: externalPreferenceId,
  maxInstallments = 4,
}) => {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preferenceId, setPreferenceId] = useState(externalPreferenceId || '');
  const { user } = useAuth();

  const buyerInfo = React.useMemo(() => ({
    email: buyer?.email || user?.email || '',
    name: buyer?.name || user?.name || '',
    docType: buyer?.docType || 'CPF',
    docNumber: buyer?.docNumber || '',
  }), [buyer, user]);

  // Inicializa SDK e cria preferência
  useEffect(() => {
    const dev = import.meta.env.MODE !== 'production';
    let cancelled = false;
    let initCompleted = false;

    if (import.meta.env.MODE === 'test') {
      setReady(true);
      setLoading(false);
      return;
    }

    // Timeout de segurança para não ficar carregando infinitamente
    const timeout = setTimeout(() => {
      if (!cancelled && !initCompleted) {
        console.warn('[PaymentBrick] Timeout de inicialização (15s). Tentando continuar...');
        setLoading(false);
        setReady(true); // Tenta renderizar mesmo assim
      }
    }, 15000);

    const init = async () => {
      try {
        if (dev) console.log('[PaymentBrick] Iniciando inicialização...');

        // Carrega o SDK JS do MercadoPago
        if (dev) console.log('[PaymentBrick] Carregando SDK...');
        try {
          await loadMercadoPagoSDK();
          if (dev) console.log('[PaymentBrick] SDK carregado.');
        } catch (sdkError) {
          console.error('[PaymentBrick] Erro ao carregar SDK:', sdkError);
          // Continua mesmo com erro - o componente Payment pode ter fallback
        }

        if (cancelled) return;

        // Obtém a public key
        const envFlag = String(import.meta.env.VITE_MP_ENV || '').toLowerCase();
        let publicKey = (
          import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
          (envFlag === 'production'
            ? import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_PROD
            : import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_SANDBOX)
        );

        if (dev) console.log('[PaymentBrick] Public key from env:', publicKey ? 'presente' : 'ausente');

        // Verifica se a chave local parece ser placeholder
        const isLocalPlaceholder = !publicKey || publicKey.includes('xxxx') || publicKey.includes('XXXX');

        // Se não tem chave ou parece placeholder, tenta buscar do backend
        if (!publicKey || isLocalPlaceholder) {
          try {
            if (dev) console.log('[PaymentBrick] Buscando public key da API...');
            const json = await apiRequest('/api/config/mp-public-key', { method: 'GET' });
            // Backend retorna: { success: true, data: { publicKey: '...' } }
            const apiKey = json?.data?.publicKey || json?.publicKey || json?.public_key || json?.data?.public_key || '';
            if (apiKey && !apiKey.includes('xxxx') && !apiKey.includes('XXXX')) {
              publicKey = apiKey;
              if (dev) console.log('[PaymentBrick] Public key obtida da API.');
            } else {
              if (dev) console.log('[PaymentBrick] Public key da API também é inválida:', apiKey ? 'presente' : 'ausente');
            }
          } catch (apiErr) {
            if (dev) console.warn('[PaymentBrick] Erro ao buscar public key:', apiErr);
          }
        }

        if (cancelled) return;

        // Verifica se a chave é válida (não é placeholder)
        const isPlaceholder = !publicKey || publicKey.includes('xxxx') || publicKey.includes('XXXX') || publicKey.length < 20;
        if (isPlaceholder) {
          if (dev) console.warn('[PaymentBrick] Chave pública parece ser placeholder ou inválida:', publicKey);
          setError('Chave pública do Mercado Pago não configurada corretamente. Em desenvolvimento, configure VITE_MERCADO_PAGO_PUBLIC_KEY no arquivo .env');
          setLoading(false);
          return;
        }

        // Inicializa SDK React apenas uma vez
        if (!window.__MP_INIT_DONE) {
          if (dev) console.log('[PaymentBrick] Inicializando SDK React...');
          try {
            initMercadoPago(publicKey, { locale: 'pt-BR' });
            window.__MP_INIT_DONE = true;
            if (dev) console.log('[PaymentBrick] SDK React inicializado.');
          } catch (initErr) {
            console.error('[PaymentBrick] Erro ao inicializar SDK React:', initErr);
            // Continua - pode já estar inicializado
          }
        } else {
          if (dev) console.log('[PaymentBrick] SDK React já estava inicializado.');
        }

        if (cancelled) return;

        // Cria preferência se não foi passada externamente
        // A preferência é necessária para métodos como Mercado Pago Wallet e Parcelamento sem cartão
        if (!externalPreferenceId && buyerInfo.email) {
          try {
            if (dev) console.log('[PaymentBrick] Criando preferência para:', buyerInfo.email);
            const pref = await createPaymentPreference(appId, {
              email: buyerInfo.email,
              name: buyerInfo.name,
            });
            if (cancelled) return;
            if (dev) console.log('[PaymentBrick] Preferência criada:', pref);
            const prefId = pref?.id || pref?.data?.id || pref?.preference_id || '';
            if (prefId) {
              setPreferenceId(prefId);
              if (dev) console.log('[PaymentBrick] Preference ID:', prefId);
            }
          } catch (prefError) {
            console.warn('[PaymentBrick] Não foi possível criar preferência:', prefError);
            // Continua sem preferência - alguns métodos não funcionarão
          }
        } else {
          if (dev) console.log('[PaymentBrick] Pulando criação de preferência. ExternalPrefId:', externalPreferenceId, 'Email:', buyerInfo.email);
        }

        if (cancelled) return;

        if (dev) console.log('[PaymentBrick] Marcando como ready.');
        setReady(true);
      } catch (err) {
        console.error('[PaymentBrick] Erro na inicialização:', err);
        if (!cancelled) {
          setError(err?.message || 'Falha ao inicializar Mercado Pago');
        }
      } finally {
        initCompleted = true;
        if (!cancelled) {
          if (dev) console.log('[PaymentBrick] Finalizando loading.');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [appId, buyerInfo.email, buyerInfo.name, externalPreferenceId]);

  const initialization = {
    amount: Number(amount || 0),
    ...(preferenceId ? { preferenceId } : {}),
    payer: {
      email: buyerInfo.email,
      firstName: buyerInfo.name?.split(' ')[0] || '',
      lastName: buyerInfo.name?.split(' ').slice(1).join(' ') || '',
      identification: {
        type: buyerInfo.docType || 'CPF',
        number: buyerInfo.docNumber || '',
      },
    },
  };

  const customization = {
    paymentMethods: {
      // Cartões
      creditCard: 'all',
      debitCard: 'all',
      // PIX
      bankTransfer: 'all',
      // Boleto
      ticket: 'all',
      // Mercado Pago (wallet, créditos)
      mercadoPago: preferenceId ? 'all' : [],
      // Limita parcelas
      maxInstallments: maxInstallments,
    },
    visual: {
      style: {
        theme: 'dark',
        customVariables: {
          formBackgroundColor: '#1a1a2e',
          baseColor: '#00e4f2',
        },
      },
      hideFormTitle: false,
      hidePaymentButton: false,
    },
  };

  const onSubmit = async ({ selectedPaymentMethod, formData }) => {
    try {
      setError('');
      const dev = import.meta.env.MODE !== 'production';
      if (dev) console.log('Payment Brick formData:', { selectedPaymentMethod, formData });

      // Para pagamentos com Mercado Pago (wallet), o redirecionamento é automático
      if (selectedPaymentMethod === 'wallet_purchase' || selectedPaymentMethod === 'onboarding_credits') {
        // O Brick já redireciona automaticamente
        return;
      }

      // Para outros métodos, processa via API
      const txAmount = Number(amount || 0);
      if (!Number.isFinite(txAmount) || txAmount <= 0) {
        throw new Error('Valor de pagamento inválido.');
      }

      const payerEmail = formData?.payer?.email || buyerInfo.email;
      if (!payerEmail) {
        throw new Error('E-mail do pagador é obrigatório');
      }

      // Limita parcelas ao máximo configurado
      const requestedInstallments = Number(formData?.installments || 1);
      const finalInstallments = Math.min(Math.max(1, requestedInstallments), maxInstallments);

      const payload = {
        token: formData?.token,
        payment_method_id: formData?.payment_method_id || selectedPaymentMethod,
        issuer_id: formData?.issuer_id,
        installments: finalInstallments,
        quantity: quantity, // Quantidade de licenças
        transaction_amount: txAmount,
        description: String(description || ''),
        payer: {
          email: payerEmail,
          first_name: formData?.payer?.first_name || buyerInfo.name?.split(' ')[0] || '',
          last_name: formData?.payer?.last_name || buyerInfo.name?.split(' ').slice(1).join(' ') || '',
          identification: formData?.payer?.identification || {
            type: buyerInfo.docType || 'CPF',
            number: buyerInfo.docNumber || '',
          },
        },
        // Dados específicos para PIX
        ...(selectedPaymentMethod === 'pix' ? {
          date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } : {}),
      };

      if (dev) console.log('Payment payload:', payload);

      const resp = await createDirectPayment(appId, payload);
      const nextStatus = resp?.status || resp?.data?.status || 'pending';

      if (typeof onStatus === 'function') onStatus(resp);

      if (nextStatus === 'approved') {
        if (typeof onPaymentSuccess === 'function') onPaymentSuccess(resp);
      } else if (nextStatus === 'pending' || nextStatus === 'in_process') {
        // Para PIX e boleto, mostra informações de pagamento
        if (typeof onPaymentSuccess === 'function') onPaymentSuccess(resp);
      } else if (nextStatus === 'rejected') {
        const statusDetail = resp?.status_detail || '';
        const rejectionMessages = {
          'cc_rejected_bad_filled_card_number': 'Número do cartão inválido.',
          'cc_rejected_bad_filled_date': 'Data de validade inválida.',
          'cc_rejected_bad_filled_security_code': 'Código de segurança (CVV) inválido.',
          'cc_rejected_insufficient_amount': 'Saldo insuficiente no cartão.',
          'cc_rejected_high_risk': 'Pagamento recusado por segurança.',
          'cc_rejected_other_reason': 'Pagamento recusado. Tente outro cartão.',
        };
        const friendlyMessage = rejectionMessages[statusDetail] || `Pagamento rejeitado: ${statusDetail || 'motivo não informado'}`;
        setError(friendlyMessage);
        if (typeof onError === 'function') onError(new Error(friendlyMessage));
      }
    } catch (err) {
      const msg = err?.message || 'Falha ao processar pagamento';
      setError(msg);
      if (typeof onError === 'function') onError(err);
    }
  };

  const onErrorCallback = (err) => {
    const msg = err?.message || 'Erro no componente de pagamento';
    setError(msg);
    if (typeof onError === 'function') onError(err);
  };

  const onReady = () => {
    // Brick está pronto
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
        <p>Carregando métodos de pagamento...</p>
      </div>
    );
  }

  if (error && !ready) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#FF6B6B' }}>❌ {error}</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: 12, color: '#fff' }}>
        Escolha a forma de pagamento
      </h3>
      {error && <p role="alert" style={{ color: '#FF6B6B', marginBottom: 12 }}>❌ {error}</p>}
      {ready && (
        <Payment
          initialization={initialization}
          customization={customization}
          onSubmit={onSubmit}
          onError={onErrorCallback}
          onReady={onReady}
        />
      )}
    </div>
  );
};

export default PaymentBrick;
