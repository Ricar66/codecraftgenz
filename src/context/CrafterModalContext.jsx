// src/context/CrafterModalContext.jsx
import { createContext, useContext, useState } from 'react';

const CrafterModalContext = createContext(null);

export function CrafterModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CrafterModalContext.Provider value={{
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }}>
      {children}
    </CrafterModalContext.Provider>
  );
}

export function useCrafterModal() {
  const ctx = useContext(CrafterModalContext);
  if (!ctx) throw new Error('useCrafterModal must be used inside CrafterModalProvider');
  return ctx;
}
