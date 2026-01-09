// src/components/UI/Toast/ToastContext.jsx
// Context e Provider para gerenciar toasts globalmente

import React, { createContext, useCallback, useReducer } from 'react';

import { TOAST_POSITIONS, TOAST_TYPES } from './toastConstants';
import ToastContainer from './ToastContainer';

// Context
const ToastContext = createContext(null);

// Actions
const ADD_TOAST = 'ADD_TOAST';
const REMOVE_TOAST = 'REMOVE_TOAST';
const REMOVE_ALL = 'REMOVE_ALL';

// Reducer
function toastReducer(state, action) {
  switch (action.type) {
    case ADD_TOAST:
      return [...state, action.payload];
    case REMOVE_TOAST:
      return state.filter(toast => toast.id !== action.payload);
    case REMOVE_ALL:
      return [];
    default:
      return state;
  }
}

// Gerar ID unico
let toastId = 0;
const generateId = () => `toast-${++toastId}`;

/**
 * ToastProvider - Provedor do contexto de toasts
 * Envolva sua aplicacao com este provider para usar toasts
 */
export function ToastProvider({
  children,
  position = TOAST_POSITIONS.TOP_RIGHT,
  maxToasts = 5
}) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  // Adicionar toast
  const addToast = useCallback((options) => {
    const {
      type = TOAST_TYPES.INFO,
      title,
      message,
      duration = 5000,
      dismissible = true,
      action,
      icon
    } = typeof options === 'string' ? { message: options } : options;

    const id = generateId();

    const toast = {
      id,
      type,
      title,
      message,
      duration,
      dismissible,
      action,
      icon,
      createdAt: Date.now()
    };

    dispatch({ type: ADD_TOAST, payload: toast });

    // Auto-remover apos duration (se > 0)
    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: REMOVE_TOAST, payload: id });
      }, duration);
    }

    return id;
  }, []);

  // Remover toast especifico
  const removeToast = useCallback((id) => {
    dispatch({ type: REMOVE_TOAST, payload: id });
  }, []);

  // Remover todos
  const removeAllToasts = useCallback(() => {
    dispatch({ type: REMOVE_ALL });
  }, []);

  // Helpers para tipos especificos
  const toast = {
    show: addToast,
    success: (msg, opts = {}) => addToast({ ...opts, message: msg, type: TOAST_TYPES.SUCCESS }),
    error: (msg, opts = {}) => addToast({ ...opts, message: msg, type: TOAST_TYPES.ERROR }),
    warning: (msg, opts = {}) => addToast({ ...opts, message: msg, type: TOAST_TYPES.WARNING }),
    info: (msg, opts = {}) => addToast({ ...opts, message: msg, type: TOAST_TYPES.INFO }),
    dismiss: removeToast,
    dismissAll: removeAllToasts
  };

  // Limitar quantidade de toasts visiveis
  const visibleToasts = toasts.slice(-maxToasts);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer
        toasts={visibleToasts}
        position={position}
        onDismiss={removeToast}
      />
    </ToastContext.Provider>
  );
}

// Exportar o contexto para uso no hook separado
export { ToastContext };

export default ToastProvider;
