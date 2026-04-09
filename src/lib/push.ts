import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type PushTokenRow = {
  id: number;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask permission, get Expo push token, and persist to Supabase `push_tokens` table.
 */
export async function registerForPush() {
  if (!supabase) return null;
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push permission not granted');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const token = (
    await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  ).data;
  if (!token) return null;

  const platform = Platform.OS;

  // Persist to Supabase (auth user required)
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return token;

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: user.user.id,
      token,
      platform,
    },
    {
      onConflict: 'user_id,token',
    }
  );

  if (error) console.warn('Failed to save push token', error.message);

  return token;
}
