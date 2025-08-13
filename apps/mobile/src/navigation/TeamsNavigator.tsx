import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/constants/theme';
import TeamsScreen from '@/screens/TeamsScreen';
import TeamDetailsScreen from '@/screens/TeamDetailsScreen';
import RosterScreen from '@/screens/RosterScreen';

export type TeamsStackParamList = {
  TeamsList: undefined;
  TeamDetails: { teamId: string };
  Roster: { teamId: string };
};

const Stack = createNativeStackNavigator<TeamsStackParamList>();

export default function TeamsNavigator() {
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
        name="TeamsList"
        component={TeamsScreen}
        options={{ title: 'Teams' }}
      />
      <Stack.Screen
        name="TeamDetails"
        component={TeamDetailsScreen}
        options={{ title: 'Team Details' }}
      />
      <Stack.Screen
        name="Roster"
        component={RosterScreen}
        options={{ title: 'Team Roster' }}
      />
    </Stack.Navigator>
  );
}