import { Stack } from "expo-router";
import "../../global.css";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useEffect } from "react";
import { Oswald_500Medium, Oswald_700Bold } from "@expo-google-fonts/oswald";
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from "@expo-google-fonts/work-sans";
import { Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import {
  GestureHandlerRootView,
  InterceptingGestureDetector,
} from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/features/auth/provider/AuthProvider";
import { BackgroundRestTimerProvider } from "@/features/workout/notifications/BackgroundRestTimerProvider";
import { queryClient } from "@/shared/api/queryClient";

SplashScreen.preventAutoHideAsync();

configureReanimatedLogger({
  level: ReanimatedLogLevel.error,
});

if (Platform.OS !== "web") {
  void SystemUI.setBackgroundColorAsync("#0B0B0B");
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#0B0B0B" }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BackgroundRestTimerProvider>
            <KeyboardProvider
              statusBarTranslucent
              navigationBarTranslucent
              preserveEdgeToEdge
            >
              <RootNavigator />
            </KeyboardProvider>
          </BackgroundRestTimerProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
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
    if (error) {
      console.error("Failed to load app fonts.", error);
    }

    if (loaded || error) {
      SplashScreen.hideAsync();
    }

    if (status !== "loading") SplashScreen.hideAsync();
  }, [loaded, error, status]);

  if (!loaded && !error) return null;

  if (status === "loading") return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0B0B0B" }}>
      <StatusBar style="light" />
      <InterceptingGestureDetector>
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
            <Stack.Screen name="index" options={{ headerShown: false }} />

            <Stack.Protected guard={status === "signedIn"}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="workout"
                options={{
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen name="schedule" options={{ headerShown: false }} />
              <Stack.Screen
                name="exercises"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="session/[sessionId]"
                options={{ headerShown: false }}
              />
            </Stack.Protected>
            <Stack.Protected guard={status === "signedOut"}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </SafeAreaView>
      </InterceptingGestureDetector>
    </GestureHandlerRootView>
  );
}
