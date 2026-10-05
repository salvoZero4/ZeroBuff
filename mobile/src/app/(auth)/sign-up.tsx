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

// PROVISIONAL: registration is presentation-only until the auth service is
// connected. The form does not create an account locally.
export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit() {
    setMessage(
      username.trim() && email.trim()
        ? "Account connection is not available in this local build."
        : "Add a username and email to continue.",
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
              Get started
            </Text>
            <Text className="font-body-bold text-title text-text-primary">
              Build your baseline.
            </Text>
            <Text className="font-body text-body leading-6 text-text-secondary">
              Create a training home for every set, session, and routine.
            </Text>
          </View>

          <View className="gap-md">
            <Field
              label="Username"
              value={username}
              placeholder="How should we call you?"
              onChangeText={setUsername}
            />
            <Field
              label="Email"
              value={email}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
            />
            {message ? (
              <Text className="font-body text-caption leading-5 text-text-secondary">
                {message}
              </Text>
            ) : null}
            <Pressable
              accessibilityLabel="Create account"
              accessibilityRole="button"
              className="min-h-14 items-center justify-center rounded-sm bg-accent active:bg-accent-pressed"
              onPress={handleSubmit}
            >
              <Text className="font-body-bold text-body text-on-accent">
                Create account
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-xs pb-md">
          <Text className="font-body text-caption text-text-secondary">
            Already training with us?
          </Text>
          <Link
            accessibilityRole="link"
            className="min-h-12 justify-center px-sm font-body-semibold text-caption text-accent"
            href="/(auth)/sign-in"
          >
            Sign in
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
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
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
        value={value}
      />
    </View>
  );
}
