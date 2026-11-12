const fs = require('node:fs');
const path = require('node:path');
const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withGradleProperties,
  withDangerousMod,
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
    // Match Expo SDK 58 template for AGP 9.2.1 until third-party RN modules migrate off kotlin-android / old DSL.
    addOrUpdate('android.builtInKotlin', 'false');
    addOrUpdate('android.newDsl', 'false');
    return modConfig;
  });

  // 2b. AGP 9 removed getDefaultProguardFile('proguard-android.txt')
  config = withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = modConfig.modResults.contents.replace(
      /getDefaultProguardFile\((['"])proguard-android\.txt\1\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")',
    );
    return modConfig;
  });

  // 3. Keep Gradle wrapper compatible with React Native 0.88 / AGP 9.2.1 (requires >= 9.4.1)
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const wrapperPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties',
      );
      if (fs.existsSync(wrapperPath)) {
        const current = await fs.promises.readFile(wrapperPath, 'utf8');
        const next = current.replace(
          /distributionUrl=.*/,
          'distributionUrl=https\\://services.gradle.org/distributions/gradle-9.4.1-bin.zip',
        );
        if (next !== current) {
          await fs.promises.writeFile(wrapperPath, next, 'utf8');
        }
      }
      return modConfig;
    },
  ]);

  return config;
}

module.exports = withAndroidReleaseOptimizations;
