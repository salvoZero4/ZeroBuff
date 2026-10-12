import NetInfo from "@react-native-community/netinfo";
import {
  QueryClient,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import { AppState } from "react-native";
import { ApiError } from "./errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data younger than 30s is served from cache without hitting the server.
      staleTime: 30_000,
      // Never retry when the server answered;
      // retry at most twice when there was no response at all.
      retry: (failureCount, error) =>
        error instanceof ApiError ? false : failureCount < 2,
    },
    mutations: {
      // Writes are never retried automatically: a retried POST could duplicate data.
      retry: false,
      networkMode: "always",
    },
  },
});

// Focus: tell React Query when the app returns to the foreground.
AppState.addEventListener("change", (state) => {
  focusManager.setFocused(state === "active");
});

// Online status: tell React Query when the phone loses/regains connectivity.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);
