import { useTranslation } from "react-i18next";
import { ActionSheet } from "@/components/ui/ActionSheet";
export function SessionActionsModal({
  visible,
  date,
  onView,
  onDelete,
  onClose,
}: {
  visible: boolean;
  date: string;
  onView: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ActionSheet
      visible={visible}
      title={t("Session actions")}
      subtitle={date}
      onClose={onClose}
      actions={[
        {
          label: t("View / edit session"),
          icon: "pen-to-square",
          onPress: onView,
        },
        {
          label: t("Delete session"),
          icon: "trash",
          destructive: true,
          onPress: onDelete,
        },
      ]}
    />
  );
}
