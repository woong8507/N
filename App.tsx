import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
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
import { PushRegistrationStatus, registerForPush } from '@/lib/push';
import { isSupabaseConfigured, supabase, supabaseAnonPublicKey, supabaseProjectUrl } from '@/lib/supabase';

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

type Screen = 'auth' | 'signup' | 'home' | 'schedule' | 'teams' | 'notice' | 'mySchedule' | 'league' | 'admin' | 'seasonAdmin' | 'seasonDetailAdmin' | 'seasonTeamAdmin' | 'seasonMatchAdmin' | 'seasonResultAdmin' | 'seasonStandingAdmin' | 'memberAdmin';
type Gender = 'MALE' | 'FEMALE';
type ProfileRole = 'member' | 'admin' | 'super_admin';
type ProfileStatus = 'active' | 'inactive';
type ProfileDepartment = '1부' | '2부' | '3부' | '4부';
type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

const NOTICE_BUCKET = 'notice-files';
const PROFILE_IMAGE_BUCKET = 'profile_img';

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
  matchStatus: MatchStatus;
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
  status: ProfileStatus;
  department: ProfileDepartment | null;
  auto_login: boolean | null;
};

type ProfileWithoutStatus = Omit<Profile, 'status'>;

type ManagedMember = {
  id: string;
  name: string;
  gender: Gender;
  role: ProfileRole;
  status: ProfileStatus;
  department: ProfileDepartment | null;
  auto_login: boolean | null;
  avatar_path: string | null;
  is_deleted: boolean;
  created_at: string | null;
};

type MemberDirectoryItem = {
  id: string;
  name: string;
  avatarPath: string | null;
  avatarUrl: string | null;
};

type ManagedMemberWithoutStatus = Omit<ManagedMember, 'status'>;
type ManagedMemberWithoutDeleted = Omit<ManagedMember, 'is_deleted'>;
type ManagedMemberWithoutStatusAndDeleted = Omit<ManagedMember, 'status' | 'is_deleted'>;

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

type ConfirmDialogState = {
  visible: boolean;
  title: string;
  message?: string;
};

type PushSetupState = {
  status: PushRegistrationStatus;
  token: string | null;
  message: string;
};

type NotificationSummary = {
  title: string;
  body: string;
  receivedAt: string;
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
  status: string | null;
  home_season_team_id: number | null;
  away_season_team_id: number | null;
};

type TeamQueryRow = {
  id: number;
  team_id: number;
  team: {
    id: number;
    name: string;
    team_members: Array<{ user_id: string }> | null;
  } | Array<{
    id: number;
    name: string;
    team_members: Array<{ user_id: string }> | null;
  }> | null;
};

type MatchTeamMember = {
  userId: string;
  name: string;
};

type MatchSeasonTeamItem = {
  seasonTeamId: number;
  teamId: number;
  name: string;
  members: MatchTeamMember[];
};

type TeamDraftRow = {
  id: string;
  seasonTeamId: number | null;
  teamId: number | null;
  playerOneId: string | null;
  playerTwoId: string | null;
  teamName: string;
};

type MatchForm = {
  matchDate: string;
  matchStartTime: string;
  matchEndTime: string;
  place: '3F' | '4F';
  entries: MatchEntry[];
};

type MatchEntry = {
  entryId: string;
  homeSeasonTeamId: number | null;
  awaySeasonTeamId: number | null;
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

type TeamRecentResult = '승' | '무' | '패';

type HomeTab = 'home' | 'schedule' | 'league' | 'teams' | 'notice';
type CalendarEventType = 'holiday' | 'match' | 'leave' | 'business_trip' | 'personal';

type CalendarEvent = {
  id: number;
  season_id: number | null;
  linked_match_id: number | null;
  event_type: CalendarEventType;
  title: string;
  description: string | null;
  location_floor: '3F' | '4F' | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  created_by: string | null;
  source_type: 'manual' | 'holiday_sync' | 'match_sync';
};

type CalendarEventForm = {
  eventType: Extract<CalendarEventType, 'leave' | 'business_trip' | 'personal'>;
  title: string;
  description: string;
  date: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
};

type PersonalScheduleConflictRow = {
  created_by: string | null;
  event_type: Extract<CalendarEventType, 'leave' | 'business_trip' | 'personal'>;
  title: string;
  start_at: string;
  end_at: string;
};

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

const createMatchEntryId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyTeamDraftRow = (): TeamDraftRow => ({
  id: createMatchEntryId(),
  seasonTeamId: null,
  teamId: null,
  playerOneId: null,
  playerTwoId: null,
  teamName: '',
});

const createEmptyMatchEntry = (): MatchEntry => ({
  entryId: createMatchEntryId(),
  homeSeasonTeamId: null,
  awaySeasonTeamId: null,
});

const getTeamRelation = (
  team: TeamQueryRow['team']
): { id: number; name: string; team_members: Array<{ user_id: string }> | null } | null => {
  if (!team) {
    return null;
  }
  return Array.isArray(team) ? (team[0] ?? null) : team;
};

const emptyMatchForm: MatchForm = {
  matchDate: '',
  matchStartTime: '',
  matchEndTime: '',
  place: '4F',
  entries: [createEmptyMatchEntry()],
};

const emptyCalendarEventForm: CalendarEventForm = {
  eventType: 'leave',
  title: '',
  description: '',
  date: '',
  isAllDay: true,
  startTime: '',
  endTime: '',
};

const personalEventTypeLabel: Record<Extract<CalendarEventType, 'leave' | 'business_trip' | 'personal'>, string> = {
  leave: '휴가',
  business_trip: '출장',
  personal: '개인 일정',
};

const matchStatusLabel: Record<MatchStatus, string> = {
  scheduled: '경기전',
  live: '진행중',
  finished: '경기종료',
  cancelled: '취소',
};

const previewProfile: Profile = {
  id: 'preview-user',
  name: '홍길동',
  gender: 'MALE',
  role: 'member',
  status: 'active',
  department: null,
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
    matchStatus: 'scheduled',
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
    matchStatus: 'finished',
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
    matchStatus: 'scheduled',
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

const previewMemberDirectory: MemberDirectoryItem[] = [
  { id: 'preview-member-1', name: '손흥민', avatarPath: null, avatarUrl: null },
  { id: 'preview-member-2', name: '이강인', avatarPath: null, avatarUrl: null },
  { id: 'preview-member-3', name: '김민재', avatarPath: null, avatarUrl: null },
  { id: 'preview-member-4', name: '황희찬', avatarPath: null, avatarUrl: null },
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

const isMatchStatus = (value: string): value is MatchStatus => (
  value === 'scheduled' || value === 'live' || value === 'finished' || value === 'cancelled'
);

const toMatchStatus = (value: string | null | undefined): MatchStatus => {
  if (!value) {
    return 'scheduled';
  }
  return isMatchStatus(value) ? value : 'scheduled';
};

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
  matchStatus: toMatchStatus(row.status),
});

const formatMatchTeamLabel = (teamName: string, players: string) => {
  const normalizedPlayers = players.trim();
  if (!normalizedPlayers || normalizedPlayers === '-') {
    return teamName;
  }
  return `${teamName}(${normalizedPlayers})`;
};

const formatMatchTitleWithPlayers = (
  homeTeam: string,
  homePlayers: string,
  awayTeam: string,
  awayPlayers: string
) => `${formatMatchTeamLabel(homeTeam, homePlayers)} vs ${formatMatchTeamLabel(awayTeam, awayPlayers)}`;

const buildRecentResultsByTeam = (matches: MatchSchedule[]) => {
  const recentByTeam: Record<string, TeamRecentResult[]> = {};
  const finishedMatches = [...matches]
    .filter((match) => (
      match.matchStatus === 'finished'
      && match.homeScore !== null
      && match.awayScore !== null
    ))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const match of finishedMatches) {
    const homeScore = match.homeScore;
    const awayScore = match.awayScore;
    if (homeScore === null || awayScore === null) {
      continue;
    }

    const pushTeamResult = (teamName: string, result: TeamRecentResult) => {
      const bucket = recentByTeam[teamName] ?? [];
      if (bucket.length >= 3) {
        return;
      }
      recentByTeam[teamName] = [...bucket, result];
    };

    if (homeScore > awayScore) {
      pushTeamResult(match.homeTeam, '승');
      pushTeamResult(match.awayTeam, '패');
      continue;
    }
    if (homeScore < awayScore) {
      pushTeamResult(match.homeTeam, '패');
      pushTeamResult(match.awayTeam, '승');
      continue;
    }

    pushTeamResult(match.homeTeam, '무');
    pushTeamResult(match.awayTeam, '무');
  }

  return recentByTeam;
};

const parseMatchPlayerNames = (value: string) => {
  const normalizedValue = value.trim();
  if (!normalizedValue || normalizedValue === '-') {
    return [];
  }

  return normalizedValue
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
};

const getNameInitial = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }

  return trimmed.slice(0, 1).toUpperCase();
};

const toDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
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
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const toDateKey = (value: string) => {
  return toKstDateInputFromIso(value) ?? '';
};

const toDateInput = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return '';
  }

  return `${year}-${month}-${day}`;
};

const toKstDateInputFromIso = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

const toKstTimeLabelFromIso = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;

  if (!hour || !minute) {
    return '';
  }

  return `${hour}:${minute}`;
};

const parseDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
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

const weekdayKo: Array<'일' | '월' | '화' | '수' | '목' | '금' | '토'> = ['일', '월', '화', '수', '목', '금', '토'];

const toWeekdayKoFromDateInput = (dateInput: string) => {
  const date = new Date(`${dateInput}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return weekdayKo[date.getDay()];
};

const defaultPushState: PushSetupState = {
  status: 'idle',
  token: null,
  message: '로그인 후 자동으로 푸시 등록을 시도합니다.',
};

const fallbackAvatarPathByName: Record<string, string> = {
  김대현: 'daehyun.png',
  공덕준: 'deockjoon.png',
  안도예: 'doye.png',
  김형래: 'hyungrae.png',
  김현섭: 'hyunsup.png',
  김진철: 'jinchol.png',
  김종우: 'jongwoo.png',
  이정훈: 'junghoon.png',
  안기철: 'kicheul.png',
  한승규: 'seunggyu.png',
  진승화: 'seunghwa.png',
  정성헌: 'songhon.png',
  김태섭: 'taeseop.png',
  최웅비: 'ungbi.png',
  윤웅기: 'unggi.png',
  조영현: 'younghyun.png',
  이진욱: 'jinwook.png',
};

const getPushStatusLabel = (status: PushRegistrationStatus) => {
  switch (status) {
    case 'checking':
      return '등록 중';
    case 'unsupported':
      return '지원 안 됨';
    case 'simulator':
      return '실기기 필요';
    case 'denied':
      return '권한 꺼짐';
    case 'registered':
      return '등록 완료';
    case 'error':
      return '오류';
    default:
      return '대기';
  }
};

const maskPushToken = (token: string | null) => {
  if (!token) {
    return '아직 발급되지 않았습니다.';
  }

  if (token.length <= 18) {
    return token;
  }

  return `${token.slice(0, 12)}...${token.slice(-6)}`;
};

const isMissingProfileStatusColumnError = (error: { code?: string; message?: string } | null) => {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === '42703'
    || message.includes('profiles.status')
    || message.includes('column profiles.status does not exist')
    || (message.includes('status') && message.includes('does not exist'))
  );
};

const isMissingProfileDeletedColumnError = (error: { code?: string; message?: string } | null) => {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === '42703'
    || message.includes('profiles.is_deleted')
    || message.includes('column profiles.is_deleted does not exist')
    || (message.includes('is_deleted') && message.includes('does not exist'))
  );
};

const getNoticeFileUrl = (notice: Notice) => {
  if (notice.file_path && supabase) {
    const { data } = supabase.storage.from(NOTICE_BUCKET).getPublicUrl(notice.file_path);
    return data.publicUrl;
  }

  return notice.file_url;
};

const resolveProfileAvatarUrl = async (avatarPath: string | null) => {
  if (!avatarPath || !supabase) {
    return null;
  }

  if (/^https?:\/\//i.test(avatarPath)) {
    return avatarPath;
  }

  const normalizedPath = avatarPath.trim().replace(/^\/+/, '');
  if (!normalizedPath) {
    return null;
  }

  const pathParts = normalizedPath.split('/').filter(Boolean);
  const fileName = pathParts[pathParts.length - 1] ?? normalizedPath;
  const toCapitalizedFileName = (value: string) => {
    const dotIndex = value.lastIndexOf('.');
    if (dotIndex <= 0) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    const stem = value.slice(0, dotIndex);
    const ext = value.slice(dotIndex);
    return stem.charAt(0).toUpperCase() + stem.slice(1) + ext;
  };
  const fileNameVariants = Array.from(
    new Set([
      fileName,
      fileName.toLowerCase(),
      fileName.toUpperCase(),
      toCapitalizedFileName(fileName),
    ].filter(Boolean))
  );
  const candidateBuckets = [PROFILE_IMAGE_BUCKET, 'profile_img', 'profile-images'];
  const candidates: Array<{ bucket: string; objectPath: string }> = [];

  if (pathParts.length >= 2) {
    const bucket = pathParts[0];
    if (bucket) {
      candidates.push({
        bucket,
        objectPath: pathParts.slice(1).join('/'),
      });
    }
  }

  for (const bucket of candidateBuckets) {
    candidates.push({
      bucket,
      objectPath: normalizedPath,
    });
  }

  if (normalizedPath.startsWith('profile_img/')) {
    for (const bucket of candidateBuckets) {
      candidates.push({
        bucket,
        objectPath: normalizedPath.replace(/^profile_img\//, ''),
      });
    }
  }

  if (normalizedPath.startsWith('profile-images/')) {
    for (const bucket of candidateBuckets) {
      candidates.push({
        bucket,
        objectPath: normalizedPath.replace(/^profile-images\//, ''),
      });
    }
  }

  if (!normalizedPath.includes('/')) {
    for (const bucket of candidateBuckets) {
      candidates.push({
        bucket,
        objectPath: `profile_img/${normalizedPath}`,
      });
    }
  }

  if (fileName) {
    for (const bucket of candidateBuckets) {
      for (const variant of fileNameVariants) {
        candidates.push({
          bucket,
          objectPath: variant,
        });
      }
    }
  }

  const dedupedCandidates = candidates.filter((candidate, index, arr) => (
    arr.findIndex((item) => item.bucket === candidate.bucket && item.objectPath === candidate.objectPath) === index
  ));

  for (const candidate of dedupedCandidates) {
    if (!candidate.objectPath) {
      continue;
    }

    const signedResult = await supabase.storage
      .from(candidate.bucket)
      .createSignedUrl(candidate.objectPath, 60 * 60 * 24 * 7);

    if (!signedResult.error && signedResult.data?.signedUrl) {
      return signedResult.data.signedUrl;
    }

    const { data: publicData } = supabase.storage
      .from(candidate.bucket)
      .getPublicUrl(candidate.objectPath);

    if (!publicData.publicUrl) {
      continue;
    }
    return publicData.publicUrl;
  }

  return null;
};

export default function App() {
  const { width } = useWindowDimensions();
  const isMobileViewport = width < 768;
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
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
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
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueTable, setLeagueTable] = useState<LeagueRow[]>([]);
  const [selectedLeagueSeasonId, setSelectedLeagueSeasonId] = useState<number | null>(null);
  const [selectedAdminStandingSeasonId, setSelectedAdminStandingSeasonId] = useState<number | null>(null);
  const [leagueStandingsRows, setLeagueStandingsRows] = useState<LeagueRow[]>([]);
  const [leagueRecentByTeam, setLeagueRecentByTeam] = useState<Record<string, TeamRecentResult[]>>({});
  const [leagueTeamAvatarByName, setLeagueTeamAvatarByName] = useState<Record<string, Array<string | null>>>({});
  const [isLoadingLeagueStandings, setIsLoadingLeagueStandings] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seasonForm, setSeasonForm] = useState<SeasonForm>(emptySeasonForm);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [selectedNoticeFile, setSelectedNoticeFile] = useState<DocumentPickerAsset | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isUploadingNotice, setIsUploadingNotice] = useState(false);
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);
  const [pushState, setPushState] = useState<PushSetupState>(defaultPushState);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [lastNotification, setLastNotification] = useState<NotificationSummary | null>(null);
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [memberDirectory, setMemberDirectory] = useState<MemberDirectoryItem[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingSeasonTeamAdmin, setIsLoadingSeasonTeamAdmin] = useState(false);
  const [seasonTeamDraftRows, setSeasonTeamDraftRows] = useState<TeamDraftRow[]>([
    createEmptyTeamDraftRow(),
    createEmptyTeamDraftRow(),
  ]);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [isProfileStatusColumnAvailable, setIsProfileStatusColumnAvailable] = useState(true);
  const [isSavingSeasonTeamAdmin, setIsSavingSeasonTeamAdmin] = useState(false);
  const [selectedSeasonTeamCount, setSelectedSeasonTeamCount] = useState(0);
  const [selectedSeasonMatchCount, setSelectedSeasonMatchCount] = useState(0);
  const [matchSeasonTeams, setMatchSeasonTeams] = useState<MatchSeasonTeamItem[]>([]);
  const [matchForm, setMatchForm] = useState<MatchForm>(emptyMatchForm);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => toDateKey(new Date().toISOString()));
  const [calendarFilter, setCalendarFilter] = useState<'all' | CalendarEventType | 'mine'>('all');
  const [calendarEventForm, setCalendarEventForm] = useState<CalendarEventForm>(emptyCalendarEventForm);
  const [isSavingCalendarEvent, setIsSavingCalendarEvent] = useState(false);
  const [isSyncingHolidayCalendar, setIsSyncingHolidayCalendar] = useState(false);
  const [holidaySyncYear, setHolidaySyncYear] = useState(() => `${new Date().getFullYear()}`);
  const [isLoadingSeasonMatchAdmin, setIsLoadingSeasonMatchAdmin] = useState(false);
  const [isSavingSeasonMatchAdmin, setIsSavingSeasonMatchAdmin] = useState(false);
  const [isLoadingSeasonResultAdmin, setIsLoadingSeasonResultAdmin] = useState(false);
  const [seasonResultSchedules, setSeasonResultSchedules] = useState<MatchSchedule[]>([]);
  const [savingSeasonResultByMatchId, setSavingSeasonResultByMatchId] = useState<Record<number, boolean>>({});
  const [deletingSeasonResultByMatchId, setDeletingSeasonResultByMatchId] = useState<Record<number, boolean>>({});
  const [deletingSeasonEventId, setDeletingSeasonEventId] = useState<number | null>(null);
  const [selectedSeasonMatchTitleByLinkedId, setSelectedSeasonMatchTitleByLinkedId] = useState<Record<string, string>>({});
  const sessionScrollRef = useRef<ScrollView | null>(null);

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
      setCalendarEvents([]);
      setTeams([]);
      setLeagueTable([]);
      setSelectedLeagueSeasonId(null);
      setSelectedAdminStandingSeasonId(null);
      setLeagueStandingsRows([]);
      setLeagueRecentByTeam({});
      setLeagueTeamAvatarByName({});
      setIsLoadingLeagueStandings(false);
      setNotices([]);
      setPushState(defaultPushState);
      setIsRegisteringPush(false);
      setLastNotification(null);
      setMembers([]);
      setMemberDirectory([]);
      setMemberQuery('');
      setIsLoadingMembers(false);
      setUpdatingMemberId(null);
      setIsProfileStatusColumnAvailable(true);
      setIsSavingSeasonTeamAdmin(false);
      setMatchSeasonTeams([]);
      setMatchForm(emptyMatchForm);
      setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      setSelectedCalendarDate(toDateKey(new Date().toISOString()));
      setCalendarFilter('all');
      setCalendarEventForm(emptyCalendarEventForm);
      setIsSavingCalendarEvent(false);
      setIsSyncingHolidayCalendar(false);
      setHolidaySyncYear(`${new Date().getFullYear()}`);
      setIsLoadingSeasonMatchAdmin(false);
      setIsSavingSeasonMatchAdmin(false);
      setIsLoadingSeasonResultAdmin(false);
      setSeasonResultSchedules([]);
      setSavingSeasonResultByMatchId({});
      setDeletingSeasonResultByMatchId({});
      setDeletingSeasonEventId(null);
      setSelectedSeasonMatchTitleByLinkedId({});
      setConfirmDialog({ visible: false, title: '', message: '' });
      return;
    }

    if (!profile) {
      return;
    }

    if (profile.status === 'inactive') {
      return;
    }

    setPushState({
      status: 'checking',
      token: null,
      message: '푸시 권한과 토큰 상태를 확인하는 중입니다.',
    });
    setIsRegisteringPush(true);

    registerForPush()
      .then((result) => {
        setPushState(result);
      })
      .catch((error: unknown) => {
        console.warn('Push registration failed', error);
        setPushState({
          status: 'error',
          token: null,
          message: error instanceof Error ? error.message : '푸시 등록 중 알 수 없는 오류가 발생했습니다.',
        });
      })
      .finally(() => {
        setIsRegisteringPush(false);
      });
  }, [profile, session]);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      setLastNotification({
        title: notification.request.content.title ?? '새 알림',
        body: notification.request.content.body ?? '본문이 없는 알림입니다.',
        receivedAt: new Date().toISOString(),
      });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      setLastNotification({
        title: response.notification.request.content.title ?? '알림 열림',
        body: response.notification.request.content.body ?? '알림에서 앱으로 진입했습니다.',
        receivedAt: new Date().toISOString(),
      });
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!session || !client) {
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);

      const profileResult = await client
        .from('profiles')
        .select('id, name, gender, role, status, department, auto_login')
        .eq('id', session.user.id)
        .maybeSingle();

      let normalizedProfileResult = profileResult as {
        data: Profile | null;
        error: { code?: string; message?: string } | null;
      };

      if (isMissingProfileStatusColumnError(profileResult.error)) {
        const fallbackProfileResult = await client
          .from('profiles')
          .select('id, name, gender, role, department, auto_login')
          .eq('id', session.user.id)
          .maybeSingle();

        if (fallbackProfileResult.error) {
          normalizedProfileResult = {
            data: null,
            error: fallbackProfileResult.error,
          };
        } else {
          normalizedProfileResult = {
            data: fallbackProfileResult.data
              ? { ...(fallbackProfileResult.data as ProfileWithoutStatus), status: 'active' }
              : null,
            error: null,
          };
        }
      }

      const loadMemberDirectoryRows = async () => {
        const membersResult = await client
          .from('profiles')
          .select('id, name, avatar_path, is_deleted')
          .eq('role', 'member')
          .order('created_at', { ascending: false });

        if (!isMissingProfileDeletedColumnError(membersResult.error)) {
          return {
            rows: ((membersResult.data as Array<{
              id: string;
              name: string;
              avatar_path: string | null;
              is_deleted: boolean;
            }> | null) ?? []).filter((member) => member.is_deleted === false),
            error: membersResult.error,
          };
        }

        const fallbackMembersResult = await client
          .from('profiles')
          .select('id, name, avatar_path')
          .eq('role', 'member')
          .order('created_at', { ascending: false });

        return {
          rows: (fallbackMembersResult.data as Array<{
            id: string;
            name: string;
            avatar_path: string | null;
          }> | null) ?? [],
          error: fallbackMembersResult.error,
        };
      };

      const [
        seasonsResult,
        noticesResult,
        calendarEventsResult,
        memberDirectoryResult,
      ] = await Promise.all([
        client.from('seasons').select('id, name, description, status').order('created_at', { ascending: false }),
        client
          .from('notices')
          .select('id, title, body, file_path, file_url, created_at')
          .order('created_at', { ascending: false }),
        client
          .from('calendar_events')
          .select('id, season_id, linked_match_id, event_type, title, description, location_floor, start_at, end_at, is_all_day, created_by, source_type')
          .order('start_at', { ascending: true }),
        loadMemberDirectoryRows(),
      ]);

      if (normalizedProfileResult.error) {
        showMessage('프로필 불러오기 실패', normalizedProfileResult.error.message);
      } else {
        const nextProfile = normalizedProfileResult.data ?? null;
        setProfile(nextProfile);

        if (nextProfile?.status === 'inactive') {
          setIsLoadingData(false);
          showMessage('로그인 차단', '비활성화된 계정입니다. 관리자에게 문의하세요.');
          await client.auth.signOut();
          return;
        }

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

      if (calendarEventsResult.error) {
        showMessage('캘린더 일정 불러오기 실패', calendarEventsResult.error.message);
      } else {
        setCalendarEvents((calendarEventsResult.data as CalendarEvent[] | null) ?? []);
      }

      if (memberDirectoryResult.error) {
        setMemberDirectory([]);
      } else {
        const nextMemberDirectory = await Promise.all(
          memberDirectoryResult.rows.map(async (member) => {
            const avatarPath = member.avatar_path ?? null;
            const avatarUrl = await resolveProfileAvatarUrl(avatarPath);
            return {
              id: member.id,
              name: member.name,
              avatarPath,
              avatarUrl,
            };
          })
        );
        setMemberDirectory(nextMemberDirectory);
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
            'id, match_date, weekday, place, home_players, away_players, home_rating, away_rating, home_score, away_score, status, home_season_team_id, away_season_team_id'
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
          name: getTeamRelation(seasonTeam.team)?.name ?? '이름 없음',
          memberCount: getTeamRelation(seasonTeam.team)?.team_members?.length ?? 0,
        }));
        const nextMemberTeamIds = seasonTeams
          .filter((seasonTeam) =>
            getTeamRelation(seasonTeam.team)?.team_members?.some((member) => member.user_id === session.user.id)
          )
          .map((seasonTeam) => seasonTeam.id);
        setTeams(nextTeams);
        setMemberTeamIds(nextMemberTeamIds);

        const teamNamesBySeasonTeamId = seasonTeams.reduce<Record<number, string>>((acc, seasonTeam) => {
          acc[seasonTeam.id] = getTeamRelation(seasonTeam.team)?.name ?? 'TBD';
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

  const refreshCalendarEvents = async (client: NonNullable<typeof supabase>) => {
    const eventsResult = await client
      .from('calendar_events')
      .select('id, season_id, linked_match_id, event_type, title, description, location_floor, start_at, end_at, is_all_day, created_by, source_type')
      .order('start_at', { ascending: true });

    if (eventsResult.error) {
      throw eventsResult.error;
    }

    setCalendarEvents((eventsResult.data as CalendarEvent[] | null) ?? []);
  };

  const refreshActiveSeasonTeams = async (client: NonNullable<typeof supabase>, currentActiveSeasonId: number, userId: string) => {
    const seasonTeamsResult = await client
      .from('season_teams')
      .select('id, team_id, team:teams(id, name, team_members(user_id))')
      .eq('season_id', currentActiveSeasonId)
      .order('display_order', { ascending: true });

    if (seasonTeamsResult.error) {
      throw seasonTeamsResult.error;
    }

    const seasonTeams = (seasonTeamsResult.data as TeamQueryRow[] | null) ?? [];
    const nextTeams = seasonTeams.map((seasonTeam) => ({
      id: seasonTeam.id,
      name: getTeamRelation(seasonTeam.team)?.name ?? '이름 없음',
      memberCount: getTeamRelation(seasonTeam.team)?.team_members?.length ?? 0,
    }));
    const nextMemberTeamIds = seasonTeams
      .filter((seasonTeam) =>
        getTeamRelation(seasonTeam.team)?.team_members?.some((member) => member.user_id === userId)
      )
      .map((seasonTeam) => seasonTeam.id);

    setTeams(nextTeams);
    setMemberTeamIds(nextMemberTeamIds);
  };

  const fetchSeasonSchedules = async (client: NonNullable<typeof supabase>, seasonId: number) => {
    const seasonTeamsResult = await client
      .from('season_teams')
      .select('id, team:teams(name)')
      .eq('season_id', seasonId);

    if (seasonTeamsResult.error) {
      throw seasonTeamsResult.error;
    }

    const teamNamesBySeasonTeamId = ((seasonTeamsResult.data as Array<{ id: number; team: Array<{ name: string }> | null }> | null) ?? [])
      .reduce<Record<number, string>>((acc, row) => {
        const rowTeam = Array.isArray(row.team) ? (row.team[0] ?? null) : row.team;
        acc[row.id] = rowTeam?.name ?? 'TBD';
        return acc;
      }, {});

    const matchesResult = await client
      .from('matches')
      .select(
        'id, match_date, weekday, place, home_players, away_players, home_rating, away_rating, home_score, away_score, status, home_season_team_id, away_season_team_id'
      )
      .eq('season_id', seasonId)
      .order('match_date', { ascending: true });

    if (matchesResult.error) {
      throw matchesResult.error;
    }

    return ((matchesResult.data as MatchQueryRow[] | null) ?? []).map((row) => mapMatchRow(row, teamNamesBySeasonTeamId));
  };

  const fetchSeasonLeagueTable = async (client: NonNullable<typeof supabase>, seasonId: number) => {
    const leagueResult = await client
      .from('league_table')
      .select('rank, team, wins, draws, losses, points, gf, ga, gd, played')
      .eq('season_id', seasonId)
      .order('rank', { ascending: true });

    if (leagueResult.error) {
      throw leagueResult.error;
    }

    return (leagueResult.data as LeagueQueryRow[] | null) ?? [];
  };

  const fetchSeasonTeamAvatarByName = async (
    client: NonNullable<typeof supabase>,
    seasonId: number
  ) => {
    const seasonTeamsResult = await client
      .from('season_teams')
      .select('id, team:teams(name, team_members(user_id))')
      .eq('season_id', seasonId);

    if (seasonTeamsResult.error) {
      throw seasonTeamsResult.error;
    }

    const avatarUrlByMemberId = memberDirectory.reduce<Record<string, string | null>>((acc, member) => {
      acc[member.id] = member.avatarUrl;
      return acc;
    }, {});

    return ((seasonTeamsResult.data as Array<{
      team: {
        name: string;
        team_members: Array<{ user_id: string }> | null;
      } | Array<{
        name: string;
        team_members: Array<{ user_id: string }> | null;
      }> | null;
    }> | null) ?? []).reduce<Record<string, Array<string | null>>>((acc, row) => {
      const teamRelation = Array.isArray(row.team) ? (row.team[0] ?? null) : row.team;
      const teamName = teamRelation?.name;
      if (!teamName) {
        return acc;
      }
      const teamMemberIds = (teamRelation.team_members ?? []).map((member) => member.user_id).slice(0, 2);
      const avatarUrls = teamMemberIds.map((memberId) => avatarUrlByMemberId[memberId] ?? null);
      while (avatarUrls.length < 2) {
        avatarUrls.push(null);
      }
      acc[teamName] = avatarUrls;
      return acc;
    }, {});
  };

  const refreshLeagueStandingsData = async (
    client: NonNullable<typeof supabase>,
    seasonId: number
  ) => {
    setIsLoadingLeagueStandings(true);
    try {
      const [leagueRows, seasonMatches, teamAvatarByName] = await Promise.all([
        fetchSeasonLeagueTable(client, seasonId),
        fetchSeasonSchedules(client, seasonId),
        fetchSeasonTeamAvatarByName(client, seasonId),
      ]);
      setLeagueStandingsRows(leagueRows);
      setLeagueRecentByTeam(buildRecentResultsByTeam(seasonMatches));
      setLeagueTeamAvatarByName(teamAvatarByName);
    } finally {
      setIsLoadingLeagueStandings(false);
    }
  };

  const refreshSeasonSchedules = async (client: NonNullable<typeof supabase>, seasonId: number) => {
    const seasonSchedules = await fetchSeasonSchedules(client, seasonId);
    setSchedules(seasonSchedules);
  };

  const refreshSeasonResultManagementData = async (
    client: NonNullable<typeof supabase>,
    seasonId: number
  ) => {
    setIsLoadingSeasonResultAdmin(true);
    try {
      const nextSchedules = await fetchSeasonSchedules(client, seasonId);
      setSeasonResultSchedules(nextSchedules);
    } finally {
      setIsLoadingSeasonResultAdmin(false);
    }
  };

  const refreshSeasonMatchManagementData = async (
    client: NonNullable<typeof supabase>,
    seasonId: number
  ) => {
    setIsLoadingSeasonMatchAdmin(true);

    try {
      const seasonTeamsResult = await client
        .from('season_teams')
        .select('id, team_id, team:teams(id, name, team_members(user_id))')
        .eq('season_id', seasonId)
        .order('display_order', { ascending: true });

      if (seasonTeamsResult.error) {
        throw seasonTeamsResult.error;
      }

      const seasonTeams = (seasonTeamsResult.data as TeamQueryRow[] | null) ?? [];
      const memberUserIds = Array.from(
        new Set(
          seasonTeams.flatMap((seasonTeam) => getTeamRelation(seasonTeam.team)?.team_members?.map((member) => member.user_id) ?? [])
        )
      );

      const profileNameById: Record<string, string> = {};
      if (memberUserIds.length > 0) {
        const profilesResult = await client
          .from('profiles')
          .select('id, name')
          .in('id', memberUserIds);

        if (profilesResult.error) {
          throw profilesResult.error;
        }

        for (const profileRow of (profilesResult.data as Array<{ id: string; name: string }> | null) ?? []) {
          profileNameById[profileRow.id] = profileRow.name;
        }
      }

      const nextMatchSeasonTeams: MatchSeasonTeamItem[] = seasonTeams.map((seasonTeam) => ({
        seasonTeamId: seasonTeam.id,
        teamId: getTeamRelation(seasonTeam.team)?.id ?? seasonTeam.team_id,
        name: getTeamRelation(seasonTeam.team)?.name ?? '이름 없음',
        members: (getTeamRelation(seasonTeam.team)?.team_members ?? []).map((member) => ({
          userId: member.user_id,
          name: profileNameById[member.user_id] ?? member.user_id.slice(0, 8),
        })),
      }));

      setMatchSeasonTeams(nextMatchSeasonTeams);
      setMatchForm((prev) => {
        if (prev.entries.length > 0) {
          return prev;
        }
        return { ...prev, entries: [createEmptyMatchEntry()] };
      });
    } finally {
      setIsLoadingSeasonMatchAdmin(false);
    }
  };

  const refreshSelectedSeasonSummary = async (
    client: NonNullable<typeof supabase>,
    seasonId: number
  ) => {
    const [teamCountResult, matchCountResult] = await Promise.all([
      client
        .from('season_teams')
        .select('id', { count: 'exact', head: true })
        .eq('season_id', seasonId),
      client
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .eq('season_id', seasonId),
    ]);

    if (teamCountResult.error) {
      throw teamCountResult.error;
    }
    if (matchCountResult.error) {
      throw matchCountResult.error;
    }

    setSelectedSeasonTeamCount(teamCountResult.count ?? 0);
    setSelectedSeasonMatchCount(matchCountResult.count ?? 0);
  };

  const refreshSelectedSeasonMatchTitles = async (
    client: NonNullable<typeof supabase>,
    seasonId: number
  ) => {
    const seasonTeamsResult = await client
      .from('season_teams')
      .select('id, team:teams(name)')
      .eq('season_id', seasonId);

    if (seasonTeamsResult.error) {
      throw seasonTeamsResult.error;
    }

    const teamNamesBySeasonTeamId = ((seasonTeamsResult.data as Array<{ id: number; team: Array<{ name: string }> | null }> | null) ?? [])
      .reduce<Record<number, string>>((acc, row) => {
        const rowTeam = Array.isArray(row.team) ? (row.team[0] ?? null) : row.team;
        acc[row.id] = rowTeam?.name ?? 'TBD';
        return acc;
      }, {});

    const matchesResult = await client
      .from('matches')
      .select('id, home_season_team_id, away_season_team_id, home_players, away_players')
      .eq('season_id', seasonId);

    if (matchesResult.error) {
      throw matchesResult.error;
    }

    const nextMatchTitleByLinkedId = ((matchesResult.data as Array<{
      id: number;
      home_season_team_id: number | null;
      away_season_team_id: number | null;
      home_players: string | null;
      away_players: string | null;
    }> | null) ?? []).reduce<Record<string, string>>((acc, row) => {
      const homeTeam = row.home_season_team_id ? (teamNamesBySeasonTeamId[row.home_season_team_id] ?? 'TBD') : 'TBD';
      const awayTeam = row.away_season_team_id ? (teamNamesBySeasonTeamId[row.away_season_team_id] ?? 'TBD') : 'TBD';
      acc[String(row.id)] = formatMatchTitleWithPlayers(
        homeTeam,
        row.home_players ?? '-',
        awayTeam,
        row.away_players ?? '-'
      );
      return acc;
    }, {});

    setSelectedSeasonMatchTitleByLinkedId(nextMatchTitleByLinkedId);
  };

  const refreshSeasonTeamManagementData = async (
    client: NonNullable<typeof supabase>,
    seasonId: number
  ) => {
    setIsLoadingSeasonTeamAdmin(true);
    try {
      const seasonTeamsResult = await client
        .from('season_teams')
        .select('id, team_id, display_order')
        .eq('season_id', seasonId)
        .order('display_order', { ascending: true });

      if (seasonTeamsResult.error) {
        throw seasonTeamsResult.error;
      }

      const seasonTeams = (seasonTeamsResult.data as Array<{
        id: number;
        team_id: number;
        display_order: number | null;
      }> | null) ?? [];

      const teamIds = seasonTeams.map((seasonTeam) => seasonTeam.team_id);
      const teamNameById: Record<number, string> = {};
      const memberIdsByTeamId: Record<number, string[]> = {};

      if (teamIds.length > 0) {
        const [teamsResult, teamMembersResult] = await Promise.all([
          client
            .from('teams')
            .select('id, name')
            .in('id', teamIds),
          client
            .from('team_members')
            .select('team_id, user_id')
            .in('team_id', teamIds),
        ]);

        if (teamsResult.error) {
          throw teamsResult.error;
        }
        if (teamMembersResult.error) {
          throw teamMembersResult.error;
        }

        for (const team of (teamsResult.data as Array<{ id: number; name: string }> | null) ?? []) {
          teamNameById[team.id] = team.name;
        }

        for (const member of (teamMembersResult.data as Array<{ team_id: number; user_id: string }> | null) ?? []) {
          const memberIds = memberIdsByTeamId[member.team_id] ?? [];
          memberIds.push(member.user_id);
          memberIdsByTeamId[member.team_id] = memberIds;
        }
      }

      const nextRows = seasonTeams.map((seasonTeam) => {
        const members = memberIdsByTeamId[seasonTeam.team_id] ?? [];
        return {
          id: createMatchEntryId(),
          seasonTeamId: seasonTeam.id,
          teamId: seasonTeam.team_id,
          playerOneId: members[0] ?? null,
          playerTwoId: members[1] ?? null,
          teamName: teamNameById[seasonTeam.team_id] ?? '',
        };
      });

      setSeasonTeamDraftRows(
        nextRows.length >= 2
          ? nextRows
          : [...nextRows, ...Array.from({ length: 2 - nextRows.length }, () => createEmptyTeamDraftRow())]
      );
    } finally {
      setIsLoadingSeasonTeamAdmin(false);
    }
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

  const refreshPushRegistration = async () => {
    if (!session) {
      showMessage('로그인 필요', '푸시 등록은 로그인 후 사용할 수 있습니다.');
      return;
    }

    setPushState({
      status: 'checking',
      token: pushState.token,
      message: '푸시 토큰을 다시 등록하는 중입니다.',
    });
    setIsRegisteringPush(true);

    try {
      const result = await registerForPush();
      setPushState(result);
      if (result.status === 'registered') {
        showMessage('푸시 등록 완료', result.message);
      } else if (result.status === 'denied' || result.status === 'error') {
        showMessage('푸시 등록 확인 필요', result.message);
      }
    } catch (error) {
      showMessage(
        '푸시 등록 실패',
        error instanceof Error ? error.message : '푸시 등록 중 오류가 발생했습니다.'
      );
      setPushState({
        status: 'error',
        token: null,
        message: error instanceof Error ? error.message : '푸시 등록 중 오류가 발생했습니다.',
      });
    } finally {
      setIsRegisteringPush(false);
    }
  };

  const refreshMembers = async (client: NonNullable<typeof supabase>) => {
    setIsLoadingMembers(true);

    try {
      const membersResult = await client
        .from('profiles')
        .select('id, name, gender, role, status, department, auto_login, avatar_path, is_deleted, created_at')
        .eq('is_deleted', false)
        .eq('role', 'member')
        .order('created_at', { ascending: false });

      let normalizedResult = membersResult as {
        data: ManagedMember[] | null;
        error: { code?: string; message?: string } | null;
      };

      if (isMissingProfileStatusColumnError(membersResult.error) || isMissingProfileDeletedColumnError(membersResult.error)) {
        const statusMissing = isMissingProfileStatusColumnError(membersResult.error);
        const deletedMissing = isMissingProfileDeletedColumnError(membersResult.error);
        if (!statusMissing) {
          setIsProfileStatusColumnAvailable(true);
        }
        const fallbackSelect = [
          'id',
          'name',
          'gender',
          'role',
          ...(!statusMissing ? ['status'] : []),
          'department',
          'auto_login',
          'avatar_path',
          ...(!deletedMissing ? ['is_deleted'] : []),
          'created_at',
        ].join(', ');

        const fallbackMembersResult = await client
          .from('profiles')
          .select(fallbackSelect)
          .eq('is_deleted', false)
          .eq('role', 'member')
          .order('created_at', { ascending: false });

        if (fallbackMembersResult.error) {
          normalizedResult = {
            data: null,
            error: fallbackMembersResult.error,
          };
        } else if (statusMissing && deletedMissing) {
          normalizedResult = {
            data: (((fallbackMembersResult.data as unknown as ManagedMemberWithoutStatusAndDeleted[] | null) ?? []).map((member) => ({
              ...member,
              status: 'active',
              is_deleted: false,
            }))),
            error: null,
          };
          setIsProfileStatusColumnAvailable(false);
        } else if (statusMissing) {
          normalizedResult = {
            data: (((fallbackMembersResult.data as unknown as ManagedMemberWithoutStatus[] | null) ?? []).map((member) => ({
              ...member,
              status: 'active',
            }))),
            error: null,
          };
          setIsProfileStatusColumnAvailable(false);
        } else {
          normalizedResult = {
            data: (((fallbackMembersResult.data as unknown as ManagedMemberWithoutDeleted[] | null) ?? []).map((member) => ({
              ...member,
              is_deleted: false,
            }))),
            error: null,
          };
        }
      } else {
        setIsProfileStatusColumnAvailable(true);
      }

      if (normalizedResult.error) {
        throw normalizedResult.error;
      }

      setMembers(
        (((normalizedResult.data as ManagedMember[] | null) ?? []).filter((member) => (
          member.is_deleted === false && member.role === 'member'
        )))
      );
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const updateMember = async (
    member: ManagedMember,
    updates: Partial<Pick<ManagedMember, 'role' | 'status' | 'department'>>
  ) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '회원 관리는 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '회원 관리는 admin 이상 계정만 사용할 수 있습니다.');
    }
    if (updates.role && !isSuperAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '권한 변경은 super_admin 계정만 수행할 수 있습니다.');
    }
    if (updates.role && member.id === session.user.id && updates.role !== member.role) {
      return showMessage('변경 제한', '현재 로그인한 본인 계정의 역할은 직접 변경할 수 없습니다.');
    }
    if (updates.status && !isProfileStatusColumnAvailable) {
      return showMessage('스키마 확인 필요', 'profiles.status 컬럼이 없어 상태 변경을 수행할 수 없습니다.');
    }

    setUpdatingMemberId(member.id);

    try {
      const updateResult = await client
        .from('profiles')
        .update(updates)
        .eq('id', member.id);

      if (updates.status && isMissingProfileStatusColumnError(updateResult.error)) {
        setIsProfileStatusColumnAvailable(false);
        showMessage('스키마 확인 필요', 'profiles.status 컬럼이 없어 상태 변경을 수행할 수 없습니다.');
        await refreshMembers(client);
        return;
      }

      if (updateResult.error) {
        throw updateResult.error;
      }

      setMembers((prevMembers) =>
        prevMembers.map((current) =>
          current.id === member.id ? { ...current, ...updates } : current
        )
      );
      setProfile((prevProfile) =>
        prevProfile && prevProfile.id === member.id ? { ...prevProfile, ...updates } : prevProfile
      );
    } catch (error) {
      showMessage('회원 정보 수정 실패', error instanceof Error ? error.message : '회원 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const softDeleteMember = async (member: ManagedMember) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '회원 관리는 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '회원 관리는 admin 이상 계정만 사용할 수 있습니다.');
    }
    if (member.id === session.user.id) {
      return showMessage('변경 제한', '현재 로그인한 본인 계정은 삭제 처리할 수 없습니다.');
    }

    setUpdatingMemberId(member.id);

    try {
      const updateResult = await client
        .from('profiles')
        .update({ is_deleted: true })
        .eq('id', member.id);

      if (isMissingProfileDeletedColumnError(updateResult.error)) {
        showMessage('스키마 확인 필요', 'profiles.is_deleted 컬럼이 없어 삭제 플래그를 저장할 수 없습니다.');
        return;
      }

      if (updateResult.error) {
        throw updateResult.error;
      }

      setMembers((prevMembers) =>
        prevMembers.map((current) =>
          current.id === member.id ? { ...current, is_deleted: true } : current
        )
      );
      showMessage('삭제되었습니다.');
    } catch (error) {
      showMessage('회원 삭제 처리 실패', error instanceof Error ? error.message : '회원 삭제 처리 중 오류가 발생했습니다.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const addMatchEntry = () => {
    setMatchForm((prev) => ({
      ...prev,
      entries: [...prev.entries, createEmptyMatchEntry()],
    }));
  };

  const removeMatchEntry = (entryId: string) => {
    setMatchForm((prev) => {
      if (prev.entries.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        entries: prev.entries.filter((entry) => entry.entryId !== entryId),
      };
    });
  };

  const updateMatchEntry = (entryId: string, updater: (entry: MatchEntry) => MatchEntry) => {
    setMatchForm((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.entryId === entryId ? updater(entry) : entry)),
    }));
  };

  const getTeamMembers = (seasonTeamId: number | null) => {
    if (!seasonTeamId) {
      return [];
    }
    return matchSeasonTeams.find((team) => team.seasonTeamId === seasonTeamId)?.members ?? [];
  };

  const saveSeasonMatches = async (skipPersonalScheduleCheck = false) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '경기 등록은 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '경기 등록은 admin 이상 계정만 사용할 수 있습니다.');
    }
    if (!selectedAdminSeason) {
      return showMessage('시즌 선택 필요', '먼저 시즌을 선택하세요.');
    }
    if (!matchForm.matchDate) {
      return showMessage('경기일 필요', '경기일을 선택하세요.');
    }
    if (!matchForm.matchStartTime || !matchForm.matchEndTime) {
      return showMessage('시간 입력 필요', '경기 시작/종료 시간을 입력하세요.');
    }

    const dayStart = new Date(`${matchForm.matchDate}T00:00:00+09:00`);
    const nextDayStart = new Date(dayStart.getTime());
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    if (Number.isNaN(dayStart.getTime())) {
      return showMessage('날짜 형식 오류', '경기일 형식을 확인하세요.');
    }
    const dayStartMs = dayStart.getTime();
    const nextDayStartMs = nextDayStart.getTime();
    const dayStartIso = dayStart.toISOString();
    const nextDayStartIso = nextDayStart.toISOString();

    const holidayFromCache = calendarEvents.find((event) => {
      if (event.event_type !== 'holiday') {
        return false;
      }
      const startMs = new Date(event.start_at).getTime();
      const endMs = new Date(event.end_at).getTime();
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
        return false;
      }
      const startDateKst = toKstDateInputFromIso(event.start_at);
      const endDateKst = toKstDateInputFromIso(event.end_at);
      const hasKstDateOverlap = Boolean(
        startDateKst
        && endDateKst
        && matchForm.matchDate >= startDateKst
        && matchForm.matchDate <= endDateKst
      );
      return (startMs < nextDayStartMs && endMs >= dayStartMs) || hasKstDateOverlap;
    });

    if (holidayFromCache) {
      return showMessage('공휴일 충돌', `${matchForm.matchDate}은(는) 공휴일(${holidayFromCache.title})입니다. 경기 등록이 불가합니다.`);
    }

    const holidayResult = await client
      .from('calendar_events')
      .select('title, start_at, end_at')
      .eq('event_type', 'holiday')
      .lt('start_at', nextDayStartIso)
      .gte('end_at', dayStartIso)
      .limit(1);

    if (holidayResult.error) {
      return showMessage('공휴일 확인 실패', holidayResult.error.message);
    }

    const holidayRow = (holidayResult.data as Array<{ title: string | null; start_at: string; end_at: string }> | null)?.[0] ?? null;
    if (holidayRow) {
      return showMessage('공휴일 충돌', `${matchForm.matchDate}은(는) 공휴일(${holidayRow.title ?? '공휴일'})입니다. 경기 등록이 불가합니다.`);
    }

    const invalidEntry = matchForm.entries.find((entry) =>
      !entry.homeSeasonTeamId
      || !entry.awaySeasonTeamId
      || entry.homeSeasonTeamId === entry.awaySeasonTeamId
    );

    if (invalidEntry) {
      return showMessage('입력 확인', '각 매치마다 홈/원정 팀을 선택하세요.');
    }

    const invalidTeamMemberEntry = matchForm.entries.find((entry) => {
      const homeTeamMembers = getTeamMembers(entry.homeSeasonTeamId);
      const awayTeamMembers = getTeamMembers(entry.awaySeasonTeamId);
      return homeTeamMembers.length < 1 || awayTeamMembers.length < 1;
    });

    if (invalidTeamMemberEntry) {
      return showMessage('입력 확인', '선택한 팀에 등록된 팀원이 1명 이상인지 확인하세요.');
    }

    if (!skipPersonalScheduleCheck) {
      const memberNameById: Record<string, string> = {};
      for (const entry of matchForm.entries) {
        const homeTeamMembers = getTeamMembers(entry.homeSeasonTeamId);
        const awayTeamMembers = getTeamMembers(entry.awaySeasonTeamId);
        for (const member of [...homeTeamMembers, ...awayTeamMembers]) {
          if (!memberNameById[member.userId]) {
            memberNameById[member.userId] = member.name;
          }
        }
      }

      const memberIds = Object.keys(memberNameById);
      if (memberIds.length > 0) {
        const memberIdSet = new Set(memberIds);
        const firstConflictByMember: Record<string, PersonalScheduleConflictRow> = {};

        for (const event of calendarEvents) {
          if (event.event_type !== 'leave' && event.event_type !== 'business_trip' && event.event_type !== 'personal') {
            continue;
          }
          if (!event.created_by || !memberIdSet.has(event.created_by)) {
            continue;
          }

          const startMs = new Date(event.start_at).getTime();
          const endMs = new Date(event.end_at).getTime();
          if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
            continue;
          }

          const startDateKst = toKstDateInputFromIso(event.start_at);
          const endDateKst = toKstDateInputFromIso(event.end_at);
          const hasKstDateOverlap = Boolean(
            startDateKst
            && endDateKst
            && matchForm.matchDate >= startDateKst
            && matchForm.matchDate <= endDateKst
          );
          const hasOverlap = (startMs < nextDayStartMs && endMs >= dayStartMs) || hasKstDateOverlap;
          if (!hasOverlap) {
            continue;
          }

          if (!firstConflictByMember[event.created_by]) {
            firstConflictByMember[event.created_by] = {
              created_by: event.created_by,
              event_type: event.event_type,
              title: event.title,
              start_at: event.start_at,
              end_at: event.end_at,
            };
          }
        }

        try {
          const conflictResult = await client
            .from('calendar_events')
            .select('created_by, event_type, title, start_at, end_at')
            .in('created_by', memberIds)
            .in('event_type', ['leave', 'business_trip', 'personal'])
            .lt('start_at', nextDayStartIso)
            .gte('end_at', dayStartIso);

          if (conflictResult.error) {
            throw conflictResult.error;
          }

          for (const row of (conflictResult.data as PersonalScheduleConflictRow[] | null) ?? []) {
            if (!row.created_by) {
              continue;
            }
            if (!firstConflictByMember[row.created_by]) {
              firstConflictByMember[row.created_by] = row;
            }
          }
        } catch (error) {
          return showMessage('개인 일정 확인 실패', error instanceof Error ? error.message : '일정 확인 중 오류가 발생했습니다.');
        }

        const conflictLines = Object.entries(firstConflictByMember).map(([memberId, row]) => {
          const memberName = memberNameById[memberId] ?? memberId.slice(0, 8);
          const eventTypeLabel = personalEventTypeLabel[row.event_type] ?? '개인 일정';
          return `${memberName} 선수 ${eventTypeLabel} 입니다.`;
        });

        if (conflictLines.length > 0) {
          setConfirmDialog({
            visible: true,
            title: '개인 일정 충돌',
            message: `${conflictLines.join('\n')}\n그래도 등록 하시겠습니까?`,
          });
          return;
        }
      }
    }

    setIsSavingSeasonMatchAdmin(true);

    try {
      const weekday = toWeekdayKoFromDateInput(matchForm.matchDate);
      // match_date is used as a date anchor. Store at noon KST to avoid UTC day-shift (e.g. 23 -> 22).
      const matchDateIso = new Date(`${matchForm.matchDate}T12:00:00+09:00`).toISOString();
      const matchStartAt = new Date(`${matchForm.matchDate}T${matchForm.matchStartTime}:00+09:00`);
      const matchEndAt = new Date(`${matchForm.matchDate}T${matchForm.matchEndTime}:00+09:00`);

      if (Number.isNaN(matchStartAt.getTime()) || Number.isNaN(matchEndAt.getTime())) {
        return showMessage('시간 형식 오류', '시간은 HH:MM 형식으로 입력하세요.');
      }
      if (matchEndAt.getTime() <= matchStartAt.getTime()) {
        return showMessage('시간 입력 확인', '종료 시간은 시작 시간보다 늦어야 합니다.');
      }

      const payload = matchForm.entries.map((entry) => {
        const homeTeamMembers = getTeamMembers(entry.homeSeasonTeamId);
        const awayTeamMembers = getTeamMembers(entry.awaySeasonTeamId);
        const homePlayers = homeTeamMembers
          .map((member) => member.name)
          .join(', ');
        const awayPlayers = awayTeamMembers
          .map((member) => member.name)
          .join(', ');

        return {
          season_id: selectedAdminSeason.id,
          match_date: matchDateIso,
          match_start_at: matchStartAt.toISOString(),
          match_end_at: matchEndAt.toISOString(),
          weekday,
          place: matchForm.place,
          home_season_team_id: entry.homeSeasonTeamId,
          away_season_team_id: entry.awaySeasonTeamId,
          home_players: homePlayers,
          away_players: awayPlayers,
          created_by: session.user.id,
        };
      });

      const insertResult = await client
        .from('matches')
        .insert(payload);

      if (insertResult.error) {
        throw insertResult.error;
      }

      if (activeSeason?.id === selectedAdminSeason.id) {
        await refreshSeasonSchedules(client, selectedAdminSeason.id);
      }
      await refreshSelectedSeasonMatchTitles(client, selectedAdminSeason.id);
      await refreshCalendarEvents(client);

      setMatchForm({
        ...emptyMatchForm,
        matchDate: matchForm.matchDate,
        matchStartTime: matchForm.matchStartTime,
        matchEndTime: matchForm.matchEndTime,
        place: matchForm.place,
      });

      showMessage('경기 등록 완료', `${payload.length}개의 2:2 경기를 등록했습니다.`);
    } catch (error) {
      showMessage('경기 등록 실패', error instanceof Error ? error.message : '경기 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSavingSeasonMatchAdmin(false);
    }
  };

  const saveSeasonMatchResult = async (params: {
    matchId: number;
    homeScore: number | null;
    awayScore: number | null;
    currentStatus: MatchStatus;
  }) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '경기결과 등록은 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '경기결과 등록은 admin 이상 계정만 사용할 수 있습니다.');
    }
    if (!selectedAdminSeason) {
      return showMessage('시즌 선택 필요', '먼저 시즌을 선택하세요.');
    }

    const hasBothScores = params.homeScore !== null && params.awayScore !== null;
    const nextStatus: MatchStatus = hasBothScores
      ? 'finished'
      : (params.currentStatus === 'cancelled' ? 'cancelled' : 'scheduled');

    setSavingSeasonResultByMatchId((prev) => ({ ...prev, [params.matchId]: true }));
    try {
      const updateResult = await client
        .from('matches')
        .update({
          home_score: params.homeScore,
          away_score: params.awayScore,
          status: nextStatus,
        })
        .eq('id', params.matchId)
        .eq('season_id', selectedAdminSeason.id);

      if (updateResult.error) {
        throw updateResult.error;
      }

      const applySavedResult = (match: MatchSchedule) => {
        if (match.id !== params.matchId) {
          return match;
        }
        return {
          ...match,
          homeScore: params.homeScore,
          awayScore: params.awayScore,
          matchStatus: nextStatus,
        };
      };

      // Avoid full list refetch/loading toggle to prevent input flicker.
      setSeasonResultSchedules((prev) => prev.map(applySavedResult));
      if (activeSeason?.id === selectedAdminSeason.id) {
        setSchedules((prev) => prev.map(applySavedResult));
      }
    } catch (error) {
      showMessage('저장 실패', error instanceof Error ? error.message : '경기결과 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingSeasonResultByMatchId((prev) => {
        const next = { ...prev };
        delete next[params.matchId];
        return next;
      });
    }
  };

  const deleteSeasonMatchFromResult = async (matchId: number) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '경기 삭제는 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '경기 삭제는 admin 이상 계정만 사용할 수 있습니다.');
    }
    if (!selectedAdminSeason) {
      return showMessage('시즌 선택 필요', '먼저 시즌을 선택하세요.');
    }

    setDeletingSeasonResultByMatchId((prev) => ({ ...prev, [matchId]: true }));
    try {
      const deleteEventResult = await client
        .from('calendar_events')
        .delete()
        .eq('event_type', 'match')
        .eq('linked_match_id', matchId);

      if (deleteEventResult.error) {
        throw deleteEventResult.error;
      }

      const deleteMatchResult = await client
        .from('matches')
        .delete()
        .eq('id', matchId)
        .eq('season_id', selectedAdminSeason.id);

      if (deleteMatchResult.error) {
        throw deleteMatchResult.error;
      }

      await refreshSeasonResultManagementData(client, selectedAdminSeason.id);
      await refreshSelectedSeasonSummary(client, selectedAdminSeason.id);
      await refreshSelectedSeasonMatchTitles(client, selectedAdminSeason.id);
      await refreshCalendarEvents(client);
      if (activeSeason?.id === selectedAdminSeason.id) {
        await refreshSeasonSchedules(client, selectedAdminSeason.id);
      }

      showMessage('삭제 완료', '경기를 삭제했습니다.');
    } catch (error) {
      showMessage('삭제 실패', error instanceof Error ? error.message : '경기 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingSeasonResultByMatchId((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    }
  };

  const saveSeasonTeams = async (seasonId: number, rows: TeamDraftRow[]) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '팀 관리는 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '팀 관리는 admin 이상 계정만 사용할 수 있습니다.');
    }

    const effectiveRows = rows
      .map((row, index) => ({
        rowIndex: index + 1,
        seasonTeamId: row.seasonTeamId,
        teamId: row.teamId,
        teamName: row.teamName.trim(),
        playerOneId: row.playerOneId,
        playerTwoId: row.playerTwoId,
      }))
      .filter((row) => row.teamName || row.playerOneId || row.playerTwoId || row.seasonTeamId || row.teamId);

    if (effectiveRows.length === 0) {
      return showMessage('입력 필요', '저장할 팀 행이 없습니다.');
    }

    const invalidRow = effectiveRows.find((row) =>
      !row.teamName
      || !row.playerOneId
      || !row.playerTwoId
      || row.playerOneId === row.playerTwoId
    );

    if (invalidRow) {
      return showMessage(
        '입력 확인',
        `${invalidRow.rowIndex}팀 행을 확인하세요. 팀명과 선수 2명(중복 불가)이 필요합니다.`
      );
    }

    const duplicateMember = (() => {
      const memberRowIndexById: Record<string, number> = {};
      for (const row of effectiveRows) {
        const memberIds = [row.playerOneId, row.playerTwoId].filter((value): value is string => Boolean(value));
        for (const memberId of memberIds) {
          const existingRowIndex = memberRowIndexById[memberId];
          if (existingRowIndex && existingRowIndex !== row.rowIndex) {
            return { rowIndex: row.rowIndex, existingRowIndex };
          }
          memberRowIndexById[memberId] = row.rowIndex;
        }
      }
      return null;
    })();

    if (duplicateMember) {
      return showMessage(
        '입력 확인',
        `${duplicateMember.existingRowIndex}팀과 ${duplicateMember.rowIndex}팀에 동일 선수가 중복되어 있습니다. 한 선수는 한 팀에만 배정할 수 있습니다.`
      );
    }

    setIsSavingSeasonTeamAdmin(true);
    try {
      const existingSeasonTeamsResult = await client
        .from('season_teams')
        .select('id, team_id')
        .eq('season_id', seasonId);

      if (existingSeasonTeamsResult.error) {
        throw existingSeasonTeamsResult.error;
      }

      const existingSeasonTeams = (existingSeasonTeamsResult.data as Array<{ id: number; team_id: number }> | null) ?? [];
      const existingSeasonTeamMap = existingSeasonTeams.reduce<Record<number, number>>((acc, item) => {
        acc[item.id] = item.team_id;
        return acc;
      }, {});
      const keepSeasonTeamIdSet = new Set(
        effectiveRows
          .map((row) => row.seasonTeamId)
          .filter((value): value is number => typeof value === 'number')
      );

      const deleteTargets = existingSeasonTeams.filter((item) => !keepSeasonTeamIdSet.has(item.id));
      const deleteTargetTeamIds = deleteTargets.map((target) => target.team_id);
      const deleteTargetTeamNameById: Record<number, string> = {};

      if (deleteTargetTeamIds.length > 0) {
        const deleteTargetTeamsResult = await client
          .from('teams')
          .select('id, name')
          .in('id', deleteTargetTeamIds);

        if (deleteTargetTeamsResult.error) {
          throw deleteTargetTeamsResult.error;
        }

        for (const team of (deleteTargetTeamsResult.data as Array<{ id: number; name: string }> | null) ?? []) {
          deleteTargetTeamNameById[team.id] = team.name;
        }
      }

      for (const target of deleteTargets) {
        const relatedMatchesResult = await client
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`home_season_team_id.eq.${target.id},away_season_team_id.eq.${target.id}`)
          .limit(1);

        if (relatedMatchesResult.error) {
          throw relatedMatchesResult.error;
        }

        if ((relatedMatchesResult.count ?? 0) > 0) {
          const blockedTeamName = deleteTargetTeamNameById[target.team_id] ?? `팀ID ${target.team_id}`;
          throw new Error(`${blockedTeamName}은(는) 경기 데이터에 연결되어 삭제할 수 없습니다. 경기 데이터를 먼저 정리한 뒤 다시 시도해 주세요.`);
        }

        const memberDeleteResult = await client
          .from('team_members')
          .delete()
          .eq('team_id', target.team_id);

        if (memberDeleteResult.error) {
          throw memberDeleteResult.error;
        }

        const seasonTeamDeleteResult = await client
          .from('season_teams')
          .delete()
          .eq('id', target.id);

        if (seasonTeamDeleteResult.error) {
          throw seasonTeamDeleteResult.error;
        }

        const otherSeasonLinkResult = await client
          .from('season_teams')
          .select('id')
          .eq('team_id', target.team_id)
          .limit(1);

        if (otherSeasonLinkResult.error) {
          throw otherSeasonLinkResult.error;
        }

        if (!otherSeasonLinkResult.data || otherSeasonLinkResult.data.length === 0) {
          const teamDeleteResult = await client
            .from('teams')
            .delete()
            .eq('id', target.team_id);

          if (teamDeleteResult.error) {
            throw teamDeleteResult.error;
          }
        }
      }

      for (const [index, row] of effectiveRows.entries()) {
        const displayOrder = index + 1;
        if (row.seasonTeamId) {
          const teamId = row.teamId ?? existingSeasonTeamMap[row.seasonTeamId];
          if (!teamId) {
            throw new Error(`${row.rowIndex}팀 행의 기존 팀 정보를 찾을 수 없습니다.`);
          }

          const teamUpdateResult = await client
            .from('teams')
            .update({ name: row.teamName })
            .eq('id', teamId);

          if (teamUpdateResult.error) {
            throw teamUpdateResult.error;
          }

          const existingMemberDeleteResult = await client
            .from('team_members')
            .delete()
            .eq('team_id', teamId);

          if (existingMemberDeleteResult.error) {
            throw existingMemberDeleteResult.error;
          }

          const memberInsertResult = await client
            .from('team_members')
            .insert([
              { team_id: teamId, user_id: row.playerOneId!, role: 'PLAYER' },
              { team_id: teamId, user_id: row.playerTwoId!, role: 'PLAYER' },
            ]);

          if (memberInsertResult.error) {
            throw memberInsertResult.error;
          }

          const seasonTeamUpdateResult = await client
            .from('season_teams')
            .update({ display_order: displayOrder })
            .eq('id', row.seasonTeamId);

          if (seasonTeamUpdateResult.error) {
            throw seasonTeamUpdateResult.error;
          }
          continue;
        }

        const createTeamResult = await client
          .from('teams')
          .insert({ name: row.teamName })
          .select('id')
          .single();

        if (createTeamResult.error) {
          throw createTeamResult.error;
        }

        const teamId = createTeamResult.data?.id;
        if (!teamId) {
          throw new Error('팀 생성 결과에서 팀 ID를 확인할 수 없습니다.');
        }

        const membersResult = await client
          .from('team_members')
          .insert([
            { team_id: teamId, user_id: row.playerOneId!, role: 'PLAYER' },
            { team_id: teamId, user_id: row.playerTwoId!, role: 'PLAYER' },
          ]);

        if (membersResult.error) {
          throw membersResult.error;
        }

        const seasonTeamResult = await client
          .from('season_teams')
          .insert({
            season_id: seasonId,
            team_id: teamId,
            display_order: displayOrder,
          });

        if (seasonTeamResult.error) {
          throw seasonTeamResult.error;
        }
      }

      await refreshSeasonTeamManagementData(client, seasonId);
      if (selectedAdminSeason?.id === seasonId) {
        await refreshSeasonMatchManagementData(client, seasonId);
        await refreshSelectedSeasonSummary(client, seasonId);
      }

      if (activeSeason?.id === seasonId) {
        await refreshActiveSeasonTeams(client, seasonId, session.user.id);
        await refreshSeasonSchedules(client, seasonId);
      }

      showMessage('저장 완료', `${effectiveRows.length}개 팀 편성을 반영했습니다.`);
    } catch (error) {
      showMessage('저장 실패', error instanceof Error ? error.message : '팀 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingSeasonTeamAdmin(false);
    }
  };

  const savePersonalCalendarEvent = async () => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '일정 등록은 로그인 후 사용할 수 있습니다.');
    }
    if (!calendarEventForm.title.trim()) {
      return showMessage('입력 확인', '일정 제목을 입력하세요.');
    }
    if (!calendarEventForm.date) {
      return showMessage('입력 확인', '일정 날짜를 선택하세요.');
    }

    // Use noon KST as a stable all-day anchor and keep end_at > start_at for DB constraint.
    const startAt = new Date(`${calendarEventForm.date}T12:00:00+09:00`);
    const endAt = new Date(`${calendarEventForm.date}T12:01:00+09:00`);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return showMessage('입력 확인', '날짜 형식을 확인하세요.');
    }

    setIsSavingCalendarEvent(true);
    try {
      const insertResult = await client
        .from('calendar_events')
        .insert({
          event_type: calendarEventForm.eventType,
          title: calendarEventForm.title.trim(),
          description: calendarEventForm.description.trim() || null,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          is_all_day: true,
          created_by: session.user.id,
          source_type: 'manual',
          season_id: activeSeason?.id ?? null,
        });

      if (insertResult.error) {
        throw insertResult.error;
      }

      await refreshCalendarEvents(client);
      setCalendarEventForm(emptyCalendarEventForm);
      showMessage('일정 등록 완료', '개인 일정이 캘린더에 등록되었습니다.');
    } catch (error) {
      showMessage('일정 등록 실패', error instanceof Error ? error.message : '일정 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSavingCalendarEvent(false);
    }
  };

  const syncHolidayCalendar = async (year: number) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '공휴일 동기화는 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '공휴일 동기화는 admin 이상 계정만 사용할 수 있습니다.');
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return showMessage('연도 입력 확인', '연도는 2000~2100 범위의 숫자로 입력하세요.');
    }
    if (!supabaseProjectUrl || !supabaseAnonPublicKey) {
      return showMessage('환경 설정 확인', 'Supabase URL 또는 anon key 설정을 확인하세요.');
    }

    const refreshResult = await client.auth.refreshSession();
    if (refreshResult.error) {
      return showMessage('세션 갱신 실패', refreshResult.error.message);
    }
    const accessToken = refreshResult.data.session?.access_token;
    if (!accessToken) {
      return showMessage('세션 확인 필요', '로그인 세션을 다시 확인한 뒤 재시도하세요.');
    }

    setIsSyncingHolidayCalendar(true);
    try {
      const response = await fetch(`${supabaseProjectUrl}/functions/v1/sync-korean-holidays`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonPublicKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year }),
      });

      const rawText = await response.text();
      const parsedBody = (() => {
        if (!rawText) {
          return null;
        }
        try {
          return JSON.parse(rawText) as { error?: string; message?: string };
        } catch {
          return null;
        }
      })();

      if (!response.ok) {
        const detailMessage = parsedBody?.error || parsedBody?.message || rawText || `HTTP ${response.status}`;
        throw new Error(detailMessage);
      }

      await refreshCalendarEvents(client);
      showMessage('동기화 완료', `${year}년 한국 공휴일을 캘린더에 반영했습니다.`);
    } catch (error) {
      showMessage('동기화 실패', error instanceof Error ? error.message : '공휴일 동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncingHolidayCalendar(false);
    }
  };

  const deleteSeasonEvent = async (event: CalendarEvent) => {
    const client = supabase;
    if (!client || !session) {
      return showMessage('로그인 필요', '일정 삭제는 로그인 후 사용할 수 있습니다.');
    }
    if (!isAdminAccount(profile?.role)) {
      return showMessage('권한 없음', '일정 삭제는 admin 이상 계정만 사용할 수 있습니다.');
    }

    setDeletingSeasonEventId(event.id);
    try {
      if (event.event_type === 'match' && event.linked_match_id) {
        const deleteMatchResult = await client
          .from('matches')
          .delete()
          .eq('id', event.linked_match_id);

        if (deleteMatchResult.error) {
          throw deleteMatchResult.error;
        }
      } else {
        const deleteEventResult = await client
          .from('calendar_events')
          .delete()
          .eq('id', event.id);

        if (deleteEventResult.error) {
          throw deleteEventResult.error;
        }
      }

      await refreshCalendarEvents(client);

      if (selectedAdminSeason) {
        await refreshSelectedSeasonSummary(client, selectedAdminSeason.id);
        await refreshSelectedSeasonMatchTitles(client, selectedAdminSeason.id);
        if (activeSeason?.id === selectedAdminSeason.id) {
          await refreshSeasonSchedules(client, selectedAdminSeason.id);
        }
      }

      showMessage('삭제 완료', event.event_type === 'match' ? '경기를 삭제했습니다.' : '일정을 삭제했습니다.');
    } catch (error) {
      showMessage('삭제 실패', error instanceof Error ? error.message : '일정 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingSeasonEventId(null);
    }
  };

  const homeProfile = isHomePreview ? previewProfile : profile;
  const homeSchedules = isHomePreview ? previewSchedules : schedules;
  const homeMySchedules = isHomePreview ? previewSchedules.slice(0, 2) : mySchedules;
  const homeTeams = isHomePreview ? previewTeams : teams;
  const homeNotices = isHomePreview ? previewNotices : notices;
  const homeLeagueTable = isHomePreview ? previewLeagueTable : leagueTable;
  const homeMemberDirectory = isHomePreview ? previewMemberDirectory : memberDirectory;
  const isShowingHome = screen === 'home' && (session || isHomePreview);
  const canAccessAdmin = isAdminAccount(profile?.role);
  const currentTeamManagementSeason = screen === 'seasonTeamAdmin'
    ? selectedAdminSeason
    : screen === 'teams' && canAccessAdmin
      ? (selectedAdminSeason ?? activeSeason)
      : null;
  const goBackScreen = previousScreen === 'seasonAdmin'
    ? 'seasonAdmin'
    : previousScreen === 'seasonDetailAdmin'
      ? 'seasonDetailAdmin'
    : previousScreen === 'seasonTeamAdmin'
      ? 'seasonTeamAdmin'
    : previousScreen === 'seasonMatchAdmin'
      ? 'seasonMatchAdmin'
    : previousScreen === 'seasonResultAdmin'
      ? 'seasonResultAdmin'
    : previousScreen === 'seasonStandingAdmin'
      ? 'seasonStandingAdmin'
    : previousScreen === 'admin'
      ? 'admin'
      : 'home';
  const calendarMonthLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(calendarMonth);
  const visibleCalendarEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      if (event.event_type === 'match') {
        if (!activeSeason) {
          return false;
        }
        return event.season_id === activeSeason.id;
      }
      return true;
    });
  }, [activeSeason, calendarEvents]);

  const filteredCalendarEvents = useMemo(() => {
    return visibleCalendarEvents.filter((event) => {
      if (calendarFilter === 'all') {
        return true;
      }
      if (calendarFilter === 'mine') {
        return session ? event.created_by === session.user.id : false;
      }
      return event.event_type === calendarFilter;
    });
  }, [calendarFilter, session, visibleCalendarEvents]);

  const selectedDateEvents = useMemo(() => {
    return filteredCalendarEvents
      .filter((event) => toDateKey(event.start_at) === selectedCalendarDate)
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [filteredCalendarEvents, selectedCalendarDate]);
  const matchTitleByLinkedId = useMemo(() => {
    return schedules.reduce<Record<string, string>>((acc, match) => {
      acc[String(match.id)] = formatMatchTitleWithPlayers(
        match.homeTeam,
        match.homePlayers,
        match.awayTeam,
        match.awayPlayers
      );
      return acc;
    }, {});
  }, [schedules]);

  useEffect(() => {
    if (
      (screen === 'admin'
        || screen === 'seasonAdmin'
        || screen === 'seasonDetailAdmin'
        || screen === 'seasonTeamAdmin'
        || screen === 'seasonMatchAdmin'
        || screen === 'seasonResultAdmin'
        || screen === 'seasonStandingAdmin'
        || screen === 'memberAdmin')
      && !canAccessAdmin
    ) {
      setScreen('home');
    }
  }, [canAccessAdmin, screen]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || !canAccessAdmin || !['memberAdmin', 'seasonDetailAdmin', 'admin'].includes(screen)) {
      return;
    }

    refreshMembers(client).catch((error: unknown) => {
      showMessage('회원 목록 불러오기 실패', error instanceof Error ? error.message : '회원 목록 조회 중 오류가 발생했습니다.');
    });
  }, [canAccessAdmin, screen, session]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || !canAccessAdmin || !currentTeamManagementSeason) {
      return;
    }

    Promise.all([
      refreshMembers(client),
      refreshSeasonTeamManagementData(client, currentTeamManagementSeason.id),
    ]).catch((error: unknown) => {
      showMessage('팀 편성 데이터 불러오기 실패', error instanceof Error ? error.message : '팀 편성 데이터 조회 중 오류가 발생했습니다.');
    });
  }, [canAccessAdmin, currentTeamManagementSeason, session]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || !canAccessAdmin || screen !== 'seasonDetailAdmin' || !selectedAdminSeason) {
      return;
    }

    Promise.all([
      refreshSelectedSeasonSummary(client, selectedAdminSeason.id),
      refreshSelectedSeasonMatchTitles(client, selectedAdminSeason.id),
    ]).catch((error: unknown) => {
      showMessage('시즌 요약 불러오기 실패', error instanceof Error ? error.message : '시즌 요약 조회 중 오류가 발생했습니다.');
    });
  }, [canAccessAdmin, screen, selectedAdminSeason, session]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || !canAccessAdmin || screen !== 'seasonMatchAdmin' || !selectedAdminSeason) {
      return;
    }

    refreshSeasonMatchManagementData(client, selectedAdminSeason.id).catch((error: unknown) => {
      showMessage('경기 등록 데이터 불러오기 실패', error instanceof Error ? error.message : '경기 등록 준비 중 오류가 발생했습니다.');
    });
  }, [canAccessAdmin, screen, selectedAdminSeason, session]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || !canAccessAdmin || screen !== 'seasonResultAdmin' || !selectedAdminSeason) {
      return;
    }

    refreshSeasonResultManagementData(client, selectedAdminSeason.id).catch((error: unknown) => {
      showMessage('경기결과 데이터 불러오기 실패', error instanceof Error ? error.message : '경기결과 조회 중 오류가 발생했습니다.');
    });
  }, [canAccessAdmin, screen, selectedAdminSeason, session]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || screen !== 'league') {
      return;
    }

    const seasonId = selectedLeagueSeasonId ?? activeSeason?.id ?? (seasons[0]?.id ?? null);
    if (!seasonId) {
      setLeagueStandingsRows([]);
      setLeagueRecentByTeam({});
      setLeagueTeamAvatarByName({});
      return;
    }

    if (selectedLeagueSeasonId !== seasonId) {
      setSelectedLeagueSeasonId(seasonId);
    }

    refreshLeagueStandingsData(client, seasonId).catch((error: unknown) => {
      showMessage('팀순위 불러오기 실패', error instanceof Error ? error.message : '팀순위 조회 중 오류가 발생했습니다.');
    });
  }, [activeSeason, screen, seasons, selectedLeagueSeasonId, session]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || !canAccessAdmin || screen !== 'seasonStandingAdmin') {
      return;
    }

    const seasonId = selectedAdminStandingSeasonId ?? selectedAdminSeason?.id ?? (seasons[0]?.id ?? null);
    if (!seasonId) {
      setLeagueStandingsRows([]);
      setLeagueRecentByTeam({});
      setLeagueTeamAvatarByName({});
      return;
    }

    if (selectedAdminStandingSeasonId !== seasonId) {
      setSelectedAdminStandingSeasonId(seasonId);
    }

    refreshLeagueStandingsData(client, seasonId).catch((error: unknown) => {
      showMessage('팀순위 불러오기 실패', error instanceof Error ? error.message : '팀순위 조회 중 오류가 발생했습니다.');
    });
  }, [canAccessAdmin, screen, seasons, selectedAdminSeason, selectedAdminStandingSeasonId, session]);

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
              memberDirectory={homeMemberDirectory}
              pushState={pushState}
              lastNotification={lastNotification}
              isRegisteringPush={isRegisteringPush}
              isMobileViewport={isMobileViewport}
              onNavigate={(nextScreen) => {
                setPreviousScreen('home');
                setScreen(nextScreen);
              }}
              onRefreshPush={refreshPushRegistration}
              onOpenPushSettings={() => {
                Linking.openSettings().catch(() => {
                  showMessage('설정 열기 실패', '기기 설정에서 직접 알림 권한을 열어 주세요.');
                });
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
            <ScrollView
              ref={sessionScrollRef}
              contentContainerStyle={
                isMobileViewport
                  ? {
                      paddingHorizontal: 0,
                      paddingTop: screen === 'league' ? 2 : 4,
                      paddingBottom: 32,
                    }
                  : {
                      padding: 20,
                      paddingBottom: 40,
                    }
              }
            >
              {screen === 'schedule' && (
                <CalendarScheduleScreen
                  monthLabel={calendarMonthLabel}
                  monthDate={calendarMonth}
                  events={filteredCalendarEvents}
                  selectedDate={selectedCalendarDate}
                  selectedDateEvents={selectedDateEvents}
                  matchTitleByLinkedId={matchTitleByLinkedId}
                  filter={calendarFilter}
                  onPrevMonth={() => {
                    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                    const key = `${nextMonth.getFullYear()}-${`${nextMonth.getMonth() + 1}`.padStart(2, '0')}-01`;
                    setCalendarMonth(nextMonth);
                    setSelectedCalendarDate(key);
                    setCalendarEventForm((prev) => ({ ...prev, date: key }));
                  }}
                  onNextMonth={() => {
                    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                    const key = `${nextMonth.getFullYear()}-${`${nextMonth.getMonth() + 1}`.padStart(2, '0')}-01`;
                    setCalendarMonth(nextMonth);
                    setSelectedCalendarDate(key);
                    setCalendarEventForm((prev) => ({ ...prev, date: key }));
                  }}
                  onSelectDate={setSelectedCalendarDate}
                  onChangeFilter={setCalendarFilter}
                  form={calendarEventForm}
                  onChangeForm={setCalendarEventForm}
                  canCreatePersonalEvent={!isHomePreview}
                  canSyncHoliday={canAccessAdmin}
                  isSyncingHoliday={isSyncingHolidayCalendar}
                  holidaySyncYear={holidaySyncYear}
                  onChangeHolidaySyncYear={setHolidaySyncYear}
                  onSyncHoliday={() => syncHolidayCalendar(Number(holidaySyncYear))}
                  isSavingEvent={isSavingCalendarEvent}
                  onSavePersonalEvent={savePersonalCalendarEvent}
                  goBack={() => setScreen(goBackScreen)}
                />
              )}

              {screen === 'league' && (
                <LeagueScreen
                  seasons={seasons}
                  selectedSeasonId={selectedLeagueSeasonId}
                  data={leagueStandingsRows}
                  recentByTeam={leagueRecentByTeam}
                  avatarByTeamName={leagueTeamAvatarByName}
                  isLoading={isLoadingLeagueStandings}
                  title="팀순위"
                  onSelectSeason={setSelectedLeagueSeasonId}
                  goBack={() => setScreen(goBackScreen)}
                />
              )}

              {screen === 'mySchedule' && (
                <MatchScheduleTableScreen data={mySchedules} goBack={() => setScreen(goBackScreen)} title="나의 경기 일정" />
              )}

              {screen === 'teams' && (
                canAccessAdmin && activeSeason ? (
                  <SeasonTeamManagementScreen
                    season={selectedAdminSeason ?? activeSeason}
                    members={members}
                    isLoadingMembers={isLoadingMembers}
                    initialRows={seasonTeamDraftRows}
                    isLoadingRows={isLoadingSeasonTeamAdmin}
                    isSaving={isSavingSeasonTeamAdmin}
                    onSave={saveSeasonTeams}
                    goBack={() => setScreen(goBackScreen)}
                  />
                ) : (
                  <TeamsScreen
                    teams={teams}
                    seasonName={activeSeason?.name ?? null}
                    goBack={() => setScreen(goBackScreen)}
                  />
                )
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
                    setSelectedAdminStandingSeasonId(season.id);
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
                  calendarEvents={calendarEvents}
                  members={members}
                  canSyncHoliday={canAccessAdmin}
                  isSyncingHoliday={isSyncingHolidayCalendar}
                  holidaySyncYear={holidaySyncYear}
                  onChangeHolidaySyncYear={setHolidaySyncYear}
                  onSyncHoliday={() => syncHolidayCalendar(Number(holidaySyncYear))}
                  isSavingMemberEvent={isSavingCalendarEvent}
                  isSavingHolidayEvent={isSavingCalendarEvent}
                  onShowMessage={showMessage}
                  deletingEventId={deletingSeasonEventId}
                  onDeleteEvent={deleteSeasonEvent}
                  onSaveHolidayEvent={async ({ date, title, description }) => {
                    const client = supabase;
                    if (!client || !session) {
                      return showMessage('로그인 필요', '공휴일 등록은 로그인 후 사용할 수 있습니다.');
                    }
                    if (!isAdminAccount(profile?.role)) {
                      return showMessage('권한 없음', '공휴일 등록은 admin 이상 계정만 사용할 수 있습니다.');
                    }
                    if (!date) {
                      return showMessage('입력 확인', '공휴일 날짜를 선택하세요.');
                    }

                    const startAt = new Date(`${date}T12:00:00+09:00`);
                    const endAt = new Date(`${date}T12:01:00+09:00`);
                    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
                      return showMessage('입력 확인', '날짜 형식을 확인하세요.');
                    }

                    setIsSavingCalendarEvent(true);
                    try {
                      const insertResult = await client
                        .from('calendar_events')
                        .insert({
                          event_type: 'holiday',
                          title: title.trim() || '추가 공휴일',
                          description: description.trim() || null,
                          start_at: startAt.toISOString(),
                          end_at: endAt.toISOString(),
                          is_all_day: true,
                          created_by: session.user.id,
                          source_type: 'manual',
                          season_id: null,
                        });

                      if (insertResult.error) {
                        throw insertResult.error;
                      }

                      await refreshCalendarEvents(client);
                      showMessage('공휴일 등록 완료', '공휴일이 캘린더에 등록되었습니다.');
                    } catch (error) {
                      showMessage('공휴일 등록 실패', error instanceof Error ? error.message : '공휴일 등록 중 오류가 발생했습니다.');
                    } finally {
                      setIsSavingCalendarEvent(false);
                    }
                  }}
                  onSaveMemberEvent={async ({ seasonId, userId, eventType, title, date, description }) => {
                    const client = supabase;
                    if (!client || !session) {
                      return showMessage('로그인 필요', '일정 등록은 로그인 후 사용할 수 있습니다.');
                    }
                    if (!isAdminAccount(profile?.role)) {
                      return showMessage('권한 없음', '회원 일정 등록은 admin 이상 계정만 사용할 수 있습니다.');
                    }
                    if (!title.trim()) {
                      return showMessage('입력 확인', '일정 제목을 입력하세요.');
                    }
                    if (!date) {
                      return showMessage('입력 확인', '일정 날짜를 선택하세요.');
                    }

                    // Use noon KST as a stable all-day anchor and keep end_at > start_at for DB constraint.
                    const startAt = new Date(`${date}T12:00:00+09:00`);
                    const endAt = new Date(`${date}T12:01:00+09:00`);
                    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
                      return showMessage('입력 확인', '날짜 형식을 확인하세요.');
                    }

                    setIsSavingCalendarEvent(true);
                    try {
                      const insertResult = await client
                        .from('calendar_events')
                        .insert({
                          event_type: eventType,
                          title: title.trim(),
                          description: description.trim() || null,
                          start_at: startAt.toISOString(),
                          end_at: endAt.toISOString(),
                          is_all_day: true,
                          created_by: userId,
                          source_type: 'manual',
                          season_id: seasonId,
                        });

                      if (insertResult.error) {
                        throw insertResult.error;
                      }

                      await refreshCalendarEvents(client);
                      showMessage('일정 등록 완료', '회원 일정이 등록되었습니다.');
                    } catch (error) {
                      showMessage('일정 등록 실패', error instanceof Error ? error.message : '일정 등록 중 오류가 발생했습니다.');
                    } finally {
                      setIsSavingCalendarEvent(false);
                    }
                  }}
                  onScrollToY={(y) => {
                    sessionScrollRef.current?.scrollTo({
                      y: Math.max(0, y - 20),
                      animated: true,
                    });
                  }}
                  seasonTeamCount={selectedSeasonTeamCount}
                  seasonMatchCount={selectedSeasonMatchCount}
                  matchTitleByLinkedId={selectedSeasonMatchTitleByLinkedId}
                  onUpdateSeasonStatus={updateSeasonStatus}
                  onNavigate={(nextScreen) => {
                    setPreviousScreen('seasonDetailAdmin');
                    setScreen(nextScreen);
                  }}
                  goBack={() => setScreen('seasonAdmin')}
                />
              )}

              {screen === 'seasonTeamAdmin' && selectedAdminSeason && (
                <SeasonTeamManagementScreen
                  season={selectedAdminSeason}
                  members={members}
                  isLoadingMembers={isLoadingMembers}
                  initialRows={seasonTeamDraftRows}
                  isLoadingRows={isLoadingSeasonTeamAdmin}
                  isSaving={isSavingSeasonTeamAdmin}
                  onSave={saveSeasonTeams}
                  goBack={() => setScreen('seasonDetailAdmin')}
                />
              )}

              {screen === 'seasonMatchAdmin' && selectedAdminSeason && (
                <SeasonMatchManagementScreen
                  season={selectedAdminSeason}
                  matchSeasonTeams={matchSeasonTeams}
                  matchForm={matchForm}
                  isLoading={isLoadingSeasonMatchAdmin}
                  isSaving={isSavingSeasonMatchAdmin}
                  onChangeMatchDate={(value) => setMatchForm((prev) => ({ ...prev, matchDate: value }))}
                  onChangeMatchStartTime={(value) => setMatchForm((prev) => ({ ...prev, matchStartTime: value }))}
                  onChangeMatchEndTime={(value) => setMatchForm((prev) => ({ ...prev, matchEndTime: value }))}
                  onChangePlace={(place) => setMatchForm((prev) => ({ ...prev, place }))}
                  onAddEntry={addMatchEntry}
                  onRemoveEntry={removeMatchEntry}
                  onChangeEntryTeam={(entryId, side, seasonTeamId) => {
                    if (seasonTeamId && matchForm.matchDate) {
                      const dayStart = new Date(`${matchForm.matchDate}T00:00:00+09:00`);
                      const nextDayStart = new Date(dayStart.getTime());
                      nextDayStart.setDate(nextDayStart.getDate() + 1);

                      if (!Number.isNaN(dayStart.getTime())) {
                        const dayStartMs = dayStart.getTime();
                        const nextDayStartMs = nextDayStart.getTime();
                        const holidayOnMatchDate = calendarEvents.find((event) => {
                          if (event.event_type !== 'holiday') {
                            return false;
                          }
                          const startMs = new Date(event.start_at).getTime();
                          const endMs = new Date(event.end_at).getTime();
                          if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
                            return false;
                          }
                          const startDateKst = toKstDateInputFromIso(event.start_at);
                          const endDateKst = toKstDateInputFromIso(event.end_at);
                          const hasKstDateOverlap = Boolean(
                            startDateKst
                            && endDateKst
                            && matchForm.matchDate >= startDateKst
                            && matchForm.matchDate <= endDateKst
                          );
                          return (startMs < nextDayStartMs && endMs >= dayStartMs) || hasKstDateOverlap;
                        });

                        if (holidayOnMatchDate) {
                          showMessage('공휴일 충돌', `${matchForm.matchDate}은(는) 공휴일(${holidayOnMatchDate.title})입니다. 팀을 선택할 수 없습니다.`);
                          return;
                        }

                        const teamMembers = getTeamMembers(seasonTeamId);
                        const firstConflictByMemberId: Record<string, Extract<CalendarEventType, 'leave' | 'business_trip' | 'personal'>> = {};

                        for (const event of calendarEvents) {
                          if (event.event_type !== 'leave' && event.event_type !== 'business_trip' && event.event_type !== 'personal') {
                            continue;
                          }
                          if (!event.created_by) {
                            continue;
                          }
                          if (!teamMembers.some((member) => member.userId === event.created_by)) {
                            continue;
                          }

                          const startMs = new Date(event.start_at).getTime();
                          const endMs = new Date(event.end_at).getTime();
                          if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
                            continue;
                          }

                          const startDateKst = toKstDateInputFromIso(event.start_at);
                          const endDateKst = toKstDateInputFromIso(event.end_at);
                          const hasKstDateOverlap = Boolean(
                            startDateKst
                            && endDateKst
                            && matchForm.matchDate >= startDateKst
                            && matchForm.matchDate <= endDateKst
                          );
                          const hasOverlap = (startMs < nextDayStartMs && endMs >= dayStartMs) || hasKstDateOverlap;
                          if (!hasOverlap) {
                            continue;
                          }

                          if (!firstConflictByMemberId[event.created_by]) {
                            firstConflictByMemberId[event.created_by] = event.event_type;
                          }
                        }

                        const conflictLines = teamMembers
                          .map((member) => {
                            const eventType = firstConflictByMemberId[member.userId];
                            if (!eventType) {
                              return null;
                            }
                            return `${member.name} 선수 ${personalEventTypeLabel[eventType]} 입니다.`;
                          })
                          .filter((line): line is string => Boolean(line));

                        if (conflictLines.length > 0) {
                          showMessage('개인 일정 충돌', `${conflictLines.join('\n')}\n해당 팀은 선택할 수 없습니다.`);
                          return;
                        }
                      }
                    }

                    updateMatchEntry(entryId, (entry) => {
                      if (side === 'home') {
                        return {
                          ...entry,
                          homeSeasonTeamId: seasonTeamId,
                        };
                      }
                      return {
                        ...entry,
                        awaySeasonTeamId: seasonTeamId,
                      };
                    });
                  }}
                  onSave={saveSeasonMatches}
                  goBack={() => setScreen('seasonDetailAdmin')}
                />
              )}

              {screen === 'seasonResultAdmin' && selectedAdminSeason && (
                <SeasonResultManagementScreen
                  season={selectedAdminSeason}
                  schedules={seasonResultSchedules}
                  isLoading={isLoadingSeasonResultAdmin}
                  savingByMatchId={savingSeasonResultByMatchId}
                  deletingByMatchId={deletingSeasonResultByMatchId}
                  onSaveRow={saveSeasonMatchResult}
                  onDeleteRow={deleteSeasonMatchFromResult}
                  onShowMessage={showMessage}
                  goBack={() => setScreen('seasonDetailAdmin')}
                />
              )}

              {screen === 'seasonStandingAdmin' && selectedAdminSeason && (
                <LeagueScreen
                  seasons={seasons}
                  selectedSeasonId={selectedAdminStandingSeasonId}
                  data={leagueStandingsRows}
                  recentByTeam={leagueRecentByTeam}
                  avatarByTeamName={leagueTeamAvatarByName}
                  isLoading={isLoadingLeagueStandings}
                  title="팀순위"
                  onSelectSeason={setSelectedAdminStandingSeasonId}
                  goBack={() => setScreen('seasonDetailAdmin')}
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
                  memberCount={members.length}
                  onNavigate={(nextScreen) => {
                    setPreviousScreen('admin');
                    setScreen(nextScreen);
                  }}
                  isSyncingHolidayCalendar={isSyncingHolidayCalendar}
                  holidaySyncYear={holidaySyncYear}
                  onChangeHolidaySyncYear={setHolidaySyncYear}
                  onSyncHolidayCalendar={(year) => syncHolidayCalendar(year)}
                  personalEventForm={calendarEventForm}
                  onChangePersonalEventForm={setCalendarEventForm}
                  isSavingPersonalEvent={isSavingCalendarEvent}
                  onSavePersonalEvent={savePersonalCalendarEvent}
                  goBack={() => setScreen('home')}
                />
              )}

              {screen === 'memberAdmin' && canAccessAdmin && (
                <MemberManagementScreen
                  members={members}
                  query={memberQuery}
                  isLoading={isLoadingMembers}
                  updatingMemberId={updatingMemberId}
                  onChangeQuery={setMemberQuery}
                  onRefresh={() => {
                    const client = supabase;
                    if (!client) {
                      return;
                    }

                    refreshMembers(client).catch((error: unknown) => {
                      showMessage(
                        '회원 목록 새로고침 실패',
                        error instanceof Error ? error.message : '회원 목록 새로고침 중 오류가 발생했습니다.'
                      );
                    });
                  }}
                  onDeleteMember={softDeleteMember}
                  onChangeDepartment={(member, department) => updateMember(member, { department })}
                  goBack={() => setScreen('admin')}
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
      <ConfirmModal
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="그래도 등록"
        cancelLabel="취소"
        onConfirm={() => {
          setConfirmDialog({ visible: false, title: '', message: '' });
          void saveSeasonMatches(true);
        }}
        onCancel={() => setConfirmDialog({ visible: false, title: '', message: '' })}
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

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        {!!message && <Text style={styles.modalMessage}>{message}</Text>}
        <View style={styles.modalActionRow}>
          <TouchableOpacity style={[styles.modalButton, styles.modalButtonHalf, styles.modalButtonSecondary]} onPress={onCancel}>
            <Text style={[styles.modalButtonText, styles.modalButtonSecondaryText]}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, styles.modalButtonHalf, styles.modalButtonPrimary]} onPress={onConfirm}>
            <Text style={styles.modalButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
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
  memberDirectory,
  pushState,
  lastNotification,
  isRegisteringPush,
  isMobileViewport,
  onNavigate,
  onRefreshPush,
  onOpenPushSettings,
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
  memberDirectory: MemberDirectoryItem[];
  pushState: PushSetupState;
  lastNotification: NotificationSummary | null;
  isRegisteringPush: boolean;
  isMobileViewport: boolean;
  onNavigate: (screen: Exclude<Screen, 'auth' | 'signup'>) => void;
  onRefreshPush: () => void;
  onOpenPushSettings: () => void;
  onAdminPress: () => void;
  onSignOut: () => Promise<void>;
}) {
  const featuredMatch = schedules[0] ?? null;
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
  const avatarUrlByName = useMemo(() => {
    return memberDirectory.reduce<Record<string, string | null>>((acc, member) => {
      acc[member.name] = member.avatarUrl;
      return acc;
    }, {});
  }, [memberDirectory]);
  const currentWeekMatchSummary = useMemo(() => {
    const todayDateInput = toDateInput(new Date());
    const today = parseDateInput(todayDateInput);
    if (!today) {
      return { weekLabel: '이번주', matches: [] as MatchSchedule[] };
    }

    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartInput = toDateInput(weekStart);
    const weekEndInput = toDateInput(weekEnd);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartDay = monthStart.getDay();
    const monthLeadingOffset = monthStartDay === 0 ? 6 : monthStartDay - 1;
    const weekOfMonth = Math.floor((today.getDate() + monthLeadingOffset - 1) / 7) + 1;
    const weekLabel = `${today.getMonth() + 1}월${weekOfMonth}주차`;

    const matches = schedules
      .filter((match) => {
        const matchDateInput = toKstDateInputFromIso(match.date);
        if (!matchDateInput) {
          return false;
        }
        return matchDateInput >= weekStartInput && matchDateInput <= weekEndInput;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { weekLabel, matches };
  }, [schedules]);
  const toWeekMatchDateLabel = (value: string) => {
    const dateInput = toKstDateInputFromIso(value);
    if (!dateInput) {
      return value;
    }
    const [, month, day] = dateInput.split('-');
    return `${Number(month)}월${Number(day)}일`;
  };
  const toMatchResultLabel = (match: MatchSchedule) => {
    if (match.homeScore !== null && match.awayScore !== null) {
      return `${match.homeScore}:${match.awayScore}`;
    }
    return '경기전';
  };

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
        </View>

        <Pressable
          style={styles.featuredCard}
          onPress={() => onNavigate('schedule')}
        >
          <View style={styles.featuredGlow} />

          {featuredMatch ? (
            <>
              <PlayerDuelRow
                homeTeamName={featuredMatch.homeTeam}
                awayTeamName={featuredMatch.awayTeam}
                homePlayers={featuredMatch.homePlayers}
                awayPlayers={featuredMatch.awayPlayers}
                avatarUrlByName={avatarUrlByName}
                size="featured"
              />
              <Text style={styles.featuredTitle}>
                {toDateLabel(featuredMatch.date)}({featuredMatch.weekday}) {featuredMatch.homeTeam} vs {featuredMatch.awayTeam}
              </Text>
              <Text style={styles.featuredSubtitle}>
                {featuredMatch.place} 경기장 | Home {featuredMatch.homePlayers} | Away {featuredMatch.awayPlayers}
              </Text>
            </>
          ) : (
            <>
              <PlayerDuelRow
                homeTeamName="HOME"
                awayTeamName="AWAY"
                homePlayers="-"
                awayPlayers="-"
                avatarUrlByName={avatarUrlByName}
                size="featured"
              />
              <Text style={styles.featuredTitle}>등록된 대표 경기가 아직 없습니다.</Text>
              <Text style={styles.featuredSubtitle}>매치 데이터가 들어오면 이 영역을 메인 배너로 사용합니다.</Text>
            </>
          )}

          <TouchableOpacity style={styles.featuredBottomButton} onPress={() => onNavigate('schedule')}>
            <Text style={styles.featuredBottomButtonText}>전체 일정</Text>
          </TouchableOpacity>

        </Pressable>

        <View style={styles.weeklyStatusCard}>
          <View style={styles.weeklyStatusGlowTop} />
          <View style={styles.weeklyStatusGlowBottom} />
          <View style={styles.weeklyStatusHeaderRow}>
            <Text style={styles.weeklyStatusWeekLabel}>{currentWeekMatchSummary.weekLabel}</Text>
            <Text style={styles.weeklyStatusMatchHeader}>경기 팀</Text>
            <Text style={styles.weeklyStatusResultHeader}>경기결과</Text>
          </View>

          {currentWeekMatchSummary.matches.length > 0 ? currentWeekMatchSummary.matches.map((match) => {
            const resultLabel = toMatchResultLabel(match);
            const isPlayed = match.homeScore !== null && match.awayScore !== null;

            return (
              <View key={`week-match-${match.id}`} style={styles.weeklyStatusRow}>
                <View style={styles.weeklyStatusDateBadge}>
                  <Text style={styles.weeklyStatusDate}>{toWeekMatchDateLabel(match.date)}</Text>
                </View>
                <Text style={styles.weeklyStatusMatchText}>
                  {formatMatchTitleWithPlayers(match.homeTeam, match.homePlayers, match.awayTeam, match.awayPlayers)}
                </Text>
                <View
                  style={[
                    styles.weeklyStatusResultBadge,
                    isPlayed ? styles.weeklyStatusResultBadgePlayed : styles.weeklyStatusResultBadgeUpcoming,
                  ]}
                >
                  <Text style={styles.weeklyStatusResultValue}>{resultLabel}</Text>
                </View>
              </View>
            );
          }) : (
            <Text style={styles.weeklyStatusEmptyText}>해당 주차에 등록된 경기가 없습니다.</Text>
          )}
        </View>

      </ScrollView>

      <View style={[styles.bottomTabBar, isMobileViewport && styles.bottomTabBarMobile]}>
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

function buildPlayerCards(
  playersText: string,
  fallbackTeamName: string,
  avatarUrlByName: Record<string, string | null>
) {
  const playerNames = parseMatchPlayerNames(playersText);
  if (playerNames.length === 0) {
    return [{
      key: `fallback-${fallbackTeamName}`,
      label: fallbackTeamName,
      initials: getNameInitial(fallbackTeamName),
      avatarUrl: null,
    }];
  }

  return playerNames.map((name, index) => ({
    key: `${fallbackTeamName}-${name}-${index}`,
    label: name,
    initials: getNameInitial(name),
    avatarUrl: avatarUrlByName[name] ?? null,
  }));
}

function PlayerDuelRow({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  avatarUrlByName,
  size,
}: {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: string;
  awayPlayers: string;
  avatarUrlByName: Record<string, string | null>;
  size: 'featured' | 'compact';
}) {
  const compact = size === 'compact';
  const homeCards = buildPlayerCards(homePlayers, homeTeamName, avatarUrlByName);
  const awayCards = buildPlayerCards(awayPlayers, awayTeamName, avatarUrlByName);

  return (
    <View style={[styles.playerDuelRow, compact && styles.playerDuelRowCompact]}>
      <View style={[styles.playerDuelSide, compact && styles.playerDuelSideCompact]}>
        {homeCards.map((card) => (
          <PlayerCard
            key={card.key}
            name={card.label}
            initials={card.initials}
            avatarUrl={card.avatarUrl}
            compact={compact}
          />
        ))}
      </View>
      <Text style={[styles.playerDuelVs, compact && styles.playerDuelVsCompact]}>VS</Text>
      <View style={[styles.playerDuelSide, styles.playerDuelSideAway, compact && styles.playerDuelSideCompact]}>
        {awayCards.map((card) => (
          <PlayerCard
            key={card.key}
            name={card.label}
            initials={card.initials}
            avatarUrl={card.avatarUrl}
            compact={compact}
          />
        ))}
      </View>
    </View>
  );
}

function PlayerCard({
  name,
  initials,
  avatarUrl,
  compact,
}: {
  name: string;
  initials: string;
  avatarUrl: string | null;
  compact: boolean;
}) {
  return (
    <View style={[styles.playerCard, compact && styles.playerCardCompact]}>
      <View style={[styles.playerCardImageWrap, compact && styles.playerCardImageWrapCompact]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.playerCardAvatarImage} resizeMode="contain" />
        ) : (
          <View style={styles.playerCardAvatarFallback}>
            <Text style={[styles.playerCardAvatarFallbackText, compact && styles.playerCardAvatarFallbackTextCompact]}>
              {initials}
            </Text>
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={[styles.playerCardName, compact && styles.playerCardNameCompact]}>
        {name}
      </Text>
    </View>
  );
}

function CalendarScheduleScreen({
  monthLabel,
  monthDate,
  events,
  selectedDate,
  selectedDateEvents,
  matchTitleByLinkedId,
  filter,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onChangeFilter,
  form,
  onChangeForm,
  canCreatePersonalEvent,
  canSyncHoliday,
  isSyncingHoliday,
  holidaySyncYear,
  onChangeHolidaySyncYear,
  onSyncHoliday,
  isSavingEvent,
  onSavePersonalEvent,
  goBack,
}: {
  monthLabel: string;
  monthDate: Date;
  events: CalendarEvent[];
  selectedDate: string;
  selectedDateEvents: CalendarEvent[];
  matchTitleByLinkedId: Record<string, string>;
  filter: 'all' | CalendarEventType | 'mine';
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (value: string) => void;
  onChangeFilter: (value: 'all' | CalendarEventType | 'mine') => void;
  form: CalendarEventForm;
  onChangeForm: React.Dispatch<React.SetStateAction<CalendarEventForm>>;
  canCreatePersonalEvent: boolean;
  canSyncHoliday: boolean;
  isSyncingHoliday: boolean;
  holidaySyncYear: string;
  onChangeHolidaySyncYear: (value: string) => void;
  onSyncHoliday: () => void;
  isSavingEvent: boolean;
  onSavePersonalEvent: () => void;
  goBack: () => void;
}) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const leadingBlank = monthStart.getDay();
  const totalCells = Math.ceil((leadingBlank + daysInMonth) / 7) * 7;
  const typeColor: Record<CalendarEventType, string> = {
    holiday: '#ef4444',
    match: colors.neon,
    leave: '#f59e0b',
    business_trip: '#22d3ee',
    personal: '#a78bfa',
  };

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      const key = toDateKey(event.start_at);
      if (!key) {
        return acc;
      }
      acc[key] = acc[key] ? [...acc[key], event] : [event];
      return acc;
    }, {});
  }, [events]);

  const filterItems: Array<{ value: 'all' | CalendarEventType | 'mine'; label: string }> = [
    { value: 'all', label: '전체' },
    { value: 'match', label: '경기' },
    { value: 'holiday', label: '공휴일' },
    { value: 'leave', label: '휴가' },
    { value: 'business_trip', label: '출장' },
    { value: 'personal', label: '기타' },
    { value: 'mine', label: '내 일정' },
  ];

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>통합 캘린더</Text>
      <Text style={styles.muted}>공휴일, 개인 일정, 경기 일정을 월간 화면에서 함께 확인합니다.</Text>

      <View style={styles.calendarMonthHeader}>
        <TouchableOpacity style={styles.iconButton} onPress={onPrevMonth}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={onNextMonth}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {canSyncHoliday && (
        <View style={styles.calendarSyncRow}>
          <Input
            value={holidaySyncYear}
            onChangeText={(value) => onChangeHolidaySyncYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="연도(YYYY)"
            keyboardType="number-pad"
            editable={!isSyncingHoliday}
            style={styles.calendarSyncYearInput}
          />
          <TouchableOpacity
            style={[styles.secondaryButton, styles.calendarSyncButton, isSyncingHoliday && styles.buttonDisabled]}
            onPress={onSyncHoliday}
            disabled={isSyncingHoliday}
          >
            <Text style={styles.secondaryButtonText}>
              {isSyncingHoliday ? '동기화 중...' : '공휴일 동기화'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.calendarFilterRow}>
        {filterItems.map((item) => {
          const selected = filter === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.memberChip, selected && styles.memberChipSelected]}
              onPress={() => onChangeFilter(item.value)}
            >
              <Text style={[styles.memberChipText, selected && styles.memberChipTextSelected]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.calendarWeekHeader}>
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <Text key={day} style={styles.calendarWeekHeaderText}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {Array.from({ length: totalCells }).map((_, index) => {
          const day = index - leadingBlank + 1;
          const inMonth = day >= 1 && day <= daysInMonth;
          const dateKey = inMonth ? `${monthDate.getFullYear()}-${`${monthDate.getMonth() + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}` : '';
          const dayEvents = dateKey ? (eventsByDate[dateKey] ?? []) : [];
          const selected = dateKey && selectedDate === dateKey;
          return (
            <TouchableOpacity
              key={`calendar-cell-${index}`}
              style={[styles.calendarCell, selected && styles.calendarCellSelected, !inMonth && styles.calendarCellDisabled]}
              onPress={() => {
                if (dateKey) {
                  onSelectDate(dateKey);
                  onChangeForm((prev) => ({ ...prev, date: dateKey }));
                }
              }}
              disabled={!dateKey}
            >
              <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>
                {inMonth ? day : ''}
              </Text>
              <View style={styles.calendarDotRow}>
                {dayEvents.slice(0, 3).map((event) => (
                  <View
                    key={`dot-${event.id}`}
                    style={[styles.calendarDot, { backgroundColor: typeColor[event.event_type] }]}
                  />
                ))}
              </View>
              {!!dayEvents.length && <Text style={styles.calendarEventCount}>{dayEvents.length}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.listCard}>
        <Text style={styles.noticeTitle}>{selectedDate || '날짜를 선택하세요'}</Text>
        {selectedDateEvents.length === 0 && <Text style={styles.muted}>선택한 날짜에 일정이 없습니다.</Text>}
        {selectedDateEvents.map((event) => {
          const timeLabel = event.is_all_day
            ? '종일'
            : `${toKstTimeLabelFromIso(event.start_at)} - ${toKstTimeLabelFromIso(event.end_at)}`;
          const displayTitle = event.event_type === 'match' && event.linked_match_id !== null
            ? (matchTitleByLinkedId[String(event.linked_match_id)] ?? event.title)
            : event.title;
          return (
            <View key={`selected-event-${event.id}`} style={styles.calendarEventItem}>
              <View style={[styles.calendarEventTypeMark, { backgroundColor: typeColor[event.event_type] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{displayTitle}</Text>
                <Text style={styles.muted}>{`${timeLabel}${event.location_floor ? ` | ${event.location_floor}` : ''}`}</Text>
                {!!event.description && <Text style={styles.muted}>{event.description}</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {canCreatePersonalEvent && (
        <View style={styles.adminSeasonPanel}>
          <Text style={styles.noticeTitle}>개인 일정 등록</Text>
          <Label text="유형" />
          <View style={styles.memberChipRow}>
            {[
              { key: 'leave', label: '휴가' },
              { key: 'business_trip', label: '출장' },
              { key: 'personal', label: '기타' },
            ].map((item) => {
              const selected = form.eventType === item.key;
              return (
                <TouchableOpacity
                  key={`event-type-${item.key}`}
                  style={[styles.memberChip, selected && styles.memberChipSelected, isSavingEvent && styles.memberChipDisabled]}
                  onPress={() => onChangeForm((prev) => ({ ...prev, eventType: item.key as CalendarEventForm['eventType'] }))}
                  disabled={isSavingEvent}
                >
                  <Text style={[styles.memberChipText, selected && styles.memberChipTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Label text="제목" />
          <Input
            value={form.title}
            onChangeText={(value) => onChangeForm((prev) => ({ ...prev, title: value }))}
            placeholder="예: 개인 휴가"
            editable={!isSavingEvent}
          />
          <Label text="날짜" />
          <Input
            value={form.date}
            onChangeText={(value) => onChangeForm((prev) => ({ ...prev, date: value }))}
            placeholder="YYYY-MM-DD"
            editable={!isSavingEvent}
          />
          <Label text="메모" required={false} />
          <Input
            value={form.description}
            onChangeText={(value) => onChangeForm((prev) => ({ ...prev, description: value }))}
            placeholder="선택 입력"
            editable={!isSavingEvent}
          />
          <TouchableOpacity
            style={[styles.primaryButton, isSavingEvent && styles.buttonDisabled]}
            onPress={onSavePersonalEvent}
            disabled={isSavingEvent}
          >
            <Text style={styles.primaryButtonText}>{isSavingEvent ? '저장 중...' : '개인 일정 저장'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function MatchScheduleTableScreen({
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
  seasons,
  selectedSeasonId,
  data,
  recentByTeam,
  avatarByTeamName,
  isLoading,
  title,
  onSelectSeason,
  goBack,
}: {
  seasons: Season[];
  selectedSeasonId: number | null;
  data: LeagueRow[];
  recentByTeam: Record<string, TeamRecentResult[]>;
  avatarByTeamName: Record<string, Array<string | null>>;
  isLoading: boolean;
  title: string;
  onSelectSeason: (seasonId: number) => void;
  goBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const isMobileStandingLayout = width < 768;
  const selectedSeasonName = seasons.find((season) => season.id === selectedSeasonId)?.name ?? null;
  const selectedSeasonLabel = selectedSeasonName ?? '시즌 미선택';
  const selectedSeasonIndex = seasons.findIndex((season) => season.id === selectedSeasonId);
  const canMovePrev = selectedSeasonIndex > 0;
  const canMoveNext = selectedSeasonIndex >= 0 && selectedSeasonIndex < seasons.length - 1;

  const moveSeason = (direction: 'prev' | 'next') => {
    if (selectedSeasonIndex < 0) {
      return;
    }

    const nextIndex = direction === 'prev'
      ? selectedSeasonIndex - 1
      : selectedSeasonIndex + 1;
    const nextSeason = seasons[nextIndex];
    if (!nextSeason) {
      return;
    }
    onSelectSeason(nextSeason.id);
  };

  const renderRecentBadge = (result: TeamRecentResult, index: number) => {
    const toneStyle = result === '승'
      ? styles.leagueRecentBadgeWin
      : result === '무'
        ? styles.leagueRecentBadgeDraw
        : styles.leagueRecentBadgeLoss;

    return (
      <View key={`recent-${index}-${result}`} style={[styles.leagueRecentBadge, toneStyle]}>
        <Text style={styles.leagueRecentBadgeText}>{result}</Text>
      </View>
    );
  };

  const renderTeamProfileAvatar = (teamName: string) => {
    const avatarUrls = avatarByTeamName[teamName] ?? [null, null];

    return (
      <View style={styles.leagueTeamProfileAvatarGroup}>
        {avatarUrls.slice(0, 2).map((avatarUrl, index) => (
          <View
            key={`${teamName}-avatar-${index}`}
            style={[
              styles.leagueTeamProfileAvatarWrap,
              index === 1 && styles.leagueTeamProfileAvatarOverlap,
              !avatarUrl && styles.leagueTeamProfileAvatarFallback,
            ]}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.leagueTeamProfileAvatarImage} />
            ) : (
              <Ionicons name="person" size={12} color="#9db5d2" />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.leaguePage}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.leagueBackLink}>{'< Back'}</Text>
      </TouchableOpacity>

      <View style={styles.leagueSeasonNavRow}>
        <TouchableOpacity
          style={[styles.leagueSeasonArrowButton, !canMovePrev && styles.leagueSeasonArrowButtonDisabled]}
          onPress={() => moveSeason('prev')}
          disabled={!canMovePrev}
        >
          <Ionicons name="chevron-back" size={16} color={canMovePrev ? colors.text : colors.sub} />
        </TouchableOpacity>
        <Text style={styles.leagueSeasonTitle}>{selectedSeasonLabel}</Text>
        <TouchableOpacity
          style={[styles.leagueSeasonArrowButton, !canMoveNext && styles.leagueSeasonArrowButtonDisabled]}
          onPress={() => moveSeason('next')}
          disabled={!canMoveNext}
        >
          <Ionicons name="chevron-forward" size={16} color={canMoveNext ? colors.text : colors.sub} />
        </TouchableOpacity>
      </View>

      <View style={styles.leaguePanel}>
        {isLoading && <Text style={styles.leagueLoadingText}>팀순위를 불러오는 중입니다...</Text>}

        {!isLoading && isMobileStandingLayout && (
          <View style={styles.leagueMobileList}>
            {data.length === 0 && <Text style={styles.leagueLoadingText}>리그 테이블 데이터가 없습니다.</Text>}
            {data.map((row) => {
              const recentResults = recentByTeam[row.team] ?? [];
              return (
                <View key={`mobile-standing-${row.rank}`} style={styles.leagueMobileCard}>
                  <View style={styles.leagueMobileTopRow}>
                    <View style={styles.leagueMobileRankWrap}>
                      <Text style={styles.leagueMobileRank}>{row.rank}</Text>
                    </View>
                    <View style={styles.leagueMobileTeamWrap}>
                      <View style={styles.leagueTeamBadge}>
                        <Text style={styles.leagueTeamBadgeText}>{row.team.slice(0, 1)}</Text>
                      </View>
                      <Text style={styles.leagueMobileTeamName} numberOfLines={1}>{row.team}</Text>
                      {renderTeamProfileAvatar(row.team)}
                    </View>
                    <View style={styles.leagueMobilePointWrap}>
                      <Text style={styles.leagueMobilePointLabel}>승점</Text>
                      <Text style={styles.leagueMobilePointValue}>{row.points}</Text>
                    </View>
                  </View>

                  <View style={styles.leagueMobileStatGrid}>
                    <View style={styles.leagueMobileStatItem}>
                      <Text style={styles.leagueMobileStatLabel}>경기</Text>
                      <Text style={styles.leagueMobileStatValue}>{row.played}</Text>
                    </View>
                    <View style={styles.leagueMobileStatItem}>
                      <Text style={styles.leagueMobileStatLabel}>승</Text>
                      <Text style={styles.leagueMobileStatValue}>{row.wins}</Text>
                    </View>
                    <View style={styles.leagueMobileStatItem}>
                      <Text style={styles.leagueMobileStatLabel}>무</Text>
                      <Text style={styles.leagueMobileStatValue}>{row.draws}</Text>
                    </View>
                    <View style={styles.leagueMobileStatItem}>
                      <Text style={styles.leagueMobileStatLabel}>패</Text>
                      <Text style={styles.leagueMobileStatValue}>{row.losses}</Text>
                    </View>
                    <View style={styles.leagueMobileStatItem}>
                      <Text style={styles.leagueMobileStatLabel}>득점</Text>
                      <Text style={styles.leagueMobileStatValue}>{row.gf}</Text>
                    </View>
                    <View style={styles.leagueMobileStatItem}>
                      <Text style={styles.leagueMobileStatLabel}>실점</Text>
                      <Text style={styles.leagueMobileStatValue}>{row.ga}</Text>
                    </View>
                    <View style={styles.leagueMobileStatItem}>
                      <Text style={styles.leagueMobileStatLabel}>득실</Text>
                      <Text style={styles.leagueMobileStatValue}>{row.gd > 0 ? `+${row.gd}` : row.gd}</Text>
                    </View>
                  </View>

                  <View style={styles.leagueMobileRecentRow}>
                    <Text style={styles.leagueMobileRecentLabel}>최근3경기</Text>
                    <View style={styles.leagueRecentCellWrap}>
                      {recentResults.length > 0
                        ? recentResults.map((result, index) => renderRecentBadge(result, index))
                        : <Text style={styles.leagueLoadingText}>-</Text>}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!isLoading && !isMobileStandingLayout && (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.leagueTableWrap}>
              <View style={styles.leagueTableHeader}>
                {['순위', '팀명', '승점', '경기', '승', '무', '패', '득점', '실점', '득실', '최근3경기'].map((h, index) => (
                  <Text
                    key={h}
                    style={[
                      styles.leagueTableHeaderText,
                      index === 1 && styles.leagueTableTeamCell,
                      index === 10 && styles.leagueTableRecentCell,
                    ]}
                  >
                    {h}
                  </Text>
                ))}
              </View>

              {data.length === 0 && <Text style={styles.leagueLoadingText}>리그 테이블 데이터가 없습니다.</Text>}
              {data.map((row) => {
                const recentResults = recentByTeam[row.team] ?? [];
                return (
                  <View key={row.rank} style={styles.leagueTableRow}>
                    <Text style={styles.leagueTableCell}>{row.rank}</Text>
                    <View style={[styles.leagueTableTeamCell, styles.leagueTeamCellWrap]}>
                      <View style={styles.leagueTeamBadge}>
                        <Text style={styles.leagueTeamBadgeText}>{row.team.slice(0, 1)}</Text>
                      </View>
                      <Text style={styles.leagueTeamNameText} numberOfLines={1}>{row.team}</Text>
                      {renderTeamProfileAvatar(row.team)}
                    </View>
                    <Text style={[styles.leagueTableCell, styles.leaguePointsCell]}>{row.points}</Text>
                    <Text style={styles.leagueTableCell}>{row.played}</Text>
                    <Text style={styles.leagueTableCell}>{row.wins}</Text>
                    <Text style={styles.leagueTableCell}>{row.draws}</Text>
                    <Text style={styles.leagueTableCell}>{row.losses}</Text>
                    <Text style={styles.leagueTableCell}>{row.gf}</Text>
                    <Text style={styles.leagueTableCell}>{row.ga}</Text>
                    <Text style={styles.leagueTableCell}>{row.gd > 0 ? `+${row.gd}` : row.gd}</Text>
                    <View style={[styles.leagueTableRecentCell, styles.leagueRecentCellWrap]}>
                      {recentResults.length > 0
                        ? recentResults.map((result, index) => renderRecentBadge(result, index))
                        : <Text style={styles.leagueLoadingText}>-</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
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
  memberCount,
  onNavigate,
  isSyncingHolidayCalendar,
  holidaySyncYear,
  onChangeHolidaySyncYear,
  onSyncHolidayCalendar,
  personalEventForm,
  onChangePersonalEventForm,
  isSavingPersonalEvent,
  onSavePersonalEvent,
  goBack,
}: {
  profile: Profile | null;
  activeSeason: Season | null;
  seasons: Season[];
  notices: Notice[];
  schedules: MatchSchedule[];
  teams: Team[];
  memberCount: number;
  onNavigate: React.Dispatch<React.SetStateAction<Screen>>;
  isSyncingHolidayCalendar: boolean;
  holidaySyncYear: string;
  onChangeHolidaySyncYear: (value: string) => void;
  onSyncHolidayCalendar: (year: number) => void;
  personalEventForm: CalendarEventForm;
  onChangePersonalEventForm: React.Dispatch<React.SetStateAction<CalendarEventForm>>;
  isSavingPersonalEvent: boolean;
  onSavePersonalEvent: () => void;
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
    {
      key: 'members',
      title: '회원 관리',
      description: '회원 부서, 활동 상태, 권한을 역할 기준으로 관리합니다.',
      badge: memberCount > 0 ? `${memberCount}명` : '관리',
      icon: 'account-group-outline',
      enabled: true,
      onPress: () => onNavigate('memberAdmin'),
    },
  ];

  if (canManageUsers) {
    menuItems.push({
      key: 'roles',
      title: '슈퍼 관리자',
      description: 'super_admin 권한으로 역할 변경까지 수행할 수 있습니다.',
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
                style={styles.adminSeasonActionButton}
                onPress={() => onNavigate('seasonAdmin')}
              >
                <MaterialCommunityIcons name="shield-outline" size={18} color={colors.accent} />
                <View style={styles.adminSeasonActionTextWrap}>
                  <Text style={styles.adminSeasonActionTitle}>팀 관리</Text>
                  <Text style={styles.adminSeasonActionMeta}>
                    시즌 선택 후 진입 ({teams.length}개 팀)
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminSeasonActionButton}
                onPress={() => onNavigate('seasonAdmin')}
              >
                <MaterialCommunityIcons name="soccer" size={18} color={colors.accent} />
                <View style={styles.adminSeasonActionTextWrap}>
                  <Text style={styles.adminSeasonActionTitle}>경기 관리</Text>
                  <Text style={styles.adminSeasonActionMeta}>
                    시즌 선택 후 진입 ({schedules.length}경기)
                  </Text>
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

            <View style={styles.calendarSyncRow}>
              <Input
                value={holidaySyncYear}
                onChangeText={(value) => onChangeHolidaySyncYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="연도(YYYY)"
                keyboardType="number-pad"
                editable={!isSyncingHolidayCalendar}
                style={styles.calendarSyncYearInput}
              />
              <TouchableOpacity
                style={[styles.secondaryButton, styles.calendarSyncButton, isSyncingHolidayCalendar && styles.buttonDisabled]}
                onPress={() => onSyncHolidayCalendar(Number(holidaySyncYear))}
                disabled={isSyncingHolidayCalendar}
              >
                <Text style={styles.secondaryButtonText}>
                  {isSyncingHolidayCalendar ? '동기화 중...' : '공휴일 동기화'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.adminSeasonHint}>
              팀 관리와 경기 관리는 시즌 관리 {'>'} 시즌 선택 {'>'} 시즌 상세 흐름에서만 진입합니다.
            </Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>OPERATIONS</Text>
          </View>
          <View style={styles.adminSeasonPanel}>
            <Text style={styles.noticeTitle}>개인 일정 등록</Text>
            <Label text="유형" />
            <View style={styles.memberChipRow}>
              {[
                { key: 'leave', label: '휴가' },
                { key: 'business_trip', label: '출장' },
                { key: 'personal', label: '기타' },
              ].map((item) => {
                const selected = personalEventForm.eventType === item.key;
                return (
                  <TouchableOpacity
                    key={`admin-personal-event-type-${item.key}`}
                    style={[styles.memberChip, selected && styles.memberChipSelected, isSavingPersonalEvent && styles.memberChipDisabled]}
                    onPress={() => onChangePersonalEventForm((prev) => ({ ...prev, eventType: item.key as CalendarEventForm['eventType'] }))}
                    disabled={isSavingPersonalEvent}
                  >
                    <Text style={[styles.memberChipText, selected && styles.memberChipTextSelected]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Label text="제목" />
            <Input
              value={personalEventForm.title}
              onChangeText={(value) => onChangePersonalEventForm((prev) => ({ ...prev, title: value }))}
              placeholder="예: 개인 휴가"
              editable={!isSavingPersonalEvent}
            />

            <Label text="날짜" />
            <Input
              value={personalEventForm.date}
              onChangeText={(value) => onChangePersonalEventForm((prev) => ({ ...prev, date: value }))}
              placeholder="YYYY-MM-DD"
              editable={!isSavingPersonalEvent}
            />

            <Label text="메모" required={false} />
            <Input
              value={personalEventForm.description}
              onChangeText={(value) => onChangePersonalEventForm((prev) => ({ ...prev, description: value }))}
              placeholder="선택 입력"
              editable={!isSavingPersonalEvent}
            />

            <TouchableOpacity
              style={[styles.primaryButton, isSavingPersonalEvent && styles.buttonDisabled]}
              onPress={onSavePersonalEvent}
              disabled={isSavingPersonalEvent}
            >
              <Text style={styles.primaryButtonText}>{isSavingPersonalEvent ? '저장 중...' : '개인 일정 저장'}</Text>
            </TouchableOpacity>
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

function MemberManagementScreen({
  members,
  query,
  isLoading,
  updatingMemberId,
  onChangeQuery,
  onRefresh,
  onDeleteMember,
  onChangeDepartment,
  goBack,
}: {
  members: ManagedMember[];
  query: string;
  isLoading: boolean;
  updatingMemberId: string | null;
  onChangeQuery: (value: string) => void;
  onRefresh: () => void;
  onDeleteMember: (member: ManagedMember) => void;
  onChangeDepartment: (member: ManagedMember, department: ProfileDepartment | null) => void;
  goBack: () => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const departmentOptions: Array<ProfileDepartment | null> = [null, '1부', '2부', '3부', '4부'];
  const visibleMembers = useMemo(
    () => members.filter((member) => member.is_deleted === false && member.role === 'member'),
    [members]
  );
  const [avatarUrlByMemberId, setAvatarUrlByMemberId] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let isActive = true;

    const loadAvatarUrls = async () => {
      const entries = await Promise.all(
        visibleMembers.map(async (member) => {
          const avatarPath = member.avatar_path ?? fallbackAvatarPathByName[member.name] ?? null;
          const avatarUrl = await resolveProfileAvatarUrl(avatarPath);
          return [member.id, avatarUrl] as const;
        })
      );

      if (!isActive) {
        return;
      }

      setAvatarUrlByMemberId((prev) => {
        const next = { ...prev };
        for (const [memberId, avatarUrl] of entries) {
          next[memberId] = avatarUrl;
        }
        return next;
      });
    };

    loadAvatarUrls().catch(() => {});

    return () => {
      isActive = false;
    };
  }, [visibleMembers]);

  const filteredMembers = normalizedQuery
    ? visibleMembers.filter((member) =>
      member.name.toLowerCase().includes(normalizedQuery)
      || member.id.toLowerCase().includes(normalizedQuery)
      || member.role.toLowerCase().includes(normalizedQuery)
      || (member.department ?? '미지정').toLowerCase().includes(normalizedQuery)
    )
    : visibleMembers;

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>회원 관리</Text>

      <Input
        value={query}
        onChangeText={onChangeQuery}
        placeholder="이름, UUID, 권한, 부서로 검색"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
        onPress={onRefresh}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>{isLoading ? '회원 목록 로딩 중...' : '회원 목록 새로고침'}</Text>
      </TouchableOpacity>

      <Text style={styles.muted}>
        총 {visibleMembers.length}명 · 검색 결과 {filteredMembers.length}명
      </Text>

      {filteredMembers.length === 0 && (
        <Text style={styles.muted}>
          {normalizedQuery ? '검색 조건에 맞는 회원이 없습니다.' : '조회된 회원이 없습니다.'}
        </Text>
      )}

      <View style={styles.memberList}>
        {filteredMembers.map((member) => {
          const isUpdating = updatingMemberId === member.id;
          const avatarUrl = avatarUrlByMemberId[member.id] ?? null;
          const avatarInitial = member.name.trim().slice(0, 1) || '?';

          return (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberCardHeader}>
                <View style={styles.memberCardHeaderLeft}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.memberAvatarImage} />
                  ) : (
                    <View style={[styles.memberAvatarImage, styles.memberAvatarFallback]}>
                      <Text style={styles.memberAvatarFallbackText}>{avatarInitial}</Text>
                    </View>
                  )}
                  <Text style={styles.body}>{member.name}</Text>
                </View>

                <View style={styles.memberBadgeRow}>
                  <View style={[styles.memberBadge, styles.memberRoleBadge]}>
                    <Text style={styles.memberBadgeText}>{member.role}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.memberDeleteButton}
                    onPress={() => onDeleteMember(member)}
                    disabled={isUpdating}
                  >
                    <Text style={styles.memberDeleteButtonText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.memberControlBlock}>
                <View style={styles.memberChipRow}>
                  {departmentOptions.map((departmentOption) => {
                    const selected = member.department === departmentOption;
                    return (
                      <TouchableOpacity
                        key={`${member.id}-department-${departmentOption ?? 'none'}`}
                        style={[styles.memberChip, selected && styles.memberChipSelected]}
                        onPress={() => onChangeDepartment(member, departmentOption)}
                        disabled={isUpdating || selected}
                      >
                        <Text style={[styles.memberChipText, selected && styles.memberChipTextSelected]}>
                          {departmentOption ?? '미지정'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </View>
          );
        })}
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
  calendarEvents,
  members,
  canSyncHoliday,
  isSyncingHoliday,
  holidaySyncYear,
  onChangeHolidaySyncYear,
  onSyncHoliday,
  isSavingMemberEvent,
  isSavingHolidayEvent,
  onShowMessage,
  deletingEventId,
  onDeleteEvent,
  onSaveHolidayEvent,
  onSaveMemberEvent,
  onScrollToY,
  seasonTeamCount,
  seasonMatchCount,
  matchTitleByLinkedId,
  onUpdateSeasonStatus,
  onNavigate,
  goBack,
}: {
  season: Season;
  activeSeason: Season | null;
  calendarEvents: CalendarEvent[];
  members: ManagedMember[];
  canSyncHoliday: boolean;
  isSyncingHoliday: boolean;
  holidaySyncYear: string;
  onChangeHolidaySyncYear: (value: string) => void;
  onSyncHoliday: () => void;
  isSavingMemberEvent: boolean;
  isSavingHolidayEvent: boolean;
  onShowMessage: (title: string, message?: string) => void;
  deletingEventId: number | null;
  onDeleteEvent: (event: CalendarEvent) => Promise<void>;
  onSaveHolidayEvent: (params: {
    title: string;
    date: string;
    description: string;
  }) => Promise<void>;
  onSaveMemberEvent: (params: {
    seasonId: number;
    userId: string;
    eventType: Extract<CalendarEventType, 'leave' | 'business_trip' | 'personal'>;
    title: string;
    date: string;
    description: string;
  }) => Promise<void>;
  onScrollToY: (y: number) => void;
  seasonTeamCount: number;
  seasonMatchCount: number;
  matchTitleByLinkedId: Record<string, string>;
  onUpdateSeasonStatus: (season: Season, nextStatus: Season['status']) => void;
  onNavigate: React.Dispatch<React.SetStateAction<Screen>>;
  goBack: () => void;
}) {
  const isActiveSeason = activeSeason?.id === season.id;
  const [seasonCalendarFilter, setSeasonCalendarFilter] = useState<'all' | 'match' | 'member' | 'holiday'>('all');
  const [seasonCalendarMonth, setSeasonCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedSeasonCalendarDate, setSelectedSeasonCalendarDate] = useState(() => toDateInput(new Date()));
  const [memberFormSectionY, setMemberFormSectionY] = useState(0);
  const [memberEventForm, setMemberEventForm] = useState<{
    userId: string | null;
    eventType: Extract<CalendarEventType, 'holiday' | 'leave' | 'business_trip' | 'personal'>;
    title: string;
    date: string;
    description: string;
  }>({
    userId: null,
    eventType: 'leave',
    title: '',
    date: toDateInput(new Date()),
    description: '',
  });

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    setSeasonCalendarMonth(monthStart);
    setSelectedSeasonCalendarDate(toDateInput(monthStart));
    setSeasonCalendarFilter('all');
    setMemberEventForm({
      userId: null,
      eventType: 'leave',
      title: '',
      date: toDateInput(new Date()),
      description: '',
    });
  }, [season.id]);

  const seasonEventTypes: CalendarEventType[] = ['holiday', 'match', 'leave', 'business_trip', 'personal'];
  const seasonTypeLabel: Record<CalendarEventType, string> = {
    holiday: '공휴일',
    match: '경기',
    leave: '휴가',
    business_trip: '출장',
    personal: '기타',
  };
  const seasonTypeColor: Record<CalendarEventType, string> = {
    holiday: '#ef4444',
    match: colors.neon,
    leave: '#f59e0b',
    business_trip: '#22d3ee',
    personal: '#a78bfa',
  };
  const filteredSeasonEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      if (!seasonEventTypes.includes(event.event_type)) {
        return false;
      }

      if (event.event_type === 'holiday') {
        if (seasonCalendarFilter === 'match' || seasonCalendarFilter === 'member') {
          return false;
        }
        return true;
      }

      if (event.season_id !== season.id) {
        return false;
      }

      if (seasonCalendarFilter === 'all') {
        return true;
      }
      if (seasonCalendarFilter === 'match') {
        return event.event_type === 'match';
      }
      if (seasonCalendarFilter === 'holiday') {
        return false;
      }
      return event.event_type === 'leave' || event.event_type === 'business_trip' || event.event_type === 'personal';
    });
  }, [calendarEvents, season.id, seasonCalendarFilter]);
  const seasonEventsByDate = useMemo(() => {
    return filteredSeasonEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      const key = toDateKey(event.start_at);
      if (!key) {
        return acc;
      }
      acc[key] = acc[key] ? [...acc[key], event] : [event];
      return acc;
    }, {});
  }, [filteredSeasonEvents]);

  const monthStart = new Date(seasonCalendarMonth.getFullYear(), seasonCalendarMonth.getMonth(), 1);
  const daysInMonth = new Date(seasonCalendarMonth.getFullYear(), seasonCalendarMonth.getMonth() + 1, 0).getDate();
  const leadingBlank = monthStart.getDay();
  const totalCells = Math.ceil((leadingBlank + daysInMonth) / 7) * 7;
  const monthLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(seasonCalendarMonth);
  const selectedSeasonEvents = seasonEventsByDate[selectedSeasonCalendarDate] ?? [];
  const memberOptions = useMemo(() => {
    return members
      .map((member) => ({ value: member.id, name: member.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
  }, [members]);
  const memberNameById = useMemo(() => {
    return members.reduce<Record<string, string>>((acc, member) => {
      acc[member.id] = member.name;
      return acc;
    }, {});
  }, [members]);
  const syncMemberFormDate = (date: string) => {
    setSelectedSeasonCalendarDate(date);
    setMemberEventForm((prev) => ({ ...prev, date }));
  };
  const isHolidayEventType = memberEventForm.eventType === 'holiday';
  const isSavingAnyEvent = isSavingMemberEvent || isSavingHolidayEvent;

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
            style={styles.adminSeasonActionButton}
            onPress={() => onNavigate('seasonTeamAdmin')}
          >
            <MaterialCommunityIcons name="shield-outline" size={18} color={colors.accent} />
            <View style={styles.adminSeasonActionTextWrap}>
              <Text style={styles.adminSeasonActionTitle}>팀 관리</Text>
              <Text style={styles.adminSeasonActionMeta}>{`${seasonTeamCount}개 팀`}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adminSeasonActionButton, !isActiveSeason && styles.adminSeasonActionButtonDisabled]}
            onPress={() => onNavigate('seasonMatchAdmin')}
            disabled={!isActiveSeason}
          >
            <MaterialCommunityIcons name="soccer" size={18} color={isActiveSeason ? colors.accent : colors.sub} />
            <View style={styles.adminSeasonActionTextWrap}>
              <Text style={styles.adminSeasonActionTitle}>경기등록</Text>
              <Text style={styles.adminSeasonActionMeta}>{isActiveSeason ? `${seasonMatchCount}경기` : '활성 시즌에서만 사용'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adminSeasonActionButton, !isActiveSeason && styles.adminSeasonActionButtonDisabled]}
            onPress={() => onNavigate('seasonResultAdmin')}
            disabled={!isActiveSeason}
          >
            <MaterialCommunityIcons name="trophy-outline" size={18} color={isActiveSeason ? colors.accent : colors.sub} />
            <View style={styles.adminSeasonActionTextWrap}>
              <Text style={styles.adminSeasonActionTitle}>경기결과등록</Text>
              <Text style={styles.adminSeasonActionMeta}>{isActiveSeason ? '결과 입력/수정' : '활성 시즌에서만 사용'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminSeasonActionButton}
            onPress={() => onNavigate('seasonStandingAdmin')}
          >
            <MaterialCommunityIcons name="podium" size={18} color={colors.accent} />
            <View style={styles.adminSeasonActionTextWrap}>
              <Text style={styles.adminSeasonActionTitle}>팀순위</Text>
              <Text style={styles.adminSeasonActionMeta}>시즌별 순위 조회</Text>
            </View>
          </TouchableOpacity>
        </View>

        {!isActiveSeason && (
          <Text style={styles.adminSeasonHint}>
            현재 일반 사용자 화면은 active 시즌 기준으로만 데이터를 노출합니다. 이 시즌을 운영하려면 먼저 active로 전환하세요.
          </Text>
        )}
      </View>

      <View style={styles.adminSeasonPanel}>
        <Text style={styles.noticeTitle}>월간 일정</Text>
        <Text style={styles.noticeText}>해당 시즌의 경기 일정과 회원 일정을 월간으로 확인합니다.</Text>

        {canSyncHoliday && (
          <View style={styles.calendarSyncRow}>
            <Input
              value={holidaySyncYear}
              onChangeText={(value) => onChangeHolidaySyncYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="연도(YYYY)"
              keyboardType="number-pad"
              editable={!isSyncingHoliday}
              style={styles.calendarSyncYearInput}
            />
            <TouchableOpacity
              style={[styles.secondaryButton, styles.calendarSyncButton, isSyncingHoliday && styles.buttonDisabled]}
              onPress={onSyncHoliday}
              disabled={isSyncingHoliday}
            >
              <Text style={styles.secondaryButtonText}>
                {isSyncingHoliday ? '동기화 중...' : '공휴일 동기화'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.calendarFilterRow}>
          {[
            { key: 'all', label: '전체' },
            { key: 'match', label: '경기' },
            { key: 'member', label: '회원일정' },
            { key: 'holiday', label: '공휴일' },
          ].map((item) => {
            const selected = seasonCalendarFilter === item.key;
            return (
              <TouchableOpacity
                key={`season-filter-${item.key}`}
                style={[styles.memberChip, selected && styles.memberChipSelected]}
                onPress={() => setSeasonCalendarFilter(item.key as 'all' | 'match' | 'member' | 'holiday')}
              >
                <Text style={[styles.memberChipText, selected && styles.memberChipTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.calendarMonthHeader}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              const next = new Date(seasonCalendarMonth.getFullYear(), seasonCalendarMonth.getMonth() - 1, 1);
              setSeasonCalendarMonth(next);
              syncMemberFormDate(toDateInput(next));
            }}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              const next = new Date(seasonCalendarMonth.getFullYear(), seasonCalendarMonth.getMonth() + 1, 1);
              setSeasonCalendarMonth(next);
              syncMemberFormDate(toDateInput(next));
            }}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarWeekHeader}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <Text key={`season-calendar-${day}`} style={styles.calendarWeekHeaderText}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {Array.from({ length: totalCells }).map((_, index) => {
            const day = index - leadingBlank + 1;
            const inMonth = day >= 1 && day <= daysInMonth;
            const dateKey = inMonth
              ? `${seasonCalendarMonth.getFullYear()}-${`${seasonCalendarMonth.getMonth() + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
              : '';
            const selected = dateKey && dateKey === selectedSeasonCalendarDate;
            const dayEvents = dateKey ? (seasonEventsByDate[dateKey] ?? []) : [];

            return (
              <TouchableOpacity
                key={`season-calendar-cell-${index}`}
                style={[styles.calendarCell, selected && styles.calendarCellSelected, !inMonth && styles.calendarCellDisabled]}
                onPress={() => {
                  if (!dateKey) {
                    return;
                  }
                  syncMemberFormDate(dateKey);
                }}
                disabled={!dateKey}
              >
                <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>
                  {inMonth ? day : ''}
                </Text>
                <View style={styles.calendarDotRow}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <View
                      key={`season-dot-${event.id}`}
                      style={[styles.calendarDot, { backgroundColor: seasonTypeColor[event.event_type] }]}
                    />
                  ))}
                </View>
                {!!dayEvents.length && <Text style={styles.calendarEventCount}>{dayEvents.length}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.listCard}>
          <Text style={styles.noticeTitle}>{selectedSeasonCalendarDate}</Text>
          {selectedSeasonEvents.length === 0 && <Text style={styles.muted}>선택한 날짜에 일정이 없습니다.</Text>}
          {selectedSeasonEvents.map((event) => {
            const timeLabel = event.is_all_day
              ? '종일'
              : `${toKstTimeLabelFromIso(event.start_at)} - ${toKstTimeLabelFromIso(event.end_at)}`;
            const displayTitle = event.event_type === 'match' && event.linked_match_id !== null
              ? (matchTitleByLinkedId[String(event.linked_match_id)] ?? event.title)
              : event.title;
            const memberName = event.created_by ? memberNameById[event.created_by] : null;
            const isMemberEvent = event.event_type === 'leave' || event.event_type === 'business_trip' || event.event_type === 'personal';
            const isDeleting = deletingEventId === event.id;
            return (
              <View key={`season-event-${event.id}`} style={styles.calendarEventItem}>
                <View style={[styles.calendarEventTypeMark, { backgroundColor: seasonTypeColor[event.event_type] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.body}>{displayTitle}</Text>
                  <Text style={styles.muted}>{`${seasonTypeLabel[event.event_type]} · ${timeLabel}`}</Text>
                  {isMemberEvent && (
                    <Text style={styles.muted}>
                      {memberName ? `${memberName} 선수` : '대상 회원 정보 없음'}
                    </Text>
                  )}
                  {!!event.description && <Text style={styles.muted}>{event.description}</Text>}
                </View>
                <TouchableOpacity
                  style={[styles.seasonEventDeleteButton, isDeleting && styles.buttonDisabled]}
                  onPress={() => {
                    void onDeleteEvent(event);
                  }}
                  disabled={isDeleting}
                >
                  <Text style={styles.seasonEventDeleteButtonText}>{isDeleting ? '삭제 중...' : '삭제'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      <View
        style={styles.adminSeasonPanel}
        onLayout={(event) => {
          setMemberFormSectionY(event.nativeEvent.layout.y);
        }}
      >
        <Text style={styles.noticeTitle}>회원 일정 등록 (관리자)</Text>
        <Label text="유형" />
        <View style={styles.memberChipRow}>
          {[
            { key: 'holiday', label: '공휴일' },
            { key: 'leave', label: '휴가' },
            { key: 'business_trip', label: '출장' },
            { key: 'personal', label: '기타' },
          ].map((item) => {
            const selected = memberEventForm.eventType === item.key;
            return (
              <TouchableOpacity
                key={`admin-member-event-type-${item.key}`}
                style={[styles.memberChip, selected && styles.memberChipSelected, isSavingAnyEvent && styles.memberChipDisabled]}
                onPress={() => setMemberEventForm((prev) => ({
                  ...prev,
                  eventType: item.key as typeof memberEventForm.eventType,
                  userId: item.key === 'holiday' ? null : prev.userId,
                }))}
                disabled={isSavingAnyEvent}
              >
                <Text style={[styles.memberChipText, selected && styles.memberChipTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Label text="대상 회원" />
        <SelectBox
          options={memberOptions}
          value={memberEventForm.userId}
          placeholder={isHolidayEventType ? '공휴일은 대상 회원 선택이 필요 없습니다.' : '회원을 선택하세요'}
          searchPlaceholder="회원 검색"
          noOptionsText="선택 가능한 회원이 없습니다."
          noResultsText="검색 결과가 없습니다."
          disabled={isSavingAnyEvent || isHolidayEventType}
          onChange={(value) => setMemberEventForm((prev) => ({ ...prev, userId: value }))}
        />

        <Label text="제목" />
        <Input
          value={memberEventForm.title}
          onChangeText={(value) => setMemberEventForm((prev) => ({ ...prev, title: value }))}
          placeholder={isHolidayEventType ? '예: 임시공휴일' : '예: 개인 휴가'}
          editable={!isSavingAnyEvent}
        />

        <Label text="날짜" />
        <Input
          value={memberEventForm.date}
          onChangeText={(value) => setMemberEventForm((prev) => ({ ...prev, date: value }))}
          placeholder="YYYY-MM-DD"
          editable={!isSavingAnyEvent}
        />

        <Label text="메모" required={false} />
        <Input
          value={memberEventForm.description}
          onChangeText={(value) => setMemberEventForm((prev) => ({ ...prev, description: value }))}
          placeholder="선택 입력"
          editable={!isSavingAnyEvent}
        />

        <TouchableOpacity
          style={[styles.primaryButton, isSavingAnyEvent && styles.buttonDisabled]}
          onPress={async () => {
            const selectedEventType = memberEventForm.eventType;
            if (selectedEventType === 'holiday') {
              await onSaveHolidayEvent({
                date: memberEventForm.date,
                title: memberEventForm.title,
                description: memberEventForm.description,
              });
              setMemberEventForm((prev) => ({
                ...prev,
                title: '',
                description: '',
              }));
              return;
            }
            if (!memberEventForm.userId) {
              onShowMessage('입력 확인', '대상 회원을 선택하세요.');
              return;
            }
            await onSaveMemberEvent({
              seasonId: season.id,
              userId: memberEventForm.userId,
              eventType: selectedEventType,
              title: memberEventForm.title,
              date: memberEventForm.date,
              description: memberEventForm.description,
            });
            setMemberEventForm((prev) => ({
              ...prev,
              title: '',
              description: '',
            }));
          }}
          disabled={isSavingAnyEvent}
        >
          <Text style={styles.primaryButtonText}>
            {isSavingAnyEvent
              ? '저장 중...'
              : isHolidayEventType
                ? '공휴일 저장'
                : '회원 일정 저장'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SeasonMatchManagementScreen({
  season,
  matchSeasonTeams,
  matchForm,
  isLoading,
  isSaving,
  onChangeMatchDate,
  onChangeMatchStartTime,
  onChangeMatchEndTime,
  onChangePlace,
  onAddEntry,
  onRemoveEntry,
  onChangeEntryTeam,
  onSave,
  goBack,
}: {
  season: Season;
  matchSeasonTeams: MatchSeasonTeamItem[];
  matchForm: MatchForm;
  isLoading: boolean;
  isSaving: boolean;
  onChangeMatchDate: (value: string) => void;
  onChangeMatchStartTime: (value: string) => void;
  onChangeMatchEndTime: (value: string) => void;
  onChangePlace: (value: '3F' | '4F') => void;
  onAddEntry: () => void;
  onRemoveEntry: (entryId: string) => void;
  onChangeEntryTeam: (entryId: string, side: 'home' | 'away', seasonTeamId: number | null) => void;
  onSave: () => void;
  goBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 960;
  const [isMatchDatePickerOpen, setIsMatchDatePickerOpen] = useState(false);
  const [matchDatePickerMonth, setMatchDatePickerMonth] = useState<Date>(() => {
    const selectedDate = parseDateInput(matchForm.matchDate);
    const baseDate = selectedDate ?? new Date();
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  });

  useEffect(() => {
    const selectedDate = parseDateInput(matchForm.matchDate);
    if (!selectedDate) {
      return;
    }
    setMatchDatePickerMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [matchForm.matchDate]);

  const matchDateMonthStart = new Date(matchDatePickerMonth.getFullYear(), matchDatePickerMonth.getMonth(), 1);
  const matchDateDaysInMonth = new Date(matchDatePickerMonth.getFullYear(), matchDatePickerMonth.getMonth() + 1, 0).getDate();
  const matchDateLeadingBlank = matchDateMonthStart.getDay();
  const matchDateTotalCells = Math.ceil((matchDateLeadingBlank + matchDateDaysInMonth) / 7) * 7;
  const matchDateMonthLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(matchDatePickerMonth);

  const renderTeamSide = (
    entry: MatchEntry,
    side: 'home' | 'away',
  ) => {
    const selectedTeamId = side === 'home' ? entry.homeSeasonTeamId : entry.awaySeasonTeamId;
    const sideTitle = side === 'home' ? '팀 A' : '팀 B';
    const sideLabel = side === 'home' ? 'HOME' : 'AWAY';
    const sideToneStyle = side === 'home' ? styles.matchEntrySideHome : styles.matchEntrySideAway;
    const selectedToneStyle = side === 'home' ? styles.matchSelectorSelectedHome : styles.matchSelectorSelectedAway;

    return (
      <View style={[styles.matchEntrySide, sideToneStyle]}>
        <View style={styles.matchEntrySideHeader}>
          <Text style={styles.matchEntrySideTitle}>{sideTitle}</Text>
          <Text style={styles.matchEntrySideMeta}>{sideLabel}</Text>
        </View>

        <Text style={styles.matchEntryBlockTitle}>팀선택 셀렉트박스</Text>
        <View style={styles.matchSelectorList}>
          {matchSeasonTeams.length === 0 && (
            <Text style={styles.muted}>선택 가능한 팀이 없습니다.</Text>
          )}
          {matchSeasonTeams.map((team) => {
            const selected = team.seasonTeamId === selectedTeamId;
            const disabled = isSaving || (side === 'home' ? entry.awaySeasonTeamId === team.seasonTeamId : entry.homeSeasonTeamId === team.seasonTeamId);
            const memberNames = team.members.map((member) => member.name).join(', ');
            return (
              <TouchableOpacity
                key={`${entry.entryId}-${side}-team-${team.seasonTeamId}`}
                style={[
                  styles.matchSelectorRow,
                  selected && selectedToneStyle,
                  disabled && styles.memberChipDisabled,
                ]}
                onPress={() => onChangeEntryTeam(entry.entryId, side, team.seasonTeamId)}
                disabled={disabled}
              >
                <Ionicons
                  name={selected ? 'checkbox-outline' : 'square-outline'}
                  size={16}
                  color={selected ? colors.neon : colors.sub}
                />
                <Text style={[styles.matchSelectorText, selected && styles.matchSelectorTextSelected]}>
                  {memberNames ? `${team.name} (${memberNames})` : team.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>{season.name} 경기 관리</Text>
      <Text style={styles.muted}>팀을 선택해 매치를 등록합니다. 팀원 정보는 선택한 팀 기준으로 자동 반영됩니다.</Text>

      <View style={styles.adminSeasonPanel}>
        <Text style={styles.noticeTitle}>경기 기본 정보</Text>
        <Label text="경기일" />
        <TouchableOpacity
          style={[styles.input, styles.matchDateInputButton, isSaving && styles.memberChipDisabled]}
          onPress={() => {
            const selectedDate = parseDateInput(matchForm.matchDate);
            const baseDate = selectedDate ?? new Date();
            setMatchDatePickerMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
            setIsMatchDatePickerOpen((prev) => !prev);
          }}
          disabled={isSaving}
        >
          <Text style={matchForm.matchDate ? styles.matchDateInputValue : styles.matchDateInputPlaceholder}>
            {matchForm.matchDate || 'YYYY-MM-DD'}
          </Text>
          <Ionicons
            name={isMatchDatePickerOpen ? 'chevron-up' : 'calendar-outline'}
            size={18}
            color={colors.sub}
          />
        </TouchableOpacity>
        {isMatchDatePickerOpen && (
          <View style={styles.matchDateCalendarPanel}>
            <View style={styles.calendarMonthHeader}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setMatchDatePickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                disabled={isSaving}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>{matchDateMonthLabel}</Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setMatchDatePickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                disabled={isSaving}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekHeader}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <Text key={`match-date-${day}`} style={styles.calendarWeekHeaderText}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {Array.from({ length: matchDateTotalCells }).map((_, index) => {
                const day = index - matchDateLeadingBlank + 1;
                const inMonth = day >= 1 && day <= matchDateDaysInMonth;
                const dateValue = inMonth
                  ? toDateInput(new Date(matchDatePickerMonth.getFullYear(), matchDatePickerMonth.getMonth(), day))
                  : '';
                const selected = dateValue && dateValue === matchForm.matchDate;

                return (
                  <TouchableOpacity
                    key={`match-date-cell-${index}`}
                    style={[
                      styles.calendarCell,
                      styles.matchDateCalendarCell,
                      selected && styles.calendarCellSelected,
                      !inMonth && styles.calendarCellDisabled,
                    ]}
                    onPress={() => {
                      if (!dateValue) {
                        return;
                      }
                      onChangeMatchDate(dateValue);
                      setIsMatchDatePickerOpen(false);
                    }}
                    disabled={!dateValue || isSaving}
                  >
                    <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>
                      {inMonth ? day : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        <Label text="시작 시간" />
        <Input
          value={matchForm.matchStartTime}
          onChangeText={onChangeMatchStartTime}
          placeholder="HH:MM"
          editable={!isSaving}
        />
        <Label text="종료 시간" />
        <Input
          value={matchForm.matchEndTime}
          onChangeText={onChangeMatchEndTime}
          placeholder="HH:MM"
          editable={!isSaving}
        />
        <Label text="장소" />
        <View style={styles.memberChipRow}>
          {(['3F', '4F'] as const).map((place) => {
            const selected = matchForm.place === place;
            return (
              <TouchableOpacity
                key={`match-place-${place}`}
                style={[styles.memberChip, selected && styles.memberChipSelected, isSaving && styles.memberChipDisabled]}
                onPress={() => onChangePlace(place)}
                disabled={isSaving}
              >
                <Text style={[styles.memberChipText, selected && styles.memberChipTextSelected]}>{place}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.adminSeasonPanel}>
        <View style={styles.matchEntriesHeader}>
          <View>
            <Text style={styles.noticeTitle}>매치 구성</Text>
            <Text style={styles.noticeText}>각 매치의 홈/원정 팀을 선택하세요.</Text>
          </View>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.matchAddButton, isSaving && styles.buttonDisabled]}
            onPress={onAddEntry}
            disabled={isSaving}
          >
            <Text style={styles.secondaryButtonText}>팀추가버튼</Text>
          </TouchableOpacity>
        </View>

        {isLoading && <Text style={styles.muted}>매치 등록 데이터를 불러오는 중입니다...</Text>}

        {!isLoading && matchForm.entries.map((entry, index) => (
          <View key={entry.entryId} style={styles.matchEntryCard}>
            <View style={styles.matchEntryTop}>
              <Text style={styles.matchEntryTitle}>매치 {index + 1}</Text>
              {matchForm.entries.length > 1 && (
                <TouchableOpacity
                  onPress={() => onRemoveEntry(entry.entryId)}
                  disabled={isSaving}
                  style={styles.adminInlineDangerButton}
                >
                  <Text style={styles.noticeDeleteLink}>매치 제거</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.matchEntryVsRow, isWideLayout && styles.matchEntryVsRowWide]}>
              {renderTeamSide(entry, 'home')}
              <View style={styles.matchEntryVsCenter}>
                <Text style={styles.matchEntryVsText}>VS</Text>
              </View>
              {renderTeamSide(entry, 'away')}
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
        onPress={onSave}
        disabled={isSaving || isLoading}
      >
        <Text style={styles.primaryButtonText}>{isSaving ? '저장 중...' : '경기 저장'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SeasonTeamManagementScreen({
  season,
  members,
  isLoadingMembers,
  initialRows,
  isLoadingRows,
  isSaving,
  onSave,
  goBack,
}: {
  season: Season;
  members: ManagedMember[];
  isLoadingMembers: boolean;
  initialRows: TeamDraftRow[];
  isLoadingRows: boolean;
  isSaving: boolean;
  onSave: (seasonId: number, rows: TeamDraftRow[]) => void;
  goBack: () => void;
}) {
  const [rows, setRows] = useState<TeamDraftRow[]>(initialRows);

  useEffect(() => {
    setRows(
      initialRows.length > 0
        ? initialRows
        : [createEmptyTeamDraftRow(), createEmptyTeamDraftRow()]
    );
  }, [initialRows, season.id]);

  const memberOptions = members.map((member) => ({
    value: member.id,
    name: `${member.name}(${member.department ?? '미지정'})`,
  }));

  const updateRow = (
    rowId: string,
    key: 'playerOneId' | 'playerTwoId' | 'teamName',
    value: string | null
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [key]: value ?? '' } : row))
    );
  };

  const addTeamRow = () => {
    setRows((prev) => [
      ...prev,
      createEmptyTeamDraftRow(),
    ]);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.logoTitle}>{season.name} 팀 관리</Text>
      <Text style={styles.muted}>선수는 selectbox로, 팀은 텍스트 입력으로 등록 행을 구성합니다.</Text>

      <View style={styles.adminSeasonPanel}>
        <View style={styles.seasonTeamHeaderRow}>
          <View>
            <Text style={styles.noticeTitle}>팀 편성 테이블</Text>
            <Text style={styles.noticeText}>팀 추가를 누르면 하단에 팀 등록 행 UI가 계속 추가됩니다.</Text>
          </View>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.seasonTeamTopAddButton]}
            onPress={addTeamRow}
            disabled={isSaving}
          >
            <Text style={styles.secondaryButtonText}>팀 추가</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.seasonTeamTable}>
          <View style={styles.seasonTeamTableHeaderRow}>
            <Text style={[styles.seasonTeamTableHeaderCell, styles.seasonTeamTeamLabelCell]} />
            <Text style={styles.seasonTeamTableHeaderCell}>선수 1</Text>
            <Text style={styles.seasonTeamTableHeaderCell}>선수 2</Text>
            <Text style={styles.seasonTeamTableHeaderCell}>팀</Text>
            <Text style={[styles.seasonTeamTableHeaderCell, styles.seasonTeamDeleteHeaderCell]}>삭제</Text>
          </View>
          {rows.map((row, index) => (
            <View key={row.id} style={styles.seasonTeamTableBodyRow}>
              <Text style={[styles.seasonTeamTableBodyCell, styles.seasonTeamTeamLabelCell]}>{index + 1}팀</Text>
              <View style={styles.seasonTeamSelectCell}>
                <SelectBox
                  options={memberOptions}
                  value={row.playerOneId}
                  placeholder="선수 선택"
                  onChange={(value) => updateRow(row.id, 'playerOneId', value)}
                  disabled={isSaving}
                />
              </View>
              <View style={styles.seasonTeamSelectCell}>
                <SelectBox
                  options={memberOptions}
                  value={row.playerTwoId}
                  placeholder="선수 선택"
                  onChange={(value) => updateRow(row.id, 'playerTwoId', value)}
                  disabled={isSaving}
                />
              </View>
              <View style={styles.seasonTeamSelectCell}>
                <Input
                  value={row.teamName}
                  onChangeText={(value) => updateRow(row.id, 'teamName', value)}
                  placeholder="팀명 입력"
                  style={styles.seasonTeamTextInput}
                  editable={!isSaving}
                />
              </View>
              <View style={[styles.seasonTeamSelectCell, styles.seasonTeamDeleteCell]}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    styles.seasonTeamDeleteButton,
                    (rows.length <= 2 || isSaving) && styles.buttonDisabled,
                  ]}
                  onPress={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                  disabled={rows.length <= 2 || isSaving}
                >
                  <Text style={styles.secondaryButtonText}>팀 삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        {isLoadingRows && <Text style={styles.muted}>기존 팀 편성 데이터를 불러오는 중입니다...</Text>}
        {isLoadingMembers && <Text style={styles.muted}>회원 목록을 불러오는 중입니다...</Text>}
        {!isLoadingMembers && memberOptions.length === 0 && (
          <Text style={styles.muted}>profiles 회원 데이터가 없어 선수 선택을 진행할 수 없습니다.</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          onPress={() => onSave(season.id, rows)}
          disabled={isSaving || isLoadingRows}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? '저장 중...' : '저장하기'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SeasonResultManagementScreen({
  season,
  schedules,
  isLoading,
  savingByMatchId,
  deletingByMatchId,
  onSaveRow,
  onDeleteRow,
  onShowMessage,
  goBack,
}: {
  season: Season;
  schedules: MatchSchedule[];
  isLoading: boolean;
  savingByMatchId: Record<number, boolean>;
  deletingByMatchId: Record<number, boolean>;
  onSaveRow: (params: {
    matchId: number;
    homeScore: number | null;
    awayScore: number | null;
    currentStatus: MatchStatus;
  }) => Promise<void>;
  onDeleteRow: (matchId: number) => Promise<void>;
  onShowMessage: (title: string, message?: string) => void;
  goBack: () => void;
}) {
  const [draftScoreByMatchId, setDraftScoreByMatchId] = useState<Record<number, { home: string; away: string }>>({});

  useEffect(() => {
    setDraftScoreByMatchId(
      schedules.reduce<Record<number, { home: string; away: string }>>((acc, match) => {
        acc[match.id] = {
          home: match.homeScore === null ? '' : String(match.homeScore),
          away: match.awayScore === null ? '' : String(match.awayScore),
        };
        return acc;
      }, {})
    );
  }, [season.id, schedules]);

  const groupedSchedules = useMemo(() => {
    const sorted = [...schedules].sort((a, b) => a.date.localeCompare(b.date));
    const groups: Array<{ key: string; label: string; items: MatchSchedule[] }> = [];
    const groupMap: Record<string, { key: string; label: string; items: MatchSchedule[] }> = {};

    for (const match of sorted) {
      const dateInput = toKstDateInputFromIso(match.date);
      if (!dateInput) {
        const fallbackKey = 'unknown';
        if (!groupMap[fallbackKey]) {
          groupMap[fallbackKey] = { key: fallbackKey, label: '일정 미정', items: [] };
          groups.push(groupMap[fallbackKey]);
        }
        groupMap[fallbackKey].items.push(match);
        continue;
      }

      const [, monthText, dayText] = dateInput.split('-');
      const year = Number(dateInput.slice(0, 4));
      const month = Number(monthText);
      const day = Number(dayText);
      const monthStartWeekday = new Date(`${year}-${monthText}-01T00:00:00+09:00`).getDay();
      // Calendar-row based week number (reflects month start weekday), not simple 1-7/8-14 chunks.
      const weekOfMonth = Math.floor((monthStartWeekday + day - 1) / 7) + 1;
      const key = `${dateInput.slice(0, 7)}-${weekOfMonth}`;
      const label = `${month}월${weekOfMonth}주차`;

      if (!groupMap[key]) {
        groupMap[key] = { key, label, items: [] };
        groups.push(groupMap[key]);
      }
      groupMap[key].items.push(match);
    }

    return groups;
  }, [schedules]);

  const toMonthDayLabel = (iso: string) => {
    const dateInput = toKstDateInputFromIso(iso);
    if (!dateInput) {
      return '-';
    }
    const [, monthText, dayText] = dateInput.split('-');
    return `${Number(monthText)}월${Number(dayText)}일`;
  };

  const sanitizeScoreText = (value: string) => value.replace(/[^0-9]/g, '').slice(0, 3);

  const parseScoreText = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return NaN;
    }
    return parsed;
  };

  const saveRow = async (match: MatchSchedule) => {
    const draft = draftScoreByMatchId[match.id] ?? {
      home: match.homeScore === null ? '' : String(match.homeScore),
      away: match.awayScore === null ? '' : String(match.awayScore),
    };
    const homeScore = parseScoreText(draft.home);
    const awayScore = parseScoreText(draft.away);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      onShowMessage('입력 확인', '점수는 0 이상의 숫자만 입력할 수 있습니다.');
      setDraftScoreByMatchId((prev) => ({
        ...prev,
        [match.id]: {
          home: match.homeScore === null ? '' : String(match.homeScore),
          away: match.awayScore === null ? '' : String(match.awayScore),
        },
      }));
      return;
    }

    if (homeScore === match.homeScore && awayScore === match.awayScore) {
      return;
    }

    await onSaveRow({
      matchId: match.id,
      homeScore,
      awayScore,
      currentStatus: match.matchStatus,
    });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>{season.name} 경기결과등록</Text>
      <Text style={styles.muted}>경기 점수를 입력하면 자동으로 경기종료 처리됩니다.</Text>

      {isLoading && <Text style={styles.muted}>경기결과 목록을 불러오는 중입니다...</Text>}
      {!isLoading && schedules.length === 0 && <Text style={styles.muted}>등록된 경기가 없습니다.</Text>}

      {!isLoading && groupedSchedules.map((group) => (
        <View key={group.key} style={styles.adminSeasonPanel}>
          <Text style={styles.noticeTitle}>{group.label}</Text>
          {group.items.map((match) => {
            const draft = draftScoreByMatchId[match.id] ?? {
              home: match.homeScore === null ? '' : String(match.homeScore),
              away: match.awayScore === null ? '' : String(match.awayScore),
            };
            const isSaving = Boolean(savingByMatchId[match.id]);
            const matchLabel = formatMatchTitleWithPlayers(
              match.homeTeam,
              match.homePlayers,
              match.awayTeam,
              match.awayPlayers
            );
            const resultStatus = matchStatusLabel[match.matchStatus] ?? '경기전';
            const isResultNotRegistered = match.homeScore === null && match.awayScore === null;
            const isDeleting = Boolean(deletingByMatchId[match.id]);
            return (
              <View key={`season-result-${match.id}`} style={styles.resultManageRow}>
                <View style={styles.resultManageMetaCol}>
                  <Text style={styles.resultManageDate}>{toMonthDayLabel(match.date)}</Text>
                  <Text style={styles.resultManageMatch} numberOfLines={2}>{matchLabel}</Text>
                  <Text style={styles.resultManageStatus}>{resultStatus}</Text>
                </View>
                <View style={styles.resultManageScoreCol}>
                  <TextInput
                    style={[styles.resultManageScoreInput, isSaving && styles.memberChipDisabled]}
                    value={draft.home}
                    onChangeText={(value) => setDraftScoreByMatchId((prev) => ({
                      ...prev,
                      [match.id]: {
                        ...(prev[match.id] ?? draft),
                        home: sanitizeScoreText(value),
                      },
                    }))}
                    onSubmitEditing={() => {
                      void saveRow(match);
                    }}
                    onBlur={() => {
                      void saveRow(match);
                    }}
                    keyboardType="number-pad"
                    editable={!isSaving}
                    placeholder="-"
                    placeholderTextColor={colors.sub}
                  />
                  <Text style={styles.resultManageColon}>:</Text>
                  <TextInput
                    style={[styles.resultManageScoreInput, isSaving && styles.memberChipDisabled]}
                    value={draft.away}
                    onChangeText={(value) => setDraftScoreByMatchId((prev) => ({
                      ...prev,
                      [match.id]: {
                        ...(prev[match.id] ?? draft),
                        away: sanitizeScoreText(value),
                      },
                    }))}
                    onSubmitEditing={() => {
                      void saveRow(match);
                    }}
                    onBlur={() => {
                      void saveRow(match);
                    }}
                    keyboardType="number-pad"
                    editable={!isSaving}
                    placeholder="-"
                    placeholderTextColor={colors.sub}
                  />
                </View>
                {isResultNotRegistered && (
                  <TouchableOpacity
                    style={[styles.seasonEventDeleteButton, (isSaving || isDeleting) && styles.buttonDisabled]}
                    onPress={() => {
                      void onDeleteRow(match.id);
                    }}
                    disabled={isSaving || isDeleting}
                  >
                    <Text style={styles.seasonEventDeleteButtonText}>{isDeleting ? '삭제 중...' : '경기 삭제'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function SelectBox({
  options,
  value,
  placeholder,
  searchPlaceholder = '검색',
  noOptionsText = '선택 가능한 항목이 없습니다.',
  noResultsText = '검색 결과가 없습니다.',
  disabled = false,
  onChange,
}: {
  options: Array<{ value: string; name: string }>;
  value: string | null;
  placeholder: string;
  searchPlaceholder?: string;
  noOptionsText?: string;
  noResultsText?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedLabel = options.find((option) => option.value === value)?.name ?? placeholder;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => {
      const normalizedName = option.name.toLowerCase();
      const normalizedValue = option.value.toLowerCase();
      return normalizedName.includes(normalizedQuery) || normalizedValue.includes(normalizedQuery);
    })
    : options;

  return (
    <View style={styles.selectBoxWrap}>
      <TouchableOpacity
        style={styles.selectBoxTrigger}
        disabled={disabled}
        onPress={() => {
          if (disabled) {
            return;
          }
          setIsOpen((prev) => {
            const next = !prev;
            if (!next) {
              setQuery('');
            }
            return next;
          });
        }}
      >
        <Text style={styles.selectBoxTriggerText}>{selectedLabel}</Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.sub} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.selectBoxMenu}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.sub}
            style={styles.selectBoxSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ScrollView nestedScrollEnabled style={styles.selectBoxMenuScroll}>
            {options.length === 0 && (
              <Text style={styles.selectBoxEmptyText}>{noOptionsText}</Text>
            )}
            {options.length > 0 && filteredOptions.length === 0 && (
              <Text style={styles.selectBoxEmptyText}>{noResultsText}</Text>
            )}
            {filteredOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.selectBoxOption}
                onPress={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                <Text style={styles.selectBoxOptionText}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
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
    paddingHorizontal: 8,
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
    justifyContent: 'flex-end',
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
  featuredMetaButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#294352',
    backgroundColor: '#101924',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredMetaButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  featuredBottomButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2f4762',
    backgroundColor: '#14283b',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  featuredBottomButtonText: {
    color: '#edf3ff',
    fontWeight: '800',
    fontSize: 12,
  },
  playerDuelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  playerDuelRowCompact: {
    marginTop: 0,
    marginBottom: 12,
    gap: 6,
  },
  playerDuelSide: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  playerDuelSideCompact: {
    gap: 6,
  },
  playerDuelSideAway: {
    justifyContent: 'flex-end',
  },
  playerDuelVs: {
    color: colors.neon,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  playerDuelVsCompact: {
    fontSize: 14,
  },
  playerCard: {
    width: 74,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a4872e',
    backgroundColor: '#2a2212',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 6,
    shadowColor: '#d8b94b',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  playerCardCompact: {
    width: 52,
    borderRadius: 11,
    paddingHorizontal: 3,
    paddingTop: 3,
    paddingBottom: 4,
  },
  playerCardImageWrap: {
    width: '100%',
    aspectRatio: 0.76,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8d27e',
    backgroundColor: '#111827',
    marginBottom: 4,
  },
  playerCardImageWrapCompact: {
    borderRadius: 8,
    marginBottom: 3,
  },
  playerCardAvatarImage: {
    width: '100%',
    height: '100%',
  },
  playerCardAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1f2b',
  },
  playerCardAvatarFallbackText: {
    color: '#f8f1d3',
    fontSize: 21,
    fontWeight: '900',
  },
  playerCardAvatarFallbackTextCompact: {
    fontSize: 14,
  },
  playerCardName: {
    color: '#f4edcf',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  playerCardNameCompact: {
    fontSize: 8,
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
  weeklyStatusCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#25445a',
    backgroundColor: '#0e1727',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 24,
    shadowColor: '#1ed5c3',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  weeklyStatusGlowTop: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(36, 230, 192, 0.12)',
  },
  weeklyStatusGlowBottom: {
    position: 'absolute',
    bottom: -55,
    left: -35,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(57, 255, 20, 0.08)',
  },
  weeklyStatusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2f4762',
    paddingBottom: 10,
    marginBottom: 6,
    gap: 8,
  },
  weeklyStatusWeekLabel: {
    width: 76,
    color: colors.neon,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  weeklyStatusMatchHeader: {
    flex: 1,
    color: '#b4c7df',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  weeklyStatusResultHeader: {
    width: 62,
    color: '#b4c7df',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    letterSpacing: 0.2,
  },
  weeklyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#253952',
  },
  weeklyStatusDateBadge: {
    width: 76,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#355a77',
    backgroundColor: '#14283b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  weeklyStatusDate: {
    color: '#dbe7f5',
    fontSize: 12,
    fontWeight: '700',
  },
  weeklyStatusMatchText: {
    flex: 1,
    color: '#edf3ff',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  weeklyStatusResultBadge: {
    width: 62,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  weeklyStatusResultBadgePlayed: {
    borderColor: '#2e6f28',
    backgroundColor: '#17351b',
  },
  weeklyStatusResultBadgeUpcoming: {
    borderColor: '#355a77',
    backgroundColor: '#14283b',
  },
  weeklyStatusResultValue: {
    color: '#f4fbff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  weeklyStatusEmptyText: {
    color: '#9fb2cc',
    fontSize: 13,
    paddingVertical: 14,
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
  pushCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#24441f',
    padding: 18,
    gap: 14,
    marginBottom: 12,
  },
  pushCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  pushCardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  pushCardSubtitle: {
    color: colors.sub,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 220,
  },
  pushStatusBadge: {
    borderRadius: 999,
    backgroundColor: '#2f2611',
    borderWidth: 1,
    borderColor: '#7d6521',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pushStatusBadgeSuccess: {
    backgroundColor: '#17351b',
    borderColor: '#2e6f28',
  },
  pushStatusBadgeError: {
    backgroundColor: '#2a1620',
    borderColor: '#6f2845',
  },
  pushStatusBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  pushInfoGrid: {
    gap: 10,
  },
  pushInfoItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f3a22',
    padding: 14,
    gap: 6,
  },
  pushInfoLabel: {
    color: colors.sub,
    fontSize: 11,
    fontWeight: '700',
  },
  pushInfoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  pushLatestNotification: {
    backgroundColor: '#101924',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#294352',
    padding: 14,
    gap: 6,
  },
  pushLatestNotificationTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  pushLatestNotificationBody: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  pushActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pushActionButton: {
    flexGrow: 1,
    minWidth: 170,
    backgroundColor: colors.neon,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pushActionButtonText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '900',
  },
  pushSecondaryButton: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: '#101924',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#294352',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pushSecondaryButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  bottomTabBar: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17, 24, 39, 0.96)',
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#24441f',
  },
  bottomTabBarMobile: {
    left: 4,
    right: 4,
    paddingHorizontal: 6,
    borderRadius: 22,
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
  adminInlineDangerButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
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
  memberList: {
    gap: 12,
    marginTop: 4,
  },
  memberCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f3a22',
    padding: 14,
    gap: 12,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  memberCardHeaderLeft: {
    flex: 1,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2b4d2a',
    backgroundColor: colors.surface,
  },
  memberAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarFallbackText: {
    color: colors.neonSoft,
    fontSize: 16,
    fontWeight: '900',
  },
  memberBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  memberBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  memberRoleBadge: {
    backgroundColor: '#101924',
    borderColor: '#294352',
  },
  memberBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  memberDeleteButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#6f2845',
    backgroundColor: '#2a1620',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  memberDeleteButtonText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '800',
  },
  memberControlBlock: {
    gap: 8,
  },
  memberControlLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  memberChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#24441f',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  memberChipSelected: {
    backgroundColor: '#17351b',
    borderColor: '#2e6f28',
  },
  memberChipDisabled: {
    opacity: 0.55,
  },
  memberChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  memberChipTextSelected: {
    color: colors.neon,
  },
  matchEntriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  seasonTeamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  seasonTeamTopAddButton: {
    marginBottom: 0,
    minWidth: 110,
    paddingHorizontal: 12,
  },
  seasonTeamTable: {
    borderWidth: 1,
    borderColor: '#24441f',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  seasonTeamTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0f1e13',
    borderBottomWidth: 1,
    borderBottomColor: '#24441f',
  },
  seasonTeamTableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#203426',
  },
  seasonTeamTableHeaderCell: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 10,
    textAlign: 'center',
  },
  seasonTeamTableBodyCell: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 10,
    textAlign: 'center',
  },
  seasonTeamTeamLabelCell: {
    maxWidth: 58,
    minWidth: 58,
    textAlign: 'center',
  },
  seasonTeamDeleteHeaderCell: {
    maxWidth: 74,
    minWidth: 74,
  },
  seasonTeamSelectCell: {
    flex: 1,
    margin: 6,
  },
  seasonTeamDeleteCell: {
    maxWidth: 74,
    minWidth: 74,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  seasonTeamDeleteButton: {
    minHeight: 36,
    paddingVertical: 8,
    marginBottom: 0,
  },
  seasonTeamTextInput: {
    marginBottom: 0,
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  selectBoxWrap: {
    position: 'relative',
    zIndex: 3,
  },
  selectBoxTrigger: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a4630',
    backgroundColor: colors.input,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectBoxTriggerText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  selectBoxMenu: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a4630',
    backgroundColor: colors.surface,
    maxHeight: 160,
  },
  selectBoxMenuScroll: {
    maxHeight: 160,
  },
  selectBoxSearchInput: {
    minHeight: 34,
    borderBottomWidth: 1,
    borderBottomColor: '#1f3a22',
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: colors.input,
  },
  selectBoxOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f3a22',
  },
  selectBoxOptionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  selectBoxEmptyText: {
    color: colors.sub,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  matchAddButton: {
    marginBottom: 0,
    minWidth: 130,
    paddingHorizontal: 12,
  },
  matchEntryCard: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: '#1f3a22',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  matchEntryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  matchEntryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  matchEntryVsRow: {
    gap: 10,
  },
  matchEntryVsRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  matchEntryVsCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
  },
  matchEntryVsText: {
    color: colors.neon,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  matchEntrySide: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24441f',
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  matchEntrySideHome: {
    borderColor: '#295a2e',
  },
  matchEntrySideAway: {
    borderColor: '#2a4e5f',
  },
  matchEntrySideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchEntrySideTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  matchEntrySideMeta: {
    color: colors.sub,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  matchEntryBlockTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  matchSelectorList: {
    gap: 8,
  },
  matchSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#24441f',
    backgroundColor: colors.input,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  matchSelectorSelectedHome: {
    borderColor: '#2e6f28',
    backgroundColor: '#17351b',
  },
  matchSelectorSelectedAway: {
    borderColor: '#2b6a80',
    backgroundColor: '#102733',
  },
  matchSelectorText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  matchSelectorTextSelected: {
    color: colors.neon,
    fontWeight: '800',
  },
  matchSelectionHint: {
    color: colors.sub,
    fontSize: 11,
    fontWeight: '700',
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
  leaguePage: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 0,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  leagueBackLink: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  leagueTopTabBar: {
    borderRadius: 12,
    backgroundColor: '#112743',
    borderWidth: 1,
    borderColor: '#1e4f86',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  leagueTopTabText: {
    color: '#8fc6ff',
    fontSize: 13,
    fontWeight: '800',
  },
  leagueSeasonNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  leagueSeasonArrowButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#2d3b52',
  },
  leagueSeasonArrowButtonDisabled: {
    opacity: 0.45,
  },
  leagueSeasonTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.4,
    minWidth: 180,
    textAlign: 'center',
  },
  leagueSubTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  leagueSubTabItem: {
    flex: 1,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingVertical: 12,
  },
  leagueSubTabItemActive: {
    borderBottomColor: colors.accent,
  },
  leagueSubTabText: {
    color: colors.sub,
    fontSize: 14,
    fontWeight: '700',
  },
  leagueSubTabTextActive: {
    color: colors.accent,
    fontWeight: '800',
  },
  leaguePanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#24364f',
    backgroundColor: '#0e1727',
    paddingVertical: 12,
    paddingHorizontal: 0,
    gap: 8,
  },
  leaguePanelHeader: {
    gap: 4,
  },
  leaguePanelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  leaguePanelHint: {
    color: colors.sub,
    fontSize: 12,
  },
  leagueLoadingText: {
    color: colors.sub,
    fontSize: 12,
    marginTop: 6,
  },
  leagueMobileList: {
    gap: 10,
  },
  leagueMobileCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a3d59',
    backgroundColor: '#111d2f',
    paddingHorizontal: 6,
    paddingVertical: 10,
    gap: 8,
  },
  leagueMobileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leagueMobileRankWrap: {
    width: 28,
    alignItems: 'center',
  },
  leagueMobileRank: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  leagueMobileTeamWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leagueMobileTeamName: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  leagueMobilePointWrap: {
    alignItems: 'flex-end',
    minWidth: 52,
  },
  leagueMobilePointLabel: {
    color: colors.sub,
    fontSize: 11,
    fontWeight: '700',
  },
  leagueMobilePointValue: {
    color: '#7bb9ff',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },
  leagueMobileStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  leagueMobileStatItem: {
    width: '22%',
    minWidth: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b3b53',
    backgroundColor: '#16253a',
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
  },
  leagueMobileStatLabel: {
    color: colors.sub,
    fontSize: 10,
    fontWeight: '700',
  },
  leagueMobileStatValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  leagueMobileRecentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2b3b53',
    paddingTop: 10,
  },
  leagueMobileRecentLabel: {
    color: colors.sub,
    fontSize: 12,
    fontWeight: '700',
  },
  leagueTableWrap: {
    minWidth: 960,
  },
  leagueTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#123556',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  leagueTableHeaderText: {
    flex: 1,
    color: '#cce7ff',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  leagueTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111d2f',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#263750',
  },
  leagueTableCell: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  leagueTableTeamCell: {
    flex: 2,
  },
  leagueTeamCellWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  leagueTeamBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c2f48',
    borderWidth: 1,
    borderColor: '#436c9a',
  },
  leagueTeamBadgeText: {
    color: '#a8d2ff',
    fontSize: 11,
    fontWeight: '800',
  },
  leagueTeamNameText: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  leagueTeamProfileAvatarWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a5475',
    backgroundColor: '#18283e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  leagueTeamProfileAvatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  leagueTeamProfileAvatarOverlap: {
    marginLeft: -6,
  },
  leagueTeamProfileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  leagueTeamProfileAvatarFallback: {
    backgroundColor: '#1a2a3f',
  },
  leaguePointsCell: {
    color: '#7bb9ff',
    fontWeight: '800',
  },
  leagueTableRecentCell: {
    flex: 1.8,
  },
  leagueRecentCellWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  leagueRecentBadge: {
    minWidth: 28,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 7,
    alignItems: 'center',
    borderWidth: 1,
  },
  leagueRecentBadgeWin: {
    backgroundColor: '#183c25',
    borderColor: '#3aa65a',
  },
  leagueRecentBadgeDraw: {
    backgroundColor: '#2a3442',
    borderColor: '#6b7f97',
  },
  leagueRecentBadgeLoss: {
    backgroundColor: '#412020',
    borderColor: '#d16262',
  },
  leagueRecentBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
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
  resultManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: '#24441f',
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultManageMetaCol: {
    flex: 1,
    gap: 4,
  },
  resultManageDate: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  resultManageMatch: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  resultManageStatus: {
    color: colors.sub,
    fontSize: 12,
    fontWeight: '700',
  },
  resultManageScoreCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultManageScoreInput: {
    width: 54,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a4630',
    backgroundColor: colors.input,
    color: colors.text,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  resultManageColon: {
    color: colors.neon,
    fontSize: 20,
    fontWeight: '900',
  },
  matchTeam: {
    color: colors.text,
    fontWeight: '800',
  },
  calendarMonthHeader: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarMonthLabel: {
    color: colors.neon,
    fontSize: 18,
    fontWeight: '800',
  },
  calendarFilterRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarSyncRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarSyncYearInput: {
    flex: 1,
    minWidth: 120,
  },
  calendarSyncButton: {
    marginTop: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  calendarWeekHeader: {
    marginTop: 14,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 6,
  },
  calendarWeekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: colors.sub,
    fontSize: 12,
    fontWeight: '800',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  calendarCell: {
    width: '14.285%',
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 4,
    paddingTop: 5,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  matchDateInputButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchDateInputValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  matchDateInputPlaceholder: {
    color: colors.sub,
    fontSize: 15,
    fontWeight: '700',
  },
  matchDateCalendarPanel: {
    marginBottom: 8,
  },
  matchDateCalendarCell: {
    minHeight: 44,
    justifyContent: 'center',
  },
  calendarCellSelected: {
    backgroundColor: '#193424',
    borderColor: colors.neon,
  },
  calendarCellDisabled: {
    opacity: 0.35,
  },
  calendarDayText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: colors.neon,
    fontWeight: '900',
  },
  calendarDotRow: {
    marginTop: 5,
    flexDirection: 'row',
    gap: 3,
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarEventCount: {
    marginTop: 4,
    color: colors.sub,
    fontSize: 10,
    fontWeight: '700',
  },
  calendarEventItem: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  calendarEventTypeMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  seasonEventDeleteButton: {
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: '#2a1111',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'center',
  },
  seasonEventDeleteButtonText: {
    color: '#fda4af',
    fontSize: 12,
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
  modalActionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  modalButtonPrimary: {
    backgroundColor: colors.neon,
  },
  modalButtonHalf: {
    flex: 1,
    width: 'auto',
  },
  modalButtonSecondary: {
    backgroundColor: '#1f2230',
    borderWidth: 1,
    borderColor: '#35522e',
  },
  modalButtonText: {
    color: colors.bg,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.4,
  },
  modalButtonSecondaryText: {
    color: colors.sub,
  },
});
