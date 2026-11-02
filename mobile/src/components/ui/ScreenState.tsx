import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "./Button";

export function ScreenSkeleton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-lg p-lg"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      {children}
      <Text
        accessibilityLiveRegion="polite"
        className="font-body text-caption text-text-secondary"
      >
        {slow
          ? "This is taking longer than usual. The server may be waking up."
          : label}
      </Text>
    </ScrollView>
  );
}

export function ScreenError({
  title,
  message,
  onRetry,
  busy = false,
  onBack,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  busy?: boolean;
  onBack?: () => void;
}) {
  return (
    <View className="flex-1 justify-center gap-lg bg-bg p-lg">
      <Text
        accessibilityRole="header"
        className="font-body-bold text-xl text-text-primary"
      >
        {title}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        className="font-body text-body text-text-secondary"
      >
        {message}
      </Text>
      <Button
        label={busy ? "Retrying…" : "Try again"}
        disabled={busy}
        onPress={onRetry}
      />
      {onBack ? (
        <Button label="Back to Today" variant="outline" onPress={onBack} />
      ) : null}
    </View>
  );
}
