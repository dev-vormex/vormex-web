import apiClient from './client';

// ============================================
// Types
// ============================================

export type GameDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type QuestionCategory = 'PROGRAMMING' | 'WEB_DEVELOPMENT' | 'DATA_STRUCTURES' | 'ALGORITHMS' | 'DATABASES' | 'DEVOPS' | 'SYSTEM_DESIGN' | 'GENERAL_TECH' | 'STARTUP' | 'CAREER';

export interface GameStats {
  id: string;
  userId: string;
  totalGamesPlayed: number;
  totalXpEarned: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: string | null;
  triviaGamesPlayed: number;
  triviaCorrectAnswers: number;
  triviaTotalQuestions: number;
  triviaHighScore: number;
  codingProblemsAttempted: number;
  codingProblemsSolved: number;
  codingTotalSubmissions: number;
  wordleGamesPlayed: number;
  wordleGamesWon: number;
  wordleCurrentStreak: number;
  wordleBestStreak: number;
  wordleAverageAttempts: number;
  quizBattlesPlayed: number;
  quizBattlesWon: number;
  quizBattleWinRate: number;
  typingRacesCompleted: number;
  typingBestWpm: number;
  typingAverageWpm: number;
  typingBestAccuracy: number;
  currentXpBalance: number;
}

export interface XPTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  source: string;
  sourceId?: string;
  description?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    name: string;
    username: string;
    profileImage: string | null;
  };
  xp: number;
  gamesPlayed: number;
  streak: number;
}

// Trivia Types
export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  category: QuestionCategory;
  difficulty: GameDifficulty;
  xpReward: number;
  timeLimit: number;
  imageUrl?: string;
  isAnswered?: boolean;
}

export interface TriviaSession {
  id: string;
  date: string;
  correctCount: number;
  totalQuestions: number;
  totalXpEarned: number;
  completedAt?: string;
}

// Coding Types
export interface CodingProblem {
  id: string;
  title: string;
  description: string;
  difficulty: GameDifficulty;
  category: QuestionCategory;
  starterCode: { [language: string]: string };
  testCases: { input: string; expectedOutput: string; isHidden?: boolean }[];
  hints?: string[];
  xpReward: number;
  timeLimit: number;
  timesAttempted: number;
  timesSolved: number;
  isSolved?: boolean;
  successRate?: number;
}

export interface CodingSubmission {
  id: string;
  code: string;
  language: string;
  status: string;
  testResults?: { testCase: number; passed: boolean; input: string; expectedOutput?: string }[];
  passedTests: number;
  totalTests: number;
  runtime?: number;
  memory?: number;
  xpEarned: number;
  submittedAt: string;
}

// Wordle Types
export interface WordleGame {
  id: string;
  status: 'playing' | 'won' | 'lost';
  guesses: { guess: string; result: { letter: string; status: 'correct' | 'present' | 'absent' }[] }[];
  attempts: number;
  maxAttempts: number;
  xpEarned: number;
  startedAt: string;
  completedAt?: string;
  word?: string;
}

// Quiz Battle Types
export interface QuizBattle {
  id: string;
  player1: { id: string; name: string; username: string; profileImage: string | null };
  player2?: { id: string; name: string; username: string; profileImage: string | null };
  category?: QuestionCategory;
  difficulty?: GameDifficulty;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  player1Score: number;
  player2Score: number;
  winnerId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// Typing Race Types
export interface TypingText {
  id: string;
  content: string;
  title?: string;
  category: string;
  difficulty: GameDifficulty;
  wordCount: number;
  charCount: number;
  xpReward: number;
}

export interface TypingRace {
  id: string;
  textId: string;
  wpm: number;
  accuracy: number;
  rawWpm: number;
  timeSpent: number;
  mistakes: number;
  charsTyped: number;
  status: 'playing' | 'completed' | 'abandoned';
  xpEarned: number;
  startedAt: string;
  completedAt?: string;
  text?: { title?: string; category: string; difficulty: GameDifficulty };
}

// ============================================
// API Functions - Stats & Leaderboards
// ============================================

export const getMyGameStats = async (): Promise<{ stats: GameStats }> => {
  return apiClient.get('/games/stats');
};

export const getXPHistory = async (limit = 20, cursor?: string): Promise<{
  transactions: XPTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}> => {
  return apiClient.get('/games/xp-history', { params: { limit, cursor } });
};

export const getLeaderboard = async (gameType?: string, period = 'alltime', limit = 20): Promise<{
  leaderboard: LeaderboardEntry[];
}> => {
  return apiClient.get('/games/leaderboard', { params: { gameType, period, limit } });
};

// ============================================
// API Functions - Daily Trivia
// ============================================

export const getDailyTrivia = async (): Promise<{
  status: 'in_progress' | 'completed';
  session: TriviaSession;
  questions?: TriviaQuestion[];
  progress?: { answered: number; total: number; correct: number };
  message?: string;
}> => {
  return apiClient.get('/games/trivia/daily');
};

export const answerTriviaQuestion = async (
  questionId: string,
  selectedIndex: number,
  timeSpent: number
): Promise<{
  isCorrect: boolean;
  correctIndex: number;
  explanation?: string;
  xpEarned: number;
}> => {
  return apiClient.post('/games/trivia/answer', { questionId, selectedIndex, timeSpent });
};

export const getTriviaQuestions = async (category?: string, difficulty?: string, limit = 10): Promise<{
  questions: TriviaQuestion[];
}> => {
  return apiClient.get('/games/trivia/questions', { params: { category, difficulty, limit } });
};

// ============================================
// API Functions - Coding Challenges
// ============================================

export const getCodingProblems = async (category?: string, difficulty?: string, limit = 20): Promise<{
  problems: CodingProblem[];
}> => {
  return apiClient.get('/games/coding/problems', { params: { category, difficulty, limit } });
};

export const getCodingProblem = async (problemId: string): Promise<{
  problem: CodingProblem;
  submissions: CodingSubmission[];
}> => {
  return apiClient.get(`/games/coding/problems/${problemId}`);
};

export const submitCodingSolution = async (
  problemId: string,
  code: string,
  language: string
): Promise<{
  submission: CodingSubmission;
  testResults: { testCase: number; passed: boolean; input: string; expectedOutput?: string }[];
  xpEarned: number;
}> => {
  return apiClient.post(`/games/coding/problems/${problemId}/submit`, { code, language });
};

// ============================================
// API Functions - Tech Wordle
// ============================================

export const getDailyWordle = async (): Promise<{
  game: WordleGame;
  hint?: string;
  wordLength: number;
}> => {
  return apiClient.get('/games/wordle/daily');
};

export const guessWordle = async (gameId: string, guess: string): Promise<{
  result: { letter: string; status: 'correct' | 'present' | 'absent' }[];
  status: 'playing' | 'won' | 'lost';
  xpEarned: number;
  word?: string;
}> => {
  return apiClient.post('/games/wordle/guess', { gameId, guess });
};

// ============================================
// API Functions - Quiz Battle
// ============================================

export const createQuizBattle = async (category?: string, difficulty?: string): Promise<{
  battle: { id: string; status: string; category?: string; difficulty?: string };
  message: string;
}> => {
  return apiClient.post('/games/battle/create', { category, difficulty });
};

export const getAvailableBattles = async (): Promise<{ battles: QuizBattle[] }> => {
  return apiClient.get('/games/battle/available');
};

export const joinQuizBattle = async (battleId: string): Promise<{ message: string; battleId: string }> => {
  return apiClient.post(`/games/battle/${battleId}/join`);
};

export const getQuizBattle = async (battleId: string): Promise<{
  battle: QuizBattle;
  questions: TriviaQuestion[];
  isPlayer1: boolean;
  isPlayer2: boolean;
}> => {
  return apiClient.get(`/games/battle/${battleId}`);
};

export const answerQuizBattle = async (
  battleId: string,
  questionId: string,
  selectedIndex: number,
  timeSpent: number
): Promise<{
  isCorrect: boolean;
  correctIndex: number;
}> => {
  return apiClient.post(`/games/battle/${battleId}/answer`, { questionId, selectedIndex, timeSpent });
};

// ============================================
// API Functions - Typing Race
// ============================================

export const getTypingTexts = async (category?: string, difficulty?: string, limit = 10): Promise<{
  texts: TypingText[];
}> => {
  return apiClient.get('/games/typing/texts', { params: { category, difficulty, limit } });
};

export const startTypingRace = async (textId: string): Promise<{
  race: TypingRace;
  text: TypingText;
}> => {
  return apiClient.post('/games/typing/start', { textId });
};

export const finishTypingRace = async (
  raceId: string,
  data: {
    wpm: number;
    accuracy: number;
    rawWpm: number;
    timeSpent: number;
    mistakes: number;
    charsTyped: number;
  }
): Promise<{
  wpm: number;
  accuracy: number;
  xpEarned: number;
  isPersonalBest: boolean;
}> => {
  return apiClient.post(`/games/typing/${raceId}/finish`, data);
};

export const getTypingHistory = async (limit = 20): Promise<{ races: TypingRace[] }> => {
  return apiClient.get('/games/typing/history', { params: { limit } });
};

// ============================================
// Social Arcade Types
// ============================================

export type ArcadeGameType = 'memory_match' | 'snake_duel' | 'paddle_volley' | 'maze_race_3d';
export type ArcadeRoomStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type ArcadeRole = 'host' | 'guest' | null;

export interface ArcadePlayer {
  id: string;
  name: string;
  username: string;
  profileImage: string | null;
  headline?: string | null;
  college?: string | null;
}

export interface ArcadeCatalogGame {
  type: ArcadeGameType;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  xpLabel: string;
  mode: 'turn_based' | 'arcade' | '3d';
}

export interface ArcadeResult {
  id: string;
  roomId: string;
  gameType: ArcadeGameType;
  userId: string;
  opponentId: string | null;
  result: 'win' | 'loss' | 'draw';
  score: number;
  opponentScore: number;
  xpEarned: number;
  coinsEarned: number;
  durationSeconds: number;
  createdAt: string;
  opponent?: ArcadePlayer | null;
}

export interface ArcadeRoom {
  id: string;
  gameType: ArcadeGameType;
  inviteCode: string;
  status: ArcadeRoomStatus;
  seed: number;
  hostReady: boolean;
  guestReady: boolean;
  hostScore: number;
  guestScore: number;
  winnerId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  currentUserRole: ArcadeRole;
  canJoin: boolean;
  playerCount: number;
  players: {
    host: ArcadePlayer | null;
    guest: ArcadePlayer | null;
    winner: ArcadePlayer | null;
  };
  results: ArcadeResult[];
}

export interface ArcadeLeaderboardEntry {
  rank: number;
  user: ArcadePlayer;
  xp: number;
  score: number;
  gamesPlayed: number;
}

// ============================================
// Social Arcade API Functions
// ============================================

export const getArcadeCatalog = async (): Promise<{ games: ArcadeCatalogGame[] }> => {
  return apiClient.get('/games/arcade/catalog');
};

export const getArcadeRooms = async (
  gameType?: ArcadeGameType | 'all',
  limit = 20
): Promise<{ rooms: ArcadeRoom[] }> => {
  return apiClient.get('/games/arcade/rooms', {
    params: { gameType: gameType === 'all' ? undefined : gameType, limit },
  });
};

export const createArcadeRoom = async (
  gameType: ArcadeGameType
): Promise<{ room: ArcadeRoom }> => {
  return apiClient.post('/games/arcade/rooms', { gameType });
};

export const getArcadeRoom = async (roomId: string): Promise<{ room: ArcadeRoom }> => {
  return apiClient.get(`/games/arcade/rooms/${roomId}`);
};

export const getArcadeInvite = async (inviteCode: string): Promise<{ room: ArcadeRoom }> => {
  return apiClient.get(`/games/arcade/invite/${inviteCode}`);
};

export const joinArcadeRoom = async (roomId: string): Promise<{ room: ArcadeRoom }> => {
  return apiClient.post(`/games/arcade/rooms/${roomId}/join`);
};

export const joinArcadeInvite = async (inviteCode: string): Promise<{ room: ArcadeRoom }> => {
  return apiClient.post(`/games/arcade/invite/${inviteCode}/join`);
};

export const setArcadeReady = async (
  roomId: string,
  ready: boolean
): Promise<{ room: ArcadeRoom }> => {
  return apiClient.post(`/games/arcade/rooms/${roomId}/ready`, { ready });
};

export const finishArcadeRoom = async (
  roomId: string,
  data: {
    hostScore: number;
    guestScore: number;
    durationSeconds: number;
    metadata?: Record<string, unknown>;
  }
): Promise<{ room: ArcadeRoom }> => {
  return apiClient.post(`/games/arcade/rooms/${roomId}/finish`, data);
};

export const abandonArcadeRoom = async (roomId: string): Promise<{ room: ArcadeRoom }> => {
  return apiClient.post(`/games/arcade/rooms/${roomId}/abandon`);
};

export const getArcadeHistory = async (limit = 20): Promise<{ results: ArcadeResult[] }> => {
  return apiClient.get('/games/arcade/history', { params: { limit } });
};

export const getArcadeLeaderboard = async (
  gameType?: ArcadeGameType | 'all',
  limit = 20
): Promise<{ leaderboard: ArcadeLeaderboardEntry[] }> => {
  return apiClient.get('/games/arcade/leaderboard', {
    params: { gameType: gameType === 'all' ? undefined : gameType, limit },
  });
};

// ============================================
// Admin - Seed Data
// ============================================

export const seedTriviaQuestions = async (): Promise<{ message: string }> => {
  return apiClient.post('/games/admin/seed/trivia');
};

export const seedWordleWords = async (): Promise<{ message: string }> => {
  return apiClient.post('/games/admin/seed/wordle');
};

export const seedTypingTexts = async (): Promise<{ message: string }> => {
  return apiClient.post('/games/admin/seed/typing');
};

export const seedCodingProblems = async (): Promise<{ message: string }> => {
  return apiClient.post('/games/admin/seed/coding');
};
