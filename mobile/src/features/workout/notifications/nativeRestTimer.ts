import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export interface NativeRestTimerModule {
  getState(): Promise<string | null>;
  setTimer(json: string, expectedVersion: number): Promise<string>;
  clear(): Promise<void>;
  canShowLiveActivity(): boolean;
  performAction?(
    action: string,
    id: string,
    version: number,
  ): Promise<string | null>;
  promoteNotification?(id: string): Promise<void>;
  addListener(
    name: "onRestTimerChanged",
    callback: () => void,
  ): { remove(): void };
}

export const nativeRestTimer =
  Platform.OS === "web"
    ? null
    : requireOptionalNativeModule<NativeRestTimerModule>("ZeroBuffRestTimer");
