// src/components/Projects/ProjectCard.jsx
import React, { useState } from 'react';
import { sanitizeImageUrl } from '../../utils/urlSanitize.js';

import styles from './ProjectCard.module.css';

/**
 * Componente de Card de Projeto
 * Exibe informações de um projeto individual com design responsivo
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.project - Dados do projeto
 * @param {string} props.project.id - ID único do projeto
 * Aceita chaves tanto em inglês quanto em português (titulo, data_inicio, descricao, progresso).
 * @param {number} props.maxDescriptionLength - Limite de caracteres para descrição (padrão: 150)
 *
*/
const ProjectCard = ({ 
  project, 
  maxDescriptionLength = 150,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Formata a data para o padrão brasileiro (DD/MM/YYYY)
   * @param {string} dateString - Data em formato ISO
   * @returns {string} Data formatada
   */
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
  };

  /**
   * Trunca a descrição se exceder o limite de caracteres
   * @param {string} text - Texto a ser truncado
   * @param {number} limit - Limite de caracteres
   * @returns {string} Texto truncado
   */
  const truncateText = (text, limit) => {
    const safe = String(text || '');
    if (safe.length <= limit) return safe;
    return safe.substring(0, limit).trim() + '...';
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
    switch (String(status || '').toLowerCase()) {
      case 'em andamento':
      case 'ongoing':
        return styles.statusInProgress;
      case 'concluído':
      case 'concluido':
      case 'finalizado':
      case 'completed':
        return styles.statusCompleted;
      case 'pausado':
      case 'paused':
        return styles.statusPaused;
      case 'arquivado':
      case 'archived':
        return styles.statusDefault;
      default:
        return styles.statusDefault;
    }
  };
  const descRaw = project?.description ?? project?.descricao;
  const desc = String(descRaw ?? '').trim();
  const shouldShowReadMore = desc.length > maxDescriptionLength;
  const displayDescription = desc.length === 0 ? 'Sem descrição cadastrada.' : (isExpanded ? desc : truncateText(desc, maxDescriptionLength));
  const progressValue = typeof project?.progress === 'number' ? project.progress : (typeof project?.progresso === 'number' ? project.progresso : 0);
  const title = project?.title ?? project?.titulo ?? 'Projeto sem título';
  const startDate = project?.startDate ?? project?.data_inicio ?? null;
  const statusLabel = project?.status || '—';
  
  // Informações do mentor
  const mentorName = project?.mentorName || project?.mentor_nome || project?.mentor?.nome || null;
  const mentorEmail = project?.mentorEmail || project?.mentor_email || project?.mentor?.email || null;
  const hasMentor = mentorName && mentorEmail;

  // Botão de inscrição removido por solicitação; função não utilizada

  return (
    <article className={styles.projectCard} role="article" aria-labelledby={`project-${project.id}-title`}>
      {/* Header do Card */}
      <header className={styles.cardHeader}>
        {project?.thumb_url ? (
          <img src={sanitizeImageUrl(project.thumb_url)} alt="Thumb do projeto" className={styles.thumb} />
        ) : null}
        <h3 id={`project-${project.id}-title`} className={styles.projectTitle}>
          {title}
        </h3>
        <span 
          className={`${styles.statusBadge} ${getStatusBadgeClass(statusLabel)}`}
          aria-label={`Status: ${statusLabel || '—'}`}
        >
          {statusLabel || '—'}
        </span>
      </header>

      {/* Informações do Projeto */}
      <div className={styles.cardContent}>
        <div className={styles.projectInfo}>
          <span className={styles.startDate} aria-label="Data de início">
            <strong>Início:</strong> {formatDate(startDate)}
          </span>
          
          {/* Informações do Mentor */}
          {hasMentor && (
            <div className={styles.mentorInfo}>
              <span className={styles.mentorLabel}>
                <strong>Mentor:</strong> {mentorName}
              </span>
              <span className={styles.mentorEmail} title={mentorEmail}>
                {mentorEmail}
              </span>
            </div>
          )}
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
            <span className={styles.progressPercentage} aria-label={`${progressValue}% concluído`}>
              {progressValue}%
            </span>
          </div>
          <div 
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={progressValue}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Progresso do projeto: ${progressValue}%`}
          >
            <div 
              className={`${styles.progressFill} ${getProgressColor(progressValue)}`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        {/* Ações do card – sem botão de inscrição por solicitação */}
      </div>
    </article>
  );
};

export default ProjectCard;