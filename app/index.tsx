import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading, hasOnboarded, hasHealthSetup, user } = useUser();
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Add debug logging
    console.log('Index Screen - State:', {
      isLoading,
      hasOnboarded,
      hasHealthSetup,
      hasUser: !!user,
      hasNavigated: hasNavigated.current,
    });

    // Prevent multiple navigations
    if (hasNavigated.current || isLoading) {
      return;
    }

    // Wait for loading to complete before routing
    if (!isLoading) {
      hasNavigated.current = true;
      
      // Follow the exact flow order
      if (!hasOnboarded) {
        // First time user - show onboarding
        console.log('Navigating to onboarding');
        router.replace('/onboarding');
      } else if (!user) {
        // Onboarded but not logged in - show login
        console.log('Navigating to login');
        router.replace('/login');
      } else if (!hasHealthSetup) {
        // Logged in but health setup not done - show health setup
        console.log('Navigating to health-setup');
        router.replace('/health-setup');
      } else {
        // Everything complete - show home
        console.log('Navigating to home');
        router.replace('/(tabs)/home');
      }
    }
  }, [isLoading, hasOnboarded, hasHealthSetup, user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});