import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge } from 'react-native-paper';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { colors } from '@/constants/theme';

import HomeScreen from '@/screens/HomeScreen';
import GamesNavigator from './GamesNavigator';
import TeamsNavigator from './TeamsNavigator';
import StandingsScreen from '@/screens/StandingsScreen';
import ProfileNavigator from './ProfileNavigator';

export type MainTabParamList = {
  Home: undefined;
  Games: undefined;
  Teams: undefined;
  Standings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);
  const liveGamesCount = useSelector((state: RootState) => state.games.liveGames.length);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.secondary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Games"
        component={GamesNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Games',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialCommunityIcons name="basketball" color={color} size={size} />
              {liveGamesCount > 0 && (
                <Badge
                  size={16}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: colors.live,
                  }}
                >
                  {liveGamesCount}
                </Badge>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Teams"
        component={TeamsNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Teams',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Standings"
        component={StandingsScreen}
        options={{
          title: 'League Standings',
          tabBarLabel: 'Standings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialCommunityIcons name="account" color={color} size={size} />
              {unreadCount > 0 && (
                <Badge
                  size={16}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: colors.error,
                  }}
                >
                  {unreadCount}
                </Badge>
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}