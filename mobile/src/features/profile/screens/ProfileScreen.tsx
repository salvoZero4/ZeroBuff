import { dateLocale } from "@/shared/i18n/i18n";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { useTranslation } from "react-i18next";
import { userKeys } from "@/features/profile/api/queryKeys";
import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileConsistency } from "@/features/profile/components/ProfileConsistency";
import { useHistory } from "@/features/analytics/hooks/useAnalytics";
import { Icon } from "@/components/ui/Icon";
import { ScreenError } from "@/components/ui/ScreenState";
import { loadErrorMessage } from "@/shared/api/loadError";
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
  const { t } = useTranslation();
  const { preference, setPreference } = useLanguage();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const languageOptions: PickerOption[] = [
    { value: "system", label: t("System") },
    { value: "it", label: "Italiano" },
    { value: "en", label: "English" },
  ];
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const history = useHistory();

  const [sexError, setSexError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditableProfileField>(null);
  const [showSexPicker, setShowSexPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const {
    data: user,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: userKeys.me(),
    queryFn: getCurrentUser,
  });

  const { mutate: updateSex, isPending: isUpdatingSex } = useMutation({
    mutationFn: (selectedSex: Sex) => updateCurrentUser({ sex: selectedSex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
      setSexError(null);
    },
    onError: () =>
      setSexError(t("Could not update this field. Select it again to retry.")),
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#f5f5f5" />
      </View>
    );
  }

  if (error && !user)
    return (
      <ScreenError
        title={t("Profile couldn’t load")}
        message={t(loadErrorMessage(error))}
        onRetry={() => void refetch()}
        busy={isRefetching}
      />
    );

  const formattedSex = user?.sex
    ? t(SEX_OPTIONS.find(({ value }) => value === user.sex)?.label ?? "")
    : "";

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || history.isRefetching}
            onRefresh={() => {
              void refetch();
              void history.refetch();
            }}
            tintColor="#f5f5f5"
          />
        }
      >
        <ScreenHeader
          title={t("Profile")}
          subtitle={t("Your account and personal details")}
        />

        <ProfileHeaderCard
          username={user?.username}
          email={user?.email}
          onPress={() => setEditingField("username")}
        />

        <ProfileConsistency history={history} />

        <SettingRow
          title={t("My exercises")}
          detail={t("Manage your custom exercises")}
          isLast
          onPress={() => router.push("/my-exercises")}
        />

        <Section title={t("Personal info")}>
          <View>
            <SettingRow
              title={t("Height")}
              detail={formatHeightDetail(user?.height_cm)}
              onPress={() => setEditingField("height")}
            />
            <SettingRow
              title={t("Sex")}
              detail={isUpdatingSex ? t("Saving…") : formattedSex}
              onPress={
                isUpdatingSex
                  ? undefined
                  : () => {
                      setSexError(null);
                      setShowSexPicker(true);
                    }
              }
            />
            <SettingRow
              title={t("Date of birth")}
              detail={
                user?.date_of_birth
                  ? new Date(
                      `${user.date_of_birth}T12:00:00`,
                    ).toLocaleDateString(dateLocale(), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : ""
              }
              isLast
              onPress={() => setEditingField("dob")}
            />
          </View>
        </Section>

        {sexError && (
          <Text
            accessibilityRole="alert"
            className="font-body text-caption text-danger"
          >
            {sexError}
          </Text>
        )}
        <Section title={t("Preferences")}>
          <SettingRow
            title={t("Language")}
            detail={
              languageOptions.find(({ value }) => value === preference)
                ?.label ?? ""
            }
            onPress={() => setShowLanguagePicker(true)}
            isLast
          />
        </Section>
        <Section title={t("Account")}>
          <View>
            <SettingRow
              isLast
              title={t("Change password")}
              detail={t("Update your account password")}
              onPress={() => setShowPasswordModal(true)}
            />
          </View>
        </Section>
        <Pressable
          accessibilityLabel={t("Sign out")}
          accessibilityRole="button"
          className="min-h-14 flex-row items-center gap-md rounded-sm py-lg active:bg-surface"
          onPress={() => setShowSignOutModal(true)}
        >
          <Icon name="right-from-bracket" size={18} className="text-danger" />
          <Text className="font-body-semibold text-body text-danger">
            {t("Sign out")}
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
          title={t("Biological sex")}
          options={SEX_OPTIONS.map((option) => ({
            ...option,
            label: t(option.label),
          }))}
          selectedValues={user?.sex ? [user.sex] : []}
          multiSelect={false}
          onConfirm={(vals) => updateSex(vals[0] as Sex)}
          onClose={() => setShowSexPicker(false)}
        />
      ) : null}

      {showLanguagePicker && (
        <SelectPickerModal
          visible
          title={t("Language")}
          options={languageOptions}
          selectedValues={[preference]}
          multiSelect={false}
          onConfirm={([value]) => {
            if (value === "system" || value === "it" || value === "en") {
              setPreference(value);
            }
          }}
          onClose={() => setShowLanguagePicker(false)}
        />
      )}

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
          title={t("Sign out")}
          description={t("Are you sure you want to sign out of your account?")}
          confirmLabel={t("Sign out")}
          cancelLabel={t("Cancel")}
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
