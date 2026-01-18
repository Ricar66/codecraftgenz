import React, { useEffect, useState } from 'react';
import { FaArrowRight, FaCheckCircle, FaEnvelope, FaHome, FaSpinner, FaWindows } from 'react-icons/fa';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { getAppById, getPurchaseStatus, registerDownload } from '../services/appsAPI.js';
import { API_BASE_URL } from '../lib/apiConfig.js';

import styles from './OrderSuccessPage.module.css';

// Converte URL relativa para URL completa do backend
const resolveDownloadUrl = (url) => {
  if (!url) return '';
  // Se já é URL completa (http/https), retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // URL relativa - precisa ser prefixada com API_BASE_URL
  // Ex: /downloads/app-2-1.0.0.exe -> https://backend.../api/downloads/app-2-1.0.0.exe
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  // Se começa com /downloads, adiciona /api antes
  if (cleanUrl.startsWith('/downloads/')) {
    return `${API_BASE_URL}/api${cleanUrl}`;
  }
  return `${API_BASE_URL}${cleanUrl}`;
};

const OrderSuccessPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('validating'); // validating, approved, pending, error
  const [downloadUrl, setDownloadUrl] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle'); // idle, sending, sent, error
  const [emailMessage, setEmailMessage] = useState('');
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Fetch App Details
        const appData = await getAppById(id);
        setApp(appData?.data || appData);

        // 2. Validate Purchase
        const prefId = searchParams.get('preference_id');
        const payId = searchParams.get('payment_id');
        const statusParam = searchParams.get('status');
        
        if (payId) setPaymentId(payId);

        const purchaseStatus = await getPurchaseStatus(id, { 
          preference_id: prefId, 
          payment_id: payId, 
          status: statusParam 
        });

        const currentStatus = purchaseStatus?.status || statusParam;

        if (currentStatus === 'approved') {
          setStatus('approved');
          trackEvent('purchase_success', { 
            app_id: id, 
            app_name: appData?.name,
            payment_id: payId,
            price: appData?.price 
          }, 'conversion');

          // Try to get download URL immediately
          if (purchaseStatus?.download_url) {
            setDownloadUrl(resolveDownloadUrl(purchaseStatus.download_url));
          } else {
            // Register download to generate URL - usa payment_id do retorno do MP
            try {
              const dlData = await registerDownload(id, { payment_id: payId });
              if (dlData?.download_url) setDownloadUrl(resolveDownloadUrl(dlData.download_url));
              // Se retornou email do comprador, preenche o campo
              if (dlData?.email) setEmail(dlData.email);
            } catch (err) {
              console.warn('Auto-register download failed:', err);
            }
          }
        } else if (currentStatus === 'pending' || currentStatus === 'in_process') {
          setStatus('pending');
        } else {
          setStatus('error');
        }

      } catch (error) {
        console.error('Error initializing success page:', error);
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, searchParams, trackEvent]);

  const handleDownload = async () => {
    // Se já temos URL de download, abre direto
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener');
      return;
    }

    try {
      // Tenta download usando payment_id (principal método após compra)
      if (paymentId) {
        const json = await registerDownload(id, { payment_id: paymentId });
        if (json?.download_url) {
          const resolvedUrl = resolveDownloadUrl(json.download_url);
          setDownloadUrl(resolvedUrl);
          if (json?.email) setEmail(json.email);
          window.open(resolvedUrl, '_blank', 'noopener');
          return;
        }
      }

      // Se não tem payment_id mas tem email, tenta por email
      if (email) {
        const json = await registerDownload(id, { email });
        if (json?.download_url) {
          const resolvedUrl = resolveDownloadUrl(json.download_url);
          setDownloadUrl(resolvedUrl);
          window.open(resolvedUrl, '_blank', 'noopener');
          return;
        }
      }

      // Se chegou aqui, não conseguiu obter URL - mostra erro
      alert('Não foi possível obter o link de download. Por favor, use o campo abaixo para receber por e-mail.');

    } catch (error) {
      console.error('Erro no download:', error);
      alert('Erro ao processar download: ' + (error?.message || 'Tente novamente'));
    }
  };

  const handleResendEmail = async (e) => {
    e.preventDefault();
    if (!email) return;

    setEmailStatus('sending');
    try {
      // Usa registerDownload com email para obter o link
      const d = await registerDownload(id, { email });
      if (d?.download_url) {
        const resolvedUrl = resolveDownloadUrl(d.download_url);
        setEmailStatus('sent');
        setEmailMessage('Link recuperado com sucesso! Clique em "Baixar Executável" acima.');
        setDownloadUrl(resolvedUrl);
      } else {
        throw new Error('Não foi possível recuperar o link.');
      }
    } catch (err) {
      setEmailStatus('error');
      setEmailMessage(err?.message || 'Erro ao enviar. Verifique o e-mail.');
    }
  };

  if (loading) {
    return (
      <div className={`${styles.container} page-with-background`}>
        <div className={styles.loading}>
          <FaSpinner className="icon-spin" /> Verificando pedido...
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`${styles.container} page-with-background`}>
        <div className={styles.card}>
          <div className={styles.iconWrapper} style={{ color: '#ff4444', borderColor: '#ff4444' }}>
            <span style={{ fontSize: '40px' }}>⚠️</span>
          </div>
          <h1 className={styles.title}>Ops! Algo deu errado.</h1>
          <p className={styles.message}>Não conseguimos confirmar seu pagamento. Se você já pagou, aguarde alguns instantes e atualize a página.</p>
          <Link to={`/apps/${id}/compra`} className={styles.downloadButton} style={{ background: 'transparent', border: '1px solid #fff' }}>
            Voltar e tentar novamente
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className={`${styles.container} page-with-background`}>
        <div className={styles.card}>
          <div className={styles.iconWrapper} style={{ color: '#ffbb33', borderColor: '#ffbb33' }}>
            <FaSpinner className="icon-spin" />
          </div>
          <h1 className={styles.title}>Pagamento em Processamento</h1>
          <p className={styles.message}>Estamos aguardando a confirmação do seu pagamento. Assim que aprovado, o download será liberado automaticamente.</p>
          <button onClick={() => window.location.reload()} className={styles.downloadButton}>
            Atualizar Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className={`${styles.container} page-with-background`}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <FaCheckCircle />
          </div>
          
          <h1 className={styles.title}>
            Parabéns pela compra do <span className={styles.appName}>{app?.name || 'App'}</span>!
          </h1>
          
          <p className={styles.message}>
            Sua licença foi ativada com sucesso. Você já pode baixar e instalar seu software.
          </p>

          {paymentId && (
            <div className={styles.orderInfo}>
              Número do Pedido: <strong>#{paymentId}</strong>
            </div>
          )}

          <div className={styles.downloadSection}>
            <button 
              onClick={handleDownload} 
              className={styles.downloadButton}
              disabled={!status === 'approved'}
            >
              <FaWindows size={24} /> Baixar Executável
            </button>
          </div>

          <div className={styles.instructions}>
            <h3 className={styles.instructionsTitle}>
              <FaArrowRight size={14} color="var(--cor-primaria)" /> Como instalar:
            </h3>
            <ol className={styles.steps}>
              <li>Clique no botão acima para baixar o instalador.</li>
              <li>Execute o arquivo <strong>.exe</strong> baixado.</li>
              <li>Siga as instruções na tela para concluir a instalação.</li>
              <li>Ao abrir o app, use seu e-mail para ativar se solicitado.</li>
            </ol>
          </div>

          <div className={styles.emailSection}>
            <h4 className={styles.emailTitle}>
              <FaEnvelope style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Reenviar link por e-mail
            </h4>
            <form onSubmit={handleResendEmail} className={styles.emailForm}>
              <input 
                type="email" 
                placeholder="Seu melhor e-mail" 
                className={styles.emailInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                id="email-input"
                required
              />
              <button type="submit" className={styles.emailButton} disabled={emailStatus === 'sending'}>
                {emailStatus === 'sending' ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
            {emailMessage && (
              <p style={{ marginTop: 8, fontSize: '0.9rem', color: emailStatus === 'error' ? '#ff4444' : '#00e4f2' }}>
                {emailMessage}
              </p>
            )}
          </div>

          <Link to="/" className={styles.homeLink}>
            <FaHome /> Voltar para a página inicial
          </Link>
        </div>
      </div>
    </>
  );
};

export default OrderSuccessPage;
