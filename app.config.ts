import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  ?? process.env.EAS_PROJECT_ID
  ?? undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'N-clasico',
  slug: 'n-clasico',
  version: '1.0.0',
  scheme: 'supabaseexpo',
  icon: './assets/app-icon.png',
  orientation: 'portrait',
  platforms: ['ios', 'android', 'web'],
  extra: {
    EXPO_PUBLIC_SUPABASE_URL:
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    EXPO_PUBLIC_SUPABASE_ANON_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    ...(easProjectId
      ? {
          eas: {
            projectId: easProjectId,
          },
        }
      : {}),
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.alimajung2.exposupabasestarter',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.alimajung2.nclasico',
    permissions: ['NOTIFICATIONS'],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-foreground.png',
      backgroundColor: '#040b2c',
    },
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#c3ef00',
        sounds: [],
      },
    ],
  ],
});
