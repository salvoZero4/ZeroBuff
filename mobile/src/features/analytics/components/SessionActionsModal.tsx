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
  return (
    <ActionSheet
      visible={visible}
      title="Session actions"
      subtitle={date}
      onClose={onClose}
      actions={[
        {
          label: "View / edit session",
          icon: "pen-to-square",
          onPress: onView,
        },
        {
          label: "Delete session",
          icon: "trash",
          destructive: true,
          onPress: onDelete,
        },
      ]}
    />
  );
}
