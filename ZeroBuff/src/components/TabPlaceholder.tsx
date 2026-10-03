import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme/tokens";

type TabPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function TabPlaceholder({
  eyebrow,
  title,
  description,
}: TabPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  eyebrow: {
    marginBottom: spacing.sm,
    color: colors.accent,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.caption,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.title,
  },
  description: {
    maxWidth: 320,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.body,
    lineHeight: 24,
  },
});
