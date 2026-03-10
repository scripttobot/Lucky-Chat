const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const exclusionList = [
  /node_modules\/.*\/test\/.*/,
  /node_modules\/.*\/__tests__\/.*/,
  /node_modules\/.*\/dist\/.*test.*/,
];

const existingBlockList = config.resolver?.blockList;
if (existingBlockList) {
  if (Array.isArray(existingBlockList)) {
    exclusionList.push(...existingBlockList);
  } else {
    exclusionList.push(existingBlockList);
  }
}

config.resolver = {
  ...config.resolver,
  blockList: exclusionList,
};

module.exports = config;
