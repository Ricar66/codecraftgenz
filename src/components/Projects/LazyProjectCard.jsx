// src/components/Projects/LazyProjectCard.jsx
import React, { useState, useRef, useEffect, memo } from 'react';

import { usePrefersReducedMotion } from '../../utils/hooks';

import { ProjectCardSkeleton } from './LoadingSpinner';
import ProjectCard from './ProjectCard';

/**
 * Componente LazyProjectCard
 * Implementa lazy loading para ProjectCard usando Intersection Observer
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.project - Dados do projeto
 * @param {number} props.index - Índice do card para delay escalonado
 * @param {Object} props.options - Opções do Intersection Observer
 * @returns {JSX.Element} Componente LazyProjectCard
 */
const LazyProjectCard = memo(({ 
  project, 
  index = 0, 
  options = { 
    threshold: 0.1, 
    rootMargin: '50px' 
  } 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const currentCardRef = cardRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Delay escalonado baseado no índice para efeito visual suave
          const delay = Math.min(index * 100, 500);
          
          setTimeout(() => {
            setIsVisible(true);
            // Simula carregamento de dados adicionais se necessário
            setTimeout(() => setIsLoaded(true), 150);
          }, delay);
          
          observer.unobserve(entry.target);
        }
      },
      options
    );

    if (currentCardRef) {
      observer.observe(currentCardRef);
    }

    return () => {
      if (currentCardRef) {
        observer.unobserve(currentCardRef);
      }
    };
  }, [index, options]);

  return (
    <div 
      ref={cardRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transitionDelay: isVisible ? '0ms' : `${index * 50}ms`
      }}
    >
      {isVisible ? (
        isLoaded ? (
          <ProjectCard project={project} />
        ) : (
          <ProjectCardSkeleton />
        )
      ) : (
        <ProjectCardSkeleton />
      )}
    </div>
  );
});

LazyProjectCard.displayName = 'LazyProjectCard';

/**
 * Componente otimizado para lista de projetos com lazy loading
 */
export const OptimizedProjectsList = memo(({ projects, loading }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {Array.from({ length: 6 }, (_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
      gap: '1.5rem' 
    }}>
      {projects.map((project, index) => (
        <LazyProjectCard
          key={project.id}
          project={project}
          index={prefersReducedMotion ? 0 : index}
          options={{
            threshold: 0.1,
            rootMargin: '100px'
          }}
        />
      ))}
    </div>
  );
});

OptimizedProjectsList.displayName = 'OptimizedProjectsList';

export default LazyProjectCard;