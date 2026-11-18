import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { APP_BACKGROUND } from "@/theme/tokens";

type AuthFormLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  error: string | null;
  submitLabel: string;
  isPending: boolean;
  onSubmit: () => void;
  switchPrompt: string;
  switchLabel: string;
  switchHref: "/(auth)/sign-in" | "/(auth)/sign-up";
};

export function AuthFormLayout({
  title,
  subtitle,
  children,
  error,
  submitLabel,
  isPending,
  onSubmit,
  switchPrompt,
  switchLabel,
  switchHref,
}: AuthFormLayoutProps) {
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.screen}>
      <KeyboardAwareScrollView
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
        mode="layout"
        bottomOffset={20}
        extraKeyboardSpace={12}
      >
        <View className="gap-xl p-lg pb-xl">
          <ScreenHeader title={title} subtitle={subtitle} />

          <View className="gap-lg">
            {children}
            {error ? (
              <Text
                accessibilityRole="alert"
                className="font-body text-caption text-danger"
              >
                {error}
              </Text>
            ) : null}
            <Button
              label={submitLabel}
              onPress={onSubmit}
              disabled={isPending}
              accessibilityState={{ busy: isPending }}
            />
          </View>

          <View className="flex-row flex-wrap items-center justify-center gap-x-xs border-t border-border pt-sm">
            <Text className="text-center font-body text-caption text-text-secondary">
              {switchPrompt}
            </Text>
            <Link href={switchHref} replace asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityState={{ disabled: isPending }}
                className={`min-h-12 min-w-12 justify-center rounded-sm px-sm active:bg-surface ${isPending ? "opacity-50" : ""}`}
                disabled={isPending}
              >
                <Text className="text-center font-body-semibold text-caption text-text-primary">
                  {switchLabel}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
  },
});
