// src/pages/HomePage/HomePage.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap, Palette, Rocket, Target, BarChart3, MessageSquare,
  Smartphone, RefreshCw, Shield, Handshake, Settings, Phone,
  UserPlus, Code2, LayoutDashboard, Building2,
  Trophy, ArrowRight, Star, CheckCircle
} from 'lucide-react';

import { apiRequest } from '../../lib/apiConfig.js';
import { DiscordIcon } from '../../components/UI/BrandIcons/index.jsx';
import appsBanner from '../../assets/apps-banner.jpg';
import companiesBanner from '../../assets/companies-banner.jpg';
import desafiosBanner from '../../assets/desafios-banner.jpg';
import hero3dImg from '../../assets/hero-3d.jpg';
import logoCodecraft from '../../assets/logo-principal.png';
import CompanySection from '../../components/CompanySection/CompanySection';
import PartnerModal from '../../components/PartnerModal/PartnerModal';
import { useCrafterModal } from '../../context/CrafterModalContext.jsx';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import FeedbackShowcase from '../../components/Feedbacks/FeedbackShowcase';
import Hero from '../../components/Hero/Hero';
import Navbar from '../../components/Navbar/Navbar';
import NewsSection from '../../components/NewsSection/NewsSection';
import ShowcaseBlock from '../../components/ShowcaseBlock/ShowcaseBlock.jsx';

import styles from './HomePage.module.css';

const sectionReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const howItWorksSteps = [
  {
    icon: <UserPlus size={28} />,
    number: '01',
    title: 'Crie sua conta',
    description: 'Cadastro gratuito. Monte seu perfil, defina suas stacks e mostre o que você já sabe fazer.',
  },
  {
    icon: <Code2 size={28} />,
    number: '02',
    title: 'Complete desafios reais',
    description: 'Problemas de empresas reais com prazo, critérios e feedback de um mentor.',
  },
  {
    icon: <LayoutDashboard size={28} />,
    number: '03',
    title: 'Construa seu portfólio',
    description: 'Cada entrega fica no seu perfil público — um portfólio vivo, não um PDF que ninguém lê.',
  },
  {
    icon: <Building2 size={28} />,
    number: '04',
    title: 'Seja descoberto',
    description: 'Empresas buscam talentos diretamente pelo ranking. Quem entrega, aparece.',
  },
];

const cicloSteps = [
  {
    icon: <Building2 size={26} />,
    step: '01',
    title: 'Empresa posta o desafio',
    description: 'Define o problema real, a stack e o prazo. Sem burocracia.',
    color: '#D12BF2',
  },
  {
    icon: <Code2 size={26} />,
    step: '02',
    title: 'Crafter aceita e resolve',
    description: 'Escolhe o desafio, escreve código de verdade e entrega com qualidade.',
    color: '#00E4F2',
  },
  {
    icon: <Trophy size={26} />,
    step: '03',
    title: 'Entrega avaliada',
    description: 'Mentor revisa, empresa recebe os melhores perfis filtrados por performance.',
    color: '#818cf8',
  },
  {
    icon: <Handshake size={26} />,
    step: '04',
    title: 'Conexão acontece',
    description: 'Empresa contrata, faz parceria ou convida para projeto. Crafter cresce.',
    color: '#10b981',
  },
];

const caseData = {
  empresa: 'Startup FinTech',
  desafio: 'API REST para controle financeiro com autenticação JWT e relatórios em PDF',
  stack: ['Node.js', 'PostgreSQL', 'Docker', 'JWT'],
  resultado: '5 crafters entregaram em 2 semanas. 2 foram convidados para o projeto.',
  quote: 'Encontramos talentos que o LinkedIn não nos daria.',
  autor: 'CTO da empresa',
};

const showcaseData = [
  {
    badge: 'Sobre nós',
    title: 'Criando o futuro, linha por linha',
    description: 'Somos uma equipe Gen-Z apaixonada por tecnologia. Desenvolvemos soluções de software modernas, escaláveis e com design que faz a diferença.',
    image: hero3dImg,
    imageAlt: 'Equipe CodeCraft desenvolvendo soluções',
    reverse: false,
    features: [
      { icon: <Zap size={18} />, text: 'Desenvolvimento ágil e moderno' },
      { icon: <Palette size={18} />, text: 'Design UI/UX premium' },
      { icon: <Rocket size={18} />, text: 'Deploy contínuo e escalável' },
    ],
  },
  {
    badge: 'Desafios',
    title: 'Supere seus limites',
    description: 'Desafios reais que testam suas habilidades e aceleram seu crescimento. Problemas do mercado, prazos reais e feedback de profissionais.',
    image: desafiosBanner,
    imageAlt: 'Desafios de programação CodeCraft',
    reverse: true,
    features: [
      { icon: <Target size={18} />, text: 'Desafios com problemas reais' },
      { icon: <BarChart3 size={18} />, text: 'Ranking e reconhecimento' },
      { icon: <MessageSquare size={18} />, text: 'Feedback de mentores' },
    ],
  },
  {
    badge: 'Aplicativos',
    title: 'Nosso ecossistema de apps',
    description: 'Aplicativos desenvolvidos com as melhores práticas de engenharia. Soluções robustas, interfaces intuitivas e performance de alto nível.',
    image: appsBanner,
    imageAlt: 'Hub de aplicativos CodeCraft',
    reverse: false,
    features: [
      { icon: <Smartphone size={18} />, text: 'Apps desktop e mobile' },
      { icon: <RefreshCw size={18} />, text: 'Atualizações automáticas' },
      { icon: <Shield size={18} />, text: 'Suporte técnico dedicado' },
    ],
  },
  {
    badge: 'Para Empresas',
    title: 'Soluções sob medida',
    description: 'Você tem uma ideia ou um problema. Nós temos o time. Do briefing ao deploy, com código limpo, design sólido e comunicação sem ruído.',
    image: companiesBanner,
    imageAlt: 'Soluções empresariais CodeCraft',
    reverse: true,
    features: [
      { icon: <Handshake size={18} />, text: 'Briefing em 24h' },
      { icon: <Settings size={18} />, text: 'Dev full-stack, design e infra' },
      { icon: <Phone size={18} />, text: 'Acompanhamento pós-entrega' },
    ],
  },
];

const HomePage = () => {
  const { open: openCrafterModal } = useCrafterModal();
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [mentores, setMentores] = useState([]);

  useEffect(() => {
    apiRequest('/api/mentores')
      .then(data => {
        const list = data?.data || data || [];
        setMentores(Array.isArray(list) ? list.slice(0, 3) : []);
      })
      .catch(() => {});
  }, []);

  const { canonical, ogUrl, ogImageUrl, twitterHandle } = useMemo(() => {
    const BASE_URL = 'https://codecraftgenz.com.br';
    const url = typeof window !== 'undefined' ? window.location.href : BASE_URL;
    const imageAbs = typeof window !== 'undefined' ? new URL(logoCodecraft, window.location.href).toString() : `${BASE_URL}${logoCodecraft}`;
    const handle = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWITTER_HANDLE) ? String(import.meta.env.VITE_TWITTER_HANDLE) : '';
    return { canonical: url, ogUrl: url, ogImageUrl: imageAbs, twitterHandle: handle };
  }, []);

  return (
    <div className={`${styles.homePage} starfield-bg`}>
      <Helmet>
        <title>CodeCraft Gen-Z | Plataforma para Devs que Querem Crescer</title>
        <meta name="description" content="Mostre seus projetos, complete desafios reais e seja descoberto por empresas que contratam. Comunidade dev com apps, mentoria e ranking." />
        <meta property="og:title" content="CodeCraft Gen-Z | Plataforma para Devs que Querem Crescer" />
        <meta property="og:description" content="Mostre seus projetos, complete desafios reais e seja descoberto por empresas. Comunidade dev com apps, mentoria e ranking." />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        <link rel="canonical" href={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CodeCraft Gen-Z | Plataforma para Devs que Querem Crescer" />
        <meta name="twitter:description" content="Mostre seus projetos, complete desafios reais e seja descoberto por empresas. Comunidade dev com apps, mentoria e ranking." />
        <meta name="twitter:image" content={ogImageUrl} />
        {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      </Helmet>
      <Navbar />
      <main>
        {/* 1. Hero */}
        <div className={styles.sectionBlock}>
          <Hero onCrafterClick={() => openCrafterModal()} />
        </div>

        {/* 2. Dois caminhos */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <div className={styles.doisCaminhosSection}>
            <div className={styles.doisCaminhosHeader}>
              <h2 className={styles.doisCaminhosTitle}>Por onde você começa?</h2>
              <p className={styles.doisCaminhosLead}>Cada lado tem sua jornada. Os dois se encontram na plataforma.</p>
            </div>
            <div className={styles.doisCaminhosGrid}>
              {/* Card Crafter */}
              <motion.div
                className={`${styles.caminhoCard} ${styles.caminhoCardCrafter}`}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={styles.caminhoIcon}><Code2 size={32} /></div>
                <h3 className={styles.caminhoTitle}>Sou um Crafter</h3>
                <p className={styles.caminhoDesc}>Quero crescer como dev, construir portfólio real e ser visto por empresas</p>
                <ul className={styles.caminhoList}>
                  <li><CheckCircle size={15} /> Desafios reais de mercado</li>
                  <li><CheckCircle size={15} /> Projetos em squad</li>
                  <li><CheckCircle size={15} /> Mentorias com sêniores</li>
                  <li><CheckCircle size={15} /> Ranking e badges</li>
                  <li><CheckCircle size={15} /> Visibilidade para empresas</li>
                </ul>
                <button
                  className={styles.caminhoBtn}
                  onClick={() => openCrafterModal()}
                >
                  Criar conta grátis <ArrowRight size={16} />
                </button>
              </motion.div>

              {/* Separador central */}
              <div className={styles.caminhoSeparador}>
                <span className={styles.caminhoSeparadorLabel}>ou</span>
              </div>

              {/* Card Empresa */}
              <motion.div
                className={`${styles.caminhoCard} ${styles.caminhoCardEmpresa}`}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={styles.caminhoIcon}><Building2 size={32} /></div>
                <h3 className={styles.caminhoTitle}>Sou uma Empresa</h3>
                <p className={styles.caminhoDesc}>Quero encontrar talentos validados por código real, não por currículo</p>
                <ul className={styles.caminhoList}>
                  <li><CheckCircle size={15} /> Perfis filtrados por performance</li>
                  <li><CheckCircle size={15} /> Desafios sob demanda</li>
                  <li><CheckCircle size={15} /> Squads montados para o seu projeto</li>
                  <li><CheckCircle size={15} /> Mentores sêniores disponíveis</li>
                  <li><CheckCircle size={15} /> Parceria ou contratação direta</li>
                </ul>
                <Link to="/para-empresas" className={`${styles.caminhoBtn} ${styles.caminhoBtnEmpresa}`}>
                  Conhecer planos <ArrowRight size={16} />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* 3. O ciclo completo */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <div className={styles.cicloSection}>
            <div className={styles.cicloHeader}>
              <span className={styles.cicloBadge}>Como funciona o ecossistema</span>
              <h2 className={styles.cicloTitle}>Empresa define. Crafter resolve. Os dois crescem.</h2>
              <p className={styles.cicloLead}>Um ciclo que une o mercado e o talento de forma direta.</p>
            </div>
            <div className={styles.cicloGrid}>
              {cicloSteps.map((s, i) => (
                <React.Fragment key={i}>
                  <motion.div
                    className={styles.cicloCard}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className={styles.cicloIconWrap} style={{ color: s.color, borderColor: `${s.color}30`, background: `${s.color}10` }}>
                      {s.icon}
                    </div>
                    <span className={styles.cicloStep}>{s.step}</span>
                    <h3 className={styles.cicloCardTitle}>{s.title}</h3>
                    <p className={styles.cicloCardDesc}>{s.description}</p>
                  </motion.div>
                  {i < cicloSteps.length - 1 && (
                    <div className={styles.cicloArrow} aria-hidden="true">
                      <ArrowRight size={20} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className={styles.cicloQuote}>"A empresa define o problema. O crafter resolve. Os melhores são descobertos."</p>
          </div>
        </motion.div>

        {/* 4. Como funciona */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <div className={styles.howItWorksSection}>
            <div className={styles.howItWorksHeader}>
              <span className={styles.howItWorksBadge}>Como funciona</span>
              <h2 className={styles.howItWorksTitle}>Da prática ao trabalho, em 4 etapas</h2>
              <p className={styles.howItWorksLead}>Uma jornada clara do aprendizado à oportunidade real</p>
            </div>
            <div className={styles.howItWorksGrid}>
              {howItWorksSteps.map((step, i) => (
                <motion.div
                  key={i}
                  className={styles.howItWorksCard}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6, transition: { type: 'spring', stiffness: 250, damping: 15 } }}
                >
                  <div className={styles.howItWorksNumber}>{step.number}</div>
                  <div className={styles.howItWorksIconWrap}>{step.icon}</div>
                  <h3 className={styles.howItWorksCardTitle}>{step.title}</h3>
                  <p className={styles.howItWorksCardDesc}>{step.description}</p>
                </motion.div>
              ))}
            </div>
            <div className={styles.howItWorksCta}>
              <Link to="/register" className={styles.howItWorksCtaBtn}>
                Começar agora — é grátis
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 5. ShowcaseBlocks */}
        {showcaseData.map((item, i) => (
          <div key={i} className={styles.sectionBlock}>
            <ShowcaseBlock {...item} />
          </div>
        ))}

        {/* 7. Cases reais */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <div className={styles.casesSection}>
            <div className={styles.casesHeader}>
              <span className={styles.casesBadge}>Casos reais</span>
              <h2 className={styles.casesTitle}>Do desafio à contratação</h2>
              <p className={styles.casesLead}>Veja como o ciclo funciona na prática</p>
            </div>
            <div className={styles.caseCard}>
              <div className={styles.caseCardLeft}>
                <div className={styles.caseLabel}>🏢 Empresa</div>
                <div className={styles.caseEmpresa}>{caseData.empresa}</div>
                <div className={styles.caseDesafioLabel}>Desafio postado</div>
                <p className={styles.caseDesafio}>{caseData.desafio}</p>
                <div className={styles.caseStack}>
                  {caseData.stack.map(t => (
                    <span key={t} className={styles.caseTag}>{t}</span>
                  ))}
                </div>
              </div>
              <div className={styles.caseCardDivider} />
              <div className={styles.caseCardRight}>
                <div className={styles.caseLabel}>👨‍💻 Resultado</div>
                <p className={styles.caseResultado}>{caseData.resultado}</p>
                <blockquote className={styles.caseQuote}>
                  <p>"{caseData.quote}"</p>
                  <cite>— {caseData.autor}</cite>
                </blockquote>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 8. Mentorias em destaque */}
        {mentores.length > 0 && (
          <motion.div
            className={styles.sectionBlock}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={sectionReveal}
          >
            <div className={styles.mentoriasSection}>
              <div className={styles.mentoriasHeader}>
                <span className={styles.mentoriasBadge}>Mentorias</span>
                <h2 className={styles.mentoriasTitle}>Aprenda com quem já está no mercado</h2>
                <p className={styles.mentoriasLead}>Mentores sêniores que já passaram pelo que você vai enfrentar</p>
              </div>
              <div className={styles.mentoriasGrid}>
                {mentores.map((m, i) => {
                  const name = m.nome || m.name || 'Mentor';
                  const initials = name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <motion.div
                      key={m.id || i}
                      className={styles.mentorCard}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 250, damping: 15 } }}
                    >
                      <div className={styles.mentorAvatar}>
                        {m.avatar ? (
                          <img src={m.avatar} alt={name} className={styles.mentorAvatarImg} />
                        ) : (
                          <span className={styles.mentorAvatarInitials}>{initials}</span>
                        )}
                      </div>
                      <div className={styles.mentorInfo}>
                        <h3 className={styles.mentorName}>{name}</h3>
                        {(m.especialidade || m.stack) && (
                          <p className={styles.mentorEspecialidade}>{m.especialidade || m.stack}</p>
                        )}
                        {m.bio && (
                          <p className={styles.mentorBio}>{m.bio.length > 100 ? m.bio.slice(0, 100) + '…' : m.bio}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className={styles.mentoriasCta}>
                <Link to="/mentoria" className={styles.mentoriasCtaBtn}>
                  Ver todos os mentores <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* 9. CraftCard Banner */}
        <motion.div
          className={styles.sectionBlock}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sectionReveal}
        >
          <a
            href="https://craftcardgenz.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardcraftBanner}
          >
            <div className={styles.cardcraftGlow} />
            <div className={styles.cardcraftContent}>
              <span className={styles.cardcraftBadge}>Produto CodeCraft Gen-Z</span>
              <h2 className={styles.cardcraftHeadline}>
                Apresentação não é detalhe.<br />
                <span className={styles.cardcraftAccent}>É posicionamento.</span>
              </h2>
              <p className={styles.cardcraftDesc}>
                CraftCard é o cartão digital profissional da CodeCraft Gen-Z — feito para quem leva carreira a sério.
                QR Code, portfólio, agendamento e analytics em um único link.
              </p>
              <div className={styles.cardcraftCta}>
                <span className={styles.cardcraftCtaText}>Conhecer CraftCard</span>
                <span className={styles.cardcraftArrow}>&#8594;</span>
              </div>
            </div>
            <div className={styles.cardcraftVisual}>
              <div className={styles.cardcraftCard}>
                <div className={styles.cardcraftCardInner}>
                  <span className={styles.cardcraftLogo}>CraftCard</span>
                  <span className={styles.cardcraftTagline}>Seu cartão virtual profissional</span>
                </div>
              </div>
            </div>
          </a>
        </motion.div>

        {/* 10. FeaturesSection */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionCard}>
            <FeaturesSection />
          </div>
        </div>

        {/* 11. CompanySection */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionCard}>
            <CompanySection />
          </div>
        </div>

        {/* 12. NewsSection */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionCard}>
            <NewsSection />
          </div>
        </div>

        {/* 13. FeedbackShowcase */}
        <motion.div
          className={styles.feedbackFullWidth}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionReveal}
        >
          <FeedbackShowcase />
        </motion.div>

        {/* 14. Discord Community */}
        <motion.div
          className={styles.discordSection}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionReveal}
        >
          <div className={styles.discordInner}>
            <DiscordIcon size={40} className={styles.discordIcon} />
            <div className={styles.discordText}>
              <h2 className={styles.discordTitle}>Junte-se à comunidade</h2>
              <p className={styles.discordDesc}>Devs que constroem, aprendem e evoluem juntos. Tire dúvidas, mostre seus projetos e conecte-se com outros Crafters.</p>
            </div>
            <a
              href="https://discord.gg/jKcuM5u6Qa"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.discordBtn}
            >
              <DiscordIcon size={18} /> Entrar no Discord
            </a>
          </div>
        </motion.div>

        {/* 15. CTA Final Duplo */}
        <motion.div
          className={styles.ctaFinalSection}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionReveal}
        >
          <div className={styles.ctaFinalInner}>
            <h2 className={styles.ctaFinalTitle}>Pronto para fazer parte do ciclo?</h2>
            <p className={styles.ctaFinalDesc}>Crafters constroem portfólio. Empresas encontram talentos. O ciclo nunca para.</p>
            <div className={styles.ctaFinalBtns}>
              <button
                className={styles.ctaFinalBtnCrafter}
                onClick={() => openCrafterModal()}
              >
                <Rocket size={18} /> Quero ser Crafter
              </button>
              <Link to="/para-empresas" className={styles.ctaFinalBtnEmpresa}>
                <Building2 size={18} /> Quero contratar →
              </Link>
            </div>
          </div>
        </motion.div>

        <PartnerModal
          isOpen={isPartnerModalOpen}
          onClose={() => setIsPartnerModalOpen(false)}
        />
      </main>
    </div>
  );
};

export default HomePage;
