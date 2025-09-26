import React, { createContext, useContext, useState } from 'react';
import { ValidationResult } from '../types';

interface ValidationContextValue {
  yamlText: string;
  setYamlText: (v: string) => void;
  selectedPolicies: string[];
  setSelectedPolicies: (v: string[]) => void;
  lastResult?: ValidationResult;
  setLastResult: (r?: ValidationResult) => void;
}

const ValidationContext = createContext<ValidationContextValue | undefined>(undefined);

export const ValidationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [yamlText, setYamlText] = useState<string>('');
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<ValidationResult | undefined>();

  return (
    <ValidationContext.Provider value={{ yamlText, setYamlText, selectedPolicies, setSelectedPolicies, lastResult, setLastResult }}>
      {children}
    </ValidationContext.Provider>
  );
};

export function useValidationContext(): ValidationContextValue {
  const ctx = useContext(ValidationContext);
  if (!ctx) throw new Error('useValidationContext must be used within ValidationProvider');
  return ctx;
}
