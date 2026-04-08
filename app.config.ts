import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'expo-supabase-starter',
  slug: 'expo-supabase-starter',
  version: '1.0.0',
  scheme: 'supabaseexpo',
  orientation: 'portrait',
  platforms: ['ios', 'android', 'web'],
  extra: {
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
    eas: {
      projectId: 'CHANGE_ME_BEFORE_BUILD'
    }
  },
  ios: {
    supportsTablet: true
  },
  android: {
    permissions: [
      'NOTIFICATIONS',
    ],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    }
  },
  web: {
    bundler: 'metro'
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#22c55e',
        sounds: [],
      },
    ],
  ]
});
