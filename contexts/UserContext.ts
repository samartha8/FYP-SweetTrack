import { createContextHook } from '@/hooks/use-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';

export type User = {
  id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  bmi?: number;
};

const STORAGE_KEYS = {
  USER: '@sweettrack_user',
  HAS_ONBOARDED: '@sweettrack_onboarded',
  HAS_HEALTH_SETUP: '@sweettrack_health_setup',
};

export const [UserProvider, useUser] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [hasHealthSetup, setHasHealthSetup] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [storedUser, storedOnboarded, storedHealthSetup] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_HEALTH_SETUP),
      ]);

      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedOnboarded) setHasOnboarded(JSON.parse(storedOnboarded));
      if (storedHealthSetup) setHasHealthSetup(JSON.parse(storedHealthSetup));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, JSON.stringify(true));
      setHasOnboarded(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, []);

  const completeHealthSetup = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_HEALTH_SETUP, JSON.stringify(true));
      setHasHealthSetup(true);
    } catch (error) {
      console.error('Error completing health setup:', error);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUser(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
    };
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
      setUser(newUser);
      return true;
    } catch (error) {
      console.error('Error signing up:', error);
      return false;
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    const currentUser = user || { id: '', name: '', email: '' };
    const updatedUser = { ...currentUser, ...updates };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }, [user]);

  return useMemo(() => ({
    user,
    hasOnboarded,
    hasHealthSetup,
    isLoading,
    completeOnboarding,
    completeHealthSetup,
    login,
    signup,
    updateUser,
  }), [user, hasOnboarded, hasHealthSetup, isLoading, completeOnboarding, completeHealthSetup, login, signup, updateUser]);
});