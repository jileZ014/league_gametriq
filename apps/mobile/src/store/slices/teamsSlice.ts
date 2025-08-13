import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Team, Player } from '@/types';

interface TeamsState {
  teams: Team[];
  myTeams: Team[];
  selectedTeam: Team | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: TeamsState = {
  teams: [],
  myTeams: [],
  selectedTeam: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    setTeams: (state, action: PayloadAction<Team[]>) => {
      state.teams = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setMyTeams: (state, action: PayloadAction<Team[]>) => {
      state.myTeams = action.payload;
    },
    addTeam: (state, action: PayloadAction<Team>) => {
      state.teams.push(action.payload);
    },
    updateTeam: (state, action: PayloadAction<Team>) => {
      const index = state.teams.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.teams[index] = action.payload;
      }
      
      const myTeamIndex = state.myTeams.findIndex(t => t.id === action.payload.id);
      if (myTeamIndex !== -1) {
        state.myTeams[myTeamIndex] = action.payload;
      }
      
      if (state.selectedTeam?.id === action.payload.id) {
        state.selectedTeam = action.payload;
      }
    },
    setSelectedTeam: (state, action: PayloadAction<Team | null>) => {
      state.selectedTeam = action.payload;
    },
    updateTeamRoster: (state, action: PayloadAction<{ teamId: string; players: Player[] }>) => {
      const team = state.teams.find(t => t.id === action.payload.teamId);
      if (team) {
        team.players = action.payload.players;
      }
      
      const myTeam = state.myTeams.find(t => t.id === action.payload.teamId);
      if (myTeam) {
        myTeam.players = action.payload.players;
      }
      
      if (state.selectedTeam?.id === action.payload.teamId) {
        state.selectedTeam.players = action.payload.players;
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
  setTeams,
  setMyTeams,
  addTeam,
  updateTeam,
  setSelectedTeam,
  updateTeamRoster,
  setLoading,
  setError,
} = teamsSlice.actions;

export default teamsSlice.reducer;