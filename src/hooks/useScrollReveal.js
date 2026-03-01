import { useInView, useAnimation } from 'framer-motion';
import { useRef, useEffect } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Hook para revelar elementos ao entrar na viewport.
 * Retorna { ref, controls, inView } para usar com motion components.
 *
 * @param {object} opts
 * @param {number} opts.threshold - Percentual visivel para disparar (0-1)
 * @param {boolean} opts.once - Animar apenas uma vez
 */
export function useScrollReveal({ threshold = 0.05, once = true } = {}) {
  const ref = useRef(null);
  const controls = useAnimation();
  const triggered = useRef(false);
  const inView = useInView(ref, { amount: threshold, once });

  useEffect(() => {
    if (prefersReducedMotion()) {
      controls.set('visible');
      triggered.current = true;
      return;
    }
    if (inView && !triggered.current) {
      triggered.current = true;
      controls.start('visible');
    }
  }, [inView, controls]);

  // Fallback: se apos 2s o elemento ainda nao animou, forcar visibilidade
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        controls.set('visible');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [controls]);

  return { ref, controls, inView };
}

// Variantes reutilizaveis
export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeUpSpring = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 80, damping: 18 },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

export const staggerContainer = (stagger = 0.12) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
});

export const slideFromLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 80, damping: 18 },
  },
};

export const tilt3DIn = {
  hidden: { opacity: 0, rotateX: 15, y: 30 },
  visible: {
    opacity: 1,
    rotateX: 0,
    y: 0,
    transition: { type: 'spring', stiffness: 70, damping: 16 },
  },
};
