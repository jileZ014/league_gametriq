# Legacy Youth Sports Mobile App

React Native mobile application for the Legacy Youth Sports basketball league platform, supporting iOS and Android with offline-first architecture.

## Features

### Core Functionality
- **Offline-First Architecture**: Full functionality without internet connection
- **Real-Time Updates**: Live score updates via WebSocket connections
- **Push Notifications**: Game alerts and announcements
- **Deep Linking**: Direct navigation to games, teams, and standings
- **Camera Integration**: Team photo and roster management

### Screens
- **Home Dashboard**: Live games, upcoming matches, quick stats
- **Games**: Browse, filter, and track game schedules
- **Teams**: Team rosters, standings, and statistics
- **Standings**: Division-based league standings
- **Profile**: User settings and notification management

## Tech Stack

- **Framework**: React Native 0.72 with Expo SDK 49
- **Navigation**: React Navigation v6
- **State Management**: Redux Toolkit with Redux Persist
- **UI Components**: React Native Paper (Material Design)
- **Offline Storage**: AsyncStorage with queue-based syncing
- **TypeScript**: Strict mode enabled

## Project Structure

```
apps/mobile/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation configuration
│   ├── store/           # Redux store and slices
│   ├── contexts/        # React contexts
│   ├── types/           # TypeScript type definitions
│   ├── constants/       # Theme and constants
│   └── hooks/           # Custom React hooks
├── assets/              # Images, fonts, and icons
├── App.tsx             # Main application entry
└── app.json            # Expo configuration
```

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Navigate to mobile directory
cd apps/mobile

# Install dependencies
npm install

# Start development server
npm start
```

### Running the App

```bash
# iOS
npm run ios

# Android
npm run android

# Web (PWA)
npm run web
```

## Development

### Commands

```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Testing
npm test

# Build for production
npm run build
```

### Environment Setup

The app uses Expo's managed workflow. For custom native code:

```bash
# Eject from Expo (use carefully)
expo eject
```

## Offline Architecture

### Data Persistence
- Redux Persist for state management
- AsyncStorage for local data storage
- Queue-based action syncing when online

### Sync Strategy
1. All actions work offline-first
2. Actions queued when offline
3. Automatic sync when connection restored
4. Conflict resolution with server timestamps

## Building for Production

### iOS
```bash
# Build iOS app
npm run build:ios

# Or with EAS Build
eas build --platform ios
```

### Android
```bash
# Build Android APK
npm run build:android

# Or with EAS Build
eas build --platform android
```

## Configuration

### Theme Customization
Edit `src/constants/theme.ts` to modify:
- Brand colors (Legacy Youth Sports gold/black)
- Typography scales
- Spacing units

### Deep Linking
Configure in `src/navigation/linking.ts`:
- URL schemes
- Path configurations
- Parameter parsing

## Performance Optimization

### Implemented Optimizations
- Memoization for expensive computations
- Lazy loading for screens
- Image optimization and caching
- FlatList optimization for large lists
- Background task management

### Monitoring
- Crash reporting ready for integration
- Performance metrics tracking
- User analytics hooks

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
# Install Detox
npm install -g detox-cli

# Run E2E tests
detox test
```

## Deployment

### App Store (iOS)
1. Build production IPA
2. Upload to App Store Connect
3. Submit for review

### Google Play (Android)
1. Build production APK/AAB
2. Upload to Google Play Console
3. Submit for review

## Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS build failures**
   ```bash
   cd ios && pod install
   ```

3. **Android build failures**
   ```bash
   cd android && ./gradlew clean
   ```

## Contributing

1. Create feature branch
2. Implement changes
3. Test on both platforms
4. Submit pull request

## License

Proprietary - Legacy Youth Sports

## Support

For support, contact the Legacy Youth Sports development team.