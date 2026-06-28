// src/pages/SobrePage.jsx
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Rocket, Target, Users, Heart, Code2, Trophy,
  Building2, ArrowRight, Zap, Star, Globe, MessageCircle
} from 'lucide-react';

import Navbar from '../components/Navbar/Navbar';

import styles from './SobrePage.module.css';

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
});

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const valores = [
  {
    icon: <Code2 size={26} />,
    titulo: 'Código limpo e confiável',
    descricao: 'Software bem feito é a base do nosso trabalho. Arquitetura sólida, testes que importam e código que envelhece bem.',
  },
  {
    icon: <Users size={26} />,
    titulo: 'Parceria de verdade',
    descricao: 'Não somos só fornecedor — somos time. Entendemos o seu negócio antes de propor a solução. Comunicação direta, sem ruído.',
  },
  {
    icon: <Trophy size={26} />,
    titulo: 'Entregas que importam',
    descricao: 'Cada projeto é avaliado pelo impacto real no negócio do cliente. Resolver o problema certo, no prazo, com qualidade.',
  },
  {
    icon: <Heart size={26} />,
    titulo: 'Suporte que não some',
    descricao: 'Software bom precisa de gente boa por trás. Acompanhamos cada cliente do briefing ao pós-deploy — sem largar no meio do caminho.',
  },
];

const numeros = [
  { valor: '5+', label: 'Produtos em produção' },
  { valor: '10+', label: 'Clientes atendidos' },
  { valor: '2025', label: 'Fundação · Ribeirão Preto/SP' },
  { valor: '100%', label: 'Foco em qualidade' },
];

const SobrePage = () => {
  return (
    <div className={`${styles.page} starfield-bg`}>
      <Navbar />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={`${styles.heroContent} container`}>
          <motion.div
            className={styles.heroBadge}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Rocket size={14} />
            <span>Nossa história</span>
          </motion.div>

          <motion.h1
            className={styles.heroTitle}
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.1)}
          >
            Software{' '}
            <span className={styles.accent}>bem feito</span>,{' '}
            <span className={styles.accentCyan}>do briefing ao deploy</span>
          </motion.h1>

          <motion.p
            className={styles.heroSubtitle}
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.25)}
          >
            A CodeCraft Gen-Z é uma empresa brasileira de desenvolvimento de software. Construímos apps próprios e soluções sob medida para empresas que precisam de tecnologia confiável — código limpo, design sólido e suporte que não some depois do deploy.
          </motion.p>
        </div>
      </section>

      {/* Missão */}
      <section className={styles.missaoSection}>
        <div className={`${styles.missaoInner} container`}>
          <motion.div
            className={styles.missaoCard}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp(0)}
          >
            <div className={styles.missaoIcon}>
              <Target size={32} />
            </div>
            <div className={styles.missaoText}>
              <h2 className={styles.missaoTitle}>Nossa Missão</h2>
              <p className={styles.missaoDesc}>
                Desenvolver software de qualidade que resolva problemas reais de empresas brasileiras. Sem complicações, sem promessas vazias, sem fornecedor que some depois do deploy. Do briefing à entrega, com código limpo e comunicação direta.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Números */}
      <section className={styles.numerosSection}>
        <motion.div
          className={`${styles.numerosGrid} container`}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          {numeros.map((n) => (
            <motion.div key={n.label} className={styles.numeroCard} variants={fadeUp()}>
              <span className={styles.numeroValor}>{n.valor}</span>
              <span className={styles.numeroLabel}>{n.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* História */}
      <section className={styles.historiaSection}>
        <div className={`${styles.historiaInner} container`}>
          <motion.div
            className={styles.sectionHeader}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp()}
          >
            <span className={styles.sectionBadge}><Globe size={13} /> Nossa jornada</span>
            <h2 className={styles.sectionTitle}>De uma ideia a uma comunidade</h2>
          </motion.div>

          <motion.div
            className={styles.historiaGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div className={styles.historiaBlock} variants={fadeUp()}>
              <div className={styles.historiaAno}>2025</div>
              <h3 className={styles.historiaItemTitle}>O início</h3>
              <p className={styles.historiaItemDesc}>
                Fundada em outubro de 2025 em Ribeirão Preto/SP, a CodeCraft Gen-Z nasceu com foco em desenvolvimento de software profissional — apps próprios e soluções sob medida para empresas que precisam de tecnologia confiável.
              </p>
            </motion.div>

            <motion.div className={styles.historiaBlock} variants={fadeUp()}>
              <div className={styles.historiaAno}>Hoje</div>
              <h3 className={styles.historiaItemTitle}>A operação</h3>
              <p className={styles.historiaItemDesc}>
                Mantemos um catálogo crescente de produtos próprios (CraftCard, CodeCraft Hub e novos lançamentos a caminho) e atendemos empresas de diferentes setores com desenvolvimento sob medida, do briefing ao deploy.
              </p>
            </motion.div>

            <motion.div className={styles.historiaBlock} variants={fadeUp()}>
              <div className={styles.historiaAno}>Próximo</div>
              <h3 className={styles.historiaItemTitle}>Para onde vamos</h3>
              <p className={styles.historiaItemDesc}>
                Lançamento de novos produtos, expansão do atendimento B2B e parcerias estratégicas. Cada cliente atendido vira referência para o próximo. Construímos software que dura.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Valores */}
      <section className={styles.valoresSection}>
        <div className={`${styles.valoresInner} container`}>
          <motion.div
            className={styles.sectionHeader}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp()}
          >
            <span className={styles.sectionBadge}><Star size={13} /> O que nos guia</span>
            <h2 className={styles.sectionTitle}>Nossos valores</h2>
            <p className={styles.sectionLead}>
              Tudo que construímos parte desses princípios.
            </p>
          </motion.div>

          <motion.div
            className={styles.valoresGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {valores.map((v) => (
              <motion.div key={v.titulo} className={styles.valorCard} variants={fadeUp()}>
                <div className={styles.valorIcon}>{v.icon}</div>
                <h3 className={styles.valorTitulo}>{v.titulo}</h3>
                <p className={styles.valorDesc}>{v.descricao}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA duplo */}
      <section className={styles.ctaSection}>
        <div className={`${styles.ctaInner} container`}>
          <motion.div
            className={styles.ctaCard}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp()}
          >
            <div className={styles.ctaIcon}><Zap size={28} /></div>
            <h2 className={styles.ctaTitle}>Pronto para trabalhar com a gente?</h2>
            <p className={styles.ctaDesc}>
              Conheça nossos apps prontos para uso ou conte sua ideia — desenvolvemos a solução sob medida com você, do briefing ao deploy.
            </p>
            <div className={styles.ctaButtons}>
              <Link to="/para-empresas" className={styles.ctaBtnPrimary}>
                <Building2 size={17} /> Quero contratar a CodeCraft
              </Link>
              <Link to="/aplicativos" className={styles.ctaBtnSecondary}>
                <Rocket size={17} /> Ver nossos apps <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>

          <motion.div
            className={styles.contactCard}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp(0.15)}
          >
            <div className={styles.contactIcon}><MessageCircle size={22} /></div>
            <h3 className={styles.contactTitle}>Fale com a gente</h3>
            <p className={styles.contactDesc}>
              Tem dúvidas, sugestões ou quer conversar sobre parcerias?
            </p>
            <a
              href="mailto:team@codecraftgenz.com.br"
              className={styles.contactLink}
            >
              team@codecraftgenz.com.br
            </a>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default SobrePage;
