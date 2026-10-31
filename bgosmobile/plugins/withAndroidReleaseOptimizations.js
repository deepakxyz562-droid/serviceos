const {
  withProjectBuildGradle,
  withGradleProperties,
} = require('expo/config-plugins');

function withAndroidReleaseOptimizations(config) {
  // 1. Ensure targetSdkVersion 35 and compileSdkVersion 35 in project build.gradle
  config = withProjectBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (!contents.includes('targetSdkVersion = 35')) {
      contents = contents.replace(
        /buildscript\s*\{/,
        `buildscript {\n  ext {\n    buildToolsVersion = "35.0.0"\n    minSdkVersion = 24\n    compileSdkVersion = 35\n    targetSdkVersion = 35\n    ndkVersion = "26.1.10909125"\n  }`
      );
      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });

  // 2. Ensure release minification and shrinking in gradle.properties
  config = withGradleProperties(config, (modConfig) => {
    const props = modConfig.modResults;
    const addOrUpdate = (key, value) => {
      const existing = props.find((p) => p.type === 'property' && p.key === key);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };
    addOrUpdate('android.enableMinifyInReleaseBuilds', 'true');
    addOrUpdate('android.enableShrinkResourcesInReleaseBuilds', 'true');
    addOrUpdate('android.enablePngCrunchInReleaseBuilds', 'true');
    return modConfig;
  });

  return config;
}

module.exports = withAndroidReleaseOptimizations;
