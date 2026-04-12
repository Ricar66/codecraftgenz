import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Code, Users, Rocket, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

const steps = [
  {
    icon: Rocket,
    title: 'Bem-vindo à CodeCraft Gen-Z!',
    description: 'Sua jornada como Crafter começa agora. Vamos te mostrar o que você pode fazer por aqui.',
    color: '#6366f1',
  },
  {
    icon: Trophy,
    title: 'Desafios de Código',
    description: 'Participe de desafios reais propostos por empresas. Teste suas habilidades e ganhe pontos no ranking.',
    color: '#f59e0b',
    link: '/desafios',
  },
  {
    icon: Code,
    title: 'Projetos Open Source',
    description: 'Contribua em projetos reais, construa seu portfólio e trabalhe em squads de desenvolvimento.',
    color: '#10b981',
    link: '/projetos',
  },
  {
    icon: Users,
    title: 'Mentorias',
    description: 'Conecte-se com profissionais experientes para acelerar sua evolução como desenvolvedor.',
    color: '#3b82f6',
    link: '/mentoria',
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    // If the server tracks onboarding, use that — the new OnboardingPage handles it
    if (user.onboardingCompleted !== undefined) return;
    const key = `cc_onboarding_${user.id}`;
    if (!localStorage.getItem(key)) {
      setVisible(true);
    }
  }, [user]);

  if (!visible) return null;

  const dismiss = () => {
    if (user) localStorage.setItem(`cc_onboarding_${user.id}`, '1');
    setVisible(false);
  };

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'rgba(15,15,25,0.98)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '24px',
        padding: '40px 36px',
        maxWidth: '440px',
        width: '100%',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <button onClick={dismiss} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'none', border: 'none', color: '#6B7280',
          cursor: 'pointer', padding: '4px',
        }} aria-label="Fechar onboarding">
          <X size={20} />
        </button>

        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: `${current.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Icon size={28} color={current.color} />
        </div>

        <h2 style={{
          color: '#F5F5F7', fontSize: '1.3rem', fontWeight: 700,
          textAlign: 'center', marginBottom: '12px',
          fontFamily: 'Montserrat, sans-serif',
        }}>{current.title}</h2>

        <p style={{
          color: '#9CA3AF', fontSize: '0.95rem', lineHeight: 1.6,
          textAlign: 'center', marginBottom: '32px',
        }}>{current.description}</p>

        {/* Step dots */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px',
        }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '24px' : '8px', height: '8px',
              borderRadius: '4px',
              background: i === step ? '#6366f1' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex', gap: '12px', justifyContent: 'center',
        }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '12px 20px',
              color: '#D1D5DB', cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <ChevronLeft size={16} /> Voltar
            </button>
          )}

          {isLast ? (
            <button onClick={() => {
              dismiss();
              if (current.link) navigate(current.link);
            }} style={{
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              border: 'none', borderRadius: '12px', padding: '12px 28px',
              color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              Começar a explorar <Rocket size={16} />
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} style={{
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              border: 'none', borderRadius: '12px', padding: '12px 28px',
              color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              Próximo <ChevronRight size={16} />
            </button>
          )}
        </div>

        <button onClick={dismiss} style={{
          display: 'block', margin: '16px auto 0', background: 'none',
          border: 'none', color: '#6B7280', cursor: 'pointer',
          fontSize: '0.8rem', textDecoration: 'underline',
        }}>Pular introdução</button>
      </div>
    </div>
  );
}
