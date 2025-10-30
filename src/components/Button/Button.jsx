// src/assets/components/Button/Button.jsx
// Estilos
import styles from './Button.module.css';

/*
 * Componente de Botão reutilizável.
 * Props:
 * - children: O texto ou ícone dentro do botão.
 * - onClick: A função a ser executada ao clicar.
 * - variant: 'primary' (padrão) ou 'secondary' (para o azul Gen-Z).
 */
const Button = ({ children, onClick, variant = 'primary' }) => {
  
  // Define a classe CSS com base na variante
  // ex: styles.btn e styles.primary ou styles.secondary
  const buttonClass = `${styles.btn} ${styles[variant]}`;

  return (
    <button className={buttonClass} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;