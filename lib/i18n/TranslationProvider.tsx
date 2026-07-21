'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Dictionary } from '@/lib/dictionary';

interface TranslationContextType {
  dictionary: Dictionary;
  locale: string;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

export function TranslationProvider({
  dictionary,
  locale,
  children,
}: {
  dictionary: Dictionary;
  locale: string;
  children: ReactNode;
}) {
  return (
    <TranslationContext.Provider value={{ dictionary, locale }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
