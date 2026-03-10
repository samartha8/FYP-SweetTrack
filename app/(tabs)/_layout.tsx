import { Tabs } from "expo-router";
import { Home, Activity, MessageCircle, Award, User } from "lucide-react-native";
import React, { type ReactElement } from "react";
import Colors from "@/constants/colors";
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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
