// src/components/ProcessSteps/ProcessSteps.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Code2, Rocket, ArrowRight, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';

import styles from './ProcessSteps.module.css';

const etapas = [
  {
    n: '01',
    Icon: MessageSquare,
    title: 'Briefing em até 24h',
    description: 'Conta o que precisa. Em até um dia útil retornamos com escopo, prazo e investimento — sem reuniões intermináveis. Direto ao ponto.',
    highlights: ['Resposta em 24h', 'Escopo e prazo claros', 'Sem pegadinhas'],
    color: '#22d3ee',
  },
  {
    n: '02',
    Icon: Code2,
    title: 'Desenvolvimento ágil',
    description: 'Codificamos com entregas semanais visíveis. Você acompanha o avanço, pode ajustar prioridades e ver o produto crescendo, não só promessas em PDF.',
    highlights: ['Entregas semanais', 'Stack moderna (React/Node)', 'Comunicação direta'],
    color: '#a78bfa',
  },
  {
    n: '03',
    Icon: Rocket,
    title: 'Entrega + suporte',
    description: 'Deploy completo (servidor, domínio, SSL), treinamento da equipe e suporte ativo no pós-entrega. A gente não some depois que o sistema sobe.',
    highlights: ['Deploy + infra', 'Treinamento incluso', 'Suporte que responde'],
    color: '#D12BF2',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };

export default function ProcessSteps() {
  return (
    <section className={styles.section} aria-label="Como funciona o processo">
      <motion.header
        className={styles.header}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.span className={styles.badge} variants={fadeUp}>
          <Workflow size={14} /> NOSSO PROCESSO
        </motion.span>
        <motion.h2 className={styles.title} variants={fadeUp}>
          Do briefing ao deploy, em 3 passos
        </motion.h2>
        <motion.p className={styles.lead} variants={fadeUp}>
          Um processo simples, transparente e sem ruído — como deve ser quando você contrata software profissional.
        </motion.p>
      </motion.header>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={stagger}
      >
        {etapas.map((etapa, i) => (
          <React.Fragment key={etapa.n}>
            <motion.div
              className={styles.card}
              variants={fadeUp}
              style={{ '--step-color': etapa.color }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.stepNumber}>{etapa.n}</span>
                <div className={styles.iconWrap}>
                  <etapa.Icon size={24} />
                </div>
              </div>
              <h3 className={styles.cardTitle}>{etapa.title}</h3>
              <p className={styles.cardDesc}>{etapa.description}</p>
              <ul className={styles.highlights}>
                {etapa.highlights.map(h => (
                  <li key={h}>
                    <span className={styles.dot} aria-hidden="true" />
                    {h}
                  </li>
                ))}
              </ul>
            </motion.div>

            {i < etapas.length - 1 && (
              <div className={styles.arrow} aria-hidden="true">
                <ArrowRight size={22} />
              </div>
            )}
          </React.Fragment>
        ))}
      </motion.div>

      <motion.div
        className={styles.ctaWrap}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
      >
        <Link to="/para-empresas" className={styles.ctaBtn}>
          Solicitar orçamento <ArrowRight size={16} />
        </Link>
        <span className={styles.ctaHint}>resposta em até 24h úteis</span>
      </motion.div>
    </section>
  );
}
