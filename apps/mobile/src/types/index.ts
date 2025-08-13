export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator';
  avatar?: string;
  teamIds?: string[];
  leagueIds?: string[];
}

export interface Team {
  id: string;
  name: string;
  leagueId: string;
  leagueName: string;
  coachId: string;
  coachName: string;
  logo?: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  players: Player[];
  upcomingGames: Game[];
  division: string;
  ageGroup: string;
}

export interface Player {
  id: string;
  name: string;
  number: string;
  position?: string;
  age?: number;
  photo?: string;
  stats?: PlayerStats;
}

export interface PlayerStats {
  gamesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fouls: number;
}

export interface Game {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo?: string;
  homeTeamScore: number;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo?: string;
  awayTeamScore: number;
  date: string;
  time: string;
  venue: string;
  court?: string;
  status: 'upcoming' | 'live' | 'final' | 'cancelled' | 'postponed';
  quarter?: number;
  timeRemaining?: string;
  leagueId: string;
  leagueName: string;
  division: string;
  refereeId?: string;
  refereeName?: string;
  scorekeeperId?: string;
  scorekeeperName?: string;
}

export interface League {
  id: string;
  name: string;
  season: string;
  startDate: string;
  endDate: string;
  logo?: string;
  divisions: Division[];
  teams: Team[];
  games: Game[];
}

export interface Division {
  id: string;
  name: string;
  ageGroup: string;
  gender: 'boys' | 'girls' | 'coed';
  level: 'recreational' | 'competitive' | 'elite';
}

export interface Standing {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  gamesBack: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  streak: string;
  division: string;
  rank: number;
}

export interface LiveScore {
  gameId: string;
  homeScore: number;
  awayScore: number;
  quarter: number;
  timeRemaining: string;
  possession?: 'home' | 'away';
  lastUpdate: string;
}

export interface Notification {
  id: string;
  type: 'game_start' | 'score_update' | 'game_final' | 'schedule_change' | 'announcement';
  title: string;
  body: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}