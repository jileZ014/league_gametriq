# PWA Installation Test Cases

## Overview
This document outlines test cases for Progressive Web App (PWA) installation across different platforms and browsers.

## Test Environment Setup

### Devices & Platforms
- **iOS Devices**: iPhone 12 Pro (iOS 16.3), iPad Air (iOS 16.2)
- **Android Devices**: Samsung Galaxy S22 (Android 13), Google Pixel 7 (Android 13)
- **Desktop**: Windows 11 (Chrome 120), macOS Ventura (Safari 17)

### Prerequisites
- HTTPS enabled on test server
- Valid SSL certificate
- manifest.json properly configured
- Service worker registered

## Test Cases

### TC-PWA-001: iOS Safari Installation
**Objective**: Verify PWA installation on iOS Safari

**Steps**:
1. Open Safari on iOS device
2. Navigate to https://app.gametriq.com
3. Tap Share button in Safari toolbar
4. Scroll down and tap "Add to Home Screen"
5. Verify app name and icon preview
6. Tap "Add" to confirm installation
7. Check home screen for installed app
8. Launch app from home screen

**Expected Results**:
- App icon appears on home screen with correct name
- App launches in standalone mode (no browser UI)
- Splash screen displays during launch
- Status bar matches app theme color

**Test Data**:
- Screenshot: `/tests/screenshots/ios-install-prompt.png`
- Screenshot: `/tests/screenshots/ios-home-screen-icon.png`
- Screenshot: `/tests/screenshots/ios-splash-screen.png`

**Platform-Specific Notes**:
- iOS doesn't support automatic install prompts
- Users must manually add to home screen
- Push notifications require additional configuration

### TC-PWA-002: Android Chrome Installation
**Objective**: Verify PWA installation on Android Chrome

**Steps**:
1. Open Chrome on Android device
2. Navigate to https://app.gametriq.com
3. Wait for install prompt banner to appear
4. Tap "Install" on the banner
5. Verify app details in installation dialog
6. Tap "Install" to confirm
7. Check app drawer for installed app
8. Launch app from app drawer

**Expected Results**:
- Install prompt appears automatically after engagement criteria met
- App installs with correct icon and name
- App appears in app drawer and recent apps
- Launches in standalone mode
- Shows in device app settings

**Test Data**:
- Screenshot: `/tests/screenshots/android-install-banner.png`
- Screenshot: `/tests/screenshots/android-install-dialog.png`
- Screenshot: `/tests/screenshots/android-app-drawer.png`

### TC-PWA-003: Desktop Chrome Installation
**Objective**: Verify PWA installation on desktop Chrome

**Steps**:
1. Open Chrome on desktop
2. Navigate to https://app.gametriq.com
3. Click install icon in address bar
4. Verify installation dialog
5. Click "Install"
6. Check desktop/start menu for app shortcut
7. Launch installed app

**Expected Results**:
- Install icon appears in address bar
- App installs with desktop shortcut
- Launches in separate window
- Window controls match OS theme

**Test Data**:
- Screenshot: `/tests/screenshots/desktop-install-icon.png`
- Screenshot: `/tests/screenshots/desktop-app-window.png`

### TC-PWA-004: App Icon Verification
**Objective**: Verify app icons display correctly across platforms

**Test Points**:
- Home screen icon (192x192, 512x512)
- Splash screen icon
- App switcher icon
- Notification icon
- Safari touch icon

**Expected Results**:
- Icons display without pixelation
- Correct icon used for each context
- Maskable icons work on Android
- iOS icons have correct padding

### TC-PWA-005: Manifest Configuration Test
**Objective**: Verify manifest.json is properly configured

**Test Points**:
```json
{
  "name": "Gametriq League",
  "short_name": "Gametriq",
  "description": "Track your basketball league stats",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### TC-PWA-006: Update Prompt Test
**Objective**: Verify app update notifications work correctly

**Steps**:
1. Install PWA on device
2. Deploy new version with updated service worker
3. Close and reopen app
4. Verify update prompt appears
5. Accept update
6. Verify app reloads with new version

**Expected Results**:
- Update prompt appears when new version available
- User can choose to update or dismiss
- App updates without data loss
- Version number updates in app info

### TC-PWA-007: Uninstall Test
**Objective**: Verify PWA can be properly uninstalled

**Platform-Specific Steps**:

**iOS**:
1. Long press app icon on home screen
2. Tap "Remove App"
3. Confirm deletion

**Android**:
1. Long press app icon
2. Drag to "Uninstall" or tap app info
3. Confirm uninstallation

**Desktop**:
1. Open app
2. Click menu (three dots)
3. Select "Uninstall"
4. Confirm removal

**Expected Results**:
- App removed from device
- Local storage cleared (optional)
- No orphaned files remain

## Known Issues & Limitations

### iOS Limitations
- No automatic install prompts
- No push notifications without native app
- Limited offline storage (50MB)
- No background sync
- Camera/microphone access requires user gesture

### Android Considerations
- Install prompt timing varies by engagement
- Some devices show app in both drawer and home screen
- WebAPK updates may be delayed

### Desktop Variations
- Install UI differs between Chrome/Edge/Brave
- File system access requires additional permissions
- Window controls vary by OS

## Performance Benchmarks

### Installation Time
- iOS Safari: 2-3 seconds
- Android Chrome: 3-5 seconds (WebAPK generation)
- Desktop Chrome: 1-2 seconds

### Launch Time (from home screen)
- iOS: 1.2s cold start, 0.3s warm start
- Android: 1.5s cold start, 0.4s warm start
- Desktop: 0.8s cold start, 0.2s warm start

## Troubleshooting Guide

### Common Issues
1. **Install option not appearing**
   - Check HTTPS configuration
   - Verify manifest.json is valid
   - Ensure service worker is registered
   - Check browser console for errors

2. **Icons not displaying correctly**
   - Verify icon paths in manifest
   - Check icon file formats (PNG recommended)
   - Ensure maskable icon has safe zone

3. **App launches in browser mode**
   - Check display mode in manifest
   - Verify standalone mode support
   - Clear cache and reinstall

## Test Report Template
```
Test Date: [DATE]
Tester: [NAME]
Device: [DEVICE MODEL]
OS Version: [VERSION]
Browser: [BROWSER VERSION]

Test Case: [TC-ID]
Result: [PASS/FAIL]
Notes: [Any observations]
Screenshots: [File paths]
```