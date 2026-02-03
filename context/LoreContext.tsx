"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Era = 'Vanilla' | 'TBC' | 'WotLK' | 'Retail';

interface LoreContextType {
  activeEra: Era;
  setActiveEra: (era: Era) => void;
}

const LoreContext = createContext<LoreContextType | undefined>(undefined);

export const LoreProvider = ({ children }: { children: ReactNode }) => {
  const [activeEra, setActiveEra] = useState<Era>('Vanilla');

  return (
    <LoreContext.Provider value={{ activeEra, setActiveEra }}>
      {children}
    </LoreContext.Provider>
  );
};

export const useLore = () => {
  const context = useContext(LoreContext);
  if (!context) {
    throw new Error('useLore must be used within a LoreProvider');
  }
  return context;
};
