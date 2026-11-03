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
        path.join(root, "modules/rest-timer/widget/NotifeeRestAlerts.swift"),
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
      // Swift AppIntents call Notifee's ObjC core directly. Expose its headers as
      // a module without enabling frameworks globally for every dependency.
      const podfilePath = path.join(
        mod.modRequest.platformProjectRoot,
        "Podfile",
      );
      const podfile = await fs.readFile(podfilePath, "utf8");
      if (!podfile.includes("# ZeroBuff Notifee modular headers")) {
        const declaration =
          "# ZeroBuff Notifee modular headers\npod 'RNNotifee', :path => File.join(__dir__, '..', 'node_modules', '@notifee', 'react-native'), :modular_headers => true\n\n";
        await fs.writeFile(
          podfilePath,
          podfile.replace(/^target /m, declaration + "target "),
        );
      }
      return mod;
    },
  ]);
};
