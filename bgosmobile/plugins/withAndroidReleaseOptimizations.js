const {
  withProjectBuildGradle,
  withGradleProperties,
} = require('expo/config-plugins');

function withAndroidReleaseOptimizations(config) {
  // 1. Ensure compileSdkVersion 36, targetSdkVersion 36, and stable androidx.core
  config = withProjectBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (contents.includes('compileSdkVersion = 35')) {
      contents = contents.replace('compileSdkVersion = 35', 'compileSdkVersion = 36');
    }
    if (contents.includes('targetSdkVersion = 35')) {
      contents = contents.replace('targetSdkVersion = 35', 'targetSdkVersion = 36');
    }
    if (contents.includes('26.1.10909125')) {
      contents = contents.replace('26.1.10909125', '27.1.12297006');
    }
    if (!contents.includes('compileSdkVersion = 36')) {
      contents = contents.replace(
        /buildscript\s*\{/,
        `buildscript {\n  ext {\n    buildToolsVersion = "35.0.0"\n    minSdkVersion = 24\n    compileSdkVersion = 36\n    targetSdkVersion = 36\n    ndkVersion = "27.1.12297006"\n  }`
      );
    }
    // Force stable androidx.core to avoid bleeding-edge 1.18.0 alpha mismatches
    if (!contents.includes("force 'androidx.core:core:")) {
      const forceResolution = `
  configurations.all {
    resolutionStrategy {
      force 'androidx.core:core:1.15.0'
      force 'androidx.core:core-ktx:1.15.0'
    }
  }`;
      contents = contents.replace(
        /allprojects\s*\{[\s\S]*?repositories\s*\{[\s\S]*?\}/,
        (match) => `${match}\n${forceResolution}`
      );
    }
    modConfig.modResults.contents = contents;
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
