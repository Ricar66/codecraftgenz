// src/pages/OnboardingPage/OnboardingPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  BarChart3,
  Users2,
  Code2,
  ChevronRight,
  ChevronLeft,
  Check,
  Rocket,
} from 'lucide-react';

import { useAuth } from '../../context/useAuth';
import { apiRequest } from '../../lib/apiConfig.js';
import styles from './OnboardingPage.module.css';

const AREAS = ['Front-end', 'Back-end', 'Mobile', 'Dados', 'Design', 'DevOps', 'Full Stack'];

const SKILLS = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Node.js',
  'Python', 'Java', 'Go', 'Docker', 'SQL', 'AWS', 'Figma', 'Flutter', 'Kotlin', 'Next.js',
];

const FEATURE_CARDS = [
  {
    icon: Trophy,
    title: 'Desafios',
    desc: 'Participe de desafios reais propostos por empresas e ganhe pontos.',
    color: '#f59e0b',
  },
  {
    icon: BarChart3,
    title: 'Ranking',
    desc: 'Suba no ranking e mostre suas habilidades para o mercado.',
    color: '#D12BF2',
  },
  {
    icon: Users2,
    title: 'Mentorias',
    desc: 'Conecte-se com profissionais experientes para acelerar sua carreira.',
    color: '#00E4F2',
  },
];

const ACTION_CARDS = [
  {
    icon: Trophy,
    title: 'Ver Desafios',
    desc: 'Participe de desafios e ganhe pontos',
    dest: '/desafios',
    color: '#f59e0b',
  },
  {
    icon: BarChart3,
    title: 'Ver Ranking',
    desc: 'Veja sua posição entre os crafters',
    dest: '/desafios/ranking',
    color: '#D12BF2',
  },
  {
    icon: Code2,
    title: 'Explorar Projetos',
    desc: 'Contribua em projetos open source',
    dest: '/projetos',
    color: '#00E4F2',
  },
];

const slideVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [completing, setCompleting] = useState(false);

  // Guard: redirect if already onboarded or not authenticated
  if (!loading && user && user.onboardingCompleted) {
    navigate('/', { replace: true });
    return null;
  }
  if (!loading && !user) {
    navigate('/login', { replace: true });
    return null;
  }

  const firstName = user?.name?.split(' ')[0] || 'Crafter';

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleComplete = async (destination = '/desafios') => {
    setCompleting(true);
    try {
      await apiRequest('/api/auth/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ area: selectedArea, skills: selectedSkills }),
      });
    } catch {
      // silent fail — still navigate
    }
    navigate(destination);
  };

  // Step dot indicators
  const stepCount = 3;
  const dots = Array.from({ length: stepCount }, (_, i) => {
    let cls = styles.stepDot;
    if (i === step) cls = `${styles.stepDot} ${styles.stepDotActive}`;
    else if (i < step) cls = `${styles.stepDot} ${styles.stepDotDone}`;
    return <span key={i} className={cls} />;
  });

  return (
    <div className={`${styles.page} starfield-bg`}>
      <div className={styles.inner}>
        {/* Step dots */}
        <div className={styles.steps}>{dots}</div>

        <AnimatePresence mode="wait">
          {/* ── STEP 0: WELCOME ── */}
          {step === 0 && (
            <motion.div
              key="step-welcome"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className={styles.welcomeAvatar}>
                {firstName.charAt(0).toUpperCase()}
              </div>

              <h1 className={styles.welcomeTitle}>
                Olá, {firstName}! 🎉
              </h1>
              <p className={styles.welcomeSubtitle}>
                Sua conta CodeCraft Gen-Z foi criada. Vamos personalizar sua jornada.
              </p>

              <div className={styles.featureGrid}>
                {FEATURE_CARDS.map(({ icon: Icon, title, desc, color }) => (
                  <div className={styles.featureCard} key={title}>
                    <div className={styles.featureIcon} style={{ color }}>
                      <Icon size={24} />
                    </div>
                    <h3 className={styles.featureCardTitle}>{title}</h3>
                    <p className={styles.featureCardDesc}>{desc}</p>
                  </div>
                ))}
              </div>

              <button
                className={styles.btnPrimary}
                onClick={() => setStep(1)}
              >
                Começar <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ── STEP 1: PROFILE ── */}
          {step === 1 && (
            <motion.div
              key="step-profile"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h2 className={styles.sectionTitle}>Qual é a sua área?</h2>
              <p className={styles.sectionHint}>Escolha a que mais representa você</p>

              <div className={styles.chipsGrid}>
                {AREAS.map((area) => (
                  <button
                    key={area}
                    className={`${styles.chip} ${selectedArea === area ? styles.chipActive : ''}`}
                    onClick={() => setSelectedArea((prev) => (prev === area ? '' : area))}
                  >
                    {area}
                  </button>
                ))}
              </div>

              <h2 className={styles.sectionLabel}>Suas tecnologias principais</h2>
              <p className={styles.sectionHint}>Selecione quantas quiser</p>

              <div className={styles.chipsGrid}>
                {SKILLS.map((skill) => (
                  <button
                    key={skill}
                    className={`${styles.chip} ${selectedSkills.includes(skill) ? styles.chipActive : ''}`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>

              <div className={styles.navRow}>
                <button className={styles.btnSecondary} onClick={() => setStep(0)}>
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button className={styles.btnPrimary} onClick={() => setStep(2)}>
                  Continuar <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: DONE ── */}
          {step === 2 && (
            <motion.div
              key="step-done"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className={styles.checkCircle}>
                <Check size={32} strokeWidth={3} color="#fff" />
              </div>

              <h2 className={styles.doneTitle}>Tudo pronto!</h2>
              <p className={styles.doneSubtitle}>
                Seu perfil está configurado. Agora escolha por onde começar:
              </p>

              <div className={styles.actionGrid}>
                {ACTION_CARDS.map(({ icon: Icon, title, desc, dest, color }) => (
                  <button
                    key={dest}
                    className={styles.actionCard}
                    onClick={() => handleComplete(dest)}
                    disabled={completing}
                  >
                    <div className={styles.actionIcon} style={{ color }}>
                      <Icon size={28} />
                    </div>
                    <h3 className={styles.actionCardTitle}>{title}</h3>
                    <p className={styles.actionCardDesc}>{desc}</p>
                    <span className={styles.actionArrow}>
                      <ChevronRight size={16} />
                    </span>
                  </button>
                ))}
              </div>

              <div className={styles.navRow}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setStep(1)}
                  disabled={completing}
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
