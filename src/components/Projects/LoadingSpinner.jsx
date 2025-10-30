// src/components/Projects/LoadingSpinner.jsx
import styles from './LoadingSpinner.module.css';

/**
 * Componente de Loading Spinner
 * Spinner moderno e animado para indicar carregamento
 * 
 * @param {Object} props - Propriedades do componente
 * @param {string} props.size - Tamanho do spinner ('small', 'medium', 'large')
 * @param {string} props.message - Mensagem a ser exibida
 * @param {boolean} props.overlay - Se deve mostrar overlay de fundo
 * @returns {JSX.Element} Componente LoadingSpinner
 */
const LoadingSpinner = ({ 
  size = 'medium', 
  message = 'Carregando...', 
  overlay = false 
}) => {
  const containerClass = overlay 
    ? `${styles.container} ${styles.overlay}` 
    : styles.container;

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className={`${styles.spinner} ${styles[size]}`}>
        <div className={styles.ring}>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
        </div>
      </div>
      
      {message && (
        <p className={styles.message} aria-label={message}>
          {message}
        </p>
      )}
    </div>
  );
};

/**
 * Componente de Skeleton para cards de projeto
 * Mostra uma versão "fantasma" do layout durante carregamento
 */
export const ProjectCardSkeleton = () => {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonBadge}></div>
      </div>
      
      <div className={styles.skeletonDate}></div>
      
      <div className={styles.skeletonDescription}>
        <div className={styles.skeletonLine}></div>
        <div className={styles.skeletonLine}></div>
        <div className={styles.skeletonLine} style={{ width: '70%' }}></div>
      </div>
      
      <div className={styles.skeletonProgress}>
        <div className={styles.skeletonProgressBar}></div>
        <div className={styles.skeletonPercentage}></div>
      </div>
    </div>
  );
};

/**
 * Componente de Loading com múltiplos skeletons
 */
export const ProjectsListSkeleton = ({ count = 6 }) => {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: count }, (_, index) => (
        <ProjectCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default LoadingSpinner;