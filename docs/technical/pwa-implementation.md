# PWA Implementation Guide

## Overview

The GameTriq web app is now a fully-featured Progressive Web App (PWA) with offline support, installability, and background sync capabilities.

## Features Implemented

### 1. **Installability**
- ✅ Web App Manifest (`/public/manifest.webmanifest`)
- ✅ Icons for all platforms (72x72 to 512x512)
- ✅ Install prompt for Chrome/Edge browsers
- ✅ iOS-specific install instructions
- ✅ App shortcuts for quick access

### 2. **Offline Support**
- ✅ Service Worker with multiple caching strategies
- ✅ Offline fallback page
- ✅ Cache-first for static assets
- ✅ Network-first for API calls with cache fallback
- ✅ Background sync for failed requests

### 3. **Update Management**
- ✅ Automatic update detection
- ✅ User prompt for new versions
- ✅ Skip waiting functionality
- ✅ Periodic update checks (hourly)

### 4. **Performance Optimizations**
- ✅ Stale-while-revalidate for images
- ✅ Runtime caching for dynamic content
- ✅ Navigation preload support
- ✅ Proper cache versioning and cleanup

## File Structure

```
apps/web/
├── public/
│   ├── manifest.webmanifest    # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── offline.html            # Offline fallback page
│   └── icons/                  # PWA icons
│       ├── icon-72x72.png
│       ├── icon-96x96.png
│       ├── icon-128x128.png
│       ├── icon-144x144.png
│       ├── icon-152x152.png
│       ├── icon-192x192.png
│       ├── icon-384x384.png
│       └── icon-512x512.png
├── src/
│   ├── app/
│   │   └── layout.tsx          # Updated with SW registration
│   ├── components/
│   │   ├── InstallPrompt.tsx   # PWA install UI
│   │   ├── UpdatePrompt.tsx    # Update notification
│   │   └── OfflineIndicator.tsx # Offline status
│   └── hooks/
│       ├── usePWA.ts           # PWA utilities
│       └── useOffline.ts       # Offline functionality
```

## Service Worker Caching Strategies

### 1. **Static Assets** (Cache-First)
- HTML, CSS, JS files
- Fonts and static images
- Served from cache with background updates

### 2. **API Requests** (Network-First)
- `/api/*` endpoints
- Fresh data when online
- Cached data when offline
- Custom offline responses

### 3. **Images** (Cache-First with Background Update)
- User avatars, team logos
- Immediate cache response
- Background fetch for updates

### 4. **Navigation** (Network-First)
- Page navigation requests
- Offline fallback page
- Cached pages when offline

## Usage

### Install the PWA

1. **Chrome/Edge Desktop**:
   - Click install icon in address bar
   - Or use the custom install prompt

2. **Android**:
   - Tap "Add to Home Screen" in browser menu
   - Or use the custom install prompt

3. **iOS**:
   - Tap Share button
   - Select "Add to Home Screen"
   - Follow the prompts

### Offline Functionality

When offline, the app will:
- Show cached content for previously visited pages
- Display offline indicator at bottom of screen
- Queue failed requests for background sync
- Automatically sync when connection returns

### Background Sync

The app supports background sync for:
- Score updates
- Form submissions
- Data synchronization

Failed requests are automatically retried when the connection is restored.

## Testing

### Lighthouse PWA Audit

Run Lighthouse audit in Chrome DevTools:
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Progressive Web App" category
4. Run audit

Expected score: ≥90

### Service Worker Testing

1. Open Chrome DevTools
2. Go to Application tab
3. Select Service Workers
4. Test offline mode:
   - Check "Offline" checkbox
   - Navigate around the app
   - Verify cached content loads

### Install Testing

1. Clear browser data
2. Visit the app
3. Wait for install prompt (30 seconds)
4. Test installation flow
5. Verify app opens standalone

## Icon Generation

To generate production icons:

```bash
# Install dependencies
npm install -g sharp-cli

# Run the icon generator
node public/icons/generate-icons.js

# Convert SVGs to PNGs
for size in 72 96 128 144 152 192 384 512; do
  sharp -i icon-${size}x${size}.svg -o icon-${size}x${size}.png
done
```

## Deployment Checklist

- [ ] Generate and optimize all icon sizes
- [ ] Test on real devices (iOS, Android)
- [ ] Verify HTTPS is enabled
- [ ] Test offline functionality
- [ ] Check Lighthouse PWA score
- [ ] Test install flow on all platforms
- [ ] Verify manifest is served correctly
- [ ] Test service worker updates

## Browser Support

- ✅ Chrome/Edge (Full support)
- ✅ Firefox (Full support)
- ✅ Safari/iOS (Limited - no install prompt)
- ✅ Samsung Internet (Full support)

## Future Enhancements

1. **Push Notifications**
   - Game reminders
   - Score updates
   - Team announcements

2. **Background Sync**
   - Periodic score updates
   - Roster synchronization

3. **Advanced Caching**
   - IndexedDB for large data
   - Selective caching based on user preferences

4. **Share Target**
   - Accept shared images/videos
   - Quick score sharing