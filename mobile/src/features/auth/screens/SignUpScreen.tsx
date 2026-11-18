import { errorText, localizedFieldErrors } from "@/shared/i18n/errors";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import { ApiError } from "@/shared/api/errors";
import { AuthFormLayout } from "@/features/auth/components/AuthFormLayout";
import { TextField } from "@/components/ui/TextField";
import {
  getRegistrationPasswordError,
  REGISTRATION_PASSWORD_HINT,
} from "@/features/auth/utils/registrationPassword";

type Field = "username" | "email" | "password";
type FormErrors = Partial<Record<Field, string>>;

function validate(values: Record<Field, string>): FormErrors {
  const username = (values.username ?? "").trim();
  const email = (values.email ?? "").trim();
  const password = values.password ?? "";
  const errors: FormErrors = {};

  if (!username) {
    errors.username = "Add a username.";
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  const passwordError = getRegistrationPasswordError(password);
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function SignUpScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { mutate: handleSignUp, isPending } = useMutation({
    mutationFn: () =>
      signUp(username.trim(), email.trim().toLowerCase(), password),
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          setErrors(localizedFieldErrors(err.fieldErrors));
        } else {
          setGeneralError(
            errorText(
              err,
              err.status === 409
                ? "An account already exists with these details."
                : "Failed to create account.",
            ),
          );
        }
      } else {
        setGeneralError(
          t("Unable to connect to the server. Check your connection."),
        );
      }
    },
  });

  function clearError(field: Field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralError(null);
  }

  function handleSubmit() {
    const found = validate({ username, email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setGeneralError(null);
    handleSignUp();
  }

  return (
    <AuthFormLayout
      title={t("Create account")}
      subtitle={t(
        "Create a training home for every set, session, and routine.",
      )}
      error={generalError}
      submitLabel={isPending ? t("Creating account...") : t("Create account")}
      isPending={isPending}
      onSubmit={handleSubmit}
      switchPrompt={t("Already training with us?")}
      switchLabel={t("Sign in")}
      switchHref="/(auth)/sign-in"
    >
      <TextField
        label={t("Username")}
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          clearError("username");
        }}
        error={errors.username ? t(errors.username) : undefined}
        placeholder={t("How should we call you?")}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        editable={!isPending}
      />

      <TextField
        label={t("Email")}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearError("email");
        }}
        error={errors.email ? t(errors.email) : undefined}
        placeholder={t("you@example.com")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!isPending}
      />

      <TextField
        label={t("Password")}
        helperText={REGISTRATION_PASSWORD_HINT}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearError("password");
        }}
        error={errors.password ? t(errors.password) : undefined}
        placeholder={t("Your password")}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!isPending}
      />
    </AuthFormLayout>
  );
}
