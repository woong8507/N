import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const rawSupabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ??
  process.env.SUPABASE_URL ??
  (Constants.expoConfig?.extra?.SUPABASE_URL as string | undefined);
const rawSupabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ??
  process.env.SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string | undefined);

const isPlaceholderValue = (value?: string) =>
  !value ||
  value.includes('your-project.supabase.co') ||
  value === 'your-anon-key' ||
  value === 'CHANGE_ME';

const supabaseUrl = isPlaceholderValue(rawSupabaseUrl) ? undefined : rawSupabaseUrl;
const supabaseAnonKey = isPlaceholderValue(rawSupabaseAnonKey) ? undefined : rawSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase URL or anon key is missing or still set to example values. Set real EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type Database = unknown;
