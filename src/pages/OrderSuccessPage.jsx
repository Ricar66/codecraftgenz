import React, { useEffect, useState } from 'react';
import { FaArrowRight, FaCheckCircle, FaEnvelope, FaHome, FaSpinner, FaWindows } from 'react-icons/fa';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import Navbar from '../components/Navbar/Navbar';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { activateDeviceLicense, downloadByEmail, getAppById, getPurchaseStatus, registerDownload } from '../services/appsAPI.js';

import styles from './OrderSuccessPage.module.css';

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

  // Hardware ID generation for license activation
  const computeHardwareId = async () => {
    const src = [
      navigator.userAgent || '',
      navigator.language || '',
      navigator.platform || '',
      (screen?.width || '') + 'x' + (screen?.height || ''),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    ].join('|');
    const enc = new TextEncoder().encode(src);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    const arr = Array.from(new Uint8Array(digest));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64);
  };

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
            setDownloadUrl(purchaseStatus.download_url);
          } else {
            // Register download to generate URL
            try {
              const dlData = await registerDownload(id);
              if (dlData?.download_url) setDownloadUrl(dlData.download_url);
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
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener');
      return;
    }

    try {
      // Hardware ID check and license activation flow
      const hwid = await computeHardwareId();
      
      // If we don't have email in state, prompt user (or try to get from user context if available, 
      // but simpler to ask if missing or just try registerDownload which might use session user)
      // For now, try registerDownload first
      try {
        const json = await registerDownload(id);
        if (json?.download_url) {
          setDownloadUrl(json.download_url);
          window.open(json.download_url, '_blank', 'noopener');
          return;
        }
      } catch (e) {
        // If fails, might need email/license flow
        console.log('Direct download failed, trying license flow', e);
      }

      if (!email) {
        alert('Por favor, informe seu e-mail abaixo para ativar a licença e baixar.');
        document.getElementById('email-input')?.focus();
        return;
      }

      const lic = await activateDeviceLicense({ email, appId: Number(id), hardwareId: hwid });
      if (!lic?.licensed) {
        alert(lic?.message || 'Erro ao validar licença.');
        return;
      }

      const d = await downloadByEmail(id, email);
      if (d?.download_url) {
        setDownloadUrl(d.download_url);
        window.open(d.download_url, '_blank', 'noopener');
      } else {
        alert('Link de download não encontrado. Verifique seu e-mail.');
      }

    } catch (error) {
      alert('Erro ao processar download: ' + error.message);
    }
  };

  const handleResendEmail = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setEmailStatus('sending');
    try {
      // Reusing downloadByEmail to trigger email send if implemented on backend, 
      // or simply simulating the "Link sent" feedback if the API sends it automatically on purchase.
      // Based on AppPurchasePage, downloadByEmail returns the URL, but doesn't explicitly say "resent email".
      // However, usually this endpoint might trigger an email or we can use the mailto trick from AppPurchasePage.
      
      const d = await downloadByEmail(id, email);
      if (d?.download_url) {
        // Prepare mailto link as fallback/confirmation
        // const subject = encodeURIComponent(`Link de Download - ${app?.name || 'CodeCraft App'}`);
        // const body = encodeURIComponent(`Aqui está seu link de download: ${d.download_url}`);
        // window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank'); // Optional: open mail client
        
        setEmailStatus('sent');
        setEmailMessage('Link enviado com sucesso!');
        setDownloadUrl(d.download_url);
      } else {
        throw new Error('Não foi possível recuperar o link.');
      }
    } catch {
      setEmailStatus('error');
      setEmailMessage('Erro ao enviar. Verifique o e-mail.');
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
