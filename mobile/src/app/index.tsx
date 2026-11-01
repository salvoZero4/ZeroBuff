import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth/provider/AuthProvider";

export default function Index() {
  const { status } = useAuth();

  if (status === "signedOut") {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(tabs)" />;
}
