// src/components/UI/Modal/Modal.jsx
// Componente Modal reutilizavel com acessibilidade

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

import styles from './Modal.module.css';

/**
 * Modal - Componente de modal padronizado com acessibilidade
 *
 * @param {boolean} isOpen - Controla visibilidade do modal
 * @param {function} onClose - Callback ao fechar o modal
 * @param {'sm'|'md'|'lg'|'xl'|'full'} size - Tamanho do modal
 * @param {string} title - Titulo do modal
 * @param {boolean} showCloseButton - Exibe botao X
 * @param {boolean} closeOnOverlayClick - Fecha ao clicar no overlay
 * @param {boolean} closeOnEsc - Fecha ao pressionar ESC
 * @param {React.ReactNode} footer - Conteudo do footer (botoes)
 *
 * @example
 * // Modal simples
 * <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirmar">
 *   <p>Tem certeza que deseja continuar?</p>
 * </Modal>
 *
 * @example
 * // Modal com footer
 * <Modal
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   title="Editar perfil"
 *   footer={
 *     <>
 *       <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
 *       <Button onClick={handleSave}>Salvar</Button>
 *     </>
 *   }
 * >
 *   <form>...</form>
 * </Modal>
 */
function Modal({
  isOpen,
  onClose,
  size = 'md',
  title,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  footer,
  children,
  className,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const titleId = ariaLabelledBy || `modal-title-${Math.random().toString(36).slice(2, 9)}`;

  // Fechar com ESC
  const handleKeyDown = useCallback((e) => {
    if (closeOnEsc && e.key === 'Escape') {
      onClose();
    }
  }, [closeOnEsc, onClose]);

  // Trap focus dentro do modal
  const handleTabKey = useCallback((e) => {
    if (!modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  // Gerenciar foco e scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Focar no modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleTabKey);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, handleKeyDown, handleTabKey]);

  // Fechar ao clicar no overlay
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalClass = [
    styles.modal,
    styles[size],
    className
  ].filter(Boolean).join(' ');

  const modalContent = (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={modalClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Fechar modal"
              >
                <FiX />
              </button>
            )}
          </div>
        )}

        <div className={styles.body}>
          {children}
        </div>

        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default Modal;
