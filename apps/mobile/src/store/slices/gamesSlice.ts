import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Game, LiveScore } from '@/types';

interface GamesState {
  games: Game[];
  upcomingGames: Game[];
  liveGames: Game[];
  completedGames: Game[];
  selectedGame: Game | null;
  liveScores: Record<string, LiveScore>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: GamesState = {
  games: [],
  upcomingGames: [],
  liveGames: [],
  completedGames: [],
  selectedGame: null,
  liveScores: {},
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const gamesSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    setGames: (state, action: PayloadAction<Game[]>) => {
      state.games = action.payload;
      state.upcomingGames = action.payload.filter(g => g.status === 'upcoming');
      state.liveGames = action.payload.filter(g => g.status === 'live');
      state.completedGames = action.payload.filter(g => g.status === 'final');
      state.lastUpdated = new Date().toISOString();
    },
    addGame: (state, action: PayloadAction<Game>) => {
      state.games.push(action.payload);
      if (action.payload.status === 'upcoming') {
        state.upcomingGames.push(action.payload);
      } else if (action.payload.status === 'live') {
        state.liveGames.push(action.payload);
      } else if (action.payload.status === 'final') {
        state.completedGames.push(action.payload);
      }
    },
    updateGame: (state, action: PayloadAction<Game>) => {
      const index = state.games.findIndex(g => g.id === action.payload.id);
      if (index !== -1) {
        state.games[index] = action.payload;
        
        // Reorganize games by status
        state.upcomingGames = state.games.filter(g => g.status === 'upcoming');
        state.liveGames = state.games.filter(g => g.status === 'live');
        state.completedGames = state.games.filter(g => g.status === 'final');
      }
    },
    setSelectedGame: (state, action: PayloadAction<Game | null>) => {
      state.selectedGame = action.payload;
    },
    updateLiveScore: (state, action: PayloadAction<LiveScore>) => {
      state.liveScores[action.payload.gameId] = action.payload;
      
      // Update the game object as well
      const gameIndex = state.games.findIndex(g => g.id === action.payload.gameId);
      if (gameIndex !== -1) {
        state.games[gameIndex].homeTeamScore = action.payload.homeScore;
        state.games[gameIndex].awayTeamScore = action.payload.awayScore;
        state.games[gameIndex].quarter = action.payload.quarter;
        state.games[gameIndex].timeRemaining = action.payload.timeRemaining;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setGames,
  addGame,
  updateGame,
  setSelectedGame,
  updateLiveScore,
  setLoading,
  setError,
} = gamesSlice.actions;

export default gamesSlice.reducer;