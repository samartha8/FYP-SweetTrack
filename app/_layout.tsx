import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
  'Warning: useLayoutEffect does nothing on the server',
  'Image: style.resizeMode is deprecated. Please use props.resizeMode.',
  'Error: Cannot pipe to a closed or destroyed stream'
]);

// 🤫 SHUSH THE TERMINAL
// Suppress the most annoying terminal warnings that LogBox misses
const ignoredWarnings = [
  'shadow* style props are deprecated',
  'useLayoutEffect does nothing on the server',
  'style.resizeMode is deprecated',
  'Cannot pipe to a closed'
];

if (__DEV__) {
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args) => {
    if (args.length > 0 && typeof args[0] === 'string' && ignoredWarnings.some(w => args[0].includes(w))) {
      return;
    }
    originalWarn(...args);
  };

  console.error = (...args) => {
    if (args.length > 0 && typeof args[0] === 'string' && ignoredWarnings.some(w => args[0].includes(w))) {
      return;
    }
    originalError(...args);
  };
}


import { UserProvider } from "@/contexts/UserContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { MealTrackingProvider } from "@/contexts/MealTrackingContext";

// SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

import { useTheme } from "@/contexts/SettingsContext";
import { StatusBar } from "expo-status-bar";

function RootLayoutNav() {
  const { colors, isHighContrast } = useTheme();

  return (
    <>
      <StatusBar
        style={isHighContrast ? 'light' : 'dark'}
        backgroundColor={colors.backgroundSecondary}
        translucent={true}
      />
      <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="health-records" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Handle error
        console.warn(e);
      }
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <UserProvider>
          <SettingsProvider>
            <AdminProvider>
              <MealTrackingProvider>
                <RootLayoutNav />
              </MealTrackingProvider>
            </AdminProvider>
          </SettingsProvider>
        </UserProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}