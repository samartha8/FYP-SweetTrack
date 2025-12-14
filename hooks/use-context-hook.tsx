import { createContext, ReactNode, useContext } from 'react';

/**
 * Creates a context hook with provider
 * Similar to @nkzw/create-context-hook but without external dependency
 * 
 * @param useValue - Function that returns the context value
 * @returns Tuple of [Provider, useHook]
 * 
 * @example
 * const [UserProvider, useUser] = createContextHook(() => {
 *   const [user, setUser] = useState(null);
 *   return { user, setUser };
 * });
 */
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

