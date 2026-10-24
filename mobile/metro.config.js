const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const nativewindConfig = withNativewind(config, {
  input: "./global.css",
  globalClassNamePolyfill: true,
});

const nativewindResolver = nativewindConfig.resolver.resolveRequest;

nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const isExpoAssetImport = context.originModulePath.includes(
    `${path.sep}expo-asset${path.sep}`,
  );

  if (moduleName === "react-native" && isExpoAssetImport) {
    return context.resolveRequest(context, moduleName, platform);
  }

  return nativewindResolver(context, moduleName, platform);
};

module.exports = nativewindConfig;
