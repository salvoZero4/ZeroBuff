import { Tabs } from "expo-router";
import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import { styled } from "nativewind";
import { Text, View } from "react-native";

const StyledFontAwesome6 = styled(FontAwesome6, {
  className: { target: "style", nativeStyleMapping: { color: "color" } },
});

function TabIcon({
  name,
  focused,
  size,
}: {
  name: "house" | "calendar-day" | "chart-simple" | "user";
  focused: boolean;
  size: number;
}) {
  return (
    <StyledFontAwesome6
      name={name}
      iconStyle="solid"
      className={focused ? "text-accent" : "text-text-secondary"}
      size={size}
    />
  );
}

function TabLabel({
  children,
  focused,
}: {
  children: string;
  focused: boolean;
}) {
  return (
    <Text
      className={`font-body-semibold text-caption ${
        focused ? "text-accent" : "text-text-secondary"
      }`}
    >
      {children}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 82,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: "transparent",
          borderTopWidth: 0,
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarBackground: () => (
          <View className="absolute inset-0 border-t border-border bg-surface" />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused}>Today</TabLabel>
          ),
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} name="house" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: "Routines",
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused}>Routines</TabLabel>
          ),
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} name="calendar-day" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused}>Analytics</TabLabel>
          ),
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} name="chart-simple" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused}>Profile</TabLabel>
          ),
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} name="user" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
