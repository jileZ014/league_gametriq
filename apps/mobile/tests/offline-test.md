# Offline Functionality Test Cases

## Overview
This document outlines test cases for offline functionality in the Gametriq League PWA, including caching strategies, offline page access, and background sync capabilities.

## Test Environment Setup

### Prerequisites
- PWA installed on test device
- Service worker with offline capabilities
- Cache API implementation
- Background sync registration
- IndexedDB for data storage

### Network Conditions
- Online (4G/WiFi)
- Offline (Airplane mode)
- Slow 3G (throttled)
- Lie-Fi (connected but no internet)

## Caching Strategy Tests

### TC-OFF-001: Static Asset Caching
**Objective**: Verify static assets are cached and available offline

**Steps**:
1. Load app while online
2. Navigate through main pages
3. Open DevTools > Application > Cache Storage
4. Verify cached assets
5. Enable airplane mode
6. Refresh the app
7. Navigate through previously visited pages

**Expected Cached Assets**:
- HTML shell (`/index.html`)
- CSS files (`/assets/styles.*.css`)
- JavaScript bundles (`/assets/app.*.js`)
- Fonts (`/fonts/*.woff2`)
- Icons (`/icons/*.png`)
- Manifest (`/manifest.json`)

**Expected Results**:
- All static assets load from cache
- No network requests for cached assets
- Page renders correctly offline
- Fonts and icons display properly

**Test Data**:
- Screenshot: `/tests/screenshots/offline-cache-storage.png`
- Screenshot: `/tests/screenshots/offline-static-assets.png`

### TC-OFF-002: Dynamic Data Caching
**Objective**: Verify API responses are cached appropriately

**Cache Strategy**:
```javascript
// Network First with Cache Fallback
const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    const cache = await caches.open('api-cache-v1');
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
};
```

**Test APIs**:
- `/api/schedule` - Game schedule
- `/api/teams` - Team rosters
- `/api/standings` - League standings
- `/api/stats/player/*` - Player statistics

**Steps**:
1. While online, visit:
   - Schedule page
   - Teams page
   - Standings page
   - Player profile pages
2. Verify data loads and displays
3. Go offline
4. Revisit same pages
5. Verify cached data displays
6. Check cache timestamps

**Expected Results**:
- Previously loaded data available offline
- Stale data indicator shown
- Last updated timestamp visible
- No error messages for cached content

### TC-OFF-003: Offline Page Navigation
**Objective**: Test navigation between pages while offline

**Test Scenarios**:

**Scenario 1: Previously Visited Pages**
1. While online, visit multiple pages
2. Go offline
3. Navigate between visited pages using:
   - Navigation menu
   - Back/forward buttons
   - Direct links
   - Deep links from home screen

**Scenario 2: New Pages While Offline**
1. Go offline
2. Try to navigate to unvisited page
3. Verify offline fallback page
4. Check retry mechanism

**Expected Results**:
- Smooth navigation between cached pages
- Offline page for uncached routes
- Browser history works correctly
- No white screens or crashes

**Test Data**:
- Screenshot: `/tests/screenshots/offline-navigation.png`
- Screenshot: `/tests/screenshots/offline-fallback-page.png`

### TC-OFF-004: Offline Fallback Page
**Objective**: Verify offline fallback page functionality

**Fallback Page Features**:
```html
<!-- /offline.html -->
<div class="offline-container">
  <h1>You're Offline</h1>
  <p>Check your connection and try again</p>
  <button onclick="location.reload()">Retry</button>
  <div class="cached-pages">
    <h2>Available Offline:</h2>
    <ul id="cached-pages-list"></ul>
  </div>
</div>
```

**Test Points**:
- Fallback page loads for uncached routes
- Retry button functionality
- List of available cached pages
- Styling matches app theme
- Clear messaging to user

### TC-OFF-005: Form Submission Offline
**Objective**: Test form submissions with background sync

**Test Forms**:
- Game score submission
- Player stats update
- Team roster changes
- User profile updates

**Steps**:
1. While offline, fill out form
2. Submit form
3. Verify queued notification
4. Check IndexedDB for queued data
5. Go online
6. Verify automatic sync
7. Check server for submitted data

**Expected Results**:
- Form data saved locally
- User notified of offline queue
- Background sync triggers when online
- No data loss
- Proper conflict resolution

**Background Sync Implementation**:
```javascript
// Register sync event
navigator.serviceWorker.ready.then(reg => {
  return reg.sync.register('sync-game-scores');
});

// Handle sync in service worker
self.addEventListener('sync', event => {
  if (event.tag === 'sync-game-scores') {
    event.waitUntil(syncGameScores());
  }
});
```

### TC-OFF-006: Image Lazy Loading Offline
**Objective**: Verify image handling in offline mode

**Test Cases**:
1. **Cached Images**
   - Load team logos while online
   - Go offline
   - Verify logos display from cache

2. **Placeholder Images**
   - Go offline
   - Navigate to page with uncached images
   - Verify placeholder images shown
   - No broken image icons

3. **Progressive Loading**
   - Low-quality placeholder first
   - High-quality image when online

**Expected Results**:
- Cached images display offline
- Graceful fallbacks for uncached images
- No layout shifts
- Alt text visible

### TC-OFF-007: Offline Data Persistence
**Objective**: Test data persistence across sessions

**Test Scenarios**:
1. **LocalStorage Data**
   - User preferences
   - Theme settings
   - Last viewed page

2. **IndexedDB Data**
   - Game scores
   - Player stats
   - Team rosters
   - Sync queue

3. **Cache Storage**
   - Static assets
   - API responses
   - Images

**Steps**:
1. Store data while online
2. Go offline
3. Close PWA completely
4. Reopen PWA while offline
5. Verify data availability

**Expected Results**:
- All data persists across sessions
- Correct data versions loaded
- No corruption or data loss

### TC-OFF-008: Service Worker Update While Offline
**Objective**: Test service worker updates in offline mode

**Steps**:
1. Install PWA with service worker v1
2. Go offline
3. Deploy service worker v2
4. Open PWA
5. Verify current version runs
6. Go online
7. Verify update prompt appears
8. Accept update
9. Verify new version active

**Expected Results**:
- App continues working offline with old SW
- Update detected when online
- Smooth transition to new version
- No data loss during update

### TC-OFF-009: Offline Performance Metrics
**Objective**: Measure performance in offline mode

**Metrics to Measure**:
```javascript
// Performance marks
performance.mark('offline-nav-start');
// ... navigation logic
performance.mark('offline-nav-end');
performance.measure('offline-navigation', 
  'offline-nav-start', 'offline-nav-end');
```

**Key Metrics**:
1. **Page Load Time**
   - Online: < 2s
   - Offline (cached): < 500ms

2. **Time to Interactive**
   - Online: < 3s
   - Offline: < 1s

3. **Cache Response Time**
   - Static assets: < 50ms
   - API cache: < 100ms

4. **Memory Usage**
   - Cache size: < 50MB
   - IndexedDB: < 25MB

### TC-OFF-010: Network Status Detection
**Objective**: Test network status detection and UI updates

**Implementation**:
```javascript
// Network status detection
window.addEventListener('online', () => {
  updateUIOnline();
  triggerBackgroundSync();
});

window.addEventListener('offline', () => {
  updateUIOffline();
  showOfflineNotification();
});

// Connection type detection
if ('connection' in navigator) {
  navigator.connection.addEventListener('change', () => {
    adaptToConnectionSpeed();
  });
}
```

**Test Points**:
1. **Status Indicator**
   - Shows online/offline status
   - Updates immediately on change
   - Correct icon/color

2. **Auto-retry Logic**
   - Failed requests retry when online
   - Exponential backoff
   - Maximum retry limit

3. **UI Adaptations**
   - Disable online-only features
   - Show cached data indicators
   - Enable offline mode UI

## Platform-Specific Offline Behavior

### iOS Safari
- Limited background sync support
- 50MB storage limit
- No persistent storage permission

### Android Chrome
- Full background sync support
- Persistent storage available
- Better cache management

### Desktop Browsers
- Larger storage quotas
- Better debugging tools
- Full API support

## Troubleshooting Guide

### Common Issues

1. **Cache Not Working**
   ```javascript
   // Debug cache issues
   caches.keys().then(names => {
     console.log('Cache names:', names);
   });
   
   caches.open('app-cache-v1').then(cache => {
     cache.keys().then(keys => {
       console.log('Cached URLs:', keys);
     });
   });
   ```

2. **Background Sync Failing**
   - Check sync registration
   - Verify online detection
   - Check browser support
   - Review sync queue in IndexedDB

3. **Storage Quota Exceeded**
   - Monitor cache size
   - Implement cache expiration
   - Use storage estimate API
   - Clear old cached data

## Test Checklist

- [ ] Static assets cached properly
- [ ] API responses cached with strategy
- [ ] Offline navigation works
- [ ] Fallback page displays
- [ ] Forms queue for sync
- [ ] Images handle offline gracefully
- [ ] Data persists across sessions
- [ ] Service worker updates properly
- [ ] Performance acceptable offline
- [ ] Network status detected accurately
- [ ] Platform-specific features tested
- [ ] Error handling works correctly

## Performance Benchmarks

### Cache Performance
| Asset Type | Size | Cache Time | Retrieve Time |
|------------|------|------------|---------------|
| HTML       | 15KB | 5ms        | 2ms           |
| CSS        | 85KB | 12ms       | 4ms           |
| JS Bundle  | 250KB| 25ms       | 8ms           |
| Images     | 50KB | 8ms        | 3ms           |
| API JSON   | 10KB | 3ms        | 1ms           |

### Offline Navigation Performance
| Action | Online | Offline (Cached) | Offline (Not Cached) |
|--------|--------|------------------|---------------------|
| Page Load | 1.5s | 0.3s | 0.5s (fallback) |
| API Call | 200ms | 50ms | 100ms (error) |
| Image Load | 300ms | 20ms | 0ms (placeholder) |