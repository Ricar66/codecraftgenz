// src/components/SecuritySection/SecuritySection.jsx
import React, { useState } from 'react';
import styles from './SecuritySection.module.css';

const SHA256 = 'e0b50ff918ea77250e837df9f0f6e0aae4f6b47b0eccfc934eeaf5393b91ec23';

const content = {
  pt: {
    badge: 'Segurança & Instalação',
    title: 'Software verificado. Aviso esperado.',
    subtitle: 'Nossos apps estão em processo de reconhecimento pelo Windows. Enquanto isso, um aviso de "Editor Desconhecido" pode aparecer — é apenas uma etapa de verificação, não indica nenhum risco. Veja como instalar com segurança.',
    steps: [
      { icon: '🛡️', title: 'Clique em "Mais informações"', desc: 'Na janela do SmartScreen, procure o link discreto abaixo da mensagem principal e clique nele.' },
      { icon: '▶️', title: 'Clique em "Executar assim mesmo"', desc: 'Um segundo botão aparecerá. Clique para confirmar que deseja prosseguir com a instalação.' },
      { icon: '✅', title: 'Instalação concluída', desc: 'O instalador abrirá normalmente. Após isso, o aplicativo roda sem restrições.' },
    ],
    hashLabel: 'SHA-256 do instalador atual',
    copyBtn: 'Copiar hash',
    copiedBtn: 'Copiado!',
    ctaTitle: 'Ficou com dúvidas?',
    ctaText: 'A comunidade CodeCraft GenZ está aqui. Nos chame no suporte — respondemos em até 24h.',
    ctaBtn: 'Acessar suporte',
    accordion: [
      {
        q: 'Por que o Windows exibe esse aviso?',
        a: 'O Windows SmartScreen funciona por reputação. Apps com certificado EV (Extended Validation) passam automaticamente. Para desenvolvedores independentes, esse certificado custa entre R$ 1.500–3.000/ano e leva semanas para ser emitido. Optamos por ser transparentes sobre isso.'
      },
      {
        q: 'Como sei que o software é seguro?',
        a: 'Verifique o hash SHA-256 do arquivo baixado e compare com o que divulgamos. Se forem idênticos, o arquivo não foi modificado. Nosso software não faz chamadas externas não documentadas e pode ser auditado.'
      },
      {
        q: 'Como verificar a integridade antes de instalar?',
        a: 'No Windows PowerShell: Get-FileHash .\\NomeDoArquivo.exe -Algorithm SHA256. Compare o resultado com o hash que disponibilizamos. Você também pode usar ferramentas como 7-Zip ou HashCheck.'
      },
    ],
  },
  en: {
    badge: 'Security & Installation',
    title: 'Verified software. Expected warning.',
    subtitle: 'Our apps are going through Windows recognition approval. In the meantime, an "Unknown Publisher" warning may appear — it is just a verification step, not a sign of any risk. Here is how to install safely.',
    steps: [
      { icon: '🛡️', title: 'Click "More info"', desc: 'In the SmartScreen window, find the subtle link below the main message and click it.' },
      { icon: '▶️', title: 'Click "Run anyway"', desc: 'A second button will appear. Click it to confirm you want to proceed with the installation.' },
      { icon: '✅', title: 'Installation complete', desc: 'The installer will open normally. After that, the app runs without restrictions.' },
    ],
    hashLabel: 'Current installer SHA-256',
    copyBtn: 'Copy hash',
    copiedBtn: 'Copied!',
    ctaTitle: 'Still have questions?',
    ctaText: 'The CodeCraft GenZ community is here for you. Reach us on support — we respond within 24h.',
    ctaBtn: 'Get support',
    accordion: [
      {
        q: 'Why does Windows show this warning?',
        a: 'Windows SmartScreen is a reputation system. Apps with an EV (Extended Validation) certificate pass automatically. For independent devs, the certificate costs $300-$500/year and takes weeks to issue. We chose transparency over hiding this fact.'
      },
      {
        q: 'How do I know the software is safe?',
        a: 'Verify the SHA-256 hash of the downloaded file and compare it with what we publish. If they match, the file was not tampered with. Our software makes no undocumented external calls and can be audited.'
      },
      {
        q: 'How can I verify integrity before installing?',
        a: 'In Windows PowerShell: Get-FileHash .\\FileName.exe -Algorithm SHA256. Compare the result with our published hash. You can also use tools like 7-Zip or HashCheck.'
      },
    ],
  },
};

export default function SecuritySection() {
  const [lang, setLang] = useState('pt');
  const [openAccordion, setOpenAccordion] = useState(null);
  const [copied, setCopied] = useState(false);

  const c = content[lang];

  const copyHash = () => {
    navigator.clipboard.writeText(SHA256).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>

        {/* Header row */}
        <div className={styles.headerRow}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} />
            {c.badge}
          </span>
          <div className={styles.langToggle}>
            <button
              className={`${styles.langBtn} ${lang === 'pt' ? styles.langBtnActive : ''}`}
              onClick={() => setLang('pt')}
            >PT</button>
            <button
              className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
              onClick={() => setLang('en')}
            >EN</button>
          </div>
        </div>

        <h2 className={styles.title}>{c.title}</h2>
        <p className={styles.subtitle}>{c.subtitle}</p>

        {/* SmartScreen step-by-step */}
        <div className={styles.steps}>
          {c.steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className={styles.step}>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h4 className={styles.stepTitle}>{step.title}</h4>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
              {i < c.steps.length - 1 && (
                <div className={styles.stepConnector}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* SHA-256 card */}
        <div className={styles.hashCard}>
          <div className={styles.hashCardLabel}>🔐 {c.hashLabel}</div>
          <div className={styles.hashCardBody}>
            <code className={styles.hashValue}>{SHA256}</code>
            <button
              className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
              onClick={copyHash}
            >
              {copied ? c.copiedBtn : c.copyBtn}
            </button>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className={styles.accordion}>
          {c.accordion.map((item, i) => (
            <div
              key={i}
              className={`${styles.accordionItem} ${openAccordion === i ? styles.accordionItemOpen : ''}`}
            >
              <button
                className={styles.accordionTrigger}
                onClick={() => setOpenAccordion(openAccordion === i ? null : i)}
                aria-expanded={openAccordion === i}
              >
                <span>{item.q}</span>
                <span className={`${styles.chevron} ${openAccordion === i ? styles.chevronOpen : ''}`}>▾</span>
              </button>
              {openAccordion === i && (
                <div className={styles.accordionContent}>
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <div>
            <h3 className={styles.ctaTitle}>{c.ctaTitle}</h3>
            <p className={styles.ctaText}>{c.ctaText}</p>
          </div>
          <a
            href="https://codecraftgenz.com.br/ajuda"
            className={styles.ctaBtn}
            target="_blank"
            rel="noopener noreferrer"
          >
            {c.ctaBtn} →
          </a>
        </div>

      </div>
    </section>
  );
}
