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
          setErrors(err.fieldErrors);
        } else {
          setGeneralError(err.message || "Failed to create account.");
        }
      } else {
        setGeneralError(
          "Unable to connect to the server. Check your connection.",
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
      title="Create account"
      subtitle="Create a training home for every set, session, and routine."
      error={generalError}
      submitLabel={isPending ? "Creating account..." : "Create account"}
      isPending={isPending}
      onSubmit={handleSubmit}
      switchPrompt="Already training with us?"
      switchLabel="Sign in"
      switchHref="/(auth)/sign-in"
    >
      <TextField
        label="Username"
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          clearError("username");
        }}
        error={errors.username}
        placeholder="How should we call you?"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        editable={!isPending}
      />

      <TextField
        label="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearError("email");
        }}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!isPending}
      />

      <TextField
        label="Password"
        helperText={REGISTRATION_PASSWORD_HINT}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearError("password");
        }}
        error={errors.password}
        placeholder="Your password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!isPending}
      />
    </AuthFormLayout>
  );
}
