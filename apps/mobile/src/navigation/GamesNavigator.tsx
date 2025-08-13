import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/constants/theme';
import GamesScreen from '@/screens/GamesScreen';
import GameDetailsScreen from '@/screens/GameDetailsScreen';

export type GamesStackParamList = {
  GamesList: undefined;
  GameDetails: { gameId: string };
};

const Stack = createNativeStackNavigator<GamesStackParamList>();

export default function GamesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.secondary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="GamesList"
        component={GamesScreen}
        options={{ title: 'Games' }}
      />
      <Stack.Screen
        name="GameDetails"
        component={GameDetailsScreen}
        options={{ title: 'Game Details' }}
      />
    </Stack.Navigator>
  );
}