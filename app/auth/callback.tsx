import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';
import { useTranslation } from '@/hooks/use-translation';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, isLoading, hasHealthSetup } = useUser();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (!hasHealthSetup) {
          router.replace('/health-setup' as any);
        } else {
          router.replace('/(tabs)/home' as any);
        }
      } else {
        // If no user is found after loading, wait 3 seconds for getInitialURL parsing, then redirect to login
        const timer = setTimeout(() => {
          if (!user) router.replace('/login' as any);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isLoading, hasHealthSetup]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Completing Authentication...</Text>
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
  text: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
