// Register notification actions before React mounts, including Headless JS launches.
import { registerRestTimerNotifications } from "./src/features/workout/notifications/notifeeRuntime";
registerRestTimerNotifications();
require("expo-router/entry");
