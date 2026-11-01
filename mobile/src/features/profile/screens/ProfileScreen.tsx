import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Section } from "@/components/ui/Section";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  SelectPickerModal,
  type PickerOption,
} from "@/components/ui/SelectPickerModal";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import { getCurrentUser, updateCurrentUser } from "@/features/profile/api/user";
import type { Sex } from "@/features/profile/types/user";
import { ProfileHeaderCard } from "@/features/profile/components/ProfileHeaderCard";
import { SettingRow } from "@/features/profile/components/SettingRow";
import {
  EditProfileFieldModal,
  formatHeightDetail,
  type EditableProfileField,
} from "@/features/profile/components/EditProfileModal";
import { ChangePasswordModal } from "@/features/profile/components/ChangePasswordModal";

const SEX_OPTIONS: readonly PickerOption[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
  //{ label: "Remove", value: null },
];

export function ProfileScreen() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  const [editingField, setEditingField] = useState<EditableProfileField>(null);
  const [showSexPicker, setShowSexPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const {
    data: user,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["users", "me"],
    queryFn: getCurrentUser,
  });

  const { mutate: updateSex } = useMutation({
    mutationFn: (selectedSex: Sex) => updateCurrentUser({ sex: selectedSex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#f5f5f5" />
      </View>
    );
  }

  const formattedSex = user?.sex
    ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1)
    : "";

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#f5f5f5"
          />
        }
      >
        <ScreenHeader title="Profile" subtitle="Your account and preferences" />

        {/* Toccando la card si modifica solo lo username */}
        <ProfileHeaderCard
          username={user?.username}
          email={user?.email}
          onPress={() => setEditingField("username")}
        />

        <Section title="Personal info">
          <View className="overflow-hidden rounded-md border border-border bg-surface">
            <SettingRow
              title="Height"
              detail={formatHeightDetail(user?.height_cm)}
              onPress={() => setEditingField("height")}
            />
            <SettingRow
              title="Sex"
              detail={formattedSex}
              onPress={() => setShowSexPicker(true)}
            />
            <SettingRow
              title="Date of birth"
              detail={user?.date_of_birth ?? ""}
              isLast
              onPress={() => setEditingField("dob")}
            />
          </View>
        </Section>

        <Section title="Account">
          <View className="overflow-hidden rounded-md border border-border bg-surface">
            <SettingRow
              title="Change password"
              detail="Update your account password"
              onPress={() => setShowPasswordModal(true)}
            />
          </View>
        </Section>
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-sm border border-border bg-surface active:bg-surface-raised"
          onPress={() => setShowSignOutModal(true)}
        >
          <Text className="font-body-semibold text-body text-danger">
            Sign out
          </Text>
        </Pressable>
      </ScrollView>

      {/* Modale singolo campo: Username, Height (cm o ft/in) o Date of Birth */}
      {editingField ? (
        <EditProfileFieldModal
          field={editingField}
          user={user}
          onClose={() => setEditingField(null)}
        />
      ) : null}

      {/* Selettore diretto per Biological Sex */}
      {showSexPicker ? (
        <SelectPickerModal
          visible
          title="Biological sex"
          options={SEX_OPTIONS}
          selectedValues={user?.sex ? [user.sex] : []}
          multiSelect={false}
          onConfirm={(vals) => updateSex(vals[0] as Sex)}
          onClose={() => setShowSexPicker(false)}
        />
      ) : null}

      {/* Modale Cambio Password */}
      {showPasswordModal ? (
        <ChangePasswordModal
          visible
          onClose={() => setShowPasswordModal(false)}
        />
      ) : null}

      {/* Modale Conferma Logout */}
      {showSignOutModal ? (
        <ConfirmModal
          visible
          title="Sign out"
          description="Are you sure you want to sign out of your account?"
          confirmLabel="Sign out"
          cancelLabel="Cancel"
          isDestructive
          onConfirm={() => {
            setShowSignOutModal(false);
            void signOut();
          }}
          onCancel={() => setShowSignOutModal(false)}
        />
      ) : null}
    </View>
  );
}
