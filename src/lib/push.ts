import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask permission, get Expo push token, and persist to Supabase `push_tokens` table.
 */
export async function registerForPush() {
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

  const projectId = Notifications.getExpoPushTokenAsync ? (await Notifications.getExpoPushTokenAsync()).data : null;
  if (!projectId) return null;

  const platform = Platform.OS;

  // Persist to Supabase (auth user required)
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return projectId;

  const { error } = await supabase.from('push_tokens').upsert({
    user_id: user.user.id,
    token: projectId,
    platform,
  });

  if (error) console.warn('Failed to save push token', error.message);

  return projectId;
}
