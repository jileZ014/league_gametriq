import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

export const linking = {
  prefixes: [prefix, 'legacyyouthsports://'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      Main: {
        screens: {
          Home: 'home',
          Games: {
            screens: {
              GamesList: 'games',
              GameDetails: 'games/:id',
            },
          },
          Teams: {
            screens: {
              TeamsList: 'teams',
              TeamDetails: 'teams/:id',
              Roster: 'teams/:id/roster',
            },
          },
          Standings: 'standings',
          Profile: {
            screens: {
              ProfileMain: 'profile',
              Settings: 'profile/settings',
              Notifications: 'profile/notifications',
            },
          },
        },
      },
    },
  },
};