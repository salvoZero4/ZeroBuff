import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import { styled } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactNode } from "react";
import { router } from "expo-router";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAuth } from "@/providers/AuthProvider";
const StyledFontAwesome6 = styled(FontAwesome6, {
  className: {
    target: "style",
    nativeStyleMapping: { color: "color" },
  },
});

// PROVISIONAL: profile controls are visual until the user endpoint is wired.
export default function ProfileScreen() {
  const { signOut } = useAuth();
  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Profile" subtitle="Your account and preferences" />

        <View className="flex-row items-center gap-md rounded-md border border-border bg-surface p-lg">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-accent">
            <Text className="font-body-bold text-xl text-on-accent">ZB</Text>
          </View>
          <View className="flex-1 gap-xs">
            <Text className="font-body-bold text-xl text-text-primary">
              ZeroBuff
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              Set up your account to personalize ZeroBuff.
            </Text>
          </View>
          <StyledFontAwesome6
            name="chevron-right"
            iconStyle="solid"
            className="text-text-secondary"
            size={15}
          />
        </View>

        <ProfileSection title="Training">
          <SettingRow
            icon="weight-hanging"
            title="Weight unit"
            detail="Kilograms"
          />
          <SettingRow icon="ruler-vertical" title="Height" detail="Not set" />
        </ProfileSection>

        <ProfileSection title="Preferences">
          <SettingRow
            icon="bell"
            title="Workout reminders"
            detail="Off"
            trailing={<Toggle />}
          />
          <SettingRow
            icon="circle-info"
            title="About ZeroBuff"
            detail="Version 1.0.0"
          />
        </ProfileSection>

        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-sm border border-border active:bg-surface-raised"
          onPress={signOut}
        >
          <Text className="font-body-semibold text-body text-danger">
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-sm">
      <Text className="font-body-semibold text-body text-text-primary">
        {title}
      </Text>
      <View className="overflow-hidden rounded-md border border-border bg-surface">
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  detail,
  trailing,
}: {
  icon: "weight-hanging" | "ruler-vertical" | "bell" | "circle-info";
  title: string;
  detail: string;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityLabel={`${title}: ${detail}`}
      accessibilityRole="button"
      className="min-h-18 flex-row items-center gap-md border-b border-border px-lg active:bg-surface-raised"
    >
      <View className="h-10 w-10 items-center justify-center rounded-sm bg-surface-raised">
        <StyledFontAwesome6
          name={icon}
          iconStyle="solid"
          className="text-accent"
          size={17}
        />
      </View>
      <View className="flex-1 gap-xs">
        <Text className="font-body-semibold text-body text-text-primary">
          {title}
        </Text>
        <Text className="font-body text-caption text-text-secondary">
          {detail}
        </Text>
      </View>
      {trailing ?? (
        <StyledFontAwesome6
          name="chevron-right"
          iconStyle="solid"
          className="text-text-secondary"
          size={15}
        />
      )}
    </Pressable>
  );
}

function Toggle() {
  return (
    <View
      accessible
      accessibilityLabel="Workout reminders off"
      accessibilityRole="switch"
      accessibilityState={{ checked: false }}
      className="h-7 w-12 justify-center rounded-full bg-surface-raised p-xs"
    >
      <View className="h-5 w-5 rounded-full bg-text-secondary" />
    </View>
  );
}
