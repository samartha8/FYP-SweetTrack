import { createContext, useContext, ReactNode } from 'react';

export function createContextHook<T>(useValue: () => T) {
  const Context = createContext<T | null>(null);

  const Provider = ({ children }: { children: ReactNode }) => {
    const value = useValue();
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useHook = () => {
    const context = useContext(Context);
    if (context === null) {
      throw new Error('Hook must be used within Provider');
    }
    return context;
  };

  return [Provider, useHook] as const;
}