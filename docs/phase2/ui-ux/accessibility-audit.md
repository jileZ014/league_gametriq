# WCAG 2.1 AA Accessibility Compliance Audit
## Basketball League Management Platform Phase 2

**Document ID:** A11Y-BLMP-001  
**Version:** 1.0  
**Date:** August 8, 2025  
**Author:** Sports UI/UX Designer  
**Status:** Phase 2 Accessibility Audit Framework  

---

## Executive Summary

This document provides a comprehensive WCAG 2.1 Level AA accessibility compliance audit checklist for the Basketball League Management Platform Phase 2. The framework ensures inclusive design for all users, including those using assistive technologies, and addresses the unique accessibility needs of multi-generational basketball league participants (ages 6-60+).

### Accessibility Goals
- **WCAG 2.1 AA Compliance**: Meet or exceed all Level AA requirements
- **Inclusive Design**: Accessible to users with diverse abilities and needs  
- **Multi-Generational Support**: Age-appropriate accessibility from children to seniors
- **Basketball Context**: Sport-specific accessibility considerations for live games
- **Assistive Technology**: Full compatibility with screen readers, voice control, and other AT

---

## Table of Contents

1. [WCAG 2.1 Compliance Matrix](#1-wcag-21-compliance-matrix)
2. [Perceivable Accessibility](#2-perceivable-accessibility)
3. [Operable Accessibility](#3-operable-accessibility)
4. [Understandable Accessibility](#4-understandable-accessibility)
5. [Robust Accessibility](#5-robust-accessibility)
6. [Basketball-Specific Accessibility](#6-basketball-specific-accessibility)
7. [Testing Procedures](#7-testing-procedures)
8. [Remediation Guidelines](#8-remediation-guidelines)

---

## 1. WCAG 2.1 Compliance Matrix

### 1.1 Level A Requirements (All Must Pass)

| Guideline | Requirement | Status | Priority |
|-----------|-------------|---------|----------|
| **1.1.1** | Non-text Content | ✅ Required | Critical |
| **1.2.1** | Audio-only and Video-only (Prerecorded) | ⚠️ Conditional | Medium |
| **1.2.2** | Captions (Prerecorded) | ⚠️ Conditional | Medium |
| **1.2.3** | Audio Description or Media Alternative | ⚠️ Conditional | Medium |
| **1.3.1** | Info and Relationships | ✅ Required | Critical |
| **1.3.2** | Meaningful Sequence | ✅ Required | Critical |
| **1.3.3** | Sensory Characteristics | ✅ Required | High |
| **1.4.1** | Use of Color | ✅ Required | Critical |
| **1.4.2** | Audio Control | ⚠️ Conditional | Medium |
| **2.1.1** | Keyboard | ✅ Required | Critical |
| **2.1.2** | No Keyboard Trap | ✅ Required | Critical |
| **2.1.4** | Character Key Shortcuts | ✅ Required | High |
| **2.2.1** | Timing Adjustable | ✅ Required | High |
| **2.2.2** | Pause, Stop, Hide | ✅ Required | High |
| **2.3.1** | Three Flashes or Below | ✅ Required | Critical |
| **2.4.1** | Bypass Blocks | ✅ Required | Critical |
| **2.4.2** | Page Titled | ✅ Required | Critical |
| **2.4.3** | Focus Order | ✅ Required | Critical |
| **2.4.4** | Link Purpose (In Context) | ✅ Required | Critical |
| **2.5.1** | Pointer Gestures | ✅ Required | High |
| **2.5.2** | Pointer Cancellation | ✅ Required | High |
| **2.5.3** | Label in Name | ✅ Required | High |
| **2.5.4** | Motion Actuation | ✅ Required | High |
| **3.1.1** | Language of Page | ✅ Required | Critical |
| **3.2.1** | On Focus | ✅ Required | Critical |
| **3.2.2** | On Input | ✅ Required | Critical |
| **3.3.1** | Error Identification | ✅ Required | Critical |
| **3.3.2** | Labels or Instructions | ✅ Required | Critical |
| **4.1.1** | Parsing | ✅ Required | Critical |
| **4.1.2** | Name, Role, Value | ✅ Required | Critical |

### 1.2 Level AA Requirements (All Must Pass)

| Guideline | Requirement | Status | Priority |
|-----------|-------------|---------|----------|
| **1.2.4** | Captions (Live) | ⚠️ Basketball-Specific | High |
| **1.2.5** | Audio Description (Prerecorded) | ⚠️ Conditional | Medium |
| **1.3.4** | Orientation | ✅ Required | High |
| **1.3.5** | Identify Input Purpose | ✅ Required | High |
| **1.4.3** | Contrast (Minimum) | ✅ Required | Critical |
| **1.4.4** | Resize text | ✅ Required | Critical |
| **1.4.5** | Images of Text | ✅ Required | High |
| **1.4.10** | Reflow | ✅ Required | High |
| **1.4.11** | Non-text Contrast | ✅ Required | Critical |
| **1.4.12** | Text Spacing | ✅ Required | High |
| **1.4.13** | Content on Hover or Focus | ✅ Required | High |
| **2.4.5** | Multiple Ways | ✅ Required | High |
| **2.4.6** | Headings and Labels | ✅ Required | Critical |
| **2.4.7** | Focus Visible | ✅ Required | Critical |
| **3.1.2** | Language of Parts | ✅ Required | Medium |
| **3.2.3** | Consistent Navigation | ✅ Required | Critical |
| **3.2.4** | Consistent Identification | ✅ Required | Critical |
| **3.3.3** | Error Suggestion | ✅ Required | High |
| **3.3.4** | Error Prevention (Legal, Financial, Data) | ✅ Required | Critical |
| **4.1.3** | Status Messages | ✅ Required | Critical |

---

## 2. Perceivable Accessibility

### 2.1 Text Alternatives (Guideline 1.1)

#### 2.1.1 Non-text Content Audit Checklist

**Images and Graphics**
- [ ] All basketball images have descriptive alt text
- [ ] Player photos include player name and team
- [ ] Team logos include team name
- [ ] Court diagrams have detailed descriptions
- [ ] Statistical charts have data table alternatives
- [ ] Decorative images use `alt=""` or `role="presentation"`
- [ ] Complex images (shot charts) have long descriptions

**Interactive Elements**
- [ ] Icon buttons have accessible names
- [ ] Image buttons describe the action
- [ ] Logo links describe destination
- [ ] Basketball emoji used for decoration only

```html
<!-- Good Examples -->
<img src="player-photo.jpg" alt="Emily Davis, #15, Point Guard for Eagles">
<img src="team-logo.png" alt="Phoenix Eagles logo">
<img src="shot-chart.svg" alt="Shot chart showing 15 attempts, 8 made, 47% accuracy" longdesc="#shot-chart-data">

<!-- Basketball-specific examples -->
<button aria-label="Add 2 points for player #15 Emily Davis">
  +2
</button>

<img src="court-diagram.png" alt="Basketball court diagram showing player positions: Smith at point guard, Davis at shooting guard, Johnson at small forward, Wilson at power forward, Brown at center">

<!-- Decorative basketball icons -->
<span role="img" aria-hidden="true">🏀</span>
```

#### 2.1.2 Audio/Video Content (Basketball Games)

**Live Game Streams**
- [ ] Live captions for game commentary
- [ ] Audio descriptions for visual game events  
- [ ] Score announcements accessible to screen readers
- [ ] Game clock updates announced
- [ ] Substitution notifications provided

**Pre-recorded Content**
- [ ] Game highlight videos have captions
- [ ] Coach interviews include transcripts
- [ ] Training videos have audio descriptions
- [ ] Team introduction videos are accessible

### 2.2 Time-based Media Compliance

```html
<!-- Live game with accessibility features -->
<video controls>
  <source src="live-game-stream.mp4" type="video/mp4">
  <track kind="captions" src="live-captions.vtt" srclang="en" label="English" default>
  <track kind="descriptions" src="audio-descriptions.vtt" srclang="en" label="Audio descriptions">
</video>

<!-- Alternative for users who cannot access video -->
<div class="live-game-alternative">
  <h3>Live Game: Eagles vs Hawks</h3>
  <div aria-live="polite" aria-atomic="true">
    <p>Current Score: Eagles 52, Hawks 48</p>
    <p>Time Remaining: 8 minutes 45 seconds, Quarter 2</p>
    <p>Last Play: Emily Davis made a 2-point shot</p>
  </div>
</div>
```

### 2.3 Adaptable Content (Guideline 1.3)

#### 2.3.1 Info and Relationships Audit

**Heading Structure**
- [ ] Logical heading hierarchy (h1 → h2 → h3)
- [ ] Page title in h1
- [ ] Section titles use appropriate heading levels
- [ ] No heading levels skipped

```html
<h1>Live Game: Eagles vs Hawks</h1>
  <h2>Current Score</h2>
  <h2>Game Statistics</h2>
    <h3>Team Statistics</h3>
    <h3>Player Statistics</h3>
      <h4>Eagles Players</h4>
      <h4>Hawks Players</h4>
  <h2>Game Timeline</h2>
```

**Form Labels**
- [ ] All form inputs have associated labels
- [ ] Required fields clearly marked
- [ ] Error messages linked to inputs
- [ ] Fieldsets group related inputs

```html
<!-- Player registration form -->
<fieldset>
  <legend>Player Information</legend>
  
  <div class="form-group">
    <label for="player-name">Player Name <span aria-label="required">*</span></label>
    <input 
      id="player-name" 
      type="text" 
      required 
      aria-describedby="name-error"
      aria-invalid="false">
    <div id="name-error" class="error-message" aria-live="polite"></div>
  </div>
  
  <div class="form-group">
    <label for="jersey-number">Jersey Number</label>
    <input 
      id="jersey-number" 
      type="number" 
      min="0" 
      max="99"
      aria-describedby="jersey-help">
    <div id="jersey-help" class="help-text">Choose a number between 0 and 99</div>
  </div>
</fieldset>
```

**Data Tables**
- [ ] Tables have table headers (`th`)
- [ ] Complex tables use `scope` attributes
- [ ] Table captions describe the table purpose
- [ ] Data tables not used for layout

```html
<!-- Basketball statistics table -->
<table>
  <caption>Player Statistics for Eagles vs Hawks Game</caption>
  <thead>
    <tr>
      <th scope="col">Player</th>
      <th scope="col">Points</th>
      <th scope="col">Rebounds</th>
      <th scope="col">Assists</th>
      <th scope="col">Field Goal %</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">#12 Smith</th>
      <td>8</td>
      <td>3</td>
      <td>5</td>
      <td>50%</td>
    </tr>
  </tbody>
</table>
```

#### 2.3.2 Meaningful Sequence

**Reading Order**
- [ ] Content reads logically without CSS
- [ ] Tab order matches visual order
- [ ] Screen reader navigation is logical
- [ ] Basketball game events announced in chronological order

**Source Order Testing**
```html
<!-- Logical source order for game interface -->
<main>
  <h1>Live Game Interface</h1>
  
  <!-- Score comes first (most important) -->
  <section aria-label="Current Score">
    <h2>Score</h2>
    <!-- Score content -->
  </section>
  
  <!-- Game controls second -->
  <section aria-label="Game Controls">
    <h2>Game Controls</h2>
    <!-- Controls content -->
  </section>
  
  <!-- Statistics last -->
  <section aria-label="Game Statistics">
    <h2>Statistics</h2>
    <!-- Stats content -->
  </section>
</main>
```

### 2.4 Distinguishable Content (Guideline 1.4)

#### 2.4.1 Color and Contrast Audit

**Color Usage**
- [ ] Information not conveyed by color alone
- [ ] Team identification includes text/icons
- [ ] Game status uses icons + color
- [ ] Form errors include text + color
- [ ] Basketball court markings are accessible

**Contrast Ratios** (WCAG AA: 4.5:1 normal text, 3:1 large text)
- [ ] Primary text: 4.5:1 minimum
- [ ] Large text (18px+): 3:1 minimum  
- [ ] UI components: 3:1 minimum
- [ ] Graphics: 3:1 minimum

```css
/* Color-blind friendly basketball team colors */
.team-home {
  background-color: #1976d2; /* Blue - 4.59:1 on white */
  color: #ffffff;
}

.team-home::before {
  content: "🏠 "; /* Icon support */
}

.team-away {
  background-color: #d32f2f; /* Red - 5.04:1 on white */
  color: #ffffff;
}

.team-away::before {
  content: "✈️ "; /* Icon support */
}

/* Game status with icons */
.game-live {
  background-color: #ff5722; /* Orange - 4.52:1 */
  color: #ffffff;
}

.game-live::before {
  content: "🔴 LIVE ";
}

.game-scheduled {
  background-color: #2196f3; /* Blue - 4.59:1 */
  color: #ffffff;
}

.game-scheduled::before {
  content: "⏰ SCHEDULED ";
}
```

**High Contrast Mode Support**
- [ ] Content visible in high contrast mode
- [ ] Custom colors respect user preferences
- [ ] Icons remain visible
- [ ] Focus indicators enhanced

```css
@media (prefers-contrast: high) {
  .button {
    border: 2px solid currentColor;
    background-color: ButtonFace;
    color: ButtonText;
  }
  
  .game-score {
    background-color: Canvas;
    color: CanvasText;
    border: 2px solid currentColor;
  }
}
```

#### 2.4.2 Resize Text Support

**Text Scaling**
- [ ] Text can be enlarged to 200% without horizontal scrolling
- [ ] Layout adapts to larger text sizes
- [ ] No content is cut off or overlapped
- [ ] Touch targets remain accessible

```css
/* Responsive design for text scaling */
.container {
  max-width: none;
  padding: 1rem;
}

.text-content {
  line-height: 1.5;
  word-wrap: break-word;
}

/* Ensure buttons scale with text */
.button {
  min-height: 2.75em; /* Relative to text size */
  padding: 0.75em 1.5em;
}

/* Basketball scoreboard scales with text */
.scoreboard {
  font-size: clamp(1.5rem, 4vw, 3rem);
  line-height: 1.2;
}
```

#### 2.4.3 Images of Text Compliance

**Text in Images**
- [ ] Avoid text in images when possible
- [ ] Essential images of text have alternatives
- [ ] Logo text has text alternative
- [ ] Jersey numbers use actual text when possible

```html
<!-- Good: Use actual text instead of images -->
<div class="jersey-number" aria-label="Jersey number 15">
  15
</div>

<!-- When image is necessary, provide alternative -->
<img src="team-banner.jpg" alt="Eagles Team Champions 2024">

<!-- Avoid: Don't use images for regular text -->
<!-- <img src="welcome-text.png" alt="Welcome to GameTriq"> -->
```

---

## 3. Operable Accessibility

### 3.1 Keyboard Accessible (Guideline 2.1)

#### 3.1.1 Keyboard Navigation Audit

**Keyboard Access**
- [ ] All functionality available via keyboard
- [ ] Tab order is logical and visible
- [ ] Skip links provided for repetitive navigation
- [ ] Basketball game controls keyboard accessible
- [ ] Mobile interfaces support external keyboards

**Keyboard Event Handlers**
- [ ] Click handlers have keyboard equivalents
- [ ] Touch gestures have keyboard alternatives
- [ ] Swipe actions have keyboard support
- [ ] Drag and drop has keyboard alternatives

```html
<!-- Basketball scoring interface with keyboard support -->
<div class="scoring-interface" role="application" aria-label="Basketball Scoring Interface">
  <h2>Scoring Controls</h2>
  
  <!-- Skip link for keyboard users -->
  <a href="#main-controls" class="skip-link">Skip to main controls</a>
  
  <div class="player-scoring">
    <h3>Eagles Players</h3>
    <div class="player-row">
      <span class="player-info">#12 Smith - 8 points</span>
      <div class="scoring-buttons">
        <button onclick="addPoints(12, 2)" onkeydown="handleKeyDown(event, 12, 2)">
          +2 Points
        </button>
        <button onclick="addPoints(12, 3)" onkeydown="handleKeyDown(event, 12, 3)">
          +3 Points
        </button>
        <button onclick="addFreeThrow(12)" onkeydown="handleKeyDown(event, 12, 'ft')">
          Free Throw
        </button>
      </div>
    </div>
  </div>
  
  <div id="main-controls" class="main-controls">
    <button onclick="pauseGame()" onkeydown="handleControlKey(event, 'pause')" accesskey="p">
      ⏸️ Pause Game (Alt+P)
    </button>
    <button onclick="timeout()" onkeydown="handleControlKey(event, 'timeout')" accesskey="t">
      ⏰ Timeout (Alt+T)
    </button>
  </div>
</div>
```

**Keyboard Shortcuts**
- [ ] Shortcuts documented and accessible
- [ ] Single key shortcuts can be disabled
- [ ] Shortcuts use modifier keys appropriately
- [ ] Basketball-specific shortcuts for common actions

```javascript
// Accessible keyboard shortcuts
class KeyboardShortcuts {
  constructor() {
    this.shortcuts = {
      'Alt+P': 'pauseGame',
      'Alt+T': 'timeout',
      'Alt+S': 'substitute',
      'Alt+R': 'resetClock',
      'Escape': 'exitFullscreen'
    };
    
    this.bindEvents();
  }
  
  bindEvents() {
    document.addEventListener('keydown', (e) => {
      // Allow users to disable single-key shortcuts
      if (this.singleKeyDisabled && !e.altKey && !e.ctrlKey && !e.metaKey) {
        return;
      }
      
      const combo = this.getKeyCombo(e);
      if (this.shortcuts[combo]) {
        e.preventDefault();
        this[this.shortcuts[combo]]();
      }
    });
  }
  
  getKeyCombo(e) {
    let combo = '';
    if (e.altKey) combo += 'Alt+';
    if (e.ctrlKey) combo += 'Ctrl+';
    if (e.metaKey) combo += 'Meta+';
    combo += e.key;
    return combo;
  }
}
```

#### 3.1.2 No Keyboard Trap

**Focus Management**
- [ ] Focus never trapped without escape method
- [ ] Modal dialogs have proper focus management
- [ ] Autocomplete widgets allow escape
- [ ] Game interfaces don't trap focus

```javascript
// Modal focus management
class AccessibleModal {
  constructor(modalElement) {
    this.modal = modalElement;
    this.focusableElements = this.getFocusableElements();
    this.firstFocusable = this.focusableElements[0];
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
  }
  
  open() {
    this.previousActiveElement = document.activeElement;
    this.modal.setAttribute('aria-hidden', 'false');
    this.firstFocusable.focus();
    
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Tab') {
        this.trapTabKey(e);
      }
    });
  }
  
  close() {
    this.modal.setAttribute('aria-hidden', 'true');
    this.previousActiveElement.focus();
  }
  
  trapTabKey(e) {
    if (e.shiftKey) {
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable.focus();
      }
    } else {
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable.focus();
      }
    }
  }
}
```

### 3.2 Enough Time (Guideline 2.2)

#### 3.2.1 Timing Adjustable

**Game Clock Considerations**
- [ ] Users can pause personal timers
- [ ] Non-essential time limits can be extended
- [ ] Game clock times are announced
- [ ] Warning before timeout expires

```html
<!-- Game timer with accessibility controls -->
<div class="game-timer" role="timer" aria-live="polite">
  <h3>Game Clock</h3>
  <div class="clock-display" aria-label="Time remaining: 8 minutes 45 seconds">
    8:45
  </div>
  <div class="period-display" aria-label="Quarter 2">
    Q2
  </div>
  
  <!-- User controls for personal timing needs -->
  <div class="timer-controls">
    <button onclick="pausePersonalTimer()" aria-describedby="pause-help">
      Pause My View
    </button>
    <div id="pause-help" class="help-text">
      Pauses updates to your view only. Game continues normally.
    </div>
  </div>
</div>

<!-- Session timeout warning -->
<div id="session-warning" class="timeout-warning" role="alertdialog" aria-hidden="true">
  <h3>Session Timeout Warning</h3>
  <p>Your session will expire in <span id="countdown">5:00</span> minutes.</p>
  <div class="timeout-actions">
    <button onclick="extendSession()">Extend Session</button>
    <button onclick="saveAndLogout()">Save and Logout</button>
  </div>
</div>
```

#### 3.2.2 Moving Content Control

**Auto-updating Content**
- [ ] Users can pause auto-updates
- [ ] Scrolling text can be paused
- [ ] Live feeds have pause controls
- [ ] Automatic slideshots are pausable

```html
<!-- Live game feed with user controls -->
<section class="live-feed" aria-label="Live Game Updates">
  <h3>Live Game Feed</h3>
  
  <div class="feed-controls">
    <button id="pause-feed" onclick="toggleFeedPause()" aria-pressed="false">
      ⏸️ Pause Updates
    </button>
    <button onclick="refreshFeed()">
      🔄 Refresh Now
    </button>
  </div>
  
  <div id="game-feed" aria-live="polite" aria-atomic="false">
    <!-- Live updates appear here -->
  </div>
</section>
```

### 3.3 Seizures and Physical Reactions (Guideline 2.3)

#### 3.3.1 Three Flashes or Below Threshold

**Visual Effects Audit**
- [ ] No content flashes more than 3 times per second
- [ ] Transition effects are smooth
- [ ] Basketball game effects don't cause seizures
- [ ] User can disable animations

```css
/* Safe animation practices */
@keyframes safe-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.live-indicator {
  animation: safe-pulse 2s ease-in-out infinite;
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .live-indicator {
    animation: none;
    opacity: 1;
  }
  
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Avoid rapid flashing */
.score-change {
  transition: background-color 0.3s ease;
  /* Avoid: animation with rapid color changes */
}
```

### 3.4 Navigable (Guideline 2.4)

#### 3.4.1 Bypass Blocks

**Skip Links**
- [ ] Skip to main content link
- [ ] Skip to navigation link  
- [ ] Skip repetitive content
- [ ] Basketball-specific skip links

```html
<body>
  <div class="skip-links">
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <a href="#navigation" class="skip-link">Skip to navigation</a>
    <a href="#live-score" class="skip-link">Skip to live score</a>
    <a href="#game-controls" class="skip-link">Skip to game controls</a>
  </div>
  
  <header>
    <nav id="navigation" aria-label="Main navigation">
      <!-- Navigation content -->
    </nav>
  </header>
  
  <main id="main-content">
    <section id="live-score" aria-label="Current game score">
      <!-- Score content -->
    </section>
    
    <section id="game-controls" aria-label="Game control interface">
      <!-- Controls content -->
    </section>
  </main>
</body>
```

#### 3.4.2 Page Titles

**Title Requirements**
- [ ] Every page has a descriptive title
- [ ] Titles include basketball context
- [ ] Dynamic titles update for live games
- [ ] Titles follow consistent format

```html
<!-- Static page titles -->
<title>Team Management - Phoenix Eagles - GameTriq</title>
<title>Player Statistics - Emily Davis - GameTriq</title>
<title>Schedule - Spring League 2025 - GameTriq</title>

<!-- Dynamic live game title -->
<title id="live-game-title">LIVE: Eagles 52-48 Hawks Q2 8:45 - GameTriq</title>

<script>
// Update title for live games
function updateLiveTitle(homeTeam, homeScore, awayTeam, awayScore, quarter, time) {
  const title = `LIVE: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam} ${quarter} ${time} - GameTriq`;
  document.getElementById('live-game-title').textContent = title;
  document.title = title;
}
</script>
```

#### 3.4.3 Focus Order

**Tab Sequence**
- [ ] Focus order matches visual order
- [ ] Important basketball actions come first
- [ ] Skip links are first in tab order
- [ ] Modal dialogs manage focus properly

**Focus Indicators**
- [ ] Focus is always visible
- [ ] High contrast focus indicators
- [ ] Custom focus styles meet contrast requirements
- [ ] Focus indicators work with all color schemes

```css
/* Accessible focus indicators */
:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* High contrast mode focus */
@media (prefers-contrast: high) {
  :focus {
    outline-width: 3px;
    outline-color: currentColor;
  }
}

/* Dark theme focus */
[data-theme="dark"] :focus {
  outline-color: #66b3ff;
}

/* Basketball-specific focus styles */
.scoring-button:focus {
  outline: 3px solid #ff9800;
  outline-offset: 2px;
  box-shadow: 0 0 0 5px rgba(255, 152, 0, 0.3);
}

.emergency-button:focus {
  outline: 3px solid #ffffff;
  outline-offset: 2px;
  box-shadow: 0 0 0 5px rgba(244, 67, 54, 0.5);
}
```

### 3.5 Input Modalities (Guideline 2.5)

#### 3.5.1 Pointer Gestures

**Gesture Alternatives**
- [ ] Multi-point gestures have single-point alternatives
- [ ] Path-based gestures have alternative actions
- [ ] Basketball court interactions accessible
- [ ] Touch and mouse both supported

```html
<!-- Shot chart with multiple interaction methods -->
<div class="shot-chart" role="img" aria-label="Basketball shot chart">
  <svg viewBox="0 0 400 300" aria-describedby="shot-chart-description">
    <!-- Court background -->
    <rect width="400" height="300" fill="#d2691e" />
    
    <!-- Shot locations with click/tap support -->
    <g class="shot-locations">
      <circle 
        cx="200" cy="100" r="8" 
        class="shot-made" 
        tabindex="0"
        role="button"
        aria-label="Made shot at top of key"
        onclick="showShotDetails(1)"
        onkeydown="handleShotKey(event, 1)">
      </circle>
    </g>
  </svg>
  
  <div id="shot-chart-description">
    Shot chart showing 15 field goal attempts by Emily Davis.
    8 shots made (shown in green), 7 shots missed (shown in red).
    Overall shooting percentage: 53%.
  </div>
  
  <!-- Alternative table view -->
  <details>
    <summary>View shot data as table</summary>
    <table>
      <caption>Shot attempts by court location</caption>
      <thead>
        <tr>
          <th>Location</th>
          <th>Attempts</th>
          <th>Made</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>3-point line</td>
          <td>5</td>
          <td>2</td>
          <td>40%</td>
        </tr>
        <tr>
          <td>Inside paint</td>
          <td>6</td>
          <td>4</td>
          <td>67%</td>
        </tr>
        <tr>
          <td>Mid-range</td>
          <td>4</td>
          <td>2</td>
          <td>50%</td>
        </tr>
      </tbody>
    </table>
  </details>
</div>
```

#### 3.5.2 Pointer Cancellation

**Touch Event Handling**
- [ ] Actions triggered on up event, not down
- [ ] Users can cancel actions before completion
- [ ] Essential actions can use down event (with abort)
- [ ] Basketball scoring allows cancellation

```javascript
// Accessible touch event handling for basketball scoring
class AccessibleScoring {
  constructor() {
    this.bindEvents();
    this.pendingAction = null;
  }
  
  bindEvents() {
    document.querySelectorAll('.scoring-button').forEach(button => {
      // Desktop mouse events
      button.addEventListener('mousedown', (e) => this.handlePointerDown(e));
      button.addEventListener('mouseup', (e) => this.handlePointerUp(e));
      button.addEventListener('mouseleave', (e) => this.cancelAction(e));
      
      // Touch events
      button.addEventListener('touchstart', (e) => this.handlePointerDown(e));
      button.addEventListener('touchend', (e) => this.handlePointerUp(e));
      button.addEventListener('touchcancel', (e) => this.cancelAction(e));
      
      // Keyboard events
      button.addEventListener('keydown', (e) => this.handleKeyDown(e));
      button.addEventListener('keyup', (e) => this.handleKeyUp(e));
    });
  }
  
  handlePointerDown(e) {
    this.pendingAction = {
      element: e.target,
      action: e.target.dataset.action,
      timestamp: Date.now()
    };
    
    // Visual feedback
    e.target.classList.add('pressed');
    
    // Set timeout for accidental long press
    this.cancelTimeout = setTimeout(() => {
      this.cancelAction(e);
    }, 5000);
  }
  
  handlePointerUp(e) {
    if (this.pendingAction && this.pendingAction.element === e.target) {
      // Execute the action
      this.executeAction(this.pendingAction.action);
      this.cleanupAction();
    }
  }
  
  cancelAction(e) {
    if (this.pendingAction) {
      this.pendingAction.element.classList.remove('pressed');
      this.cleanupAction();
      
      // Announce cancellation to screen readers
      this.announce('Action cancelled');
    }
  }
  
  cleanupAction() {
    if (this.cancelTimeout) {
      clearTimeout(this.cancelTimeout);
    }
    this.pendingAction = null;
  }
  
  executeAction(action) {
    switch(action) {
      case 'add-2-points':
        this.addPoints(2);
        break;
      case 'add-3-points':
        this.addPoints(3);
        break;
      case 'free-throw':
        this.addFreeThrow();
        break;
    }
  }
  
  announce(message) {
    const announcer = document.getElementById('aria-announcer');
    announcer.textContent = message;
  }
}
```

---

## 4. Understandable Accessibility

### 4.1 Readable (Guideline 3.1)

#### 4.1.1 Language of Page

**Language Declaration**
- [ ] HTML lang attribute set correctly
- [ ] Language changes marked with lang attribute
- [ ] Basketball terms defined when necessary
- [ ] Multi-language support accessible

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Basketball League Management - GameTriq</title>
</head>
<body>
  <main>
    <h1>Welcome to GameTriq</h1>
    
    <!-- Basketball terms with definitions -->
    <p>The player made a <dfn title="A field goal worth three points, shot from beyond the three-point line">three-pointer</dfn> with 30 seconds left.</p>
    
    <!-- Language changes marked -->
    <p>Welcome to our international tournament. <span lang="es">¡Bienvenidos!</span></p>
  </main>
</body>
</html>
```

#### 4.1.2 Language of Parts

**Multi-language Content**
- [ ] Foreign phrases marked with lang attribute
- [ ] Player/team names with different languages marked
- [ ] Screen readers pronounce correctly
- [ ] Translation tools work properly

### 4.2 Predictable (Guideline 3.2)

#### 4.2.1 Navigation Consistency

**Navigation Patterns**
- [ ] Navigation appears in same location
- [ ] Basketball-specific navigation is consistent
- [ ] Breadcrumbs follow consistent pattern
- [ ] Mobile navigation behaves predictably

```html
<!-- Consistent navigation structure -->
<nav aria-label="Main navigation" role="navigation">
  <ul class="nav-list">
    <li><a href="/dashboard" aria-current="page">Dashboard</a></li>
    <li><a href="/teams">My Teams</a></li>
    <li><a href="/schedule">Schedule</a></li>
    <li><a href="/stats">Statistics</a></li>
    <li><a href="/messages">Messages</a></li>
  </ul>
</nav>

<!-- Consistent breadcrumbs -->
<nav aria-label="Breadcrumb" role="navigation">
  <ol class="breadcrumb">
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/teams">Teams</a></li>
    <li><a href="/teams/eagles">Eagles</a></li>
    <li aria-current="page">Player Statistics</li>
  </ol>
</nav>

<!-- Basketball-specific navigation -->
<nav aria-label="Game navigation" class="game-nav">
  <ul>
    <li><a href="#scoreboard">Scoreboard</a></li>
    <li><a href="#stats">Live Stats</a></li>
    <li><a href="#roster">Rosters</a></li>
    <li><a href="#timeline">Game Timeline</a></li>
  </ul>
</nav>
```

#### 4.2.2 Consistent Identification

**Component Consistency**
- [ ] Same functionality identified consistently
- [ ] Basketball icons used consistently
- [ ] Error patterns are consistent
- [ ] Success patterns are consistent

### 4.3 Input Assistance (Guideline 3.3)

#### 4.3.1 Error Identification

**Form Error Handling**
- [ ] Errors clearly identified
- [ ] Error messages descriptive
- [ ] Basketball-specific validation messages
- [ ] Errors announced to screen readers

```html
<!-- Player registration form with error handling -->
<form class="player-registration" novalidate>
  <fieldset>
    <legend>Player Information</legend>
    
    <div class="form-group">
      <label for="player-name">
        Player Full Name <span class="required">*</span>
      </label>
      <input 
        id="player-name" 
        type="text" 
        required 
        aria-describedby="name-error name-help"
        aria-invalid="true">
      
      <div id="name-help" class="help-text">
        Enter the player's legal first and last name
      </div>
      
      <div id="name-error" class="error-message" role="alert">
        <strong>Error:</strong> Player name is required and must be at least 2 characters long.
      </div>
    </div>
    
    <div class="form-group">
      <label for="birthdate">Date of Birth <span class="required">*</span></label>
      <input 
        id="birthdate" 
        type="date" 
        required
        min="2005-01-01"
        max="2020-12-31"
        aria-describedby="birthdate-error birthdate-help"
        aria-invalid="false">
      
      <div id="birthdate-help" class="help-text">
        Player must be between 4 and 19 years old
      </div>
      
      <div id="birthdate-error" class="error-message" role="alert" style="display: none;">
        <strong>Error:</strong> Invalid date. Player must be between 4 and 19 years old for this league.
      </div>
    </div>
    
    <div class="form-group">
      <label for="jersey-number">Preferred Jersey Number</label>
      <input 
        id="jersey-number" 
        type="number" 
        min="0" 
        max="99"
        aria-describedby="jersey-error jersey-help"
        aria-invalid="false">
      
      <div id="jersey-help" class="help-text">
        Choose a number 0-99. We'll assign the closest available number.
      </div>
      
      <div id="jersey-error" class="error-message" role="alert" style="display: none;">
        <strong>Error:</strong> Jersey number must be between 0 and 99.
      </div>
    </div>
  </fieldset>
  
  <div class="form-actions">
    <button type="submit">Register Player</button>
    <button type="button" onclick="validateForm()">Check for Errors</button>
  </div>
</form>
```

#### 4.3.2 Error Prevention

**High-Consequence Actions**
- [ ] Registration submissions confirmed
- [ ] Payment processes have confirmation
- [ ] Data deletion requires confirmation
- [ ] Game score changes can be reviewed

```html
<!-- Confirmation dialog for important basketball actions -->
<div class="confirmation-dialog" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-message">
  <h3 id="confirm-title">Confirm Game Score Change</h3>
  <p id="confirm-message">
    You are about to change the score from Eagles 52, Hawks 48 to Eagles 54, Hawks 48.
    This action will be recorded in the official game log.
  </p>
  
  <div class="dialog-actions">
    <button onclick="confirmScoreChange()" class="primary-action">
      Yes, Update Score
    </button>
    <button onclick="cancelScoreChange()" class="secondary-action">
      Cancel
    </button>
  </div>
</div>

<!-- Payment confirmation -->
<div class="payment-confirmation">
  <h3>Confirm Payment</h3>
  <div class="payment-summary">
    <p><strong>Player:</strong> Emily Davis</p>
    <p><strong>Team:</strong> Phoenix Eagles</p>
    <p><strong>Amount:</strong> $125.00</p>
    <p><strong>Description:</strong> Spring season registration fee</p>
  </div>
  
  <div class="confirmation-checkbox">
    <label>
      <input type="checkbox" required aria-describedby="payment-terms">
      I confirm the payment details are correct
    </label>
    <div id="payment-terms" class="help-text">
      This payment is non-refundable after processing. Please review all details carefully.
    </div>
  </div>
</div>
```

---

## 5. Robust Accessibility

### 5.1 Compatible (Guideline 4.1)

#### 5.1.1 Parsing and Validation

**HTML Validation**
- [ ] Valid HTML5 markup
- [ ] No duplicate IDs
- [ ] Proper nesting of elements
- [ ] ARIA attributes used correctly

```html
<!-- Valid HTML structure for basketball interface -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Game: Eagles vs Hawks - GameTriq</title>
</head>
<body>
  <header>
    <h1>Basketball League Management</h1>
  </header>
  
  <main>
    <section aria-labelledby="game-title">
      <h2 id="game-title">Live Game</h2>
      
      <!-- Properly nested and valid structure -->
      <div class="scoreboard" role="region" aria-label="Current game score">
        <div class="team home-team">
          <h3>Eagles</h3>
          <div class="score" aria-label="Eagles score: 52">52</div>
        </div>
        
        <div class="game-info">
          <div class="period" aria-label="Quarter 2">Q2</div>
          <div class="time" aria-label="8 minutes 45 seconds remaining">8:45</div>
        </div>
        
        <div class="team away-team">
          <h3>Hawks</h3>
          <div class="score" aria-label="Hawks score: 48">48</div>
        </div>
      </div>
    </section>
  </main>
</body>
</html>
```

#### 5.1.2 Name, Role, Value

**ARIA Implementation**
- [ ] All UI components have accessible names
- [ ] Roles accurately describe function
- [ ] States and properties updated dynamically
- [ ] Basketball-specific components properly labeled

```html
<!-- Custom basketball components with proper ARIA -->
<div class="game-clock" role="timer" aria-label="Game clock">
  <div class="clock-display" aria-live="off">
    <span aria-label="Time remaining: 8 minutes 45 seconds">8:45</span>
  </div>
  <div class="period-display" aria-label="Quarter 2">Q2</div>
  
  <div class="clock-controls">
    <button 
      id="clock-start"
      aria-describedby="start-help"
      onclick="startClock()"
      disabled>
      <span aria-hidden="true">▶️</span>
      Start Clock
    </button>
    <div id="start-help" class="sr-only">
      Starts the game clock. Clock must be stopped to start.
    </div>
    
    <button 
      id="clock-pause"
      aria-describedby="pause-help"
      onclick="pauseClock()">
      <span aria-hidden="true">⏸️</span>
      Pause Clock
    </button>
    <div id="pause-help" class="sr-only">
      Pauses the game clock. Game time stops but real time continues.
    </div>
  </div>
</div>

<!-- Player substitution interface -->
<div class="substitution-interface" role="region" aria-labelledby="sub-heading">
  <h3 id="sub-heading">Player Substitution</h3>
  
  <fieldset>
    <legend>Select players for substitution</legend>
    
    <div class="player-selection">
      <label for="player-out">Player leaving game:</label>
      <select 
        id="player-out" 
        required 
        aria-describedby="player-out-help">
        <option value="">Select player...</option>
        <option value="12">Number 12 - Smith - Point Guard - Currently playing</option>
        <option value="15">Number 15 - Davis - Shooting Guard - Currently playing</option>
      </select>
      <div id="player-out-help" class="help-text">
        Choose the player who will leave the game
      </div>
    </div>
    
    <div class="player-selection">
      <label for="player-in">Player entering game:</label>
      <select 
        id="player-in" 
        required 
        aria-describedby="player-in-help">
        <option value="">Select player...</option>
        <option value="8">Number 8 - Lee - Guard - On bench</option>
        <option value="19">Number 19 - Clark - Forward - On bench</option>
      </select>
      <div id="player-in-help" class="help-text">
        Choose the player who will enter the game
      </div>
    </div>
  </fieldset>
  
  <div class="substitution-actions">
    <button 
      type="button" 
      onclick="makeSubstitution()"
      aria-describedby="sub-confirm-help"
      disabled
      id="confirm-substitution">
      Confirm Substitution
    </button>
    <div id="sub-confirm-help" class="help-text">
      Substitution will be recorded in the official game log
    </div>
  </div>
</div>

<!-- Live updating score with appropriate ARIA -->
<div class="live-score-feed" aria-live="polite" aria-atomic="true">
  <h3>Live Score Updates</h3>
  <div id="score-announcements">
    <!-- Screen reader announcements appear here -->
  </div>
</div>
```

#### 5.1.3 Status Messages

**Live Regions and Announcements**
- [ ] Score changes announced
- [ ] Game state changes announced  
- [ ] Form errors announced
- [ ] Success messages announced

```javascript
// Accessible status announcements for basketball
class BasketballAnnouncer {
  constructor() {
    this.setupAnnouncer();
    this.setupScoreTracking();
  }
  
  setupAnnouncer() {
    // Create announcement regions if they don't exist
    if (!document.getElementById('aria-announcer-polite')) {
      const polite = document.createElement('div');
      polite.id = 'aria-announcer-polite';
      polite.setAttribute('aria-live', 'polite');
      polite.setAttribute('aria-atomic', 'true');
      polite.className = 'sr-only';
      document.body.appendChild(polite);
    }
    
    if (!document.getElementById('aria-announcer-assertive')) {
      const assertive = document.createElement('div');
      assertive.id = 'aria-announcer-assertive';
      assertive.setAttribute('aria-live', 'assertive');
      assertive.setAttribute('aria-atomic', 'true');
      assertive.className = 'sr-only';
      document.body.appendChild(assertive);
    }
  }
  
  announceScore(homeTeam, homeScore, awayTeam, awayScore, quarter, time) {
    const message = `Score update: ${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}. ${quarter}, ${time} remaining.`;
    this.announce(message, 'assertive');
  }
  
  announceGameEvent(event, player, team) {
    let message = '';
    switch(event) {
      case 'timeout':
        message = `${team} timeout called.`;
        break;
      case 'substitution':
        message = `Player substitution for ${team}.`;
        break;
      case 'foul':
        message = `Foul called on ${player}, ${team}.`;
        break;
      case 'period_end':
        message = `End of quarter.`;
        break;
    }
    
    this.announce(message, 'polite');
  }
  
  announceError(errorMessage) {
    this.announce(`Error: ${errorMessage}`, 'assertive');
  }
  
  announceSuccess(successMessage) {
    this.announce(`Success: ${successMessage}`, 'polite');
  }
  
  announce(message, priority = 'polite') {
    const announcerId = priority === 'assertive' 
      ? 'aria-announcer-assertive' 
      : 'aria-announcer-polite';
    
    const announcer = document.getElementById(announcerId);
    
    // Clear previous message and announce new one
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
    
    // Clear after announcement to avoid repetition
    setTimeout(() => {
      announcer.textContent = '';
    }, 5000);
  }
  
  setupScoreTracking() {
    // Monitor score changes and announce them
    this.previousScores = {};
    
    // Use MutationObserver to detect score changes
    const scoreElements = document.querySelectorAll('[data-score]');
    scoreElements.forEach(element => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            this.handleScoreChange(element);
          }
        });
      });
      
      observer.observe(element, {
        childList: true,
        characterData: true,
        subtree: true
      });
    });
  }
  
  handleScoreChange(scoreElement) {
    const team = scoreElement.dataset.team;
    const newScore = parseInt(scoreElement.textContent);
    const oldScore = this.previousScores[team] || 0;
    
    if (newScore !== oldScore && !isNaN(newScore)) {
      this.previousScores[team] = newScore;
      
      // Announce the score change
      const scoreDifference = newScore - oldScore;
      const message = `${team} scores ${scoreDifference} point${scoreDifference !== 1 ? 's' : ''}. New score: ${newScore}.`;
      this.announce(message, 'assertive');
    }
  }
}

// Initialize announcer
document.addEventListener('DOMContentLoaded', () => {
  window.basketballAnnouncer = new BasketballAnnouncer();
});
```

---

## 6. Basketball-Specific Accessibility

### 6.1 Live Game Accessibility

#### 6.1.1 Real-time Score Updates

**Score Accessibility Requirements**
- [ ] Score changes announced immediately
- [ ] Game clock updates provided
- [ ] Play-by-play accessible to screen readers
- [ ] Timeout and substitution notifications

```html
<!-- Live game accessibility structure -->
<section class="live-game" role="main" aria-labelledby="game-title">
  <h1 id="game-title">Live Game: Eagles vs Hawks</h1>
  
  <!-- Live score with proper announcements -->
  <div class="scoreboard" role="region" aria-label="Live scoreboard">
    <div class="home-team">
      <h2>Eagles (Home)</h2>
      <div 
        class="score" 
        data-team="Eagles" 
        data-score="52"
        aria-label="Eagles score: 52 points">
        52
      </div>
    </div>
    
    <div class="game-status">
      <div class="period" aria-label="Quarter 2">Q2</div>
      <div 
        class="game-clock" 
        aria-label="8 minutes 45 seconds remaining"
        aria-live="off">
        8:45
      </div>
    </div>
    
    <div class="away-team">
      <h2>Hawks (Away)</h2>
      <div 
        class="score" 
        data-team="Hawks" 
        data-score="48"
        aria-label="Hawks score: 48 points">
        48
      </div>
    </div>
  </div>
  
  <!-- Game events with live updates -->
  <div class="game-events" role="log" aria-label="Game events" aria-live="polite">
    <h3>Recent Events</h3>
    <ul id="event-list">
      <li>8:45 - Eagles timeout</li>
      <li>8:52 - Score: Emily Davis made 2-point shot</li>
      <li>9:01 - Hawks missed 3-pointer</li>
    </ul>
  </div>
  
  <!-- Live commentary for screen readers -->
  <div id="screen-reader-commentary" class="sr-only" aria-live="assertive">
    <!-- Real-time updates for screen readers -->
  </div>
</section>
```

#### 6.1.2 Game Control Accessibility

**Referee/Scorekeeper Interface**
- [ ] All controls keyboard accessible
- [ ] Actions can be confirmed/cancelled
- [ ] Mistakes can be corrected
- [ ] Emergency procedures accessible

```html
<!-- Accessible game control interface -->
<section class="game-controls" role="region" aria-labelledby="controls-title">
  <h2 id="controls-title">Game Control Interface</h2>
  
  <!-- Scoring controls -->
  <fieldset class="scoring-controls">
    <legend>Scoring Actions</legend>
    
    <div class="team-selection">
      <legend>Select Team</legend>
      <label>
        <input type="radio" name="active-team" value="eagles" checked>
        Eagles (Home)
      </label>
      <label>
        <input type="radio" name="active-team" value="hawks">
        Hawks (Away)
      </label>
    </div>
    
    <div class="player-selection">
      <label for="scoring-player">Player who scored:</label>
      <select id="scoring-player" required>
        <option value="">Select player...</option>
        <option value="12">#12 Smith - Point Guard</option>
        <option value="15">#15 Davis - Shooting Guard</option>
      </select>
    </div>
    
    <div class="score-type">
      <legend>Score Type</legend>
      <button 
        class="score-button" 
        data-points="2"
        aria-describedby="two-point-help"
        onclick="addScore(2)">
        +2 Points
      </button>
      <div id="two-point-help" class="help-text">
        Field goal worth 2 points
      </div>
      
      <button 
        class="score-button" 
        data-points="3"
        aria-describedby="three-point-help"
        onclick="addScore(3)">
        +3 Points  
      </button>
      <div id="three-point-help" class="help-text">
        Field goal worth 3 points, shot from beyond the arc
      </div>
      
      <button 
        class="score-button" 
        data-points="1"
        aria-describedby="free-throw-help"
        onclick="addScore(1)">
        Free Throw (+1)
      </button>
      <div id="free-throw-help" class="help-text">
        Uncontested shot worth 1 point
      </div>
    </div>
  </fieldset>
  
  <!-- Game management controls -->
  <fieldset class="game-management">
    <legend>Game Management</legend>
    
    <button 
      class="control-button timeout-button"
      onclick="callTimeout()"
      aria-describedby="timeout-help">
      🕐 Call Timeout
    </button>
    <div id="timeout-help" class="help-text">
      Stops the game clock for team strategy discussion
    </div>
    
    <button 
      class="control-button substitution-button"
      onclick="openSubstitution()"
      aria-describedby="sub-help">
      ↔️ Player Substitution
    </button>
    <div id="sub-help" class="help-text">
      Replace a player currently on court with a bench player
    </div>
    
    <button 
      class="control-button foul-button"
      onclick="openFoulInterface()"
      aria-describedby="foul-help">
      ⚠️ Call Foul
    </button>
    <div id="foul-help" class="help-text">
      Record a rule violation by a player
    </div>
  </fieldset>
  
  <!-- Emergency controls -->
  <fieldset class="emergency-controls">
    <legend>Emergency Controls</legend>
    
    <button 
      class="emergency-button"
      onclick="handleEmergency()"
      aria-describedby="emergency-help">
      🚨 Emergency Stop
    </button>
    <div id="emergency-help" class="help-text">
      Immediately stop game for medical or safety emergency
    </div>
  </fieldset>
  
  <!-- Correction controls -->
  <fieldset class="correction-controls">
    <legend>Score Corrections</legend>
    
    <button 
      class="undo-button"
      onclick="undoLastAction()"
      aria-describedby="undo-help">
      ↶ Undo Last Action
    </button>
    <div id="undo-help" class="help-text">
      Reverse the most recent scoring or game action
    </div>
    
    <div class="recent-actions" role="log" aria-label="Recent actions">
      <h4>Last 5 Actions</h4>
      <ol id="action-history">
        <li>8:52 - Added 2 points for Eagles #15 Davis</li>
        <li>9:15 - Hawks timeout called</li>
        <li>9:23 - Added 1 point (free throw) for Eagles #12 Smith</li>
      </ol>
    </div>
  </fieldset>
</section>
```

### 6.2 Multi-Generational Accessibility

#### 6.2.1 Youth Player Interface (Ages 6-12)

**Simplified Interface Requirements**
- [ ] Large touch targets (56px minimum)
- [ ] Simple language and instructions
- [ ] Visual icons with text labels
- [ ] Reduced cognitive load
- [ ] Parental controls accessible

```html
<!-- Youth-friendly player interface -->
<section class="youth-interface" data-age-group="youth">
  <h1>Hi Emily! 👋</h1>
  
  <!-- Simplified navigation -->
  <nav class="youth-nav" aria-label="Main sections">
    <a href="/my-team" class="nav-card">
      <div class="nav-icon">👥</div>
      <div class="nav-label">My Team</div>
    </a>
    
    <a href="/my-games" class="nav-card">
      <div class="nav-icon">🏀</div>
      <div class="nav-label">My Games</div>
    </a>
    
    <a href="/my-stats" class="nav-card">
      <div class="nav-icon">📊</div>
      <div class="nav-label">My Stats</div>
    </a>
    
    <a href="/photos" class="nav-card">
      <div class="nav-icon">📸</div>
      <div class="nav-label">Team Photos</div>
    </a>
  </nav>
  
  <!-- Achievement display -->
  <section class="achievements" aria-labelledby="achievements-title">
    <h2 id="achievements-title">My Basketball Achievements 🏆</h2>
    
    <div class="achievement-grid">
      <div class="achievement earned" aria-label="Achievement earned">
        <div class="achievement-icon">🏀</div>
        <div class="achievement-name">First Basket</div>
        <div class="achievement-description">You made your first basket!</div>
      </div>
      
      <div class="achievement earned" aria-label="Achievement earned">
        <div class="achievement-icon">🎯</div>
        <div class="achievement-name">Perfect Free Throws</div>
        <div class="achievement-description">Made all free throws in a game</div>
      </div>
      
      <div class="achievement locked" aria-label="Achievement not yet earned">
        <div class="achievement-icon">⭐</div>
        <div class="achievement-name">Team MVP</div>
        <div class="achievement-description">Be the most valuable player</div>
      </div>
    </div>
  </section>
  
  <!-- Simple stats display -->
  <section class="simple-stats" aria-labelledby="stats-title">
    <h2 id="stats-title">My Basketball Numbers 📊</h2>
    
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-number">12</div>
        <div class="stat-label">Points Per Game</div>
        <div class="stat-icon">🏀</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">4</div>
        <div class="stat-label">Rebounds Per Game</div>
        <div class="stat-icon">💪</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">3</div>
        <div class="stat-label">Assists Per Game</div>
        <div class="stat-icon">🤝</div>
      </div>
    </div>
  </section>
</section>
```

#### 6.2.2 Senior/Adult Interface Considerations

**Enhanced Accessibility for Older Users**
- [ ] Larger text options available
- [ ] High contrast mode
- [ ] Simplified navigation options
- [ ] Voice control support
- [ ] Reduced animation preferences

```css
/* Senior-friendly interface adjustments */
.senior-mode {
  font-size: 1.2em;
  line-height: 1.6;
}

.senior-mode .button {
  min-height: 52px;
  font-size: 16px;
  border: 2px solid currentColor;
}

.senior-mode .nav-link {
  padding: 16px 24px;
  font-weight: 600;
}

/* High contrast for seniors */
@media (prefers-contrast: high), .senior-high-contrast {
  .card {
    border: 2px solid currentColor;
    background: Canvas;
    color: CanvasText;
  }
  
  .button {
    background: ButtonFace;
    color: ButtonText;
    border: 2px solid ButtonText;
  }
}

/* Reduced motion for seniors */
@media (prefers-reduced-motion: reduce), .senior-reduced-motion {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6.3 Emergency and Safety Accessibility

#### 6.3.1 Emergency Alert System

**Accessible Emergency Procedures**
- [ ] Emergency buttons highly visible
- [ ] Multiple notification channels
- [ ] Clear evacuation instructions
- [ ] Medical emergency protocols
- [ ] Heat safety alerts accessible

```html
<!-- Accessible emergency alert system -->
<div class="emergency-system" role="region" aria-labelledby="emergency-title">
  <h2 id="emergency-title" class="sr-only">Emergency Alert System</h2>
  
  <!-- Emergency notification area -->
  <div 
    id="emergency-alerts" 
    role="alert" 
    aria-live="assertive" 
    aria-atomic="true"
    class="emergency-alerts">
    <!-- Emergency messages appear here -->
  </div>
  
  <!-- Emergency action buttons -->
  <div class="emergency-controls">
    <button 
      class="emergency-button medical"
      onclick="triggerMedicalEmergency()"
      aria-describedby="medical-help">
      <span class="emergency-icon">🚑</span>
      <span class="emergency-label">Medical Emergency</span>
    </button>
    <div id="medical-help" class="sr-only">
      Call for immediate medical assistance. Will contact 911 and facility staff.
    </div>
    
    <button 
      class="emergency-button fire"
      onclick="triggerFireEmergency()"
      aria-describedby="fire-help">
      <span class="emergency-icon">🔥</span>
      <span class="emergency-label">Fire/Evacuation</span>
    </button>
    <div id="fire-help" class="sr-only">
      Trigger building evacuation procedures. Will sound alarms and contact emergency services.
    </div>
    
    <button 
      class="emergency-button security"
      onclick="triggerSecurityEmergency()"
      aria-describedby="security-help">
      <span class="emergency-icon">🚨</span>
      <span class="emergency-label">Security Emergency</span>
    </button>
    <div id="security-help" class="sr-only">
      Report security incident or threat. Will contact facility security and law enforcement.
    </div>
  </div>
</div>

<!-- Heat safety alerts (Phoenix-specific) -->
<div class="heat-safety" role="region" aria-labelledby="heat-title">
  <h3 id="heat-title">Heat Safety Monitor</h3>
  
  <div 
    class="heat-status" 
    data-heat-level="orange"
    role="status"
    aria-live="polite">
    <div class="heat-indicator">
      <span class="heat-icon">🌡️</span>
      <span class="heat-level">Orange Alert</span>
    </div>
    
    <div class="heat-details">
      <p><strong>Temperature:</strong> 108°F (42°C)</p>
      <p><strong>Heat Index:</strong> 115°F (46°C)</p>
      <p><strong>Action Required:</strong> Enhanced safety protocols in effect</p>
    </div>
    
    <div class="heat-protocols">
      <h4>Current Safety Protocols:</h4>
      <ul>
        <li>Water breaks every 6 minutes</li>
        <li>Shade breaks mandatory between plays</li>
        <li>Game periods reduced to 6 minutes</li>
        <li>Medical staff on high alert</li>
      </ul>
    </div>
  </div>
</div>
```

---

## 7. Testing Procedures

### 7.1 Automated Testing Tools

#### 7.1.1 Accessibility Testing Stack

**Required Testing Tools**
- [ ] axe-core automated testing
- [ ] WAVE web accessibility evaluator
- [ ] Lighthouse accessibility audit
- [ ] Pa11y command-line testing
- [ ] Color contrast analyzers

```javascript
// Automated accessibility testing setup
const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');

class AccessibilityTesting {
  async runAccessibilityTests() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Test basketball-specific pages
    const pagesToTest = [
      '/dashboard',
      '/live-game',
      '/player-registration',
      '/team-management',
      '/statistics',
      '/schedule'
    ];
    
    const results = {};
    
    for (const pagePath of pagesToTest) {
      await page.goto(`http://localhost:3000${pagePath}`);
      
      const axeResults = await new AxePuppeteer(page)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
        
      results[pagePath] = {
        violations: axeResults.violations,
        passes: axeResults.passes,
        incomplete: axeResults.incomplete
      };
      
      // Test specific basketball interactions
      if (pagePath === '/live-game') {
        await this.testLiveGameAccessibility(page);
      }
    }
    
    await browser.close();
    return results;
  }
  
  async testLiveGameAccessibility(page) {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    console.log('First focused element:', focusedElement);
    
    // Test screen reader announcements
    const scoreElement = await page.$('[data-score]');
    if (scoreElement) {
      await page.evaluate(el => {
        el.textContent = '54'; // Simulate score change
      }, scoreElement);
      
      // Check if announcement was made
      const announcement = await page.$eval('#aria-announcer-assertive', el => el.textContent);
      console.log('Score change announcement:', announcement);
    }
  }
  
  generateReport(results) {
    let report = '# Accessibility Test Report\n\n';
    
    Object.entries(results).forEach(([page, result]) => {
      report += `## ${page}\n\n`;
      report += `- **Violations**: ${result.violations.length}\n`;
      report += `- **Passes**: ${result.passes.length}\n`;
      report += `- **Incomplete**: ${result.incomplete.length}\n\n`;
      
      if (result.violations.length > 0) {
        report += '### Violations:\n\n';
        result.violations.forEach(violation => {
          report += `- **${violation.id}**: ${violation.description}\n`;
          report += `  - Impact: ${violation.impact}\n`;
          report += `  - Help: ${violation.help}\n\n`;
        });
      }
    });
    
    return report;
  }
}
```

#### 7.1.2 Basketball-Specific Test Cases

**Live Game Testing**
- [ ] Score updates announced to screen readers
- [ ] Game clock changes accessible
- [ ] Player substitutions properly labeled
- [ ] Emergency procedures keyboard accessible

**Form Testing**
- [ ] Player registration forms fully accessible
- [ ] Error messages properly associated
- [ ] Required fields clearly marked
- [ ] Basketball-specific validation works

```javascript
// Basketball-specific accessibility tests
describe('Basketball Accessibility Tests', () => {
  test('Live score updates are announced', async () => {
    const page = await browser.newPage();
    await page.goto('/live-game');
    
    // Monitor aria announcements
    const announcements = [];
    page.on('console', msg => {
      if (msg.text().includes('aria-announcement')) {
        announcements.push(msg.text());
      }
    });
    
    // Simulate score change
    await page.click('[data-action="add-2-points"]');
    
    // Wait for announcement
    await page.waitForTimeout(1000);
    
    expect(announcements).toContain('Score update: Eagles 54, Hawks 48');
  });
  
  test('Player registration form is accessible', async () => {
    const page = await browser.newPage();
    await page.goto('/player-registration');
    
    // Check form accessibility
    const axeResults = await new AxePuppeteer(page)
      .include('form')
      .analyze();
      
    expect(axeResults.violations).toHaveLength(0);
    
    // Test form submission with errors
    await page.click('button[type="submit"]');
    
    // Check error announcements
    const errorElement = await page.$('[role="alert"]');
    expect(errorElement).toBeTruthy();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.getAttribute('id'));
    expect(focusedElement).toBe('player-name');
  });
  
  test('Emergency controls are keyboard accessible', async () => {
    const page = await browser.newPage();
    await page.goto('/game-controls');
    
    // Navigate to emergency button via keyboard
    await page.focus('.emergency-button');
    
    // Check focus is visible
    const focusOutline = await page.evaluate(() => {
      const element = document.activeElement;
      const styles = window.getComputedStyle(element);
      return styles.outline !== 'none';
    });
    
    expect(focusOutline).toBe(true);
    
    // Test activation via keyboard
    await page.keyboard.press('Enter');
    
    // Check confirmation dialog appears
    const dialog = await page.$('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
  });
});
```

### 7.2 Manual Testing Procedures

#### 7.2.1 Screen Reader Testing

**Testing Checklist**
- [ ] NVDA testing (Windows)
- [ ] JAWS testing (Windows)  
- [ ] VoiceOver testing (macOS/iOS)
- [ ] TalkBack testing (Android)

**Basketball-Specific Screen Reader Tests**
```
Test Script: Live Game with Screen Reader

1. Navigate to live game page
2. Confirm page title is announced: "Live Game: Eagles vs Hawks"
3. Navigate through page structure using headings (H key)
   - Should announce: "Heading level 1: Live Game"
   - Should announce: "Heading level 2: Current Score"
   - Should announce: "Heading level 2: Game Statistics"
4. Navigate to scoreboard region
   - Should announce: "Region: Live scoreboard"
   - Should read current score clearly
5. Monitor live updates
   - Score changes should be announced automatically
   - Game clock updates should be available on request
6. Test game controls
   - All buttons should have clear labels
   - Instructions should be available
   - Confirmation dialogs should be announced

Expected Results:
- All content accessible via screen reader
- Live updates announced appropriately
- Basketball terminology is clear
- Navigation is logical and efficient
```

#### 7.2.2 Keyboard Navigation Testing

**Navigation Test Script**
```
Test Script: Keyboard Navigation - Basketball Interface

Starting Point: Dashboard page

Tab Navigation Test:
1. Press Tab to begin navigation
2. Verify skip links appear and function
3. Navigate through main navigation
4. Test dropdown menus with arrow keys
5. Navigate to live game section
6. Test all game controls via keyboard
7. Verify modal dialogs trap focus
8. Test emergency controls accessibility

Arrow Key Navigation:
1. Test data tables with arrow keys
2. Navigate player rosters
3. Navigate through statistics
4. Test calendar/schedule navigation

Shortcut Key Testing:
1. Test Alt+P for pause game
2. Test Alt+T for timeout
3. Test Alt+S for substitution
4. Test Escape to close modals

Expected Results:
- All functionality accessible via keyboard
- Focus indicators are visible
- Tab order is logical
- Shortcuts work as documented
- No keyboard traps exist
```

#### 7.2.3 Color and Contrast Testing

**Visual Accessibility Checklist**
- [ ] Color contrast ratios meet WCAG AA standards
- [ ] Information not conveyed by color alone
- [ ] High contrast mode support
- [ ] Color-blind simulation testing

```javascript
// Color contrast testing utility
class ContrastTester {
  constructor() {
    this.wcagAAMinimum = 4.5;
    this.wcagAALarge = 3.0;
  }
  
  testPageContrast() {
    const results = [];
    
    // Test all text elements
    const textElements = document.querySelectorAll('*:not(script):not(style)');
    
    textElements.forEach(element => {
      if (element.innerText && element.innerText.trim()) {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = this.getBackgroundColor(element);
        
        if (backgroundColor) {
          const ratio = this.calculateContrast(color, backgroundColor);
          const fontSize = parseFloat(styles.fontSize);
          const fontWeight = styles.fontWeight;
          
          const isLargeText = fontSize >= 24 || (fontSize >= 19 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
          const minimum = isLargeText ? this.wcagAALarge : this.wcagAAMinimum;
          
          results.push({
            element: element.tagName + (element.className ? '.' + element.className : ''),
            color,
            backgroundColor,
            ratio,
            passes: ratio >= minimum,
            minimum,
            isLargeText
          });
        }
      }
    });
    
    return results;
  }
  
  calculateContrast(color1, color2) {
    // Convert colors to RGB and calculate contrast ratio
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  // Additional helper methods for color calculations...
}
```

### 7.3 User Testing with Assistive Technology

#### 7.3.1 User Testing Protocol

**Test Participants**
- [ ] Screen reader users (blind/low vision)
- [ ] Keyboard-only users (motor disabilities)
- [ ] Voice control users
- [ ] Cognitive accessibility users
- [ ] Youth users (ages 8-12)
- [ ] Senior users (ages 60+)

**Basketball-Specific User Tasks**
```
User Testing Tasks: Basketball League Platform

Task 1: Player Registration
- Navigate to player registration
- Complete form for a 10-year-old player
- Submit with intentional error
- Correct error and submit successfully

Task 2: Live Game Following
- Navigate to live game page
- Follow along with score updates
- Find specific player statistics
- Understand current game situation

Task 3: Team Management
- Access team roster
- Find specific player information
- Update player status (injured/available)
- Communicate with team parents

Task 4: Emergency Scenario
- Locate emergency controls
- Understand how to report medical emergency
- Navigate heat safety information
- Find emergency contact information

Success Criteria:
- Task completion rate >80%
- User satisfaction >4/5
- Critical issues: 0
- Major issues: <3
- Time on task within acceptable range
```

#### 7.3.2 Assistive Technology Compatibility

**Testing Matrix**

| Platform | Screen Reader | Voice Control | Switch Navigation | Magnification |
|----------|---------------|---------------|-------------------|----------------|
| Windows | NVDA ✅ JAWS ✅ | Dragon ✅ | Switch Access ✅ | ZoomText ✅ |
| macOS | VoiceOver ✅ | Voice Control ✅ | Switch Control ✅ | Zoom ✅ |
| iOS | VoiceOver ✅ | Voice Control ✅ | Switch Control ✅ | Zoom ✅ |
| Android | TalkBack ✅ | Voice Access ✅ | Switch Access ✅ | Magnification ✅ |

---

## 8. Remediation Guidelines

### 8.1 Common Issue Fixes

#### 8.1.1 Missing Alt Text

**Problem:** Images without alternative text
**Impact:** Screen reader users cannot understand image content
**Fix:**

```html
<!-- Before: Inaccessible -->
<img src="player-photo.jpg">
<img src="team-logo.png">

<!-- After: Accessible -->
<img src="player-photo.jpg" alt="Emily Davis, #15, Point Guard for Phoenix Eagles">
<img src="team-logo.png" alt="Phoenix Eagles team logo">

<!-- Decorative images -->
<img src="basketball-decoration.png" alt="" role="presentation">
```

#### 8.1.2 Low Color Contrast

**Problem:** Text doesn't meet WCAG contrast requirements
**Impact:** Users with low vision cannot read content
**Fix:**

```css
/* Before: Low contrast (2.1:1) */
.team-name {
  color: #999999;
  background: #ffffff;
}

/* After: Accessible contrast (4.52:1) */
.team-name {
  color: #666666;
  background: #ffffff;
}

/* Or use high contrast mode */
@media (prefers-contrast: high) {
  .team-name {
    color: #000000;
    background: #ffffff;
    border: 1px solid currentColor;
  }
}
```

#### 8.1.3 Missing Form Labels

**Problem:** Form inputs without associated labels
**Impact:** Screen readers cannot identify input purpose
**Fix:**

```html
<!-- Before: Inaccessible -->
<input type="text" placeholder="Player name">
<input type="number" placeholder="Jersey number">

<!-- After: Accessible -->
<label for="player-name">Player Name</label>
<input id="player-name" type="text" required>

<label for="jersey-number">Jersey Number (0-99)</label>
<input id="jersey-number" type="number" min="0" max="99">

<!-- With additional help text -->
<label for="birthdate">Date of Birth</label>
<input id="birthdate" type="date" aria-describedby="birthdate-help">
<div id="birthdate-help">Player must be between 4 and 19 years old</div>
```

#### 8.1.4 Keyboard Navigation Issues

**Problem:** Interface not accessible via keyboard
**Impact:** Keyboard users cannot access functionality
**Fix:**

```html
<!-- Before: Mouse-only interaction -->
<div class="score-button" onclick="addPoints(2)">+2</div>

<!-- After: Keyboard accessible -->
<button class="score-button" onclick="addPoints(2)" onkeydown="handleKeyPress(event, 2)">
  Add 2 Points
</button>

<!-- Or better: Use proper button semantics -->
<button class="score-button" onclick="addPoints(2)">
  Add 2 Points for <span class="player-name">Emily Davis</span>
</button>
```

### 8.2 Basketball-Specific Fixes

#### 8.2.1 Live Game Accessibility Issues

**Problem:** Score updates not announced
**Fix:**

```html
<!-- Add live regions for announcements -->
<div id="score-announcer" aria-live="assertive" class="sr-only"></div>

<script>
function updateScore(team, newScore) {
  // Update visual score
  document.querySelector(`[data-team="${team}"]`).textContent = newScore;
  
  // Announce to screen readers
  const announcer = document.getElementById('score-announcer');
  announcer.textContent = `${team} now has ${newScore} points`;
}
</script>
```

**Problem:** Game controls not properly labeled
**Fix:**

```html
<!-- Before: Unclear button purpose -->
<button onclick="pauseGame()">⏸️</button>
<button onclick="timeout()">🕐</button>

<!-- After: Clear accessible labels -->
<button onclick="pauseGame()" aria-label="Pause game clock">
  <span aria-hidden="true">⏸️</span>
  Pause Game
</button>

<button onclick="timeout()" aria-label="Call team timeout">
  <span aria-hidden="true">🕐</span>
  Timeout
</button>
```

#### 8.2.2 Statistical Data Accessibility

**Problem:** Charts and graphs not accessible
**Fix:**

```html
<!-- Provide data table alternative -->
<div class="statistics-container">
  <div class="chart-container">
    <canvas id="scoring-chart" aria-labelledby="chart-title" aria-describedby="chart-description">
      <!-- Chart rendered here -->
    </canvas>
    
    <div id="chart-title" class="sr-only">Player Scoring Trends</div>
    <div id="chart-description" class="sr-only">
      Chart showing Emily Davis' scoring over the last 10 games, 
      ranging from 8 points to 16 points with an average of 12 points per game.
    </div>
  </div>
  
  <!-- Accessible data table -->
  <details class="data-table-toggle">
    <summary>View data as table</summary>
    <table>
      <caption>Emily Davis - Last 10 Games Scoring</caption>
      <thead>
        <tr>
          <th>Game Date</th>
          <th>Opponent</th>
          <th>Points Scored</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>March 15, 2025</td>
          <td>Hawks</td>
          <td>12</td>
        </tr>
        <!-- Additional data rows -->
      </tbody>
    </table>
  </details>
</div>
```

### 8.3 Testing and Validation

#### 8.3.1 Pre-Deployment Checklist

**Automated Testing**
- [ ] axe-core tests pass with zero violations
- [ ] WAVE evaluation shows no errors
- [ ] Lighthouse accessibility score >95
- [ ] Color contrast ratios validated

**Manual Testing**
- [ ] Keyboard navigation tested on all pages
- [ ] Screen reader testing completed
- [ ] High contrast mode verified
- [ ] Mobile accessibility confirmed

**User Testing**
- [ ] Basketball-specific user tasks completed
- [ ] Assistive technology users tested successfully
- [ ] Multi-generational feedback incorporated
- [ ] Emergency procedures validated

#### 8.3.2 Ongoing Monitoring

```javascript
// Accessibility monitoring system
class AccessibilityMonitor {
  constructor() {
    this.setupMonitoring();
    this.scheduleRegularAudits();
  }
  
  setupMonitoring() {
    // Monitor for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          this.validateNewContent(mutation.addedNodes);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  validateNewContent(nodes) {
    nodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check for common accessibility issues
        this.checkImages(node);
        this.checkForms(node);
        this.checkButtons(node);
        this.checkHeadings(node);
      }
    });
  }
  
  checkImages(element) {
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt && !img.hasAttribute('role')) {
        console.warn('Image missing alt text:', img.src);
        this.reportIssue('missing-alt-text', img);
      }
    });
  }
  
  checkForms(element) {
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (!label && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        console.warn('Form input missing label:', input);
        this.reportIssue('missing-form-label', input);
      }
    });
  }
  
  reportIssue(issueType, element) {
    // Report to monitoring system
    fetch('/api/accessibility-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: issueType,
        element: element.outerHTML,
        page: window.location.pathname,
        timestamp: new Date().toISOString()
      })
    });
  }
  
  scheduleRegularAudits() {
    // Run full accessibility audit weekly
    setInterval(() => {
      this.runFullAudit();
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }
}

// Initialize monitoring
if (typeof window !== 'undefined') {
  window.accessibilityMonitor = new AccessibilityMonitor();
}
```

---

## Summary and Next Steps

This comprehensive WCAG 2.1 AA accessibility audit framework ensures the Basketball League Management Platform Phase 2 meets the highest standards of digital accessibility. The framework covers:

### Key Achievements
- **Complete WCAG 2.1 AA Coverage**: All Level A and AA criteria addressed
- **Basketball-Specific Accessibility**: Sport-specific scenarios and requirements
- **Multi-Generational Support**: Age-appropriate accessibility from 6-60+ years
- **Comprehensive Testing**: Automated and manual testing procedures
- **Remediation Guidelines**: Clear fixes for common accessibility issues

### Implementation Priorities

**Phase 1 (Critical)**
1. Fix all Level A violations
2. Ensure keyboard accessibility
3. Provide text alternatives
4. Meet color contrast requirements

**Phase 2 (Important)**
1. Complete Level AA compliance
2. Implement live game accessibility
3. Test with real users
4. Basketball-specific enhancements

**Phase 3 (Enhancement)**
1. Beyond WCAG compliance
2. User experience optimization
3. Advanced assistive technology support
4. Continuous monitoring

### Success Metrics
- **Zero WCAG violations** in automated testing
- **>90% task completion** rate for users with disabilities
- **>4/5 user satisfaction** across all accessibility needs
- **100% keyboard accessibility** for all functions
- **Full screen reader compatibility** across platforms

This accessibility framework ensures that all basketball league participants, regardless of ability, age, or technology used, can fully engage with the platform's features and functions.

---

**Accessibility Audit Status**: Complete  
**Next Phase**: User Flow Diagrams  
**Dependencies**: Component library, design system, responsive layouts  
**Review Required**: Accessibility team, legal compliance, user testing team