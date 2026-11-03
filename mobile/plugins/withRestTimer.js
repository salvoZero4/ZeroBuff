const { withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

// expo-widgets owns the target, signing, App Group and embedding configuration.
// Supply a native ActivityKit layout to support actions without a JS runtime.
module.exports = function withRestTimer(config) {
  return withDangerousMod(config, [
    "ios",
    async (mod) => {
      const root = mod.modRequest.projectRoot;
      const target = path.join(
        mod.modRequest.platformProjectRoot,
        "ExpoWidgetsTarget",
        "index.swift",
      );
      const state = await fs.readFile(
        path.join(root, "modules/rest-timer/ios/RestTimerState.swift"),
        "utf8",
      );
      const shared = await fs.readFile(
        path.join(root, "modules/rest-timer/ios/RestTimerShared.swift"),
        "utf8",
      );
      const alerts = await fs.readFile(
        path.join(root, "modules/rest-timer/ios/RestCompletionAlerts.swift"),
        "utf8",
      );
      const widget = await fs.readFile(
        path.join(root, "modules/rest-timer/widget/RestTimerWidget.swift"),
        "utf8",
      );
      await fs.writeFile(
        target,
        `${state}\n${alerts}\n${shared}\n${widget}\n@main\nstruct RestTimerBundle: WidgetBundle { var body: some Widget { RestTimerWidget() } }\n`,
      );
      // Remove the old generated Notifee declaration on incremental prebuilds.
      const podfilePath = path.join(
        mod.modRequest.platformProjectRoot,
        "Podfile",
      );
      const podfile = await fs.readFile(podfilePath, "utf8");
      await fs.writeFile(
        podfilePath,
        podfile.replace(
          /# ZeroBuff Notifee modular headers\npod 'RNNotifee'[^\n]*\n\n?/g,
          "",
        ),
      );
      return mod;
    },
  ]);
};
