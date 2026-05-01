import { useEffect, useLayoutEffect } from 'react';
import { Platform } from 'react-native';

/**
 * A hook that uses useLayoutEffect on the client and useEffect on the server.
 * This prevents the "useLayoutEffect does nothing on the server" warning in Expo/Next.js.
 */
export const useIsomorphicLayoutEffect = 
  Platform.OS === 'web' && typeof window === 'undefined' 
    ? useEffect 
    : useLayoutEffect;
