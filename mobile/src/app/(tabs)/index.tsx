import { useLanguage } from "@/shared/i18n/LanguageProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback } from "react";
import { AppState } from "react-native";
import { TodayScreen as TodayView } from "@/features/today/screens/TodayScreen";
import { nativeRestTimer } from "@/features/workout/notifications/nativeRestTimer";
import { getRestTimerRuntime } from "@/features/workout/notifications/restNotificationsRuntime";

export default function TodayRoute() {
  const navigation = useNavigation();
  const { language } = useLanguage();
  useFocusEffect(
    useCallback(() => {
      const runtime = getRestTimerRuntime();
      if (!runtime) return;

      const request = () => {
        void runtime
          .requestOnToday(
            () => navigation.isFocused() && AppState.currentState === "active",
            AsyncStorage,
            nativeRestTimer?.isNotificationPermissionUndetermined,
            language,
          )
          .catch((error) => {
            console.warn(
              "[RestTimer] Could not request notification permission",
              error,
            );
          });
      };
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") request();
      });
      request();
      return () => subscription.remove();
    }, [navigation, language]),
  );

  return <TodayView />;
}
