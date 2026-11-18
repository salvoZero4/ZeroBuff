import { ApiError, NetworkError } from "@/shared/api/errors";
import { loadErrorMessage } from "@/shared/api/loadError";
import { i18n, translate } from "./i18n";

export function errorText(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) {
    return translate(loadErrorMessage(error));
  }
  if (error instanceof ApiError) {
    if ([403, 404, 429].includes(error.status) || error.status >= 500) {
      return translate(loadErrorMessage(error));
    }
  }
  if (error instanceof Error && error.message) {
    if (i18n.exists(error.message) || i18n.resolvedLanguage === "en") {
      return translate(error.message);
    }
  }
  return translate(fallback);
}

const fieldMessages: Readonly<Record<string, string>> = {
  date: "Enter a valid date.",
  date_of_birth: "Enter a valid date.",
  email: "Enter a valid email address.",
  exercise_name: "Enter an exercise name.",
  height_cm: "Select a valid height.",
  password:
    "At least 8 characters, including an uppercase letter, a lowercase letter, and a digit.",
  reps: "Reps must be a whole number of at least 1.",
  rir: "RIR must be a whole number from 0 to 10, or empty.",
  set_number: "Set number must be a whole number of at least 1.",
  username: "Username must be at least 3 characters.",
  weight: "Enter a valid weight.",
};

export function localizedFieldErrors(
  errors: Record<string, string>,
): Record<string, string> {
  if (i18n.resolvedLanguage !== "it") return errors;

  return Object.fromEntries(
    Object.keys(errors).map((field) => [
      field,
      translate(fieldMessages[field] ?? "Check this value."),
    ]),
  );
}
