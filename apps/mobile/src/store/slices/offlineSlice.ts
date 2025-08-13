import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OfflineAction } from '@/types';

interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  syncInProgress: boolean;
  lastSyncTime: string | null;
  syncErrors: string[];
}

const initialState: OfflineState = {
  isOnline: true,
  pendingActions: [],
  syncInProgress: false,
  lastSyncTime: null,
  syncErrors: [],
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (action.payload && state.pendingActions.length > 0) {
        // Trigger sync when coming back online
        state.syncInProgress = true;
      }
    },
    addPendingAction: (state, action: PayloadAction<Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>>) => {
      const newAction: OfflineAction = {
        ...action.payload,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      };
      state.pendingActions.push(newAction);
    },
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter(a => a.id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const pendingAction = state.pendingActions.find(a => a.id === action.payload);
      if (pendingAction) {
        pendingAction.retryCount++;
      }
    },
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
    },
    setSyncTime: (state, action: PayloadAction<string>) => {
      state.lastSyncTime = action.payload;
    },
    addSyncError: (state, action: PayloadAction<string>) => {
      state.syncErrors.push(action.payload);
      // Keep only last 10 errors
      if (state.syncErrors.length > 10) {
        state.syncErrors = state.syncErrors.slice(-10);
      }
    },
    clearSyncErrors: (state) => {
      state.syncErrors = [];
    },
    clearPendingActions: (state) => {
      state.pendingActions = [];
    },
  },
});

export const {
  setOnlineStatus,
  addPendingAction,
  removePendingAction,
  incrementRetryCount,
  setSyncInProgress,
  setSyncTime,
  addSyncError,
  clearSyncErrors,
  clearPendingActions,
} = offlineSlice.actions;

export default offlineSlice.reducer;