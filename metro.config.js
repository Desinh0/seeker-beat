const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Заставляем Metro компилировать современные модули, которые используют #height
config.resolver.unstable_enablePackageExports = true;
config.resolver.sourceExts.push('mjs');

module.exports = config;