import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { registerForPush } from '@/lib/push';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Simple neon brand palette
const colors = {
  bg: '#0b0f16',
  card: '#111827',
  neon: '#39ff14',
  accent: '#24e6c0',
  input: '#0f172a',
  text: '#e2e8f0',
  sub: '#94a3b8',
  border: '#1f2937',
  surface: '#0d131d',
  surfaceAlt: '#101924',
  neonSoft: '#86ff6a',
};

type Screen = 'auth' | 'signup' | 'home' | 'schedule' | 'teams' | 'notice' | 'mySchedule' | 'league';
type Gender = 'MALE' | 'FEMALE';
type ProfileRole = 'member' | 'admin' | 'super_admin';

const NOTICE_BUCKET = 'notice-files';

type MatchSchedule = {
  id: number;
  date: string;
  weekday: string;
  place: '3F' | '4F';
  homeSeasonTeamId: number | null;
  awaySeasonTeamId: number | null;
  homeTeam: string;
  awayTeam: string;
  homePlayers: string;
  awayPlayers: string;
  homeScore: number | null;
  awayScore: number | null;
  homeRating: string | null;
  awayRating: string | null;
};

type Team = {
  id: number | string;
  name: string;
  memberCount: number;
};

type Season = {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'closed';
};

type LeagueRow = {
  rank: number;
  team: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gf: number;
  ga: number;
  gd: number;
  played: number;
};

type Profile = {
  id: string;
  name: string;
  gender: Gender;
  role: ProfileRole;
  auto_login: boolean | null;
};

type Notice = {
  id: number;
  title: string;
  body: string | null;
  file_url: string | null;
  created_at: string;
};

type SignupForm = {
  email: string;
  password: string;
  name: string;
  gender: Gender;
};

type DialogState = {
  visible: boolean;
  title: string;
  message?: string;
};

type MatchQueryRow = {
  id: number;
  match_date: string;
  weekday: string;
  place: '3F' | '4F';
  home_players: string | null;
  away_players: string | null;
  home_rating: string | null;
  away_rating: string | null;
  home_score: number | null;
  away_score: number | null;
  home_season_team_id: number | null;
  away_season_team_id: number | null;
};

type TeamQueryRow = {
  id: number;
  team: Array<{
    id: number;
    name: string;
    team_members: Array<{ user_id: string }> | null;
  }> | null;
};

type LeagueQueryRow = {
  rank: number;
  team: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gf: number;
  ga: number;
  gd: number;
  played: number;
};

type HomeTab = 'home' | 'schedule' | 'league' | 'teams' | 'notice';

const emptySignupForm: SignupForm = {
  email: '',
  password: '',
  name: '',
  gender: 'MALE',
};

const previewProfile: Profile = {
  id: 'preview-user',
  name: '홍길동',
  gender: 'MALE',
  role: 'member',
  auto_login: true,
};

const previewSchedules: MatchSchedule[] = [
  {
    id: 1,
    date: '2026-04-10T04:00:00+09:00',
    weekday: '금',
    place: '4F',
    homeSeasonTeamId: 1,
    awaySeasonTeamId: 2,
    homeTeam: '마인츠',
    awayTeam: '스트라스부르',
    homePlayers: '손흥민, 이강인',
    awayPlayers: '김민재, 황희찬',
    homeScore: null,
    awayScore: null,
    homeRating: 'A',
    awayRating: 'A',
  },
  {
    id: 2,
    date: '2026-04-12T18:30:00+09:00',
    weekday: '일',
    place: '3F',
    homeSeasonTeamId: 1,
    awaySeasonTeamId: 3,
    homeTeam: '서울FC',
    awayTeam: '수원블루',
    homePlayers: '김준호, 박민수',
    awayPlayers: '이현우, 정승민',
    homeScore: 2,
    awayScore: 1,
    homeRating: 'B+',
    awayRating: 'B',
  },
  {
    id: 3,
    date: '2026-04-14T20:00:00+09:00',
    weekday: '화',
    place: '4F',
    homeSeasonTeamId: 2,
    awaySeasonTeamId: 3,
    homeTeam: '아스날',
    awayTeam: '첼시',
    homePlayers: 'Player A, Player B',
    awayPlayers: 'Player C, Player D',
    homeScore: null,
    awayScore: null,
    homeRating: 'A-',
    awayRating: 'A',
  },
];

const previewTeams: Team[] = [
  { id: 1, name: '레드스타', memberCount: 14 },
  { id: 2, name: '블루웨이브', memberCount: 12 },
  { id: 3, name: '그린유나이티드', memberCount: 15 },
];

const previewLeagueTable: LeagueRow[] = [
  { rank: 1, team: '레드스타', wins: 5, draws: 1, losses: 0, points: 16, gf: 14, ga: 5, gd: 9, played: 6 },
  { rank: 2, team: '블루웨이브', wins: 4, draws: 1, losses: 1, points: 13, gf: 11, ga: 6, gd: 5, played: 6 },
];

const previewNotices: Notice[] = [
  {
    id: 1,
    title: '4월 2주차 메인 경기 오픈',
    body: '금요일 4F 대표 경기와 하이라이트 편성이 확정되었습니다.',
    file_url: null,
    created_at: '2026-04-09T09:00:00+09:00',
  },
  {
    id: 2,
    title: '유니폼 공지',
    body: '이번 주는 홈팀이 레드, 원정팀이 블루를 착용합니다.',
    file_url: null,
    created_at: '2026-04-08T12:30:00+09:00',
  },
];

const mapMatchRow = (row: MatchQueryRow, teamNamesBySeasonTeamId: Record<number, string>): MatchSchedule => ({
  id: row.id,
  date: row.match_date,
  weekday: row.weekday,
  place: row.place,
  homeSeasonTeamId: row.home_season_team_id,
  awaySeasonTeamId: row.away_season_team_id,
  homeTeam: row.home_season_team_id ? teamNamesBySeasonTeamId[row.home_season_team_id] ?? 'TBD' : 'TBD',
  awayTeam: row.away_season_team_id ? teamNamesBySeasonTeamId[row.away_season_team_id] ?? 'TBD' : 'TBD',
  homePlayers: row.home_players ?? '-',
  awayPlayers: row.away_players ?? '-',
  homeRating: row.home_rating,
  awayRating: row.away_rating,
  homeScore: row.home_score,
  awayScore: row.away_score,
});

const toDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const toCreatedAtLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '-');

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('auth');
  const [isHomePreview, setIsHomePreview] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [signupForm, setSignupForm] = useState<SignupForm>(emptySignupForm);
  const [dialog, setDialog] = useState<DialogState>({
    visible: false,
    title: '',
    message: '',
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [memberTeamIds, setMemberTeamIds] = useState<number[]>([]);
  const [schedules, setSchedules] = useState<MatchSchedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueTable, setLeagueTable] = useState<LeagueRow[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [selectedNoticeFile, setSelectedNoticeFile] = useState<DocumentPickerAsset | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isUploadingNotice, setIsUploadingNotice] = useState(false);

  const mySchedules = schedules.filter(
    (match) =>
      (match.homeSeasonTeamId !== null && memberTeamIds.includes(match.homeSeasonTeamId))
      || (match.awaySeasonTeamId !== null && memberTeamIds.includes(match.awaySeasonTeamId))
  );

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setIsHomePreview(false);
      setSession(data.session);
      setScreen(data.session ? 'home' : 'auth');
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_, authSession) => {
      setIsHomePreview(false);
      setSession(authSession);
      setScreen(authSession ? 'home' : 'auth');
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setActiveSeason(null);
      setMemberTeamIds([]);
      setSchedules([]);
      setTeams([]);
      setLeagueTable([]);
      setNotices([]);
      return;
    }

    registerForPush().catch((error: unknown) => {
      console.warn('Push registration failed', error);
    });
  }, [session]);

  useEffect(() => {
    const client = supabase;
    if (!session || !client) {
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);

      const [
        profileResult,
        seasonResult,
        noticesResult,
      ] = await Promise.all([
        client.from('profiles').select('id, name, gender, role, auto_login').eq('id', session.user.id).maybeSingle(),
        client.from('seasons').select('id, name, status').eq('status', 'active').order('starts_at', { ascending: false }).limit(1).maybeSingle(),
        client.from('notices').select('id, title, body, file_url, created_at').order('created_at', { ascending: false }),
      ]);

      if (profileResult.error) {
        showMessage('프로필 불러오기 실패', profileResult.error.message);
      } else {
        setProfile(profileResult.data ?? null);
      }

      if (seasonResult.error) {
        showMessage('시즌 불러오기 실패', seasonResult.error.message);
      } else {
        setActiveSeason((seasonResult.data as Season | null) ?? null);
      }

      if (noticesResult.error) {
        showMessage('공지사항 불러오기 실패', noticesResult.error.message);
      } else {
        setNotices((noticesResult.data as Notice[] | null) ?? []);
      }

      const nextSeason = (seasonResult.data as Season | null) ?? null;
      if (!nextSeason) {
        setMemberTeamIds([]);
        setSchedules([]);
        setTeams([]);
        setLeagueTable([]);
        setIsLoadingData(false);
        return;
      }

      const [
        seasonTeamsResult,
        matchesResult,
        leagueResult,
      ] = await Promise.all([
        client
          .from('season_teams')
          .select('id, team_id, team:teams(id, name, team_members(user_id))')
          .eq('season_id', nextSeason.id)
          .order('display_order', { ascending: true }),
        client
          .from('matches')
          .select(
            'id, match_date, weekday, place, home_players, away_players, home_rating, away_rating, home_score, away_score, home_season_team_id, away_season_team_id'
          )
          .eq('season_id', nextSeason.id)
          .order('match_date', { ascending: true }),
        client
          .from('league_table')
          .select('rank, team, wins, draws, losses, points, gf, ga, gd, played')
          .eq('season_id', nextSeason.id)
          .order('rank', { ascending: true }),
      ]);

      if (seasonTeamsResult.error) {
        showMessage('시즌 팀 불러오기 실패', seasonTeamsResult.error.message);
      } else {
        const seasonTeams = (seasonTeamsResult.data as TeamQueryRow[] | null) ?? [];
        const nextTeams = seasonTeams.map((seasonTeam) => ({
          id: seasonTeam.id,
          name: seasonTeam.team?.[0]?.name ?? '이름 없음',
          memberCount: seasonTeam.team?.[0]?.team_members?.length ?? 0,
        }));
        const nextMemberTeamIds = seasonTeams
          .filter((seasonTeam) =>
            seasonTeam.team?.[0]?.team_members?.some((member) => member.user_id === session.user.id)
          )
          .map((seasonTeam) => seasonTeam.id);
        setTeams(nextTeams);
        setMemberTeamIds(nextMemberTeamIds);

        const teamNamesBySeasonTeamId = seasonTeams.reduce<Record<number, string>>((acc, seasonTeam) => {
          acc[seasonTeam.id] = seasonTeam.team?.[0]?.name ?? 'TBD';
          return acc;
        }, {});

        if (matchesResult.error) {
          showMessage('경기 일정 불러오기 실패', matchesResult.error.message);
        } else {
          setSchedules(
            ((matchesResult.data as MatchQueryRow[] | null) ?? []).map((row) => mapMatchRow(row, teamNamesBySeasonTeamId))
          );
        }
      }

      if (leagueResult.error) {
        showMessage('리그 테이블 불러오기 실패', leagueResult.error.message);
      } else {
        setLeagueTable((leagueResult.data as LeagueQueryRow[] | null) ?? []);
      }

      setIsLoadingData(false);
    };

    loadData().catch((error: unknown) => {
      setIsLoadingData(false);
      showMessage('데이터 로딩 실패', error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    });
  }, [session]);

  const showMessage = (title: string, message?: string) => {
    setDialog({ visible: true, title, message });
  };

  const formatAuthError = (message: string) => {
    const normalizedMessage = message.toLowerCase();

    if (message.includes('Email address') && message.includes('is invalid')) {
      return '올바른 이메일 주소를 입력하세요. 예시 도메인(example.com) 대신 실제 이메일을 사용해야 합니다.';
    }
    if (normalizedMessage.includes('email rate limit exceeded')) {
      return '이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도하거나 다른 이메일 주소를 사용하세요.';
    }
    if (message.includes('User already registered')) {
      return '이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용하세요.';
    }
    if (normalizedMessage.includes('invalid login credentials')) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    if (normalizedMessage.includes('email not confirmed')) {
      return '이메일 인증이 완료되지 않았습니다. 메일함에서 인증 후 다시 로그인하세요.';
    }
    if (normalizedMessage.includes('password')) {
      return '비밀번호 조건을 다시 확인하세요.';
    }
    return message;
  };

  const login = async () => {
    if (!supabase) {
      return showMessage(
        '환경 변수 필요',
        'EXPO_PUBLIC_SUPABASE_URL 과 EXPO_PUBLIC_SUPABASE_ANON_KEY 를 .env 에 설정하세요.'
      );
    }
    const emailValue = email.trim().toLowerCase();
    const passwordValue = password.trim();

    if (!emailValue || !passwordValue) {
      return showMessage('로그인 정보를 입력하세요', '이메일과 비밀번호를 모두 입력하세요.');
    }

    setIsSubmittingAuth(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue,
      });

      if (error) {
        return showMessage('로그인 실패', formatAuthError(error.message));
      }

      setEmail(emailValue);
      setPassword('');
      setScreen('home');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const signup = async () => {
    if (!supabase) {
      return showMessage(
        '환경 변수 필요',
        'EXPO_PUBLIC_SUPABASE_URL 과 EXPO_PUBLIC_SUPABASE_ANON_KEY 를 .env 에 설정하세요.'
      );
    }
    const { email, password, name, gender } = signupForm;
    const missingFields: string[] = [];
    if (!name.trim()) missingFields.push('이름');
    if (!gender) missingFields.push('성별');
    if (!email.trim()) missingFields.push('이메일');
    if (!password.trim()) missingFields.push('비밀번호');

    if (missingFields.length > 0) {
      return showMessage('입력 필요', `${missingFields.join(', ')} 항목을 입력하세요.`);
    }

    const emailValue = email.trim().toLowerCase();
    const passwordValue = password.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailValue) || emailValue.endsWith('@example.com')) {
      return showMessage('이메일 확인', '실제로 받을 수 있는 올바른 이메일 주소를 입력하세요.');
    }

    if (passwordValue.length < 6) {
      return showMessage('비밀번호 확인', '비밀번호는 6자 이상 입력하세요.');
    }

    setIsSubmittingAuth(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue,
        options: { data: { name: name.trim(), gender } },
      });
      if (error) return showMessage('회원가입 실패', formatAuthError(error.message));
      showMessage('가입 완료', '이메일 인증 후 로그인하세요');
      setSignupForm(emptySignupForm);
      setEmail(emailValue);
      setPassword('');
      setScreen('auth');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const pickNoticeFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({});
    if (res.canceled) return;

    const asset = res.assets[0];
    if (!asset) return;

    setSelectedNoticeFile(asset);
    if (!noticeTitle.trim()) {
      const [defaultTitle] = asset.name.split('.');
      setNoticeTitle(defaultTitle || asset.name);
    }
  };

  const uploadNotice = async () => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '공지 업로드는 로그인 후 사용할 수 있습니다.');
    }
    if (!noticeTitle.trim()) {
      return showMessage('제목 필요', '공지 제목을 먼저 입력하세요.');
    }
    if (!selectedNoticeFile) {
      return showMessage('파일 선택 필요', '업로드할 파일을 선택하세요.');
    }

    setIsUploadingNotice(true);

    try {
      const fileName = `${session.user.id}/${Date.now()}-${sanitizeFileName(selectedNoticeFile.name)}`;
      const response = await fetch(selectedNoticeFile.uri);
      const fileBlob = await response.blob();

      const uploadResult = await client.storage.from(NOTICE_BUCKET).upload(fileName, fileBlob, {
        contentType: selectedNoticeFile.mimeType ?? 'application/octet-stream',
        upsert: false,
      });

      if (uploadResult.error) {
        throw new Error(
          `${uploadResult.error.message} (Storage bucket: ${NOTICE_BUCKET})`
        );
      }

      const { data: publicUrlData } = client.storage.from(NOTICE_BUCKET).getPublicUrl(fileName);

      const insertResult = await client.from('notices').insert({
        title: noticeTitle.trim(),
        body: noticeBody.trim() || null,
        file_url: publicUrlData.publicUrl,
        author_id: session.user.id,
      });

      if (insertResult.error) {
        throw insertResult.error;
      }

      const noticesResult = await client
        .from('notices')
        .select('id, title, body, file_url, created_at')
        .order('created_at', { ascending: false });

      if (noticesResult.error) {
        throw noticesResult.error;
      }

      setNotices((noticesResult.data as Notice[] | null) ?? []);
      setNoticeTitle('');
      setNoticeBody('');
      setSelectedNoticeFile(null);
      showMessage('공지 업로드 완료', '파일과 공지 레코드가 Supabase에 저장되었습니다.');
    } catch (error) {
      showMessage(
        '공지 업로드 실패',
        error instanceof Error
          ? error.message
          : 'notice-files 버킷과 notices 테이블 설정을 확인하세요.'
      );
    } finally {
      setIsUploadingNotice(false);
    }
  };

  const homeProfile = isHomePreview ? previewProfile : profile;
  const homeSchedules = isHomePreview ? previewSchedules : schedules;
  const homeMySchedules = isHomePreview ? previewSchedules.slice(0, 2) : mySchedules;
  const homeTeams = isHomePreview ? previewTeams : teams;
  const homeNotices = isHomePreview ? previewNotices : notices;
  const homeLeagueTable = isHomePreview ? previewLeagueTable : leagueTable;
  const isShowingHome = screen === 'home' && (session || isHomePreview);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {screen === 'auth' || screen === 'signup' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {screen === 'auth' && (
              <AuthScreen
                email={email}
                password={password}
                onChangeEmail={setEmail}
                onChangePassword={setPassword}
                onLogin={login}
                isSubmitting={isSubmittingAuth}
                goSignup={() => setScreen('signup')}
                goPreviewHome={() => {
                  setIsHomePreview(true);
                  setScreen('home');
                }}
                isSupabaseConfigured={isSupabaseConfigured}
              />
            )}

            {screen === 'signup' && (
              <SignupScreen
                form={signupForm}
                setForm={setSignupForm}
                onSignup={signup}
                isSubmitting={isSubmittingAuth}
                goBack={() => setScreen('auth')}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {isShowingHome && (
            <HomeScreen
              profile={homeProfile}
              isLoadingData={isHomePreview ? false : isLoadingData}
              schedules={homeSchedules}
              mySchedules={homeMySchedules}
              teams={homeTeams}
              notices={homeNotices}
              leagueTable={homeLeagueTable}
              onNavigate={(nextScreen) => setScreen(nextScreen)}
              onAdminPress={() => showMessage('관리자 메뉴', '관리자 전용 설정 화면은 다음 단계에서 연결합니다.')}
              onSignOut={async () => {
                if (isHomePreview) {
                  setIsHomePreview(false);
                  setScreen('auth');
                  return;
                }
                if (!supabase) return;
                await supabase.auth.signOut();
                setScreen('auth');
              }}
            />
          )}

          {session && screen !== 'home' && (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {screen === 'schedule' && (
                <ScheduleScreen data={schedules} goBack={() => setScreen('home')} />
              )}

              {screen === 'league' && (
                <LeagueScreen
                  data={leagueTable}
                  seasonName={activeSeason?.name ?? null}
                  goBack={() => setScreen('home')}
                />
              )}

              {screen === 'mySchedule' && (
                <ScheduleScreen data={mySchedules} goBack={() => setScreen('home')} title="나의 경기 일정" />
              )}

              {screen === 'teams' && (
                <TeamsScreen teams={teams} goBack={() => setScreen('home')} />
              )}

              {screen === 'notice' && (
                <NoticeScreen
                  canManage={profile?.role === 'admin' || profile?.role === 'super_admin'}
                  notices={notices}
                  noticeTitle={noticeTitle}
                  noticeBody={noticeBody}
                  selectedFileName={selectedNoticeFile?.name ?? null}
                  isUploading={isUploadingNotice}
                  onChangeTitle={setNoticeTitle}
                  onChangeBody={setNoticeBody}
                  onPickFile={pickNoticeFile}
                  onUpload={uploadNotice}
                  goBack={() => setScreen('home')}
                />
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      )}
      <MessageModal
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={() => setDialog((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

function MessageModal({
  visible,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        {!!message && <Text style={styles.modalMessage}>{message}</Text>}
        <TouchableOpacity style={styles.modalButton} onPress={onClose}>
          <Text style={styles.modalButtonText}>확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AuthScreen({
  email,
  password,
  onChangeEmail,
  onChangePassword,
  onLogin,
  isSubmitting,
  goSignup,
  goPreviewHome,
  isSupabaseConfigured,
}: {
  email: string;
  password: string;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onLogin: () => void;
  isSubmitting: boolean;
  goSignup: () => void;
  goPreviewHome: () => void;
  isSupabaseConfigured: boolean;
}) {
  const canSubmit = Boolean(email.trim() && password.trim()) && !isSubmitting && isSupabaseConfigured;

  return (
    <View style={styles.authShell}>
      <View style={styles.authHero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.authTitle}>N-CLASICO</Text>
        <Text style={styles.authSubtitle}>FOOTBALL GAME CLUB</Text>
      </View>

      {!isSupabaseConfigured && (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Supabase 설정이 없습니다</Text>
          <Text style={styles.noticeText}>
            웹 화면은 볼 수 있지만 로그인은 비활성화됩니다. `.env` 파일에
            `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`를 넣으면 바로 연결됩니다.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://supabase.com/dashboard')}>
            <Text style={styles.footerLink}>Open Supabase Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      <Label text="EMAIL" required={false} />
      <Input
        value={email}
        onChangeText={onChangeEmail}
        placeholder="Enter your email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        editable={!isSubmitting}
        returnKeyType="next"
      />
      <Label text="PASSWORD" required={false} />
      <Input
        value={password}
        onChangeText={onChangePassword}
        placeholder="Enter your password"
        secureTextEntry
        textContentType="password"
        autoComplete="password"
        editable={!isSubmitting}
        onSubmitEditing={onLogin}
        returnKeyType="go"
      />
      <TouchableOpacity
        style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
        onPress={onLogin}
        disabled={!canSubmit}
      >
        <Text style={styles.primaryButtonText}>{isSubmitting ? 'SIGNING IN...' : 'START MATCH'}</Text>
      </TouchableOpacity>

      {Platform.OS === 'web' && (
        <TouchableOpacity style={styles.previewHomeButton} onPress={goPreviewHome}>
          <Text style={styles.previewHomeButtonText}>메인 화면 미리보기</Text>
        </TouchableOpacity>
      )}

      <View style={styles.authFooterRow}>
        <Text style={styles.footerHint}>New Player?</Text>
        <TouchableOpacity onPress={goSignup}>
          <Text style={styles.footerLink}>Sign Up Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SignupScreen({
  form,
  setForm,
  onSignup,
  isSubmitting,
  goBack,
}: {
  form: SignupForm;
  setForm: React.Dispatch<React.SetStateAction<SignupForm>>;
  onSignup: () => void;
  isSubmitting: boolean;
  goBack: () => void;
}) {
  const canSubmit = Boolean(
    form.name.trim() && form.email.trim() && form.password.trim() && !isSubmitting
  );

  return (
    <View style={styles.signupShell}>
      <TouchableOpacity onPress={goBack} style={styles.backLinkWrap}>
        <Text style={styles.backLink}>{'← BACK TO LOCKER ROOM'}</Text>
      </TouchableOpacity>
      <Text style={styles.signupTitle}>NEW PLAYER</Text>
      <Text style={styles.signupSubtitle}>CREATE YOUR ATHLETE PROFILE</Text>

      <Label text="NAME" />
      <Input
        value={form.name}
        onChangeText={(v) => setForm({ ...form, name: v })}
        placeholder="Enter your real name"
        editable={!isSubmitting}
        textContentType="name"
        autoComplete="name"
      />

      <Label text="GENDER" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['MALE', 'FEMALE'] as const).map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genderChip, form.gender === g && styles.genderChipActive]}
            onPress={() => setForm({ ...form, gender: g })}
          >
            <Text style={[styles.genderChipText, form.gender === g && styles.genderChipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Label text="EMAIL / ID" />
      <Input
        value={form.email}
        onChangeText={(v) => setForm({ ...form, email: v })}
        placeholder="Email for login"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        editable={!isSubmitting}
      />

      <Label text="PASSWORD" />
      <Input
        value={form.password}
        onChangeText={(v) => setForm({ ...form, password: v })}
        placeholder="Min 6 characters"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="password-new"
        editable={!isSubmitting}
        onSubmitEditing={onSignup}
        returnKeyType="done"
      />

      <TouchableOpacity
        style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
        onPress={onSignup}
        disabled={!canSubmit}
      >
        <Text style={styles.primaryButtonText}>{isSubmitting ? 'CREATING ACCOUNT...' : 'JOIN N-CLASICO'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({
  profile,
  isLoadingData,
  schedules,
  mySchedules,
  teams,
  notices,
  leagueTable,
  onNavigate,
  onAdminPress,
  onSignOut,
}: {
  profile: Profile | null;
  isLoadingData: boolean;
  schedules: MatchSchedule[];
  mySchedules: MatchSchedule[];
  teams: Team[];
  notices: Notice[];
  leagueTable: LeagueRow[];
  onNavigate: (screen: Exclude<Screen, 'auth' | 'signup'>) => void;
  onAdminPress: () => void;
  onSignOut: () => Promise<void>;
}) {
  const featuredMatch = schedules[0] ?? null;
  const liveMatches = schedules.slice(0, 5);
  const canAccessAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const shortcutItems: Array<{
    label: string;
    meta: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    onPress: () => void;
  }> = [
    { label: '나의 일정', meta: `${mySchedules.length}경기`, icon: 'calendar-star', onPress: () => onNavigate('mySchedule') },
    { label: '리그 순위', meta: leagueTable[0] ? `1위 ${leagueTable[0].team}` : '업데이트 대기', icon: 'trophy-outline', onPress: () => onNavigate('league') },
    { label: '팀 현황', meta: `${teams.length}개 팀`, icon: 'shield-outline', onPress: () => onNavigate('teams') },
    { label: '공지', meta: `${notices.length}건`, icon: 'bullhorn-outline', onPress: () => onNavigate('notice') },
  ];
  const tabs: Array<{
    key: HomeTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    target: Exclude<Screen, 'auth' | 'signup'>;
  }> = [
    { key: 'home', label: '홈', icon: 'home-outline', target: 'home' },
    { key: 'schedule', label: '일정', icon: 'calendar-outline', target: 'schedule' },
    { key: 'league', label: '리그', icon: 'trophy-outline', target: 'league' },
    { key: 'teams', label: '팀', icon: 'people-outline', target: 'teams' },
    { key: 'notice', label: '공지', icon: 'notifications-outline', target: 'notice' },
  ];

  return (
    <View style={styles.homeShell}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}
      >
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.brandWordmark}>N-CLASICO</Text>
            <Text style={styles.brandSubline}>MATCHDAY LIVE</Text>
          </View>
          <View style={styles.headerActions}>
            {canAccessAdmin && (
              <TouchableOpacity style={styles.iconButton} onPress={onAdminPress}>
                <Ionicons name="settings-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconButton} onPress={onSignOut}>
              <Ionicons name="person-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.homeGreeting}>
          <Text style={styles.homeGreetingTitle}>{profile?.name ?? sessionLabelFallback(isLoadingData)} 님</Text>
          <Text style={styles.homeGreetingText}>
            {isLoadingData ? '경기 데이터와 공지를 불러오는 중입니다.' : '오늘의 경기와 리그 업데이트를 한 화면에서 확인하세요.'}
          </Text>
        </View>

        <Pressable
          style={styles.featuredCard}
          onPress={() => onNavigate('schedule')}
        >
          <View style={styles.featuredGlow} />
          <View style={styles.featuredBadges}>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>프리뷰</Text>
            </View>
            <Text style={styles.featuredMeta}>대표 경기</Text>
          </View>

          {featuredMatch ? (
            <>
              <View style={styles.featuredTeams}>
                <TeamBadge name={featuredMatch.homeTeam} accent={colors.neon} />
                <Text style={styles.featuredVersus}>VS</Text>
                <TeamBadge name={featuredMatch.awayTeam} accent={colors.neonSoft} />
              </View>
              <Text style={styles.featuredTitle}>
                {toDateLabel(featuredMatch.date)}({featuredMatch.weekday}) {featuredMatch.homeTeam} vs {featuredMatch.awayTeam}
              </Text>
              <Text style={styles.featuredSubtitle}>
                {featuredMatch.place} 경기장 | Home {featuredMatch.homePlayers} | Away {featuredMatch.awayPlayers}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.featuredTeams}>
                <TeamBadge name="HOME" accent={colors.neon} />
                <Text style={styles.featuredVersus}>VS</Text>
                <TeamBadge name="AWAY" accent={colors.neonSoft} />
              </View>
              <Text style={styles.featuredTitle}>등록된 대표 경기가 아직 없습니다.</Text>
              <Text style={styles.featuredSubtitle}>매치 데이터가 들어오면 이 영역을 메인 배너로 사용합니다.</Text>
            </>
          )}

          <TouchableOpacity style={styles.reserveButton} onPress={() => onNavigate('mySchedule')}>
            <Text style={styles.reserveButtonText}>바로가기</Text>
          </TouchableOpacity>
        </Pressable>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>LIVE NOW</Text>
          <TouchableOpacity onPress={() => onNavigate('schedule')}>
            <Text style={styles.sectionLink}>전체 일정</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
          {liveMatches.length > 0 ? liveMatches.map((match) => (
            <TouchableOpacity
              key={match.id}
              style={styles.liveCard}
              onPress={() => onNavigate('schedule')}
            >
              <View style={styles.liveCardTop}>
                <View style={styles.liveChip}>
                  <Text style={styles.liveChipText}>{match.weekday}</Text>
                </View>
                <View style={styles.liveState}>
                  <Text style={styles.liveStateText}>
                    {match.homeScore !== null || match.awayScore !== null ? 'LIVE' : 'UP NEXT'}
                  </Text>
                </View>
              </View>
              <Text style={styles.liveLeagueLabel}>N-CLASICO</Text>
              <View style={styles.liveTeamsRow}>
                <MiniTeamMark label={match.homeTeam} />
                <Text style={styles.liveVs}>VS</Text>
                <MiniTeamMark label={match.awayTeam} />
              </View>
              <Text style={styles.liveMatchText}>{match.homeTeam} vs {match.awayTeam}</Text>
              <Text style={styles.liveMetaText}>
                {toDateLabel(match.date)} | {match.place} | {match.homeScore ?? '-'} : {match.awayScore ?? '-'}
              </Text>
            </TouchableOpacity>
          )) : (
            <View style={[styles.liveCard, styles.liveCardEmpty]}>
              <Text style={styles.liveMatchText}>등록된 경기가 없습니다.</Text>
              <Text style={styles.liveMetaText}>Supabase `matches` 데이터가 홈 섹션에 노출됩니다.</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>QUICK MENU</Text>
        </View>
        <View style={styles.shortcutGrid}>
          {shortcutItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.shortcutCard} onPress={item.onPress}>
              <MaterialCommunityIcons name={item.icon} size={24} color={colors.accent} />
              <Text style={styles.shortcutLabel}>{item.label}</Text>
              <Text style={styles.shortcutMeta}>{item.meta}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomTabBar}>
        {tabs.map((tab) => {
          const active = tab.key === 'home';
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.bottomTab}
              onPress={() => onNavigate(tab.target)}
            >
              <Ionicons
                name={tab.icon}
                size={21}
                color={active ? colors.accent : colors.sub}
              />
              <Text style={[styles.bottomTabText, active && styles.bottomTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TeamBadge({ name, accent }: { name: string; accent: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  return (
    <View style={[styles.teamBadge, { borderColor: accent, shadowColor: accent }]}>
      <Text style={styles.teamBadgeText}>{initials || name.slice(0, 3).toUpperCase()}</Text>
    </View>
  );
}

function MiniTeamMark({ label }: { label: string }) {
  return (
    <View style={styles.miniTeamMark}>
      <Text style={styles.miniTeamMarkText}>
        {label.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function ScheduleScreen({
  data,
  goBack,
  title = '경기 일정 & 결과',
}: {
  data: MatchSchedule[];
  goBack: () => void;
  title?: string;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>{title}</Text>
      <View style={styles.matchTableHeader}>
        {['일자', '요일', '장소', 'Home', 'Away', 'Pen./Adv.', '경기결과'].map((h) => (
          <Text key={h} style={[styles.tableHeaderText, h === 'Pen./Adv.' ? { flex: 1.5 } : {}]}>{h}</Text>
        ))}
      </View>
      {data.length === 0 && <Text style={styles.muted}>Supabase에 등록된 경기 일정이 없습니다.</Text>}
      {data.map((m) => (
        <View key={m.id} style={styles.matchRow}>
          <Text style={styles.matchCell}>{toDateLabel(m.date)}</Text>
          <Text style={styles.matchCell}>{m.weekday}</Text>
          <Text style={styles.matchCell}>{m.place}</Text>
          <View style={[styles.matchCellBox, { flex: 2 }]}>
            <Text style={styles.matchTeam}>{m.homeTeam}</Text>
            <Text style={styles.muted}>{m.homePlayers}</Text>
          </View>
          <View style={[styles.matchCellBox, { flex: 2 }]}>
            <Text style={styles.matchTeam}>{m.awayTeam}</Text>
            <Text style={styles.muted}>{m.awayPlayers}</Text>
          </View>
          <View style={[styles.matchCellBox, { flex: 1.5 }]}>
            <Text style={styles.muted}>Home {m.homeRating ?? '-'}</Text>
            <Text style={styles.muted}>Away {m.awayRating ?? '-'}</Text>
          </View>
          <View style={[styles.matchCellBox, { flex: 1 }]}> 
            <Text style={styles.result}>{m.homeScore ?? '-'} : {m.awayScore ?? '-'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function TeamsScreen({ teams, goBack }: { teams: Team[]; goBack: () => void }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>팀 관리</Text>
      <Text style={styles.muted}>현재 스키마 기준으로 팀명과 인원 수를 Supabase에서 불러옵니다.</Text>
      {teams.map((t) => (
        <View key={t.id} style={[styles.listCard, { marginTop: 10 }]}>
          <Text style={styles.body}>{t.name}</Text>
          <Text style={styles.muted}>팀원 {t.memberCount}명</Text>
        </View>
      ))}
      {teams.length === 0 && <Text style={styles.muted}>Supabase에 등록된 팀이 없습니다.</Text>}
    </View>
  );
}

function NoticeScreen({
  canManage,
  notices,
  noticeTitle,
  noticeBody,
  selectedFileName,
  isUploading,
  onChangeTitle,
  onChangeBody,
  onPickFile,
  onUpload,
  goBack,
}: {
  canManage: boolean;
  notices: Notice[];
  noticeTitle: string;
  noticeBody: string;
  selectedFileName: string | null;
  isUploading: boolean;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onPickFile: () => void;
  onUpload: () => void;
  goBack: () => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>공지사항</Text>
      <Text style={styles.muted}>파일은 Supabase Storage `notice-files` 버킷에 업로드됩니다.</Text>
      {canManage && (
        <>
          <Label text="NOTICE TITLE" required={false} />
          <Input value={noticeTitle} onChangeText={onChangeTitle} placeholder="공지 제목" />
          <Label text="NOTICE BODY" required={false} />
          <Input
            value={noticeBody}
            onChangeText={onChangeBody}
            placeholder="선택 입력"
            multiline
            style={{ minHeight: 110, textAlignVertical: 'top' }}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={onPickFile}>
            <Text style={styles.secondaryButtonText}>
              {selectedFileName ? `파일 변경: ${selectedFileName}` : '파일 선택'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={onUpload} disabled={isUploading}>
            <Text style={styles.primaryButtonText}>
              {isUploading ? '업로드 중...' : '공지 업로드'}
            </Text>
          </TouchableOpacity>
        </>
      )}
      {notices.length === 0 && <Text style={styles.muted}>등록된 공지가 없습니다.</Text>}
      {notices.map((notice) => (
        <View key={notice.id} style={styles.listCard}>
          <Text style={styles.body}>{notice.title}</Text>
          {!!notice.body && <Text style={styles.muted}>{notice.body}</Text>}
          <Text style={styles.muted}>{toCreatedAtLabel(notice.created_at)}</Text>
          {!!notice.file_url && (
            <TouchableOpacity onPress={() => Linking.openURL(notice.file_url!)}>
              <Text style={styles.footerLink}>첨부 파일 열기</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

function LeagueScreen({
  data,
  seasonName,
  goBack,
}: {
  data: LeagueRow[];
  seasonName: string | null;
  goBack: () => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>{seasonName ? `${seasonName} 리그` : '리그 순위'}</Text>
      <View style={styles.tableHeader}>
        {['Rank', 'Team', '승', '무', '패', '승점', '득점', '실점', '골득실', '경기수'].map((h) => (
          <Text key={h} style={styles.tableHeaderText}>{h}</Text>
        ))}
      </View>
      {data.length === 0 && <Text style={styles.muted}>리그 테이블 데이터가 없습니다.</Text>}
      {data.map((row) => (
        <View key={row.rank} style={styles.tableRow}>
          <Text style={styles.tableCell}>{row.rank}</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>{row.team}</Text>
          <Text style={styles.tableCell}>{row.wins}</Text>
          <Text style={styles.tableCell}>{row.draws}</Text>
          <Text style={styles.tableCell}>{row.losses}</Text>
          <Text style={[styles.tableCell, { color: colors.neon, fontWeight: '800' }]}>{row.points}</Text>
          <Text style={styles.tableCell}>{row.gf}</Text>
          <Text style={styles.tableCell}>{row.ga}</Text>
          <Text style={styles.tableCell}>{row.gd > 0 ? `+${row.gd}` : row.gd}</Text>
          <Text style={styles.tableCell}>{row.played}</Text>
        </View>
      ))}
    </View>
  );
}

function Label({ text, required = true }: { text: string; required?: boolean }) {
  return <Text style={styles.label}>{required ? `${text} *` : text}</Text>;
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor={colors.sub} />;
}

function sessionLabelFallback(isLoadingData: boolean) {
  return isLoadingData ? '프로필 로딩 중' : '플레이어';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  homeShell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  homeContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: colors.neon,
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  logoText: {
    fontWeight: '800',
    fontSize: 34,
    color: colors.bg,
    fontStyle: 'italic',
  },
  logoTitle: {
    color: colors.neon,
    fontWeight: '800',
    fontSize: 22,
  },
  brandWordmark: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 24,
    letterSpacing: 1,
  },
  brandSubline: {
    color: colors.neon,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginTop: 2,
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#24441f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeGreeting: {
    marginBottom: 16,
  },
  homeGreetingTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  homeGreetingText: {
    color: colors.sub,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  featuredCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 340,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#24441f',
    backgroundColor: '#111827',
    marginBottom: 26,
  },
  featuredGlow: {
    position: 'absolute',
    top: -40,
    right: -10,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(57, 255, 20, 0.12)',
    transform: [{ scaleX: 1.2 }],
  },
  featuredBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#17351b',
    borderWidth: 1,
    borderColor: '#2e6f28',
  },
  previewBadgeText: {
    color: colors.neon,
    fontWeight: '800',
    fontSize: 12,
  },
  featuredMeta: {
    color: colors.sub,
    fontWeight: '600',
    fontSize: 12,
  },
  featuredTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
  },
  teamBadge: {
    width: 86,
    height: 86,
    borderRadius: 20,
    backgroundColor: 'rgba(11, 15, 22, 0.9)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  teamBadgeText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  featuredVersus: {
    color: colors.neon,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  featuredTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 8,
  },
  featuredSubtitle: {
    color: colors.sub,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  reserveButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neon,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reserveButtonText: {
    color: colors.bg,
    fontWeight: '900',
    fontSize: 14,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.neon,
    fontSize: 27,
    fontWeight: '900',
  },
  sectionLink: {
    color: colors.sub,
    fontSize: 13,
    fontWeight: '700',
  },
  liveRow: {
    paddingBottom: 10,
    gap: 12,
  },
  liveCard: {
    width: 220,
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#24441f',
    marginBottom: 24,
  },
  liveCardEmpty: {
    width: 280,
    justifyContent: 'center',
  },
  liveCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveChip: {
    backgroundColor: '#182412',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2e6f28',
  },
  liveChipText: {
    color: colors.neon,
    fontSize: 11,
    fontWeight: '700',
  },
  liveState: {
    backgroundColor: '#1d7a38',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveStateText: {
    color: '#ecfff0',
    fontSize: 10,
    fontWeight: '900',
  },
  liveLeagueLabel: {
    color: colors.neonSoft,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 14,
  },
  liveTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  miniTeamMark: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#182412',
    borderWidth: 1,
    borderColor: '#2e6f28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTeamMarkText: {
    color: colors.neon,
    fontSize: 19,
    fontWeight: '900',
  },
  liveVs: {
    color: colors.neon,
    fontSize: 16,
    fontWeight: '900',
  },
  liveMatchText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 8,
  },
  liveMetaText: {
    color: colors.sub,
    fontSize: 12,
    lineHeight: 17,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutCard: {
    width: '47%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24441f',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  shortcutLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  shortcutMeta: {
    color: colors.sub,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  bottomTabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17, 24, 39, 0.96)',
    borderRadius: 26,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#24441f',
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomTabText: {
    color: colors.sub,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomTabTextActive: {
    color: colors.accent,
  },
  logoSubtitle: {
    color: colors.sub,
    fontWeight: '600',
  },
  authShell: {
    minHeight: '100%',
    paddingTop: 48,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  authHero: {
    alignItems: 'center',
    marginBottom: 42,
  },
  authTitle: {
    color: colors.neon,
    fontWeight: '900',
    fontSize: 32,
    fontStyle: 'italic',
    letterSpacing: 0.4,
  },
  authSubtitle: {
    color: '#8b8b8b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginTop: 4,
  },
  signupShell: {
    minHeight: '100%',
    paddingTop: 10,
  },
  backLinkWrap: {
    marginBottom: 18,
  },
  backLink: {
    color: colors.neon,
    fontWeight: '800',
    fontSize: 12,
  },
  signupTitle: {
    color: colors.neon,
    fontWeight: '900',
    fontSize: 28,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  signupSubtitle: {
    color: '#8b8b8b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 26,
  },
  label: {
    color: colors.neon,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#222222',
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#24441f',
    minHeight: 50,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: colors.neon,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: colors.neon,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.bg,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.6,
  },
  previewHomeButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#285f56',
    backgroundColor: '#0f1c1d',
    paddingVertical: 14,
    alignItems: 'center',
  },
  previewHomeButtonText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: colors.input,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  muted: {
    color: colors.sub,
    fontSize: 13,
    marginTop: 4,
  },
  link: {
    color: colors.neon,
    fontWeight: '700',
  },
  authFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 18,
  },
  noticeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
  },
  noticeTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  noticeText: {
    color: colors.sub,
    lineHeight: 20,
    marginBottom: 10,
  },
  footerHint: {
    color: '#6f6f6f',
    fontSize: 12,
    fontWeight: '600',
  },
  footerLink: {
    color: colors.neon,
    fontSize: 13,
    fontWeight: '800',
  },
  genderChip: {
    flex: 1,
    backgroundColor: '#222222',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#24441f',
  },
  genderChipActive: {
    borderColor: colors.neon,
    backgroundColor: '#182412',
  },
  genderChipText: {
    color: '#9b9b9b',
    fontWeight: '900',
    fontStyle: 'italic',
    fontSize: 18,
  },
  genderChipTextActive: {
    color: colors.neon,
  },
  listCard: {
    backgroundColor: colors.input,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: {
    color: colors.text,
    fontWeight: '600',
  },
  result: {
    color: colors.neon,
    fontWeight: '800',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0d3b1f',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginTop: 12,
  },
  tableHeaderText: {
    flex: 1,
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#0f2b16',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#14532d',
  },
  tableCell: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  matchTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#114d1c',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginTop: 10,
  },
  matchRow: {
    flexDirection: 'row',
    backgroundColor: '#0f2b16',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#14532d',
    alignItems: 'center',
  },
  matchCell: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  matchCellBox: {
    flex: 1,
    gap: 2,
  },
  matchTeam: {
    color: colors.text,
    fontWeight: '800',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#151515',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2f5a28',
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: colors.neon,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  modalTitle: {
    color: colors.neon,
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalMessage: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    backgroundColor: colors.neon,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.bg,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.4,
  },
});
