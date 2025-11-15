import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading, hasOnboarded, hasHealthSetup, user } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (!hasOnboarded) {
        router.replace('/onboarding' as any);
      } else if (!user) {
        router.replace('/login' as any);
      } else if (!hasHealthSetup) {
        router.replace('/health-setup' as any);
      } else {
        router.replace('/(tabs)/home' as any);
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