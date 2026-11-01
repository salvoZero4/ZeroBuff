import { Text } from "react-native";

import { Card } from "@/components/ui/Card";

type InfoCardProps = {
  title: string;
  description: string;
};

export function InfoCard({ title, description }: InfoCardProps) {
  return (
    <Card className="gap-xs">
      <Text className="font-body-bold text-xl text-text-primary">{title}</Text>
      <Text className="font-body text-caption leading-5 text-text-secondary">
        {description}
      </Text>
    </Card>
  );
}
