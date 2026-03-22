import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="starfield-bg" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '480px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '24px',
        padding: '48px 32px',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          fontSize: 'clamp(4rem, 12vw, 7rem)',
          fontWeight: 800,
          fontFamily: 'Montserrat, sans-serif',
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '16px',
        }}>404</div>
        <h2 style={{
          color: '#F5F5F7',
          fontSize: '1.25rem',
          fontWeight: 600,
          marginBottom: '12px',
        }}>Página não encontrada</h2>
        <p style={{
          color: '#9CA3AF',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          marginBottom: '32px',
        }}>
          A página que você procura não existe ou foi movida.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 32px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.3)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
}
