// src/utils/hooks.js

import { useRef, useEffect, useState } from 'react';

/**
 * Hook para otimização de performance com debounce
 * @param {Function} callback - Função a ser executada
 * @param {number} delay - Delay em ms
 * @returns {Function} Função com debounce
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  return (...args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  };
};

/**
 * Hook para detectar se o usuário prefere movimento reduzido
 * @returns {boolean} Se prefere movimento reduzido
 */
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};