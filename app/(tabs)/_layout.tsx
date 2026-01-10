import { Tabs } from "expo-router";
import { Home, Activity, MessageCircle, Award, User } from "lucide-react-native";
import React, { type ReactElement } from "react";
import Colors from "@/constants/colors";
import { HapticTab } from "@/components/haptic-tab";

// Define the type locally instead of importing
type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

export default function TabLayout(): ReactElement {
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
          title: "Home",
          tabBarIcon: ({ color, size }: TabBarIconProps) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: "Wellness",
          tabBarIcon: ({ color, size }: TabBarIconProps) => <Activity size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: "Ask Chori",
          tabBarIcon: ({ color, size }: TabBarIconProps) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color, size }: TabBarIconProps) => <Award size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }: TabBarIconProps) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}