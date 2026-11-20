import { useTranslation } from "react-i18next";
import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/ui/Icon";

function TabIcon({
  name,
  focused,
  size,
}: {
  name: IconName;
  focused: boolean;
  size: number;
}) {
  return (
    <Icon
      name={name}
      size={size}
      className={focused ? "text-accent" : "text-text-secondary"}
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
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const tabBarPadding = 10;
  const bottomPadding =
    Platform.OS === "android" ? Math.max(tabBarPadding, bottom) : tabBarPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          // Grow the bar with the Android inset to keep the tab row the same height.
          height: 82 + bottomPadding - tabBarPadding,
          paddingTop: tabBarPadding,
          paddingBottom: bottomPadding,
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
          title: t("Today"),
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused}>{t("Today")}</TabLabel>
          ),
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} name="house" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: t("Routines"),
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused}>{t("Routines")}</TabLabel>
          ),
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} name="calendar-day" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t("Analytics"),
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused}>{t("Analytics")}</TabLabel>
          ),
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} name="chart-simple" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("Profile"),
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused}>{t("Profile")}</TabLabel>
          ),
          tabBarIcon: ({ focused, size }) => (
            <TabIcon focused={focused} name="user" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
