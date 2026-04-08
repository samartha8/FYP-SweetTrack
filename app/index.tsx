import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function IndexScreen() {
  const { isLoading, hasOnboarded, hasHealthSetup, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    console.log('🚀 Index: isLoading:', isLoading, 'hasOnboarded:', hasOnboarded, 'user:', user?.email);
    if (!isLoading) {
      if (user) {
        if (!hasHealthSetup) {
          router.replace('/health-setup' as any);
        } else {
          router.replace('/(tabs)/home' as any);
        }
        return;
      }

      if (!hasOnboarded) {
        // First time - show onboarding
        router.replace('/onboarding' as any);
      } else {
        // Not first time - show login
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});