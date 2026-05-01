import { Tabs } from "expo-router";
import { Home, Activity, MessageCircle, Award, User, Sparkles, Zap, Brain, Trophy } from "lucide-react-native";
import React, { type ReactElement, useMemo } from "react";
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from "@/contexts/SettingsContext";
import { HapticTab } from "@/components/haptic-tab";
import { useTranslation } from "@/hooks/use-translation";
import { LinearGradient } from "expo-linear-gradient";

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

export default function TabLayout(): ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, scale } = useTheme();

  const themed = useMemo(() => ({
    tabBar: {
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      height: Platform.OS === 'ios' ? 88 : 60,
      paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
      paddingTop: 8,
    },
    label: {
      fontSize: scale(11),
      fontWeight: '600' as const,
      marginBottom: 2,
    }
  }), [colors, scale, insets.bottom]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: themed.tabBar,
        tabBarLabelStyle: themed.label,
        tabBarButton: (props) => <HapticTab {...props} />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: t.tabs.wellness,
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: t.tabs.chatbot,
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t.tabs.rewards,
          tabBarIcon: ({ color }) => <Award size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
