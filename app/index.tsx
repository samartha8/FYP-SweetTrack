import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';;
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/SettingsContext";

export default function IndexScreen() {
  const { isLoading, hasOnboarded, user } = useAuth();
  const { hasHealthSetup, isHealthLoading } = useHealth();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    // Wait for both Auth and Health data to be loaded from storage
    if (!isLoading && !isHealthLoading) {
      // 1. Always prioritize Onboarding if not completed
      if (!hasOnboarded) {
        router.replace('/onboarding' as any);
        return;
      }

      // 2. Handle Logged-In state
      if (user) {
        if (!hasHealthSetup) {
          router.replace('/health-setup' as any);
        } else {
          router.replace('/(tabs)/home' as any);
        }
        return;
      }

      // 3. Fallback to Login
      router.replace('/login' as any);
    }
  }, [isLoading, isHealthLoading, hasOnboarded, hasHealthSetup, user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});