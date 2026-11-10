const fs = require('node:fs');
const path = require('node:path');
const {
  createRunOncePlugin,
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const GOOGLE_SERVICES_CLASSPATH = 'com.google.gms:google-services';
const GOOGLE_SERVICES_VERSION = '4.5.0';
const GOOGLE_SERVICES_PLUGIN = 'com.google.gms.google-services';

function withAndroidFirebase(config) {
  config = withProjectBuildGradle(config, (modConfig) => {
    if (
      modConfig.modResults.language === 'groovy' &&
      !modConfig.modResults.contents.includes(GOOGLE_SERVICES_CLASSPATH)
    ) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    classpath('${GOOGLE_SERVICES_CLASSPATH}:${GOOGLE_SERVICES_VERSION}')`,
      );
    }
    return modConfig;
  });

  config = withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      const pattern = new RegExp(`apply\\s+plugin:\\s+['"]${GOOGLE_SERVICES_PLUGIN}['"]`);
      if (!pattern.test(modConfig.modResults.contents)) {
        modConfig.modResults.contents += `\napply plugin: '${GOOGLE_SERVICES_PLUGIN}'`;
      }
    }
    return modConfig;
  });

  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const configuredFile = modConfig.android?.googleServicesFile;
      if (!configuredFile) {
        return modConfig;
      }
      const srcPath = path.resolve(modConfig.modRequest.projectRoot, configuredFile);
      const destPath = path.resolve(modConfig.modRequest.platformProjectRoot, 'app', 'google-services.json');
      if (fs.existsSync(srcPath)) {
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.copyFile(srcPath, destPath);
      }
      return modConfig;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(withAndroidFirebase, 'bgos-android-firebase', '1.0.0');
