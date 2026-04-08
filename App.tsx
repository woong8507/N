import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { registerForPush } from './src/lib/push';
import * as DocumentPicker from 'expo-document-picker';

// Simple neon brand palette
const colors = {
  bg: '#0b0f16',
  card: '#111827',
  neon: '#39ff14',
  input: '#0f172a',
  text: '#e2e8f0',
  sub: '#94a3b8',
  border: '#1f2937',
};

type Screen = 'auth' | 'signup' | 'home' | 'schedule' | 'teams' | 'notice' | 'mySchedule' | 'league';

type MatchSchedule = {
  id: number;
  date: string; // e.g., '2026-03-03'
  weekday: string; // '화'
  place: '3F' | '4F';
  homeTeam: string;
  awayTeam: string;
  homePlayers: string;
  awayPlayers: string;
  homeScore?: number;
  awayScore?: number;
  homeRating?: string; // ☆4.5
  awayRating?: string; // ☆5.0
};

type Team = {
  id: number;
  name: string; // e.g., "맨체스터 유나이티드"
  members: string[]; // two names
};

type LeagueRow = {
  rank: number;
  players: string;
  team: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gf: number;
  ga: number;
  gd: number;
  played: string; // e.g., "6/7"
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [autoLogin, setAutoLogin] = useState(true);

  // signup
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    name: '',
    gender: 'MALE',
  });
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // mock data for UI
  const schedules: MatchSchedule[] = useMemo(
    () => [
      {
        id: 1,
        date: '2026-03-03',
        weekday: '화',
        place: '3F',
        homeTeam: 'Galatasaray',
        awayTeam: 'Spain',
        homePlayers: '김태성 (Solo)',
        awayPlayers: '안기철 조영현',
        homeRating: '☆4.5',
        awayRating: '☆5.0',
        homeScore: 4,
        awayScore: 4,
      },
      {
        id: 2,
        date: '2026-03-04',
        weekday: '수',
        place: '3F',
        homeTeam: '☆4',
        awayTeam: 'FC Barcelona',
        homePlayers: '김종우 최웅비',
        awayPlayers: '공덕준 안도에',
        homeRating: '☆4.0',
        awayRating: '☆5.0',
        homeScore: 2,
        awayScore: 3,
      },
      {
        id: 3,
        date: '2026-03-05',
        weekday: '목',
        place: '3F',
        homeTeam: 'Fenerbahçe',
        awayTeam: 'Galatasaray',
        homePlayers: '김현섭 김대현',
        awayPlayers: '김태성 (Solo)',
        homeRating: '☆4.0',
        awayRating: '☆4.5',
        homeScore: 3,
        awayScore: 5,
      },
      {
        id: 4,
        date: '2026-03-06',
        weekday: '금',
        place: '3F',
        homeTeam: '☆4',
        awayTeam: 'FC Barcelona',
        homePlayers: '김종우 최웅비',
        awayPlayers: '공덕준 안도에',
        homeRating: '☆4.0',
        awayRating: '☆5.0',
        homeScore: 2,
        awayScore: 5,
      },
    ],
    []
  );

  const mySchedules = schedules.filter((s) => s.homePlayers.includes('정길웅') || s.awayPlayers.includes('정길웅'));

  const teams: Team[] = [
    { id: 1, name: '맨체스터 유나이티드', members: ['정길웅', '정길순'] },
    { id: 2, name: '토트넘 홋스퍼', members: ['손흥민', '케인'] },
  ];

  const leagueTable: LeagueRow[] = [
    { rank: 1, players: '공덕준 / 안도에', team: 'FC Barcelona', wins: 4, draws: 1, losses: 1, points: 13, gf: 18, ga: 12, gd: 6, played: '6/7' },
    { rank: 2, players: '김현섭 / 김대현', team: 'Fenerbahçe', wins: 4, draws: 0, losses: 2, points: 12, gf: 22, ga: 16, gd: 6, played: '6/7' },
    { rank: 3, players: '윤용기 / 이정훈', team: 'Liverpool', wins: 4, draws: 0, losses: 1, points: 12, gf: 17, ga: 11, gd: 6, played: '5/7' },
    { rank: 4, players: '안기철 / 조영현', team: 'Bayern München', wins: 3, draws: 2, losses: 2, points: 11, gf: 22, ga: 18, gd: 4, played: '7/7' },
    { rank: 5, players: '김태성 / 정성현', team: 'Galatasaray', wins: 3, draws: 1, losses: 2, points: 10, gf: 15, ga: 13, gd: 2, played: '5/7' },
    { rank: 6, players: '한승규 / 이진욱', team: 'Arsenal', wins: 2, draws: 0, losses: 4, points: 6, gf: 10, ga: 15, gd: -5, played: '6/7' },
    { rank: 7, players: '정길웅 / 김형래', team: 'Manchester City', wins: 1, draws: 0, losses: 5, points: 3, gf: 7, ga: 19, gd: -12, played: '6/7' },
    { rank: 8, players: '김종우 / 최웅비', team: 'PSG', wins: 0, draws: 0, losses: 5, points: 0, gf: 11, ga: 18, gd: -7, played: '5/7' },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_, authSession) => {
      setSession(authSession);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    registerForPush();
  }, [session]);

  const showMessage = (title: string, message?: string) => {
    setDialog({ visible: true, title, message });
  };

  const formatAuthError = (message: string) => {
    if (message.includes('Email address') && message.includes('is invalid')) {
      return '올바른 이메일 주소를 입력하세요. 예시 도메인(example.com) 대신 실제 이메일을 사용해야 합니다.';
    }
    if (message.toLowerCase().includes('email rate limit exceeded')) {
      return '이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도하거나 다른 이메일 주소를 사용하세요.';
    }
    if (message.includes('User already registered')) {
      return '이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용하세요.';
    }
    if (message.toLowerCase().includes('password')) {
      return '비밀번호 조건을 다시 확인하세요.';
    }
    return message;
  };

  const login = async () => {
    if (!email || !password) return showMessage('로그인 정보를 입력하세요');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return showMessage('로그인 실패', formatAuthError(error.message));
    setScreen('home');
  };

  const signup = async () => {
    const { email, password, name, gender } = signupForm;
    const missingFields: string[] = [];
    if (!name.trim()) missingFields.push('이름');
    if (!gender) missingFields.push('성별');
    if (!email.trim()) missingFields.push('이메일');
    if (!password.trim()) missingFields.push('비밀번호');

    if (missingFields.length > 0) {
      return showMessage('입력 필요', `${missingFields.join(', ')} 항목을 입력하세요.`);
    }

    const emailValue = email.trim();
    const passwordValue = password.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailValue) || emailValue.endsWith('@example.com')) {
      return showMessage('이메일 확인', '실제로 받을 수 있는 올바른 이메일 주소를 입력하세요.');
    }

    if (passwordValue.length < 6) {
      return showMessage('비밀번호 확인', '비밀번호는 6자 이상 입력하세요.');
    }

    const { error } = await supabase.auth.signUp({
      email: emailValue,
      password: passwordValue,
      options: { data: { name, gender } },
    });
    if (error) return showMessage('회원가입 실패', formatAuthError(error.message));
    showMessage('가입 완료', '이메일 인증 후 로그인하세요');
    setScreen('auth');
  };

  const pickNoticeFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({});
    if (res.canceled) return;
    showMessage('업로드 준비됨', res.assets[0].name);
    // TODO: upload to Supabase storage bucket and store URL
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
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
              goSignup={() => setScreen('signup')}
              autoLogin={autoLogin}
              setAutoLogin={setAutoLogin}
            />
          )}

          {screen === 'signup' && (
            <SignupScreen
              form={signupForm}
              setForm={setSignupForm}
              onSignup={signup}
              goBack={() => setScreen('auth')}
            />
          )}

          {session && screen === 'home' && (
            <HomeScreen
              goSchedule={() => setScreen('schedule')}
              goLeague={() => setScreen('league')}
              goTeams={() => setScreen('teams')}
              goMySchedule={() => setScreen('mySchedule')}
              goNotice={() => setScreen('notice')}
              onSignOut={async () => {
                await supabase.auth.signOut();
                setScreen('auth');
              }}
            />
          )}

          {session && screen === 'schedule' && (
            <ScheduleScreen data={schedules} goBack={() => setScreen('home')} />
          )}

          {session && screen === 'league' && (
            <LeagueScreen data={leagueTable} goBack={() => setScreen('home')} />
          )}

          {session && screen === 'mySchedule' && (
            <ScheduleScreen data={mySchedules} goBack={() => setScreen('home')} title="나의 경기 일정" />
          )}

          {session && screen === 'teams' && (
            <TeamsScreen teams={teams} goBack={() => setScreen('home')} />
          )}

          {session && screen === 'notice' && (
            <NoticeScreen pickFile={pickNoticeFile} goBack={() => setScreen('home')} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  goSignup,
  autoLogin,
  setAutoLogin,
}: any) {
  return (
    <View style={styles.authShell}>
      <View style={styles.authHero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.authTitle}>N-CLASICO</Text>
        <Text style={styles.authSubtitle}>FOOTBALL GAME CLUB</Text>
      </View>

      <Label text="EMAIL" required={false} />
      <Input value={email} onChangeText={onChangeEmail} placeholder="Enter your email" />
      <Label text="PASSWORD" required={false} />
      <Input
        value={password}
        onChangeText={onChangePassword}
        placeholder="Enter your password"
        secureTextEntry
      />
      <TouchableOpacity style={styles.primaryButton} onPress={onLogin}>
        <Text style={styles.primaryButtonText}>START MATCH</Text>
      </TouchableOpacity>

      <View style={styles.authFooterRow}>
        <Text style={styles.footerHint}>New Player?</Text>
        <TouchableOpacity onPress={goSignup}>
          <Text style={styles.footerLink}>Sign Up Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SignupScreen({ form, setForm, onSignup, goBack }: any) {
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
      />

      <Label text="PASSWORD" />
      <Input
        value={form.password}
        onChangeText={(v) => setForm({ ...form, password: v })}
        placeholder="Min 6 characters"
        secureTextEntry
      />

      <TouchableOpacity style={styles.primaryButton} onPress={onSignup}>
        <Text style={styles.primaryButtonText}>JOIN N-CLASICO</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({ goSchedule, goLeague, goTeams, goMySchedule, goNotice, onSignOut }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.logoTitle}>N-CLASICO</Text>
      <Text style={[styles.logoSubtitle, { marginBottom: 16 }]}>Member Hub</Text>
      {[
        ['경기 스케줄 관리', goSchedule],
        ['리그 테이블', goLeague],
        ['나의 경기 일정', goMySchedule],
        ['팀 관리', goTeams],
        ['공지사항', goNotice],
      ].map(([label, fn]) => (
        <TouchableOpacity key={label} style={styles.secondaryButton} onPress={fn as any}>
          <Text style={styles.secondaryButtonText}>{label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={onSignOut} style={[styles.secondaryButton, { marginTop: 8 }]}>
        <Text style={[styles.secondaryButtonText, { color: colors.sub }]}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

function ScheduleScreen({ data, goBack, title = '경기 일정 & 결과' }: any) {
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
      {data.map((m) => (
        <View key={m.id} style={styles.matchRow}>
          <Text style={styles.matchCell}>{m.date.slice(5)}</Text>
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

function TeamsScreen({ teams, goBack }: any) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>팀 관리</Text>
      {teams.map((t) => (
        <View key={t.id} style={[styles.listCard, { marginTop: 10 }]}>
          <Text style={styles.body}>{t.name}</Text>
          <Text style={styles.muted}>{t.members.join(' / ')}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>팀 추가 / 수정</Text>
      </TouchableOpacity>
    </View>
  );
}

function NoticeScreen({ pickFile, goBack }: any) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>공지사항</Text>
      <Text style={styles.muted}>파일 업로드로 공지 올리기</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={pickFile}>
        <Text style={styles.primaryButtonText}>파일 선택</Text>
      </TouchableOpacity>
    </View>
  );
}

function LeagueScreen({ data, goBack }: { data: LeagueRow[]; goBack: () => void }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.link}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.logoTitle}>2026 N클라시코 상반기 리그</Text>
      <View style={styles.tableHeader}>
        {['Rank', 'Players', 'Team', '승', '무', '패', '승점', '득점', '실점', '골득실', '경기수'].map((h) => (
          <Text key={h} style={styles.tableHeaderText}>{h}</Text>
        ))}
      </View>
      {data.map((row) => (
        <View key={row.rank} style={styles.tableRow}>
          <Text style={styles.tableCell}>{row.rank}</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>{row.players}</Text>
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

function Input(props: any) {
  return <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor={colors.sub} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  primaryButtonText: {
    color: colors.bg,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.6,
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
