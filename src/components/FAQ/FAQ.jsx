// src/components/FAQ/FAQ.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle, MessageCircle } from 'lucide-react';

import styles from './FAQ.module.css';

const perguntas = [
  {
    q: 'Quanto custa um projeto sob medida?',
    a: 'O investimento varia conforme escopo, prazo e funcionalidades. Trabalhamos por projeto fechado (não por hora). Um site profissional começa a partir de R$ 2.500. Um sistema web com painel administrativo, a partir de R$ 8.000. Te passamos o orçamento exato em até 24h após entender seu briefing.',
  },
  {
    q: 'Em quanto tempo o projeto fica pronto?',
    a: 'Landing pages ficam prontas em 7 a 14 dias úteis. Sites profissionais com várias páginas em 2 a 4 semanas. Sistemas web personalizados em 1 a 3 meses, dependendo da complexidade. Sempre alinhamos o cronograma no briefing — sem prazos surpresa.',
  },
  {
    q: 'O que está incluído no preço?',
    a: 'Tudo o que o projeto precisa para rodar: desenvolvimento, design, hospedagem nos primeiros 3 meses, configuração de domínio, certificado SSL, deploy completo e treinamento da sua equipe. Sem cobranças escondidas no final.',
  },
  {
    q: 'E depois que o projeto sobe? Tem suporte?',
    a: 'Tem sim. Oferecemos suporte ativo no pós-entrega via WhatsApp e e-mail, com correções de bugs incluídas por 3 meses. Após esse período, mantemos contratos opcionais de manutenção mensal para ajustes, melhorias e novas funcionalidades.',
  },
  {
    q: 'Quais tecnologias vocês usam?',
    a: 'Stack moderna e consolidada: React, Next.js e Vite no front-end; Node.js (Express/NestJS) e Python no back-end; MySQL e PostgreSQL como banco; AWS, Hostinger e VPS dedicada para infraestrutura. Tudo pensado para escalar com seu negócio.',
  },
  {
    q: 'Como funciona o pagamento? Tem contrato?',
    a: 'Sim, sempre com contrato formal — protege você e a gente. O pagamento é dividido em parcelas: entrada (40%), meio do projeto (30%) e entrega final (30%). Aceitamos PIX, boleto e cartão. NFS-e emitida automaticamente.',
  },
  {
    q: 'Vocês desenvolvem app mobile também?',
    a: 'Sim. Trabalhamos com React Native para apps multiplataforma (iOS + Android com um único código) e com PWAs (Progressive Web Apps) para soluções mais leves que rodam direto no navegador como app nativo.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (i) => setOpenIndex(prev => (prev === i ? -1 : i));

  return (
    <section className={styles.section} aria-label="Dúvidas frequentes">
      <motion.header
        className={styles.header}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.span className={styles.badge} variants={fadeUp}>
          <HelpCircle size={14} /> FAQ
        </motion.span>
        <motion.h2 className={styles.title} variants={fadeUp}>
          Perguntas que recebemos com frequência
        </motion.h2>
        <motion.p className={styles.lead} variants={fadeUp}>
          Direto ao ponto, sem letras miúdas. Se ficar com qualquer dúvida adicional, é só falar com a gente.
        </motion.p>
      </motion.header>

      <motion.div
        className={styles.list}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={stagger}
      >
        {perguntas.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <motion.div
              key={item.q}
              className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}
              variants={fadeUp}
            >
              <button
                type="button"
                className={styles.question}
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
              >
                <span className={styles.qText}>{item.q}</span>
                <span className={styles.qIcon} aria-hidden="true">
                  {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-answer-${i}`}
                    className={styles.answer}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className={styles.answerText}>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        className={styles.contactCard}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
      >
        <div className={styles.contactIcon}>
          <MessageCircle size={20} />
        </div>
        <div className={styles.contactText}>
          <h3 className={styles.contactTitle}>Outra dúvida?</h3>
          <p className={styles.contactDesc}>Manda mensagem direto pra gente — atendimento rápido por WhatsApp ou e-mail.</p>
        </div>
        <div className={styles.contactActions}>
          <a
            href="https://wa.me/5516997552548"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.contactBtn} ${styles.contactBtnWpp}`}
          >
            WhatsApp
          </a>
          <a
            href="mailto:team@codecraftgenz.com.br"
            className={`${styles.contactBtn} ${styles.contactBtnMail}`}
          >
            E-mail
          </a>
        </div>
      </motion.div>
    </section>
  );
}
