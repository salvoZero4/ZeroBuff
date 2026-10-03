import { Tabs } from "expo-router";
import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import type { ColorValue } from "react-native";

type TabIconProps = {
  color: ColorValue;
  size: number;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#B9714F",
        tabBarInactiveTintColor: "#A89B8C",
        tabBarStyle: {
          height: 76,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: "#1F1914",
          borderTopColor: "#342B23",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <FontAwesome6
              name="house"
              iconStyle="solid"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: "Routines",
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <FontAwesome6
              name="calendar-day"
              iconStyle="solid"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <FontAwesome6
              name="chart-simple"
              iconStyle="solid"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <FontAwesome6
              name="user"
              iconStyle="solid"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
