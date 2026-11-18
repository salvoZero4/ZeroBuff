import { errorText, localizedFieldErrors } from "@/shared/i18n/errors";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import { ApiError } from "@/shared/api/errors";
import { AuthFormLayout } from "@/features/auth/components/AuthFormLayout";
import { TextField } from "@/components/ui/TextField";

type Field = "email" | "password";
type FormErrors = Partial<Record<Field, string>>;

function validate(values: Record<Field, string>): FormErrors {
  const email = values.email;
  const password = values.password;
  const errors: FormErrors = {};

  if (!password) {
    errors.password = "Enter your password.";
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

export function SignInScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { mutate: handleSignIn, isPending } = useMutation({
    mutationFn: () => signIn(email.trim().toLowerCase(), password),
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          setErrors(localizedFieldErrors(err.fieldErrors));
        } else {
          setGeneralError(errorText(err, "Invalid credentials."));
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
    const found = validate({ email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setGeneralError(null);
    handleSignIn();
  }

  return (
    <AuthFormLayout
      title={t("Sign in")}
      subtitle={t("Sign in to keep your routines and progress in one place.")}
      error={generalError}
      submitLabel={isPending ? t("Signing in...") : t("Sign in")}
      isPending={isPending}
      onSubmit={handleSubmit}
      switchPrompt={t("New to ZeroBuff?")}
      switchLabel={t("Create an account")}
      switchHref="/(auth)/sign-up"
    >
      <TextField
        label={t("Email")}
        value={email}
        onChangeText={(value) => {
          setEmail(value ?? "");
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
        value={password}
        onChangeText={(value) => {
          setPassword(value ?? "");
          clearError("password");
        }}
        error={errors.password ? t(errors.password) : undefined}
        placeholder={t("Your password")}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        editable={!isPending}
      />
    </AuthFormLayout>
  );
}
