import { Text, View } from "react-native";
import { IconButton } from "@/components/ui/IconButton";

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
    <View className="min-h-14 flex-row items-center gap-md py-lg">
      <View className="flex-1 gap-xs">
        <Text className="font-body-bold text-xl text-text-primary">
          {username || "ZeroBuff Athlete"}
        </Text>
        <Text className="font-body text-caption text-text-secondary">
          {email || "Tap to edit your username"}
        </Text>
      </View>

      <IconButton
        icon="pen-to-square"
        label="Edit username"
        variant="bare"
        onPress={onPress}
      />
    </View>
  );
}
