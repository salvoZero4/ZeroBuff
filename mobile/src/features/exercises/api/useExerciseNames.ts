import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { getExerciseTranslations } from "./exercise";
import { exerciseKeys } from "./queryKeys";

export function useExerciseNames() {
  const { language, ready } = useLanguage();
  const { status } = useAuth();
  const { data } = useQuery({
    queryKey: exerciseKeys.translations(language),
    queryFn: () => getExerciseTranslations(language),
    enabled: ready && status === "signedIn" && language !== "en",
    staleTime: 10 * 60 * 1000,
  });

  return useCallback(
    (exerciseId: string | undefined, canonicalName: string) =>
      (language !== "en" && exerciseId ? data?.get(exerciseId) : undefined) ??
      canonicalName,
    [data, language],
  );
}
