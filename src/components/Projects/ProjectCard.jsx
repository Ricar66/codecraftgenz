// src/components/Projects/ProjectCard.jsx
import React, { useState } from 'react';

import styles from './ProjectCard.module.css';

/**
 * Componente de Card de Projeto
 * Exibe informações de um projeto individual com design responsivo
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.project - Dados do projeto
 * @param {string} props.project.id - ID único do projeto
 * @param {string} props.project.title - Título do projeto
 * @param {string} props.project.status - Status do projeto (ex: "Em andamento")
 * @param {string} props.project.startDate - Data de início (formato ISO)
 * @param {string} props.project.description - Descrição do projeto
 * @param {number} props.project.progress - Progresso do projeto (0-100)
 * @param {number} props.maxDescriptionLength - Limite de caracteres para descrição (padrão: 150)
 */
const ProjectCard = ({ 
  project, 
  maxDescriptionLength = 150 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Formata a data para o padrão brasileiro (DD/MM/YYYY)
   * @param {string} dateString - Data em formato ISO
   * @returns {string} Data formatada
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  /**
   * Trunca a descrição se exceder o limite de caracteres
   * @param {string} text - Texto a ser truncado
   * @param {number} limit - Limite de caracteres
   * @returns {string} Texto truncado
   */
  const truncateText = (text, limit) => {
    if (text.length <= limit) return text;
    return text.substring(0, limit).trim() + '...';
  };

  /**
   * Determina a cor da barra de progresso baseada na porcentagem
   * @param {number} progress - Progresso (0-100)
   * @returns {string} Classe CSS para cor
   */
  const getProgressColor = (progress) => {
    if (progress >= 80) return styles.progressHigh;
    if (progress >= 50) return styles.progressMedium;
    return styles.progressLow;
  };

  /**
   * Determina a cor do badge de status
   * @param {string} status - Status do projeto
   * @returns {string} Classe CSS para cor do badge
   */
  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'em andamento':
        return styles.statusInProgress;
      case 'concluído':
        return styles.statusCompleted;
      case 'pausado':
        return styles.statusPaused;
      default:
        return styles.statusDefault;
    }
  };

  const shouldShowReadMore = project.description.length > maxDescriptionLength;
  const displayDescription = isExpanded 
    ? project.description 
    : truncateText(project.description, maxDescriptionLength);

  return (
    <article className={styles.projectCard} role="article" aria-labelledby={`project-${project.id}-title`}>
      {/* Header do Card */}
      <header className={styles.cardHeader}>
        <h3 id={`project-${project.id}-title`} className={styles.projectTitle}>
          {project.title}
        </h3>
        <span 
          className={`${styles.statusBadge} ${getStatusBadgeClass(project.status)}`}
          aria-label={`Status: ${project.status}`}
        >
          {project.status}
        </span>
      </header>

      {/* Informações do Projeto */}
      <div className={styles.cardContent}>
        <div className={styles.projectInfo}>
          <span className={styles.startDate} aria-label="Data de início">
            <strong>Início:</strong> {formatDate(project.startDate)}
          </span>
        </div>

        <div className={styles.description}>
          <p>{displayDescription}</p>
          {shouldShowReadMore && (
            <button
              className={styles.readMoreButton}
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={`project-${project.id}-description`}
            >
              {isExpanded ? 'Leia menos' : 'Leia mais'}
            </button>
          )}
        </div>

        {/* Barra de Progresso */}
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Progresso</span>
            <span className={styles.progressPercentage} aria-label={`${project.progress}% concluído`}>
              {project.progress}%
            </span>
          </div>
          <div 
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={project.progress}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Progresso do projeto: ${project.progress}%`}
          >
            <div 
              className={`${styles.progressFill} ${getProgressColor(project.progress)}`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;