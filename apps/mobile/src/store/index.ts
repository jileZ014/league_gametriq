import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import gamesReducer from './slices/gamesSlice';
import teamsReducer from './slices/teamsSlice';
import standingsReducer from './slices/standingsSlice';
import offlineReducer from './slices/offlineSlice';
import notificationsReducer from './slices/notificationsSlice';

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'games', 'teams', 'standings', 'offline'], // Persist these reducers
};

const rootReducer = {
  auth: authReducer,
  games: gamesReducer,
  teams: teamsReducer,
  standings: standingsReducer,
  offline: offlineReducer,
  notifications: notificationsReducer,
};

const persistedReducer = Object.keys(rootReducer).reduce((acc, key) => {
  if (persistConfig.whitelist?.includes(key)) {
    acc[key] = persistReducer(
      {
        key,
        storage: AsyncStorage,
        whitelist: key === 'auth' ? ['user', 'token'] : undefined,
      },
      rootReducer[key as keyof typeof rootReducer]
    );
  } else {
    acc[key] = rootReducer[key as keyof typeof rootReducer];
  }
  return acc;
}, {} as any);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;