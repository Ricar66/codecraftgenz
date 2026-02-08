// src/components/PaymentBrick.jsx
// Payment Brick completo - combina todos os métodos de pagamento (cartão, PIX, boleto, Mercado Pago)
import React, { useEffect, useState, useRef } from 'react';

import { useAuth } from '../context/useAuth.js';
import { apiRequest } from '../lib/apiConfig.js';
import { createDirectPayment, createPaymentPreference, getPurchaseStatus } from '../services/appsAPI.js';
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
  const [pixData, setPixData] = useState(null); // Para mostrar QR Code do PIX
  const { user } = useAuth();
  const brickContainerRef = useRef(null);
  const brickControllerRef = useRef(null);

  const buyerInfo = React.useMemo(() => ({
    email: buyer?.email || user?.email || '',
    name: buyer?.name || user?.name || '',
    docType: buyer?.docType || 'CPF',
    docNumber: buyer?.docNumber || '',
  }), [buyer, user]);

  // Cleanup do brick quando componente desmonta
  useEffect(() => {
    return () => {
      if (brickControllerRef.current) {
        try {
          brickControllerRef.current.unmount();
        } catch (e) {
          // Ignora erro de unmount
        }
      }
    };
  }, []);

  // Inicializa SDK e cria o Brick
  useEffect(() => {
    const dev = import.meta.env.MODE !== 'production';
    let cancelled = false;
    let initCompleted = false;

    if (import.meta.env.MODE === 'test') {
      setReady(true);
      setLoading(false);
      return;
    }

    // Timeout de segurança
    const timeout = setTimeout(() => {
      if (!cancelled && !initCompleted) {
        console.warn('[PaymentBrick] Timeout de inicialização (20s).');
        setLoading(false);
        setError('Tempo esgotado ao carregar métodos de pagamento. Recarregue a página.');
      }
    }, 20000);

    const init = async () => {
      try {
        if (dev) console.log('[PaymentBrick] Iniciando inicialização...');

        // Carrega o SDK JS do MercadoPago
        if (dev) console.log('[PaymentBrick] Carregando SDK...');
        await loadMercadoPagoSDK();
        if (dev) console.log('[PaymentBrick] SDK carregado.');

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
            const apiKey = json?.data?.publicKey || json?.publicKey || json?.public_key || json?.data?.public_key || '';
            if (apiKey && !apiKey.includes('xxxx') && !apiKey.includes('XXXX')) {
              publicKey = apiKey;
              if (dev) console.log('[PaymentBrick] Public key obtida da API.');
            }
          } catch (apiErr) {
            if (dev) console.warn('[PaymentBrick] Erro ao buscar public key:', apiErr);
          }
        }

        if (cancelled) return;

        // Verifica se a chave é válida
        const isPlaceholder = !publicKey || publicKey.includes('xxxx') || publicKey.includes('XXXX') || publicKey.length < 20;
        if (isPlaceholder) {
          setError('Chave pública do Mercado Pago não configurada.');
          setLoading(false);
          return;
        }

        // Cria preferência se não foi passada externamente
        let prefId = externalPreferenceId || '';
        if (!prefId && buyerInfo.email) {
          try {
            if (dev) console.log('[PaymentBrick] Criando preferência...');
            const pref = await createPaymentPreference(appId, {
              email: buyerInfo.email,
              name: buyerInfo.name,
            });
            if (cancelled) return;
            prefId = pref?.id || pref?.data?.id || pref?.preference_id || '';
            if (prefId) {
              setPreferenceId(prefId);
              if (dev) console.log('[PaymentBrick] Preference ID:', prefId);
            }
          } catch (prefError) {
            console.warn('[PaymentBrick] Não foi possível criar preferência:', prefError);
          }
        }

        if (cancelled) return;

        // Aguarda o container estar disponível no DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!brickContainerRef.current) {
          console.error('[PaymentBrick] Container não encontrado no DOM');
          setError('Erro interno: container de pagamento não encontrado.');
          setLoading(false);
          return;
        }

        // Inicializa o MercadoPago e cria o Brick manualmente
        if (dev) console.log('[PaymentBrick] Criando instância MercadoPago...');
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();

        if (dev) console.log('[PaymentBrick] Criando Payment Brick...');

        const settings = {
          initialization: {
            amount: Number(amount || 0),
            preferenceId: prefId || undefined,
            payer: {
              email: buyerInfo.email,
              firstName: buyerInfo.name?.split(' ')[0] || '',
              lastName: buyerInfo.name?.split(' ').slice(1).join(' ') || '',
              identification: {
                type: buyerInfo.docType || 'CPF',
                number: buyerInfo.docNumber || '',
              },
            },
          },
          customization: {
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              bankTransfer: 'all', // PIX
              ticket: 'all', // Boleto
              mercadoPago: prefId ? 'all' : [],
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
            },
          },
          callbacks: {
            onReady: () => {
              if (dev) console.log('[PaymentBrick] Brick ready!');
              setLoading(false);
              setReady(true);
            },
            onSubmit: async ({ selectedPaymentMethod, formData }) => {
              if (dev) console.log('[PaymentBrick] onSubmit:', { selectedPaymentMethod, formData });

              try {
                setError('');

                // Para wallet, o redirecionamento é automático
                if (selectedPaymentMethod === 'wallet_purchase' || selectedPaymentMethod === 'onboarding_credits') {
                  return;
                }

                const txAmount = Number(amount || 0);
                if (!Number.isFinite(txAmount) || txAmount <= 0) {
                  throw new Error('Valor de pagamento inválido.');
                }

                const payerEmail = formData?.payer?.email || buyerInfo.email;
                if (!payerEmail) {
                  throw new Error('E-mail do pagador é obrigatório');
                }

                const requestedInstallments = Number(formData?.installments || 1);
                const finalInstallments = Math.min(Math.max(1, requestedInstallments), maxInstallments);

                const payload = {
                  token: formData?.token,
                  payment_method_id: formData?.payment_method_id || selectedPaymentMethod,
                  issuer_id: formData?.issuer_id,
                  installments: finalInstallments,
                  quantity: quantity,
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
                  ...(selectedPaymentMethod === 'pix' ? {
                    date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  } : {}),
                };

                if (dev) console.log('[PaymentBrick] Enviando pagamento:', payload);

                const resp = await createDirectPayment(appId, payload);
                if (dev) console.log('[PaymentBrick] Resposta do pagamento:', resp);

                const nextStatus = resp?.status || resp?.data?.status || 'pending';
                const paymentMethodId = formData?.payment_method_id || selectedPaymentMethod || '';

                if (dev) console.log('[PaymentBrick] Status:', nextStatus, 'Method:', paymentMethodId);

                // Se for PIX, mostra o QR Code
                // Verifica multiplas formas de identificar PIX
                const isPix = paymentMethodId === 'pix' ||
                              paymentMethodId?.toLowerCase()?.includes('pix') ||
                              selectedPaymentMethod === 'pix' ||
                              selectedPaymentMethod === 'bank_transfer';

                let pixDataSet = false;

                if (isPix && (nextStatus === 'pending' || nextStatus === 'in_process')) {
                  // Tenta extrair dados PIX de varias estruturas possiveis da resposta
                  const pixInfo = resp?.point_of_interaction?.transaction_data ||
                                  resp?.data?.point_of_interaction?.transaction_data ||
                                  resp?.result?.point_of_interaction?.transaction_data ||
                                  resp?.data?.result?.point_of_interaction?.transaction_data ||
                                  resp?.transaction_data ||
                                  {
                                    qr_code: resp?.qr_code || resp?.data?.qr_code,
                                    qr_code_base64: resp?.qr_code_base64 || resp?.data?.qr_code_base64,
                                    ticket_url: resp?.ticket_url || resp?.data?.ticket_url,
                                  };

                  if (dev) console.log('[PaymentBrick] PIX Info:', pixInfo);

                  if (pixInfo && (pixInfo.qr_code || pixInfo.qr_code_base64)) {
                    const payId = resp?.data?.payment_id || resp?.payment_id || resp?.data?.mp_payment_id || '';
                    setPixData({
                      qrCode: pixInfo.qr_code,
                      qrCodeBase64: pixInfo.qr_code_base64,
                      ticketUrl: pixInfo.ticket_url,
                      paymentId: payId,
                    });
                    pixDataSet = true;
                    if (dev) console.log('[PaymentBrick] QR Code PIX definido com sucesso, paymentId:', payId);
                  } else {
                    console.warn('[PaymentBrick] PIX selecionado mas QR Code não encontrado na resposta:', resp);
                  }
                }

                if (typeof onStatus === 'function') onStatus(resp);

                if (nextStatus === 'approved') {
                  if (typeof onPaymentSuccess === 'function') onPaymentSuccess(resp);
                } else if (nextStatus === 'pending' || nextStatus === 'in_process') {
                  // Para PIX com QR Code: NÃO navega - exibe QR Code para o usuário escanear
                  // O polling (useEffect abaixo) detectará quando o pagamento for aprovado
                  if (!pixDataSet) {
                    if (typeof onPaymentSuccess === 'function') onPaymentSuccess(resp);
                  }
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
                console.error('[PaymentBrick] Erro no pagamento:', err);
                const msg = err?.message || 'Falha ao processar pagamento';
                setError(msg);
                if (typeof onError === 'function') onError(err);
              }
            },
            onError: (err) => {
              console.error('[PaymentBrick] Brick error:', err);
              const msg = err?.message || 'Erro no componente de pagamento';
              setError(msg);
              if (typeof onError === 'function') onError(err);
            },
          },
        };

        // Cria o brick no container
        const controller = await bricksBuilder.create('payment', 'paymentBrick_container', settings);
        brickControllerRef.current = controller;

        if (dev) console.log('[PaymentBrick] Brick criado com sucesso!');

      } catch (err) {
        console.error('[PaymentBrick] Erro na inicialização:', err);
        if (!cancelled) {
          setError(err?.message || 'Falha ao inicializar Mercado Pago');
          setLoading(false);
        }
      } finally {
        initCompleted = true;
      }
    };

    init();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [appId, amount, quantity, description, buyerInfo.email, buyerInfo.name, buyerInfo.docType, buyerInfo.docNumber, externalPreferenceId, maxInstallments, onPaymentSuccess, onStatus, onError]);

  // Polling para verificar status do pagamento PIX
  useEffect(() => {
    if (!pixData?.paymentId || !appId) return;

    const dev = import.meta.env.MODE !== 'production';
    if (dev) console.log('[PaymentBrick] Iniciando polling PIX para paymentId:', pixData.paymentId);

    const interval = setInterval(async () => {
      try {
        const result = await getPurchaseStatus(appId, { payment_id: pixData.paymentId });
        const s = result?.data?.status || result?.status;
        if (dev) console.log('[PaymentBrick] Poll PIX status:', s);

        if (s === 'approved') {
          clearInterval(interval);
          setPixData(null);
          if (typeof onPaymentSuccess === 'function') {
            onPaymentSuccess({ status: 'approved', payment_id: pixData.paymentId, data: result?.data || result });
          }
        }
      } catch (err) {
        console.warn('[PaymentBrick] Erro ao verificar status PIX:', err);
      }
    }, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(interval);
  }, [pixData?.paymentId, appId, onPaymentSuccess]);

  // Renderiza QR Code do PIX se disponível
  if (pixData) {
    return (
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 12, color: '#fff' }}>
          Pague com PIX
        </h3>
        <p style={{ color: '#00e4f2', marginBottom: 16 }}>
          Escaneie o QR Code abaixo ou copie o código PIX
        </p>

        {pixData.qrCodeBase64 && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={`data:image/png;base64,${pixData.qrCodeBase64}`}
              alt="QR Code PIX"
              style={{ maxWidth: 250, border: '4px solid #fff', borderRadius: 8 }}
            />
          </div>
        )}

        {pixData.qrCode && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 8 }}>Código PIX (Copia e Cola):</p>
            <textarea
              readOnly
              value={pixData.qrCode}
              style={{
                width: '100%',
                maxWidth: 400,
                padding: 12,
                fontSize: '0.75rem',
                backgroundColor: '#1a1a2e',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: 4,
                resize: 'none',
                height: 80,
              }}
              onClick={(e) => {
                e.target.select();
                navigator.clipboard?.writeText(pixData.qrCode);
              }}
            />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(pixData.qrCode);
                alert('Código PIX copiado!');
              }}
              style={{
                marginTop: 8,
                padding: '10px 20px',
                backgroundColor: '#00e4f2',
                color: '#000',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Copiar código PIX
            </button>
          </div>
        )}

        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 228, 242, 0.08)',
          border: '1px solid rgba(0, 228, 242, 0.2)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#00e4f2',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <p style={{ fontSize: '0.85rem', color: '#00e4f2', margin: 0 }}>
            Aguardando pagamento... Verificando automaticamente.
          </p>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 8 }}>
          Assim que o pagamento for confirmado, voce sera redirecionado automaticamente.
        </p>

        <button
          onClick={() => setPixData(null)}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#00e4f2',
            border: '1px solid #00e4f2',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Escolher outro método
        </button>
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
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          <p>Carregando métodos de pagamento...</p>
        </div>
      )}
      {/* Container sempre presente no DOM para o Brick ser criado */}
      <div id="paymentBrick_container" ref={brickContainerRef} style={{ minHeight: loading ? 0 : 'auto' }} />
    </div>
  );
};

export default PaymentBrick;
