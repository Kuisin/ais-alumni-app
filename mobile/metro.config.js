const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// UI strings are the website's own (../messages/<locale>/<namespace>.json),
// imported through the "@messages/*" path in tsconfig.json.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, "../messages"),
];

module.exports = config;
