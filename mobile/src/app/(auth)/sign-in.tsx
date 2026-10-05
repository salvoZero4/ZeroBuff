import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

// PROVISIONAL: authentication is presentation-only until the auth service is
// connected. Validation remains local and never claims a successful sign-in.
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit() {
    setMessage(
      email.trim() && password
        ? "Account connection is not available in this local build."
        : "Enter your email and password to continue.",
    );
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

          <View className="gap-md">
            <Field
              label="Email"
              value={email}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
            />
            <Field
              label="Password"
              value={password}
              placeholder="Your password"
              secureTextEntry
              onChangeText={setPassword}
            />
            {message ? (
              <Text className="font-body text-caption leading-5 text-text-secondary">
                {message}
              </Text>
            ) : null}
            <Pressable
              accessibilityLabel="Sign in"
              accessibilityRole="button"
              className="min-h-14 items-center justify-center rounded-sm bg-accent active:bg-accent-pressed"
              onPress={handleSubmit}
            >
              <Text className="font-body-bold text-body text-on-accent">
                Sign in
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-xs pb-md">
          <Text className="font-body text-caption text-text-secondary">
            New to ZeroBuff?
          </Text>
          <Link
            accessibilityRole="link"
            className="min-h-12 justify-center px-sm font-body-semibold text-caption text-accent"
            href="/(auth)/sign-up"
          >
            Create an account
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View className="gap-xs">
      <Text className="font-body-semibold text-caption text-text-primary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        className="min-h-14 rounded-sm border border-border bg-surface px-lg font-body text-body text-text-primary placeholder:text-text-secondary"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        value={value}
      />
    </View>
  );
}
