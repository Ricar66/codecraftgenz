// src/components/TargetAudience/TargetAudience.jsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope, ShoppingBag, Briefcase, Factory, Rocket, Store,
  Target as TargetIcon,
} from 'lucide-react';

import styles from './TargetAudience.module.css';

const segmentos = [
  {
    Icon: Stethoscope,
    title: 'Clínicas e Consultórios',
    description: 'Sistemas de agendamento, prontuário eletrônico, evolução do paciente e fluxo de atendimento.',
    color: '#22d3ee',
  },
  {
    Icon: ShoppingBag,
    title: 'E-commerce e Varejo',
    description: 'Lojas virtuais, integrações com marketplaces, automação de pedidos e dashboards de venda.',
    color: '#D12BF2',
  },
  {
    Icon: Briefcase,
    title: 'Prestadores de Serviço',
    description: 'Sites profissionais, orçamentos online, agendamento de clientes e gestão de contratos.',
    color: '#a78bfa',
  },
  {
    Icon: Factory,
    title: 'Indústria e Logística',
    description: 'Sistemas de controle de estoque, ordens de produção, rastreabilidade e relatórios operacionais.',
    color: '#fb923c',
  },
  {
    Icon: Rocket,
    title: 'Startups e Tech',
    description: 'MVPs validáveis em semanas, escalabilidade desde o dia 1 e integrações com APIs modernas.',
    color: '#34d399',
  },
  {
    Icon: Store,
    title: 'Pequenas Empresas',
    description: 'Landing pages que convertem, painéis administrativos enxutos e automações para o dia a dia.',
    color: '#fbbf24',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

export default function TargetAudience() {
  return (
    <section className={styles.section} aria-label="Para quem fazemos software">
      <motion.header
        className={styles.header}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <motion.span className={styles.badge} variants={fadeUp}>
          <TargetIcon size={14} /> PARA QUEM É
        </motion.span>
        <motion.h2 className={styles.title} variants={fadeUp}>
          Desenvolvemos para empresas como a sua
        </motion.h2>
        <motion.p className={styles.lead} variants={fadeUp}>
          Atendemos clientes de diferentes setores — o que muda é o problema, mas o método é o mesmo: entender o negócio antes de propor a solução.
        </motion.p>
      </motion.header>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={stagger}
      >
        {segmentos.map(({ Icon, title, description, color }) => (
          <motion.div key={title} className={styles.card} variants={fadeUp} style={{ '--seg-color': color }}>
            <div className={styles.iconWrap}>
              <Icon size={26} />
            </div>
            <h3 className={styles.cardTitle}>{title}</h3>
            <p className={styles.cardDesc}>{description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
