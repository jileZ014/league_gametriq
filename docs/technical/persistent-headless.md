# Persistent Headless Testing with Modern UI

## Overview

This document outlines the persistent headless testing setup for the Gametriq basketball league management platform, including the Modern UI theming system with NBA 2K + ESPN inspired design.

## Architecture

### Persistent Browser Context

The testing system uses Playwright's `launchPersistentContext` for improved performance and user experience testing:

- **Persistent User Directory**: `.pw-user` stores browser state between runs
- **Performance Benefits**: Faster test execution, cached resources
- **Real User Simulation**: Maintains cookies, localStorage, and session data
- **Feature Flag Support**: Automatic injection of UI_MODERN_V1 and other flags

### Modern UI Theme System

The Modern UI implements a sports-centric design inspired by NBA 2K and ESPN:

- **NBA 2K Colors**: Orange (#ea580c) and Purple (#9333ea) primary palette
- **ESPN Layout**: Clean typography, data-dense layouts, live indicators
- **Basketball Context**: Court-inspired textures, team colors, game status
- **Phoenix Market**: Desert-themed accent colors for local branding

## Quick Start

### Running Persistent Tests

```bash
# Headless smoke tests with Modern UI
npm run test:persistent:smoke

# Headed visual review mode
npm run test:persistent:headed

# Modern UI enabled explicitly
npm run test:persistent:modern

# Clean artifacts and browser data
npm run pw:clean
```

### Environment Variables

```bash
# Feature Flags
UI_MODERN_V1=1          # Enable Modern UI theme
PERSISTENT_MODE=1       # Use persistent browser context
HEADLESS=0             # Run in headed mode
RECORD_VIDEO=1         # Record test videos
SLOW_MO=500           # Slow motion for visual review
```

## Testing Tools

### 1. Browser Context Manager (`tools/browserContext.ts`)

```typescript
import { startPersistentSession } from './tools/browserContext';

const { manager, context, page } = await startPersistentSession({
  headless: false,
  slowMo: 500,
  recordVideo: true
});
```

**Features:**
- Phoenix, AZ timezone and geolocation
- Mobile/tablet viewport testing
- Performance monitoring hooks
- Automatic feature flag injection

### 2. Headless Smoke Runner (`tools/runPersistentSmoke.js`)

Automated headless test execution with comprehensive reporting:

```bash
node tools/runPersistentSmoke.js
```

**Capabilities:**
- Real-time progress monitoring
- Performance budget enforcement (<100ms API p95)
- WCAG AA contrast checking
- Artifact generation (screenshots, traces, videos)

### 3. Headed Review Tool (`tools/runHeadedReview.js`)

Interactive visual testing environment:

```bash
node tools/runHeadedReview.js
```

**Menu Options:**
1. Run full smoke test suite
2. Run specific test patterns
3. Launch manual testing browser
4. View recent artifacts
5. Toggle Modern UI on/off
6. Exit

## Modern UI Feature Flag System

### Implementation

The Modern UI is implemented using React Context and CSS-in-JS:

```tsx
import { useModernUI, ModernUIConditional } from '@/components/providers/modern-ui-provider';

// Conditional rendering
<ModernUIConditional fallback={<LegacyComponent />}>
  <ModernComponent />
</ModernUIConditional>

// Hook usage
const { isModernUIEnabled, toggleModernUI, themeTokens } = useModernUI();
```

### Design Tokens

TypeScript design system with comprehensive theming:

```typescript
import { themeTokens } from '@/lib/theme.tokens';

// NBA 2K inspired colors
themeTokens.colors.nba2k.primary      // #ea580c (Orange)
themeTokens.colors.nba2k.secondary    // #9333ea (Purple)

// ESPN sports colors
themeTokens.colors.espn.red           // #d32f2f
themeTokens.colors.espn.gold          // #f57c00

// Phoenix market colors
themeTokens.colors.phoenix.sun        // #ff6b35
themeTokens.colors.phoenix.desert     // #d4a574
```

### Component Examples

#### Modern Score Card

```tsx
import { ScoreCard } from '@/components/ui/modern-score-card';

<ScoreCard
  homeTeam={{ name: "Suns Warriors", score: 84, color: "#ea580c" }}
  awayTeam={{ name: "Desert Eagles", score: 76, color: "#9333ea" }}
  gameStatus="live"
  quarter="Q4 2:45"
  venue="Desert Sky Pavilion"
/>
```

**Legacy vs Modern:**
- Legacy: Simple card with basic styling
- Modern: NBA 2K gradients, team logos, live animations, ESPN-style layout

## Performance Standards

### API Performance Budget
- **P95 Response Time**: <100ms
- **Page Load Time**: <3000ms
- **Navigation Time**: <1500ms
- **Interaction Response**: <200ms

### Accessibility Standards
- **WCAG AA Compliance**: ≥4.5:1 contrast ratio
- **Touch Targets**: ≥44px minimum size
- **Keyboard Navigation**: Full support
- **Screen Readers**: Semantic HTML and ARIA labels

### Mobile Performance
- **First Contentful Paint**: <2s on 3G
- **Largest Contentful Paint**: <4s on 3G
- **Time to Interactive**: <5s on 3G
- **Cumulative Layout Shift**: <0.1

## Test Scenarios

### Core User Flows
1. **Home Page Load**: Modern UI detection, performance measurement
2. **Navigation**: Portal, registration, login sections
3. **Mobile Responsive**: iPhone/iPad viewport testing
4. **Basketball Domain**: Search, filters, team data
5. **PWA Features**: Installation prompts, offline indicators
6. **Accessibility**: Contrast, keyboard navigation, screen readers
7. **Error Handling**: 404 pages, offline modes, network failures

### Modern UI Specific Tests
1. **Feature Flag Toggle**: Enable/disable Modern UI
2. **Theme Switching**: Light/dark mode compatibility  
3. **Component Comparison**: Legacy vs Modern side-by-side
4. **Design Token Usage**: CSS custom properties validation
5. **Responsive Design**: Mobile-first approach verification
6. **Animation Performance**: Smooth 60fps animations
7. **Basketball Theming**: NBA 2K/ESPN visual elements

## Artifacts and Reports

### Generated Files

```
artifacts/playwright/
├── screenshots/        # Full-page screenshots
├── traces/            # Interactive traces
├── videos/            # Screen recordings
├── html/             # Test reports
├── results.json      # Machine-readable results
└── smoke-report-*.json # Detailed test metadata
```

### Report Sections
- **Environment**: Headless mode, Modern UI status, viewport
- **Performance**: API timing, page load metrics
- **Coverage**: Routes tested, features verified
- **Accessibility**: Contrast issues, keyboard navigation
- **Basketball Domain**: League data, search functionality

## Debugging and Development

### Visual Debugging
```bash
# Slow motion with headed browser
HEADLESS=0 SLOW_MO=1000 npm run test:smoke:headed

# Video recording for issue reproduction
RECORD_VIDEO=1 npm run test:smoke:video
```

### Feature Flag Testing
```bash
# Test both UI modes
UI_MODERN_V1=1 npm run test:persistent:headed  # Modern
UI_MODERN_V1=0 npm run test:persistent:headed  # Legacy
```

### Performance Profiling
```bash
# Enable performance tracking
npm run test:smoke -- --grep="performance"

# View detailed traces
npm run pw:trace
```

## Configuration Files

### Playwright Config (`playwright.config.ts`)
- Persistent mode detection
- Phoenix, AZ timezone/geolocation
- Enhanced mobile testing (iPhone 14, iPad Pro)
- Performance budgets enforcement
- Basketball domain metadata

### Theme Files
- `src/styles/theme.modern.css`: Modern UI styles
- `src/lib/theme.tokens.ts`: TypeScript design tokens
- `src/components/providers/modern-ui-provider.tsx`: React context

### Testing Scripts
- `tools/browserContext.ts`: Persistent browser management
- `tools/runPersistentSmoke.js`: Headless automation
- `tools/runHeadedReview.js`: Visual testing interface

## Basketball Domain Specifics

### Test Data
```typescript
const TEST_DATA = {
  leagues: ['Phoenix Youth Basketball', 'Desert Storm League'],
  teams: ['Suns Warriors', 'Desert Eagles', 'Phoenix Fire'],
  divisions: ['6U', '8U', '10U', '12U', '14U', '16U', '18U'],
  venues: ['Desert Sky Pavilion', 'Phoenix Community Center']
};
```

### Game Status Colors
- **Live**: Red/orange gradient with pulse animation
- **Final**: Dark gray
- **Scheduled**: Light gray  
- **Cancelled**: Red
- **Halftime**: Yellow/amber

### Performance Considerations
- **Saturday Tournament Load**: 1000+ concurrent users
- **Gym WiFi**: Poor connectivity resilience
- **Mobile-First**: Tablet scorekeeping, phone spectating
- **Real-Time Updates**: WebSocket connections, optimistic UI

## Troubleshooting

### Common Issues

**Browser Won't Start**
```bash
# Clear persistent context
rm -rf .pw-user
npm run pw:clean
```

**Modern UI Not Loading**
```bash
# Check feature flags
UI_MODERN_V1=1 node -e "console.log(process.env.UI_MODERN_V1)"

# Verify CSS file exists
ls -la src/styles/theme.modern.css
```

**Performance Test Failures**
```bash
# Check network conditions
# Ensure dev server is running on :3000
# Verify API endpoints are responding
```

**Test Timeout Issues**
```bash
# Increase timeout in playwright.config.ts
# Check for infinite loading states
# Verify proper awaits in test code
```

## Contributing

### Adding New Tests
1. Use persistent browser context for consistency
2. Include Modern UI conditional testing
3. Add performance assertions
4. Follow basketball domain naming
5. Include accessibility checks

### Theme Development
1. Update design tokens in `theme.tokens.ts`
2. Add CSS rules in `theme.modern.css`
3. Test with feature flag toggle
4. Ensure WCAG AA compliance
5. Verify mobile responsiveness

### Performance Optimization
1. Monitor API response times
2. Use lazy loading for heavy components
3. Optimize images and assets
4. Implement proper caching strategies
5. Test on Phoenix-area network conditions

---

*This documentation is maintained by the Gametriq development team for the Phoenix youth basketball league management platform.*