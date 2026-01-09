// src/components/UI/Toast/useToast.js
// Hook para usar o sistema de toasts

import { useContext } from 'react';

import { ToastContext } from './ToastContext';

/**
 * Hook para usar toasts
 * @returns {Object} Objeto com metodos para criar toasts
 * @example
 * const toast = useToast();
 * toast.success('Operacao realizada!');
 * toast.error('Algo deu errado');
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export default useToast;
