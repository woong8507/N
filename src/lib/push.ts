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

export type PushRegistrationStatus =
  | 'idle'
  | 'checking'
  | 'unsupported'
  | 'simulator'
  | 'denied'
  | 'registered'
  | 'error';

export type PushRegistrationResult = {
  status: PushRegistrationStatus;
  token: string | null;
  message: string;
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

const getProjectId = () =>
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined)
  ?? Constants.easConfig?.projectId;

const isValidProjectId = (projectId?: string | null) =>
  Boolean(projectId && projectId !== 'CHANGE_ME_BEFORE_BUILD');

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22c55e',
  });
}

/**
 * Ask permission, get Expo push token, and persist to Supabase `push_tokens` table.
 */
export async function registerForPush(): Promise<PushRegistrationResult> {
  if (!supabase) {
    return {
      status: 'error',
      token: null,
      message: 'Supabase 설정이 없어 푸시 토큰을 저장할 수 없습니다.',
    };
  }
  if (Platform.OS === 'web') {
    return {
      status: 'unsupported',
      token: null,
      message: '푸시 알림은 iOS/Android 앱에서만 지원됩니다.',
    };
  }

  if (!Device.isDevice) {
    const message = '푸시 알림은 실제 디바이스에서만 테스트할 수 있습니다.';
    console.warn(message);
    return {
      status: 'simulator',
      token: null,
      message,
    };
  }

  await ensureAndroidNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    const message = '알림 권한이 거부되었습니다. 시스템 설정에서 알림을 허용하세요.';
    console.warn(message);
    return {
      status: 'denied',
      token: null,
      message,
    };
  }

  const projectId = getProjectId();
  if (!isValidProjectId(projectId)) {
    return {
      status: 'error',
      token: null,
      message: 'Expo EAS projectId가 설정되지 않아 푸시 토큰을 발급할 수 없습니다.',
    };
  }

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    return {
      status: 'error',
      token: null,
      message: error instanceof Error ? error.message : 'Expo Push Token 발급에 실패했습니다.',
    };
  }

  if (!token) {
    return {
      status: 'error',
      token: null,
      message: 'Expo Push Token이 비어 있습니다.',
    };
  }

  const platform = Platform.OS;

  // Persist to Supabase (auth user required)
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    return {
      status: 'error',
      token,
      message: '로그인 사용자 정보를 찾지 못해 push_tokens 저장을 건너뛰었습니다.',
    };
  }

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

  if (error) {
    console.warn('Failed to save push token', error.message);
    return {
      status: 'error',
      token,
      message: `push_tokens 저장 실패: ${error.message}`,
    };
  }

  return {
    status: 'registered',
    token,
    message: '푸시 토큰을 발급하고 계정에 연결했습니다.',
  };
}
