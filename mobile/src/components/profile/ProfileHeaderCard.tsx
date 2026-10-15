import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/Icon";

type ProfileHeaderCardProps = {
  username?: string;
  email?: string;
  onPress: () => void;
};

export function ProfileHeaderCard({
  username,
  email,
  onPress,
}: ProfileHeaderCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit username and profile information"
      onPress={onPress}
      className="flex-row items-center justify-between gap-md rounded-md border border-border bg-surface p-lg active:bg-surface-raised"
    >
      <View className="flex-1 gap-xs">
        <Text className="font-body-bold text-xl text-text-primary">
          {username || "ZeroBuff Athlete"}
        </Text>
        <Text className="font-body text-caption text-text-secondary">
          {email || "Tap to edit your username"}
        </Text>
      </View>

      <View className="h-10 w-10 items-center justify-center rounded-sm bg-surface-raised">
        <Icon name="pen-to-square" size={16} className="text-accent" />
      </View>
    </Pressable>
  );
}
