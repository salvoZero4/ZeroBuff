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

type Field = "email" | "password";
type FormErrors = Partial<Record<Field, string>>;

function validate(values: Record<Field, string>): FormErrors {
  const errors: FormErrors = {};
  if (!(values.email ?? "").trim()) {
    errors.email = "Enter your email.";
  }
  if (!(values.password ?? "")) {
    errors.password = "Enter your password.";
  }
  return errors;
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  function clearError(field: Field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit() {
    const found = validate({ email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // TODO: call the login endpoint
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-between gap-xl p-lg"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-xl">
          <View className="gap-sm">
            <Text className="font-body-semibold text-caption uppercase tracking-[1.6px] text-accent">
              Welcome back
            </Text>
            <Text className="font-body-bold text-title text-text-primary">
              Train with intent.
            </Text>
            <Text className="font-body text-body leading-6 text-text-secondary">
              Sign in to keep your routines and progress in one place.
            </Text>
          </View>

          <View className="gap-lg">
            <TextField
              label="Email"
              value={email}
              onChangeText={(value) => {
                setEmail(value ?? "");
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
                setPassword(value ?? "");
                clearError("password");
              }}
              error={errors.password}
              placeholder="Your password"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />

            <Button label="Sign in" onPress={handleSubmit} />
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-xs pb-md">
          <Text className="font-body text-caption text-text-secondary">
            New to Zerobuff?
          </Text>
          <Link href="/(auth)/sign-up" replace asChild>
            <Pressable
              accessibilityRole="link"
              className="min-h-12 justify-center px-sm"
            >
              <Text className="font-body-semibold text-caption text-accent">
                Create an account
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
