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
  useWindowDimensions,
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

type Screen = 'auth' | 'signup' | 'home' | 'schedule' | 'teams' | 'notice' | 'mySchedule' | 'league' | 'admin' | 'seasonAdmin' | 'seasonDetailAdmin';
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
  description: string | null;
  status: 'active' | 'inactive';
};

type SeasonForm = {
  name: string;
  description: string;
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
  file_path: string | null;
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

const emptySeasonForm: SeasonForm = {
  name: '',
  description: '',
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
    file_path: null,
    file_url: null,
    created_at: '2026-04-09T09:00:00+09:00',
  },
  {
    id: 2,
    title: '유니폼 공지',
    body: '이번 주는 홈팀이 레드, 원정팀이 블루를 착용합니다.',
    file_path: null,
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
const isAdminAccount = (role: ProfileRole | null | undefined) => role === 'admin' || role === 'super_admin';
const isSuperAdminAccount = (role: ProfileRole | null | undefined) => role === 'super_admin';
const makeSeasonSlug = (name: string) =>
  `${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'season'}-${Date.now().toString(36)}`;

const getNoticeFileUrl = (notice: Notice) => {
  if (notice.file_path && supabase) {
    const { data } = supabase.storage.from(NOTICE_BUCKET).getPublicUrl(notice.file_path);
    return data.publicUrl;
  }

  return notice.file_url;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('auth');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');
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
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedAdminSeason, setSelectedAdminSeason] = useState<Season | null>(null);
  const [memberTeamIds, setMemberTeamIds] = useState<number[]>([]);
  const [schedules, setSchedules] = useState<MatchSchedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueTable, setLeagueTable] = useState<LeagueRow[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seasonForm, setSeasonForm] = useState<SeasonForm>(emptySeasonForm);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [selectedNoticeFile, setSelectedNoticeFile] = useState<DocumentPickerAsset | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isUploadingNotice, setIsUploadingNotice] = useState(false);
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);

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
      setSeasons([]);
      setSelectedAdminSeason(null);
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
        seasonsResult,
        noticesResult,
      ] = await Promise.all([
        client.from('profiles').select('id, name, gender, role, auto_login').eq('id', session.user.id).maybeSingle(),
        client.from('seasons').select('id, name, description, status').order('created_at', { ascending: false }),
        client
          .from('notices')
          .select('id, title, body, file_path, file_url, created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (profileResult.error) {
        showMessage('프로필 불러오기 실패', profileResult.error.message);
      } else {
        const nextProfile = profileResult.data ?? null;
        setProfile(nextProfile);
        setScreen('home');
      }

      if (seasonsResult.error) {
        showMessage('시즌 불러오기 실패', seasonsResult.error.message);
      } else {
        const nextSeasons = (seasonsResult.data as Season[] | null) ?? [];
        setSeasons(nextSeasons);
        setActiveSeason(nextSeasons.find((season) => season.status === 'active') ?? null);
      }

      if (noticesResult.error) {
        showMessage('공지사항 불러오기 실패', noticesResult.error.message);
      } else {
        setNotices((noticesResult.data as Notice[] | null) ?? []);
      }

      const nextSeason = ((seasonsResult.data as Season[] | null) ?? []).find((season) => season.status === 'active') ?? null;
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

  const refreshSeasons = async (client: NonNullable<typeof supabase>) => {
    const seasonsResult = await client
      .from('seasons')
      .select('id, name, description, status')
      .order('created_at', { ascending: false });

    if (seasonsResult.error) {
      throw seasonsResult.error;
    }

    const nextSeasons = (seasonsResult.data as Season[] | null) ?? [];
    setSeasons(nextSeasons);
    setActiveSeason(nextSeasons.find((season) => season.status === 'active') ?? null);

    return nextSeasons;
  };

  const syncSelectedAdminSeason = (nextSeasons: Season[], seasonId: number) => {
    const nextSelectedSeason = nextSeasons.find((season) => season.id === seasonId) ?? null;
    setSelectedAdminSeason(nextSelectedSeason);
    return nextSelectedSeason;
  };

  const refreshNotices = async (client: NonNullable<typeof supabase>) => {
    const noticesResult = await client
      .from('notices')
      .select('id, title, body, file_path, file_url, created_at')
      .order('created_at', { ascending: false });

    if (noticesResult.error) {
      throw noticesResult.error;
    }

    setNotices((noticesResult.data as Notice[] | null) ?? []);
  };

  const createSeason = async () => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '시즌 등록은 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '시즌 등록은 admin 이상 계정만 사용할 수 있습니다.');
    }

    const name = seasonForm.name.trim();
    const description = seasonForm.description.trim();

    if (!name) {
      return showMessage('시즌명 필요', '시즌명을 입력하세요.');
    }

    setIsCreatingSeason(true);

    try {
      const status: Season['status'] = activeSeason ? 'inactive' : 'active';
      const insertResult = await client.from('seasons').insert({
        name,
        description: description || null,
        slug: makeSeasonSlug(name),
        status,
        created_by: session.user.id,
      });

      if (insertResult.error) {
        throw insertResult.error;
      }

      await refreshSeasons(client);
      setSeasonForm(emptySeasonForm);
      showMessage(
        '시즌 등록 완료',
        status === 'active'
          ? '첫 시즌이 활성 시즌으로 등록되었습니다.'
          : '새 시즌이 비활성 상태로 등록되었습니다.'
      );
    } catch (error) {
      showMessage(
        '시즌 등록 실패',
        error instanceof Error ? error.message : '시즌 저장 중 오류가 발생했습니다.'
      );
    } finally {
      setIsCreatingSeason(false);
    }
  };

  const updateSeasonStatus = async (season: Season, nextStatus: Season['status']) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '시즌 상태 변경은 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '시즌 상태 변경은 admin 이상 계정만 사용할 수 있습니다.');
    }

    try {
      const updateResult = await client
        .from('seasons')
        .update({ status: nextStatus })
        .eq('id', season.id);

      if (updateResult.error) {
        throw updateResult.error;
      }

      const nextSeasons = await refreshSeasons(client);
      syncSelectedAdminSeason(nextSeasons, season.id);
      showMessage(
        '시즌 상태 변경 완료',
        nextStatus === 'active'
          ? `${season.name} 시즌이 활성 시즌으로 설정되었습니다.`
          : `${season.name} 시즌이 비활성 상태로 변경되었습니다.`
      );
    } catch (error) {
      showMessage(
        '시즌 상태 변경 실패',
        error instanceof Error ? error.message : '시즌 상태 변경 중 오류가 발생했습니다.'
      );
    }
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

    setIsUploadingNotice(true);

    try {
      let filePath: string | null = null;
      let fileUrl: string | null = null;

      if (selectedNoticeFile) {
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
        filePath = fileName;
        fileUrl = publicUrlData.publicUrl;
      }

      const insertResult = await client.from('notices').insert({
        title: noticeTitle.trim(),
        body: noticeBody.trim() || null,
        file_path: filePath,
        file_url: fileUrl,
        author_id: session.user.id,
      });

      if (insertResult.error) {
        throw insertResult.error;
      }

      await refreshNotices(client);
      setNoticeTitle('');
      setNoticeBody('');
      setSelectedNoticeFile(null);
      showMessage('저장 완료');
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

  const deleteNotice = async (notice: Notice) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '공지 삭제는 로그인 후 사용할 수 있습니다.');
    }

    setDeletingNoticeId(notice.id);

    try {
      if (notice.file_path) {
        const removeResult = await client.storage.from(NOTICE_BUCKET).remove([notice.file_path]);
        if (removeResult.error) {
          throw removeResult.error;
        }
      }

      const deleteResult = await client.from('notices').delete().eq('id', notice.id);
      if (deleteResult.error) {
        throw deleteResult.error;
      }

      await refreshNotices(client);
      showMessage('삭제 완료');
    } catch (error) {
      showMessage(
        '공지 삭제 실패',
        error instanceof Error ? error.message : '공지와 첨부 파일 삭제 중 오류가 발생했습니다.'
      );
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const homeProfile = isHomePreview ? previewProfile : profile;
  const homeSchedules = isHomePreview ? previewSchedules : schedules;
  const homeMySchedules = isHomePreview ? previewSchedules.slice(0, 2) : mySchedules;
  const homeTeams = isHomePreview ? previewTeams : teams;
  const homeNotices = isHomePreview ? previewNotices : notices;
  const homeLeagueTable = isHomePreview ? previewLeagueTable : leagueTable;
  const isShowingHome = screen === 'home' && (session || isHomePreview);
  const canAccessAdmin = isAdminAccount(profile?.role);
  const goBackScreen = previousScreen === 'seasonAdmin'
    ? 'seasonAdmin'
    : previousScreen === 'seasonDetailAdmin'
      ? 'seasonDetailAdmin'
    : previousScreen === 'admin'
      ? 'admin'
      : 'home';

  useEffect(() => {
    if (screen === 'admin' && !canAccessAdmin) {
      setScreen('home');
    }
  }, [canAccessAdmin, screen]);

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
              canAccessAdmin={canAccessAdmin}
              isLoadingData={isHomePreview ? false : isLoadingData}
              schedules={homeSchedules}
              mySchedules={homeMySchedules}
              teams={homeTeams}
              notices={homeNotices}
              leagueTable={homeLeagueTable}
              onNavigate={(nextScreen) => {
                setPreviousScreen('home');
                setScreen(nextScreen);
              }}
              onAdminPress={() => {
                if (canAccessAdmin) {
                  setPreviousScreen('home');
                  setScreen('admin');
                }
              }}
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
                <ScheduleScreen
                  data={schedules}
                  goBack={() => setScreen(goBackScreen)}
                  subtitle={activeSeason ? `${activeSeason.name} 시즌 경기 목록입니다.` : undefined}
                />
              )}

              {screen === 'league' && (
                <LeagueScreen
                  data={leagueTable}
                  seasonName={activeSeason?.name ?? null}
                  goBack={() => setScreen(goBackScreen)}
                />
              )}

              {screen === 'mySchedule' && (
                <ScheduleScreen data={mySchedules} goBack={() => setScreen(goBackScreen)} title="나의 경기 일정" />
              )}

              {screen === 'teams' && (
                <TeamsScreen
                  teams={teams}
                  seasonName={activeSeason?.name ?? null}
                  goBack={() => setScreen(goBackScreen)}
                />
              )}

              {screen === 'notice' && (
                <NoticeScreen
                  canManage={isAdminAccount(profile?.role)}
                  notices={notices}
                  noticeTitle={noticeTitle}
                  noticeBody={noticeBody}
                  selectedFileName={selectedNoticeFile?.name ?? null}
                  isUploading={isUploadingNotice}
                  deletingNoticeId={deletingNoticeId}
                  onChangeTitle={setNoticeTitle}
                  onChangeBody={setNoticeBody}
                  onPickFile={pickNoticeFile}
                  onUpload={uploadNotice}
                  onDelete={deleteNotice}
                  goBack={() => setScreen(goBackScreen)}
                />
              )}

              {screen === 'seasonAdmin' && (
                <SeasonManagementScreen
                  activeSeason={activeSeason}
                  seasons={seasons}
                  seasonForm={seasonForm}
                  isCreatingSeason={isCreatingSeason}
                  onChangeSeasonForm={setSeasonForm}
                  onCreateSeason={createSeason}
                  onOpenSeason={(season) => {
                    setSelectedAdminSeason(season);
                    setPreviousScreen('seasonAdmin');
                    setScreen('seasonDetailAdmin');
                  }}
                  goBack={() => setScreen('admin')}
                />
              )}

              {screen === 'seasonDetailAdmin' && selectedAdminSeason && (
                <SeasonOperationsScreen
                  season={selectedAdminSeason}
                  activeSeason={activeSeason}
                  schedules={schedules}
                  teams={teams}
                  onUpdateSeasonStatus={updateSeasonStatus}
                  onNavigate={(nextScreen) => {
                    setPreviousScreen('seasonDetailAdmin');
                    setScreen(nextScreen);
                  }}
                  goBack={() => setScreen('seasonAdmin')}
                />
              )}

              {screen === 'admin' && canAccessAdmin && (
                <AdminScreen
                  profile={profile}
                  activeSeason={activeSeason}
                  seasons={seasons}
                  notices={notices}
                  schedules={schedules}
                  teams={teams}
                  onNavigate={(nextScreen) => {
                    setPreviousScreen('admin');
                    setScreen(nextScreen);
                  }}
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
  canAccessAdmin,
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
  canAccessAdmin: boolean;
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
  subtitle,
}: {
  data: MatchSchedule[];
  goBack: () => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.muted}>{subtitle}</Text>}
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

function TeamsScreen({
  teams,
  goBack,
  seasonName,
}: {
  teams: Team[];
  goBack: () => void;
  seasonName?: string | null;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>팀 관리</Text>
      <Text style={styles.muted}>
        {seasonName
          ? `${seasonName} 시즌에 속한 팀 목록입니다.`
          : '현재 스키마 기준으로 팀명과 인원 수를 Supabase에서 불러옵니다.'}
      </Text>
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
  deletingNoticeId,
  onChangeTitle,
  onChangeBody,
  onPickFile,
  onUpload,
  onDelete,
  goBack,
}: {
  canManage: boolean;
  notices: Notice[];
  noticeTitle: string;
  noticeBody: string;
  selectedFileName: string | null;
  isUploading: boolean;
  deletingNoticeId: number | null;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onPickFile: () => void;
  onUpload: () => void;
  onDelete: (notice: Notice) => void;
  goBack: () => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>공지사항</Text>
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
          {canManage && (
            <View style={styles.noticeActionRow}>
              <TouchableOpacity onPress={() => onDelete(notice)} disabled={deletingNoticeId === notice.id}>
                <Text style={styles.noticeDeleteLink}>
                  {deletingNoticeId === notice.id ? '삭제 중...' : '공지 삭제'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {!!getNoticeFileUrl(notice) && (
            <TouchableOpacity onPress={() => Linking.openURL(getNoticeFileUrl(notice)!)}>
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

function AdminScreen({
  profile,
  activeSeason,
  seasons,
  notices,
  schedules,
  teams,
  onNavigate,
  goBack,
}: {
  profile: Profile | null;
  activeSeason: Season | null;
  seasons: Season[];
  notices: Notice[];
  schedules: MatchSchedule[];
  teams: Team[];
  onNavigate: React.Dispatch<React.SetStateAction<Screen>>;
  goBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width >= 960;
  const canManageUsers = isSuperAdminAccount(profile?.role);
  const isAdmin = isAdminAccount(profile?.role);
  const upcomingMatch = schedules[0] ?? null;
  const recentNotice = notices[0] ?? null;
  const menuItems: Array<{
    key: string;
    title: string;
    description: string;
    badge: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    enabled: boolean;
    onPress?: () => void;
  }> = [
    {
      key: 'dashboard',
      title: '운영 대시보드',
      description: '현재 시즌과 운영 상태를 한 번에 확인합니다.',
      badge: activeSeason?.name ?? '시즌 없음',
      icon: 'view-dashboard-outline',
      enabled: true,
    },
    {
      key: 'notice',
      title: '공지사항 관리',
      description: '공지 등록, 수정, 첨부 파일 업로드를 처리합니다.',
      badge: `${notices.length}건`,
      icon: 'bullhorn-outline',
      enabled: true,
      onPress: () => onNavigate('notice'),
    },
    {
      key: 'season',
      title: '시즌 관리',
      description: '공지사항 관리처럼 별도 페이지에서 시즌 등록, 목록 확인, 시즌 문맥 운영을 처리합니다.',
      badge: activeSeason ? `${activeSeason.name}` : '시즌 등록',
      icon: 'calendar-multiple-check',
      enabled: true,
      onPress: () => onNavigate('seasonAdmin'),
    },
  ];

  if (canManageUsers) {
    menuItems.push({
      key: 'roles',
      title: '권한 관리',
      description: '관리자 권한 부여와 역할 변경을 위한 확장 영역입니다.',
      badge: 'super_admin',
      icon: 'account-key-outline',
      enabled: false,
    });
  }

  const statusCards = [
    {
      key: 'season',
      label: '현재 시즌',
      value: activeSeason?.name ?? '활성 시즌 없음',
      tone: 'neon',
    },
    {
      key: 'role',
      label: '권한',
      value: isAdmin ? (profile?.role ?? 'admin') : 'member',
      tone: 'accent',
    },
    {
      key: 'notice',
      label: '최근 공지',
      value: recentNotice ? toCreatedAtLabel(recentNotice.created_at) : '데이터 없음',
      tone: 'default',
    },
  ] as const;

  if (!isAdmin) {
    return (
      <View style={styles.adminShell}>
        <TouchableOpacity onPress={goBack}>
          <Text style={styles.link}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.logoTitle}>권한이 없습니다.</Text>
        <Text style={styles.muted}>관리자 화면은 admin 이상 계정에서만 접근할 수 있습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.adminShell}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>

      <View style={[styles.adminLayout, isWebDesktop && styles.adminLayoutDesktop]}>
        {isWebDesktop && (
          <View style={styles.adminSidebar}>
            <Text style={styles.adminSidebarEyebrow}>ADMIN MODE</Text>
            <Text style={styles.adminSidebarTitle}>운영 메뉴</Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.adminSidebarItem}
                onPress={item.onPress}
                disabled={!item.onPress}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={item.onPress ? colors.accent : colors.sub}
                />
                <View style={styles.adminSidebarItemBody}>
                  <Text style={styles.adminSidebarItemTitle}>{item.title}</Text>
                  <Text style={styles.adminSidebarItemMeta}>{item.badge}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.adminMain}>
          <View style={styles.adminHero}>
            <View style={styles.adminHeroHeader}>
              <View>
                <Text style={styles.logoTitle}>관리자 대시보드</Text>
                <Text style={styles.muted}>
                  웹에서는 운영 패널처럼, 모바일에서는 관리자 허브처럼 동작하도록 설계했습니다.
                </Text>
              </View>
              <View style={styles.adminHeroBadges}>
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>{isAdmin ? (profile?.role ?? 'admin') : 'member'}</Text>
                </View>
                <View style={styles.adminBadgeMuted}>
                  <Text style={styles.adminBadgeMutedText}>{activeSeason?.name ?? '시즌 미선택'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.adminStatusGrid}>
              {statusCards.map((card) => (
                <View key={card.key} style={styles.adminStatusCard}>
                  <Text style={styles.adminStatusLabel}>{card.label}</Text>
                  <Text
                    style={[
                      styles.adminStatusValue,
                      card.tone === 'neon' && styles.adminStatusValueNeon,
                      card.tone === 'accent' && styles.adminStatusValueAccent,
                    ]}
                  >
                    {card.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          </View>
          <View style={styles.adminCardGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.adminActionCard, !item.enabled && styles.adminActionCardDisabled]}
                onPress={item.onPress}
                disabled={!item.onPress}
              >
                <View style={styles.adminActionTop}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={24}
                    color={item.onPress ? colors.accent : colors.sub}
                  />
                  <Text style={styles.adminActionBadge}>{item.badge}</Text>
                </View>
                <Text style={styles.adminActionTitle}>{item.title}</Text>
                <Text style={styles.adminActionDescription}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>SEASON OPERATIONS</Text>
          </View>
          <View style={styles.adminSeasonPanel}>
            <View style={styles.adminSeasonPanelHeader}>
              <View>
                <Text style={styles.noticeTitle}>시즌 관리</Text>
                <Text style={styles.noticeText}>
                  팀 관리와 경기 관리는 독립 메뉴가 아니라 선택된 시즌 아래에서만 진입합니다.
                </Text>
              </View>
              <View style={styles.adminBadgeMuted}>
                <Text style={styles.adminBadgeMutedText}>{activeSeason?.name ?? '시즌 미선택'}</Text>
              </View>
            </View>

            <View style={styles.adminSeasonActionRow}>
              <TouchableOpacity
                style={[styles.adminSeasonActionButton, !activeSeason && styles.adminSeasonActionButtonDisabled]}
                onPress={() => onNavigate('teams')}
                disabled={!activeSeason}
              >
                <MaterialCommunityIcons name="shield-outline" size={18} color={activeSeason ? colors.accent : colors.sub} />
                <View style={styles.adminSeasonActionTextWrap}>
                  <Text style={styles.adminSeasonActionTitle}>팀 관리</Text>
                  <Text style={styles.adminSeasonActionMeta}>{teams.length}개 팀</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.adminSeasonActionButton, !activeSeason && styles.adminSeasonActionButtonDisabled]}
                onPress={() => onNavigate('schedule')}
                disabled={!activeSeason}
              >
                <MaterialCommunityIcons name="soccer" size={18} color={activeSeason ? colors.accent : colors.sub} />
                <View style={styles.adminSeasonActionTextWrap}>
                  <Text style={styles.adminSeasonActionTitle}>경기 관리</Text>
                  <Text style={styles.adminSeasonActionMeta}>{schedules.length}경기</Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.adminSeasonActionButton, styles.adminSeasonActionButtonDisabled]}>
                <MaterialCommunityIcons name="send-outline" size={18} color={colors.sub} />
                <View style={styles.adminSeasonActionTextWrap}>
                  <Text style={styles.adminSeasonActionTitle}>푸시 발송</Text>
                  <Text style={styles.adminSeasonActionMeta}>준비 중</Text>
                </View>
              </View>
            </View>

            {!activeSeason && (
              <Text style={styles.adminSeasonHint}>
                활성 시즌이 있어야 팀 관리와 경기 관리로 진입할 수 있습니다.
              </Text>
            )}
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>OPERATIONS</Text>
          </View>
          <View style={[styles.adminInsightGrid, isWebDesktop && styles.adminInsightGridDesktop]}>
            <View style={styles.adminInsightCard}>
              <Text style={styles.noticeTitle}>공지 운영</Text>
              <Text style={styles.noticeText}>
                공지는 시즌과 분리된 전역 데이터로 유지하고, 작성과 수정은 관리자 메뉴에서만 처리합니다.
              </Text>
              <Text style={styles.footerLink}>
                {recentNotice ? `최근 공지: ${recentNotice.title}` : '등록된 공지가 없습니다.'}
              </Text>
            </View>

            <View style={styles.adminInsightCard}>
              <Text style={styles.noticeTitle}>시즌 운영</Text>
              <Text style={styles.noticeText}>
                팀 관리와 경기 관리는 모두 시즌 문맥 안에서 이어지도록 설계합니다.
              </Text>
              <Text style={styles.footerLink}>
                {upcomingMatch
                  ? `다음 경기: ${upcomingMatch.homeTeam} vs ${upcomingMatch.awayTeam}`
                  : '예정 경기가 없습니다.'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function SeasonManagementScreen({
  activeSeason,
  seasons,
  seasonForm,
  isCreatingSeason,
  onChangeSeasonForm,
  onCreateSeason,
  onOpenSeason,
  goBack,
}: {
  activeSeason: Season | null;
  seasons: Season[];
  seasonForm: SeasonForm;
  isCreatingSeason: boolean;
  onChangeSeasonForm: React.Dispatch<React.SetStateAction<SeasonForm>>;
  onCreateSeason: () => void;
  onOpenSeason: (season: Season) => void;
  goBack: () => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>시즌 관리</Text>
      <Text style={styles.muted}>
        시즌 등록과 시즌별 운영은 관리자 대시보드 하단이 아니라 이 전용 화면에서만 처리합니다.
      </Text>

      <View style={styles.adminSeasonPanel}>
        <View style={styles.adminSeasonPanelHeader}>
          <View>
            <Text style={styles.noticeTitle}>시즌 등록</Text>
            <Text style={styles.noticeText}>
              시즌명과 시즌 설명을 등록하면 이후 팀 관리와 경기 일정 관리가 이 시즌에 종속됩니다.
            </Text>
          </View>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>{seasons.length}개 시즌</Text>
          </View>
        </View>

        <View style={styles.adminFormCard}>
          <Label text="시즌명" />
          <Input
            value={seasonForm.name}
            onChangeText={(value) => onChangeSeasonForm((prev) => ({ ...prev, name: value }))}
            placeholder="예: 2026 Spring League"
          />

          <Label text="시즌 설명" required={false} />
          <Input
            value={seasonForm.description}
            onChangeText={(value) => onChangeSeasonForm((prev) => ({ ...prev, description: value }))}
            placeholder="운영 목적, 참가 팀 범위, 시즌 특징 등을 입력하세요."
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />

          <TouchableOpacity
            style={[styles.primaryButton, isCreatingSeason && styles.buttonDisabled]}
            onPress={onCreateSeason}
            disabled={isCreatingSeason}
          >
            <Text style={styles.primaryButtonText}>
              {isCreatingSeason ? '시즌 등록 중...' : '시즌 등록'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.adminSeasonPanel}>
        <View style={styles.adminSeasonPanelHeader}>
          <View>
            <Text style={styles.noticeTitle}>등록된 시즌</Text>
            <Text style={styles.noticeText}>시즌을 누르면 해당 시즌 운영 페이지로 이동합니다.</Text>
          </View>
          <View style={styles.adminBadgeMuted}>
            <Text style={styles.adminBadgeMutedText}>{activeSeason?.name ?? '활성 시즌 없음'}</Text>
          </View>
        </View>

        <View style={styles.adminSeasonList}>
          {seasons.map((season) => (
            <TouchableOpacity key={season.id} style={styles.adminSeasonListItem} onPress={() => onOpenSeason(season)}>
              <View style={styles.adminSeasonListHeader}>
                <Text style={styles.adminSeasonListTitle}>{season.name}</Text>
                <View
                      style={[
                        styles.adminSeasonStatusBadge,
                        season.status === 'active' && styles.adminSeasonStatusBadgeActive,
                        season.status === 'inactive' && styles.adminSeasonStatusBadgeInactive,
                      ]}
                >
                  <Text style={styles.adminSeasonStatusText}>{season.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.adminSeasonListDescription}>
                {season.description?.trim() || '시즌 설명이 아직 등록되지 않았습니다.'}
              </Text>
              <Text style={styles.adminSeasonListMeta}>
                {season.status === 'active'
                  ? '현재 팀 관리와 경기 일정 관리는 이 시즌을 기준으로 동작합니다.'
                  : 'inactive 시즌입니다. 운영 페이지에서 active로 전환할 수 있습니다.'}
              </Text>
            </TouchableOpacity>
          ))}

          {seasons.length === 0 && (
            <Text style={styles.adminSeasonHint}>
              아직 시즌이 없습니다. 첫 시즌을 등록하면 활성 시즌으로 바로 사용됩니다.
            </Text>
          )}
        </View>
      </View>

    </View>
  );
}

function SeasonOperationsScreen({
  season,
  activeSeason,
  schedules,
  teams,
  onUpdateSeasonStatus,
  onNavigate,
  goBack,
}: {
  season: Season;
  activeSeason: Season | null;
  schedules: MatchSchedule[];
  teams: Team[];
  onUpdateSeasonStatus: (season: Season, nextStatus: Season['status']) => void;
  onNavigate: React.Dispatch<React.SetStateAction<Screen>>;
  goBack: () => void;
}) {
  const isActiveSeason = activeSeason?.id === season.id;

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>{season.name}</Text>
      <Text style={styles.muted}>
        {season.description?.trim() || '시즌 설명이 아직 등록되지 않았습니다.'}
      </Text>

      <View style={styles.adminSeasonPanel}>
        <View style={styles.adminSeasonPanelHeader}>
          <View>
            <Text style={styles.noticeTitle}>시즌 운영</Text>
            <Text style={styles.noticeText}>
              팀 관리와 경기 관리는 등록된 시즌을 선택한 뒤 이 전용 페이지에서 이동합니다.
            </Text>
          </View>
          <View
            style={[
              styles.adminSeasonStatusBadge,
              season.status === 'active' && styles.adminSeasonStatusBadgeActive,
              season.status === 'inactive' && styles.adminSeasonStatusBadgeInactive,
            ]}
          >
            <Text style={styles.adminSeasonStatusText}>{season.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.adminSeasonActionRow}>
          <TouchableOpacity
            style={styles.adminSeasonActionButton}
            onPress={() => onUpdateSeasonStatus(season, isActiveSeason ? 'inactive' : 'active')}
          >
            <MaterialCommunityIcons
              name={isActiveSeason ? 'toggle-switch-off-outline' : 'toggle-switch-outline'}
              size={18}
              color={colors.accent}
            />
            <View style={styles.adminSeasonActionTextWrap}>
              <Text style={styles.adminSeasonActionTitle}>{isActiveSeason ? 'Inactive 변경' : 'Active 변경'}</Text>
              <Text style={styles.adminSeasonActionMeta}>
                {isActiveSeason
                  ? '일반 사용자 화면에서 이 시즌 노출을 중지합니다.'
                  : '기존 active 시즌은 자동으로 inactive 처리됩니다.'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adminSeasonActionButton, !isActiveSeason && styles.adminSeasonActionButtonDisabled]}
            onPress={() => onNavigate('teams')}
            disabled={!isActiveSeason}
          >
            <MaterialCommunityIcons name="shield-outline" size={18} color={isActiveSeason ? colors.accent : colors.sub} />
            <View style={styles.adminSeasonActionTextWrap}>
              <Text style={styles.adminSeasonActionTitle}>팀 관리</Text>
              <Text style={styles.adminSeasonActionMeta}>{isActiveSeason ? `${teams.length}개 팀` : '활성 시즌에서만 사용'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adminSeasonActionButton, !isActiveSeason && styles.adminSeasonActionButtonDisabled]}
            onPress={() => onNavigate('schedule')}
            disabled={!isActiveSeason}
          >
            <MaterialCommunityIcons name="soccer" size={18} color={isActiveSeason ? colors.accent : colors.sub} />
            <View style={styles.adminSeasonActionTextWrap}>
              <Text style={styles.adminSeasonActionTitle}>경기 관리</Text>
              <Text style={styles.adminSeasonActionMeta}>{isActiveSeason ? `${schedules.length}경기` : '활성 시즌에서만 사용'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {!isActiveSeason && (
          <Text style={styles.adminSeasonHint}>
            현재 일반 사용자 화면은 active 시즌 기준으로만 데이터를 노출합니다. 이 시즌을 운영하려면 먼저 active로 전환하세요.
          </Text>
        )}
      </View>
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
  adminShell: {
    gap: 14,
  },
  adminLayout: {
    gap: 16,
  },
  adminLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  adminSidebar: {
    width: 260,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#24441f',
    padding: 18,
    gap: 12,
    alignSelf: 'stretch',
  },
  adminSidebarEyebrow: {
    color: colors.neon,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  adminSidebarTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  adminSidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: '#1f3a22',
    borderRadius: 16,
    padding: 14,
  },
  adminSidebarItemBody: {
    flex: 1,
  },
  adminSidebarItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  adminSidebarItemMeta: {
    color: colors.sub,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  adminMain: {
    flex: 1,
    gap: 16,
  },
  adminHero: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#24441f',
    padding: 20,
    gap: 18,
  },
  adminHeroHeader: {
    gap: 12,
  },
  adminHeroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminBadge: {
    borderRadius: 999,
    backgroundColor: '#17351b',
    borderWidth: 1,
    borderColor: '#2e6f28',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminBadgeText: {
    color: colors.neon,
    fontSize: 12,
    fontWeight: '800',
  },
  adminBadgeMuted: {
    borderRadius: 999,
    backgroundColor: '#101924',
    borderWidth: 1,
    borderColor: '#294352',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminBadgeMutedText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  adminStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adminStatusCard: {
    flexGrow: 1,
    minWidth: 180,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f3a22',
    padding: 16,
    gap: 8,
  },
  adminStatusLabel: {
    color: colors.sub,
    fontSize: 12,
    fontWeight: '700',
  },
  adminStatusValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  adminStatusValueNeon: {
    color: colors.neon,
  },
  adminStatusValueAccent: {
    color: colors.accent,
  },
  adminCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adminActionCard: {
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#24441f',
    padding: 16,
    minHeight: 150,
    gap: 12,
  },
  adminActionCardDisabled: {
    opacity: 0.7,
  },
  adminActionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminActionBadge: {
    color: colors.sub,
    fontSize: 11,
    fontWeight: '800',
  },
  adminActionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  adminActionDescription: {
    color: colors.sub,
    fontSize: 13,
    lineHeight: 20,
  },
  adminInsightGrid: {
    gap: 12,
  },
  adminInsightGridDesktop: {
    flexDirection: 'row',
  },
  adminInsightCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#24441f',
    padding: 18,
  },
  adminSeasonPanel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#24441f',
    padding: 18,
    gap: 14,
  },
  adminSeasonPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  adminSeasonActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adminSeasonActionButton: {
    flexGrow: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f3a22',
    padding: 16,
  },
  adminSeasonActionButtonDisabled: {
    opacity: 0.6,
  },
  adminSeasonActionTextWrap: {
    flex: 1,
  },
  adminSeasonActionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  adminSeasonActionMeta: {
    color: colors.sub,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  adminSeasonHint: {
    color: colors.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  adminFormCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f3a22',
    padding: 16,
    gap: 10,
  },
  adminSeasonList: {
    gap: 10,
  },
  adminSeasonListItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f3a22',
    padding: 16,
    gap: 8,
  },
  adminSeasonListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  adminSeasonListTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  adminSeasonListDescription: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  adminSeasonListMeta: {
    color: colors.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  adminSeasonStatusBadge: {
    borderRadius: 999,
    backgroundColor: '#2f2611',
    borderWidth: 1,
    borderColor: '#7d6521',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  adminSeasonStatusBadgeActive: {
    backgroundColor: '#17351b',
    borderColor: '#2e6f28',
  },
  adminSeasonStatusBadgeInactive: {
    backgroundColor: '#2a1620',
    borderColor: '#6f2845',
  },
  adminSeasonStatusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 14,
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
  noticeActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginBottom: 4,
  },
  noticeDeleteLink: {
    color: '#f87171',
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
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 14,
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
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.bg,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
