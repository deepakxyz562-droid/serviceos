import { getDefaultConfig } from 'expo/metro-config';
import { withNativeWind } from 'nativewind/metro';

const config = getDefaultConfig(__dirname);

config.watcher.healthCheck.enabled = false;

export default withNativeWind(config, { input: './global.css' });
