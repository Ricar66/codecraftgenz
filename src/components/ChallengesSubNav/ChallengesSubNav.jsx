// src/components/ChallengesSubNav/ChallengesSubNav.jsx
import { Link, useLocation } from 'react-router-dom';
import { Code2, Trophy, MessageSquare } from 'lucide-react';
import styles from './ChallengesSubNav.module.css';

const tabs = [
  { to: '/desafios', label: 'Desafios', icon: <Code2 size={15} />, exact: true },
  { to: '/desafios/ranking', label: 'Ranking', icon: <Trophy size={15} /> },
  { to: '/desafios/feedbacks', label: 'Feedbacks', icon: <MessageSquare size={15} /> },
];

const ChallengesSubNav = () => {
  const { pathname } = useLocation();

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav} aria-label="Navegação de Desafios">
        {tabs.map(({ to, label, icon, exact }) => {
          const isActive = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {icon}
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default ChallengesSubNav;
