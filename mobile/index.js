// Register Expo's presentation handler before React mounts.
import { registerRestTimerNotifications } from "./src/features/workout/notifications/restNotificationsRuntime";
registerRestTimerNotifications();
require("expo-router/entry");
