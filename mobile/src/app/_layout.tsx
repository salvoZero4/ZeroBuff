import { Stack } from "expo-router";
import "../../global.css";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Oswald_500Medium, Oswald_700Bold } from "@expo-google-fonts/oswald";
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from "@expo-google-fonts/work-sans";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { queryClient } from "@/utils/api/queryClient";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();

  const [loaded, error] = useFonts({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    Oswald_500Medium,
    Oswald_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }

    if (status !== "loading") SplashScreen.hideAsync();
  }, [loaded, error, status]);

  if (status === "loading") return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0B0B0B" }}>
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: "#0B0B0B" }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0B0B0B" },
          }}
        >
          <Stack.Protected guard={status === "signedIn"}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="workout"
              options={{
                headerShown: false,
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="schedule" options={{ headerShown: false }} />
            <Stack.Screen
              name="exercises"
              options={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            />
            {/* other protected routes (routine detail, workout...) */}
          </Stack.Protected>
          <Stack.Protected guard={status === "signedOut"}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
