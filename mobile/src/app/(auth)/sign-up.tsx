import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError } from "@/utils/api/errors";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

type Field = "username" | "email" | "password";
type FormErrors = Partial<Record<Field, string>>;

const MIN_PASSWORD_LENGTH = 8;

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
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return errors;
}

export default function SignUp() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { mutate: handleSignUp, isPending } = useMutation({
    mutationFn: async () => {
      setGeneralError(null);
      await signUp(username.trim(), email.trim().toLowerCase(), password);
    },
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

    handleSignUp();
  }

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: "#0B0B0B" }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "space-between",
        padding: 16,
      }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-between gap-xl p-lg"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-xl">
          <View className="gap-sm">
            <Text className="font-body-semibold text-caption uppercase tracking-[1.6px] text-accent">
              Get started
            </Text>
            <Text className="font-body-bold text-title text-text-primary">
              Build your baseline.
            </Text>
            <Text className="font-body text-body leading-6 text-text-secondary">
              Create a training home for every set, session, and routine.
            </Text>
          </View>

          <View className="gap-lg">
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

            {generalError ? (
              <View className="rounded-sm border border-danger/40 bg-danger/10 p-md">
                <Text className="font-body text-caption text-danger">
                  {generalError}
                </Text>
              </View>
            ) : null}

            <Button
              label={isPending ? "Creating account..." : "Create account"}
              onPress={handleSubmit}
              disabled={isPending}
            />
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-xs pb-md">
          <Text className="font-body text-caption text-text-secondary">
            Already training with us?
          </Text>
          <Link href="/(auth)/sign-in" replace asChild>
            <Pressable
              accessibilityRole="link"
              className="min-h-12 justify-center px-sm"
              disabled={isPending}
            >
              <Text className="font-body-semibold text-caption text-accent">
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAwareScrollView>
  );
}
