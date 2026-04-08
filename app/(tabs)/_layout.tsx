import { Tabs } from "expo-router";
import { Home, Activity, MessageCircle, Award, User } from "lucide-react-native";
import React, { type ReactElement } from "react";
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from "@/contexts/SettingsContext";
import { HapticTab } from "@/components/haptic-tab";
import { useTranslation } from "@/hooks/use-translation";

// Define the type locally instead of importing
type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

export default function TabLayout(): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, scale } = useTheme();

  // Calculate dynamic tab bar height based on safe area insets
  // On Android with edge-to-edge enabled, we need to account for the bottom navigation bar
  const tabHeight = Platform.OS === 'android' 
    ? (insets.bottom > 0 ? 70 + insets.bottom : 70) 
    : (insets.bottom > 0 ? 88 : 64);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom,
          elevation: 8,
          shadowColor: colors.cardShadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: scale(11),
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarButton: (props) => <HapticTab {...props} />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color, size }: TabBarIconProps) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: t.tabs.wellness,
          tabBarIcon: ({ color, size }: TabBarIconProps) => <Activity size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: t.tabs.chatbot,
          tabBarIcon: ({ color, size }: TabBarIconProps) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t.tabs.rewards,
          tabBarIcon: ({ color, size }: TabBarIconProps) => <Award size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, size }: TabBarIconProps) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
