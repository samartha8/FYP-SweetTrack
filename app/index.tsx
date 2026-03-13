import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading, hasOnboarded, hasHealthSetup, user } = useUser();

  useEffect(() => {
    console.log('🚀 Index: isLoading:', isLoading, 'hasOnboarded:', hasOnboarded, 'user:', user?.email);
    if (!isLoading) {
      // Priority 1: If user is logged in, they've already seen onboarding (via login screen)
      // Skip onboarding check if user exists
      if (user) {
        if (!hasHealthSetup) {
          // Logged in but no health setup - go to health setup
          router.replace('/health-setup' as any);
        } else {
          // Everything complete - go to dashboard
          router.replace('/(tabs)/home' as any);
        }
        return;
      }

      // Priority 2: Check onboarding only if no user is logged in
      if (!hasOnboarded) {
        // First time - show onboarding
        router.replace('/onboarding' as any);
      } else {
        // Not logged in - go to login
        router.replace('/login' as any);
      }
    }
  }, [isLoading, hasOnboarded, hasHealthSetup, user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ marginTop: 20, color: Colors.textSecondary }}>Initializing...</Text>
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