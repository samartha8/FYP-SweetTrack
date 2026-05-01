import { useUser } from "@/contexts/UserContext";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/SettingsContext";

export default function IndexScreen() {
  const { isLoading, hasOnboarded, hasHealthSetup, user } = useUser();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
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
        router.replace('/onboarding' as any);
      } else {
        router.replace('/login' as any);
      }
    }
  }, [isLoading, hasOnboarded, hasHealthSetup, user, router]);

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