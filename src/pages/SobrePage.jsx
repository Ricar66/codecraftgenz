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
    titulo: 'Código como linguagem',
    descricao: 'Acreditamos que programar é uma das habilidades mais transformadoras do século. Desenvolvemos quem já programa e inspiramos quem quer começar.',
  },
  {
    icon: <Users size={26} />,
    titulo: 'Comunidade acima de tudo',
    descricao: 'Crescemos juntos. Nossa comunidade é o coração da plataforma — conexões reais entre devs, mentores e empresas que constroem coisas que importam.',
  },
  {
    icon: <Trophy size={26} />,
    titulo: 'Mérito reconhecido',
    descricao: 'Chega de currículos que não contam a história real. Aqui, o que você constrói fala por você — desafios, projetos e entregas são o seu portfólio vivo.',
  },
  {
    icon: <Heart size={26} />,
    titulo: 'Impacto humano',
    descricao: 'Por trás de cada pull request existe uma pessoa com sonhos e objetivos. Não construímos só software — construímos carreiras e futuros.',
  },
];

const numeros = [
  { valor: '500+', label: 'Crafters ativos' },
  { valor: '30+', label: 'Empresas parceiras' },
  { valor: '120+', label: 'Desafios publicados' },
  { valor: '15+', label: 'Mentores especialistas' },
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
            Construindo a ponte entre{' '}
            <span className={styles.accent}>talentos</span> e{' '}
            <span className={styles.accentCyan}>oportunidades</span>
          </motion.h1>

          <motion.p
            className={styles.heroSubtitle}
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.25)}
          >
            A CodeCraft Gen-Z nasceu da frustração de desenvolvedores que entregavam projetos reais mas não conseguiam provar isso em uma entrevista. Criamos um lugar onde o trabalho fala por si só.
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
                Democratizar o acesso a oportunidades na área de tecnologia, conectando desenvolvedores talentosos a empresas que valorizam competência real. Queremos que qualquer dev, independente de onde estudou ou de onde vem, possa ser descoberto pelo que é capaz de construir.
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
              <div className={styles.historiaAno}>2023</div>
              <h3 className={styles.historiaItemTitle}>O problema</h3>
              <p className={styles.historiaItemDesc}>
                Desenvolvedores com habilidades reais eram preteridos por falta de "experiência formal". As empresas, por sua vez, gastavam meses em processos seletivos sem encontrar o fit certo. Percebemos que o mercado estava olhando para os lugares errados.
              </p>
            </motion.div>

            <motion.div className={styles.historiaBlock} variants={fadeUp()}>
              <div className={styles.historiaAno}>2024</div>
              <h3 className={styles.historiaItemTitle}>A solução</h3>
              <p className={styles.historiaItemDesc}>
                Lançamos a CodeCraft Gen-Z com desafios práticos, projetos colaborativos e um sistema de ranking baseado em entregas reais. Os primeiros Crafters foram selecionados e as primeiras parcerias com empresas surgiram organicamente.
              </p>
            </motion.div>

            <motion.div className={styles.historiaBlock} variants={fadeUp()}>
              <div className={styles.historiaAno}>Hoje</div>
              <h3 className={styles.historiaItemTitle}>A comunidade</h3>
              <p className={styles.historiaItemDesc}>
                Somos uma comunidade ativa de devs que se desafiam, colaboram e crescem juntos. Empresas usam nossa plataforma para encontrar talentos verificados. E continuamos expandindo — apps, mentorias, projetos reais e muito mais.
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
            <h2 className={styles.ctaTitle}>Faça parte desta história</h2>
            <p className={styles.ctaDesc}>
              Seja um Crafter e mostre o que você é capaz de construir. Ou traga sua empresa e encontre os talentos que você procura.
            </p>
            <div className={styles.ctaButtons}>
              <Link to="/register" className={styles.ctaBtnPrimary}>
                <Rocket size={17} /> Quero ser um Crafter
              </Link>
              <Link to="/para-empresas" className={styles.ctaBtnSecondary}>
                <Building2 size={17} /> Sou uma Empresa <ArrowRight size={15} />
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
