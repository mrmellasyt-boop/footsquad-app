const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Ensure node_modules cache directories are watched (fixes Vercel/CI build)
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, "node_modules"),
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
