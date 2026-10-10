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

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type Field = "username" | "email" | "password";
type FormErrors = Partial<Record<Field, string>>;

const MIN_PASSWORD_LENGTH = 8; // adjust to the backend's rule

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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  function clearError(field: Field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit() {
    const found = validate({ username, email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // TODO: call the register endpoint
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 40}
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
            />

            <Button label="Create account" onPress={handleSubmit} />
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-xs pb-md">
          <Text className="font-body text-caption text-text-secondary">
            Already training with us?
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable
              accessibilityRole="link"
              className="min-h-12 justify-center px-sm"
            >
              <Text className="font-body-semibold text-caption text-accent">
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
