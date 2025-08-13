import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Standing } from '@/types';

interface StandingsState {
  standings: Standing[];
  divisionStandings: Record<string, Standing[]>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: StandingsState = {
  standings: [],
  divisionStandings: {},
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const standingsSlice = createSlice({
  name: 'standings',
  initialState,
  reducers: {
    setStandings: (state, action: PayloadAction<Standing[]>) => {
      state.standings = action.payload;
      
      // Group standings by division
      state.divisionStandings = action.payload.reduce((acc, standing) => {
        if (!acc[standing.division]) {
          acc[standing.division] = [];
        }
        acc[standing.division].push(standing);
        return acc;
      }, {} as Record<string, Standing[]>);
      
      // Sort each division by rank
      Object.keys(state.divisionStandings).forEach(division => {
        state.divisionStandings[division].sort((a, b) => a.rank - b.rank);
      });
      
      state.lastUpdated = new Date().toISOString();
    },
    updateStanding: (state, action: PayloadAction<Standing>) => {
      const index = state.standings.findIndex(s => s.teamId === action.payload.teamId);
      if (index !== -1) {
        state.standings[index] = action.payload;
        
        // Update division standings
        const divStandings = state.divisionStandings[action.payload.division];
        if (divStandings) {
          const divIndex = divStandings.findIndex(s => s.teamId === action.payload.teamId);
          if (divIndex !== -1) {
            divStandings[divIndex] = action.payload;
            divStandings.sort((a, b) => a.rank - b.rank);
          }
        }
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
  setStandings,
  updateStanding,
  setLoading,
  setError,
} = standingsSlice.actions;

export default standingsSlice.reducer;