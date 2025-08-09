# Mobile-First Responsive Layouts
## Basketball League Management Platform Phase 2

**Document ID:** MOBILE-BLMP-001  
**Version:** 1.0  
**Date:** August 8, 2025  
**Author:** Sports UI/UX Designer  
**Status:** Phase 2 Mobile Layout Specifications  

---

## Executive Summary

This document defines comprehensive mobile-first responsive layouts for the Basketball League Management Platform Phase 2. Designed for optimal courtside use, these layouts prioritize touch interactions, quick access to essential functions, and seamless performance across all devices from smartphones to large displays.

### Mobile-First Principles
- **Touch-Optimized**: 48px minimum touch targets, thumb-friendly navigation
- **Performance-First**: Optimized for 3G networks and older devices
- **Progressive Enhancement**: Core functionality on all devices, enhanced features on capable devices
- **Basketball Context**: Layouts optimized for game-day scenarios and sports environments
- **Multi-Generational**: Accessible to users ages 6-60+ with varying technical skills

---

## Table of Contents

1. [Breakpoint Strategy](#1-breakpoint-strategy)
2. [Mobile Layouts (320px - 767px)](#2-mobile-layouts-320px---767px)
3. [Tablet Layouts (768px - 1023px)](#3-tablet-layouts-768px---1023px)
4. [Desktop Layouts (1024px+)](#4-desktop-layouts-1024px)
5. [Basketball-Specific Responsive Patterns](#5-basketball-specific-responsive-patterns)
6. [Touch Interaction Guidelines](#6-touch-interaction-guidelines)
7. [Performance Optimizations](#7-performance-optimizations)
8. [Offline Layout Considerations](#8-offline-layout-considerations)

---

## 1. Breakpoint Strategy

### 1.1 Breakpoint System

```css
/* Mobile-First Breakpoints */
:root {
  --breakpoint-xs: 320px;     /* Small phones */
  --breakpoint-sm: 480px;     /* Large phones */
  --breakpoint-md: 768px;     /* Tablets */
  --breakpoint-lg: 1024px;    /* Small desktops */
  --breakpoint-xl: 1200px;    /* Large desktops */
  --breakpoint-xxl: 1400px;   /* Extra large screens */
}

/* Responsive Containers */
.container {
  width: 100%;
  padding-left: 16px;
  padding-right: 16px;
  margin: 0 auto;
}

/* Mobile (320px - 767px) */
@media (max-width: 767px) {
  .container {
    max-width: 100%;
    padding: 0 16px;
  }
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .container {
    max-width: 720px;
    padding: 0 24px;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    padding: 0 32px;
  }
}
```

### 1.2 Basketball-Specific Breakpoints

```css
/* Optimized for Basketball Use Cases */

/* Scorekeeper Phone (Portrait) */
@media (max-width: 480px) and (orientation: portrait) {
  .scorekeeper-layout {
    grid-template-areas: 
      "scoreboard"
      "active-team"
      "quick-score"
      "game-clock";
  }
}

/* Coach Tablet (Landscape) */
@media (min-width: 768px) and (orientation: landscape) {
  .coach-dashboard {
    grid-template-columns: 1fr 2fr 1fr;
    grid-template-areas: "sidebar main stats";
  }
}

/* Referee Phone (Any Orientation) */
@media (max-width: 767px) {
  .referee-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: var(--surface-primary);
    box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
  }
}

/* Fan Experience (All Devices) */
@media (min-width: 320px) {
  .fan-view {
    /* Always prioritize scoreboard visibility */
    --scoreboard-height: min(30vh, 200px);
  }
}
```

---

## 2. Mobile Layouts (320px - 767px)

### 2.1 Mobile Navigation Pattern

```
Stack-Based Mobile Navigation:
┌─────────────────────────────────────┐
│ GameTriq    🔔(3)    👤           │ ← 64px header
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│        Main Content Area            │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [🏠] [👥] [📊] [💬] [👤]           │ ← 72px bottom nav
└─────────────────────────────────────┘

CSS Implementation:
.mobile-layout {
  display: grid;
  grid-template-rows: 64px 1fr 72px;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height */
}

.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--surface-primary);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.mobile-content {
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.mobile-bottom-nav {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--surface-primary);
  border-top: 1px solid var(--outline);
  padding: 8px 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
  min-height: 48px;
  padding: 6px 12px;
  color: var(--on-surface-variant);
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
}

.nav-item.active {
  color: var(--color-primary);
}
```

### 2.2 Mobile Dashboard Layout

```
Mobile Dashboard (Portrait):
┌─────────────────────────────────────┐
│ ☰ GameTriq  🔔(3)  👤 Profile      │
├─────────────────────────────────────┤
│ ┌─ Today's Games ─────────────────┐ │
│ │ 🔴 LIVE: Eagles vs Hawks        │ │ ← Priority content
│ │ Score: 52-48 | Q2 8:45          │ │
│ │ [📱 Watch Live]                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Quick Actions ─────────────────┐ │
│ │ [📊 View Stats] [💬 Team Chat]  │ │ ← Touch-friendly
│ │ [📅 Schedule] [📸 Photos]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ My Teams ──────────────────────┐ │
│ │ 🏀 Eagles (Coach)               │ │
│ │    Next: Today 4:00 PM          │ │
│ │                                 │ │
│ │ 🏀 Hawks (Parent - Emily)       │ │
│ │    Next: Tomorrow 2:00 PM       │ │
│ │                                 │ │
│ │ [View All Teams]                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Notifications ─────────────────┐ │
│ │ • Payment due: Hawks team fees  │ │
│ │ • Practice reminder: Thursday   │ │
│ │ • New photos: Eagles vs Lions   │ │
│ │ [View All (8)]                  │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [🏠] [👥] [📊] [💬] [👤]           │
└─────────────────────────────────────┘

CSS Grid Implementation:
.mobile-dashboard {
  display: grid;
  gap: 16px;
  padding: 16px;
  grid-template-columns: 1fr;
}

.dashboard-card {
  background: var(--surface-primary);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.priority-card {
  background: linear-gradient(
    135deg, 
    var(--color-primary) 0%, 
    var(--color-primary-dark) 100%
  );
  color: var(--color-on-primary);
  margin: -8px -8px 8px -8px; /* Break out of container */
  border-radius: 0 0 12px 12px;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: var(--surface-secondary);
  border-radius: 8px;
  border: none;
  min-height: 64px;
  font-size: 12px;
  font-weight: 500;
}
```

### 2.3 Mobile Live Game Interface

```
Mobile Live Scoring (Scorekeeper):
┌─────────────────────────────────────┐
│ 🏀 LIVE SCORING                     │
├─────────────────────────────────────┤
│    EAGLES  52  :  48  HAWKS         │ ← Large, clear scores
│           Q2   8:45                 │
├─────────────────────────────────────┤
│ Active: 🏀 EAGLES                   │ ← Visual indicator
│                                     │
│ ┌─ Eagles Roster ─────────────────┐ │
│ │ #12 Smith    [+2][+3][🆓]      │ │ ← Thumb-friendly
│ │ #15 Davis    [+2][+3][🆓]      │ │
│ │ #23 Johnson  [+2][+3][🆓]      │ │
│ │ #42 Wilson   [+2][+3][🆓]      │ │
│ │ #34 Brown    [+2][+3][🆓]      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Last: Wilson +2 pointer             │
│ [↩️ UNDO] [🔄 SWITCH TEAM]          │
├─────────────────────────────────────┤
│ [⏰ TIMEOUT] [🔄 SUB] [🚨 HELP]      │ ← Always visible
└─────────────────────────────────────┘

CSS Layout:
.mobile-scoring {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  height: 100vh;
  height: 100dvh;
}

.scoreboard-mobile {
  background: var(--color-primary);
  color: var(--color-on-primary);
  text-align: center;
  padding: 16px;
}

.score-display {
  font-family: var(--font-mono);
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  margin: 8px 0;
}

.team-roster {
  overflow-y: auto;
  padding: 16px;
}

.player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--outline);
}

.scoring-buttons {
  display: flex;
  gap: 8px;
}

.score-btn {
  min-width: 48px;
  min-height: 48px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 14px;
}

.fixed-controls {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: var(--surface-primary);
  border-top: 1px solid var(--outline);
}

.control-btn {
  min-width: 72px;
  min-height: 48px;
  border-radius: 24px;
  font-size: 12px;
  font-weight: 600;
}
```

### 2.4 Mobile Forms Layout

```
Mobile Registration Form:
┌─────────────────────────────────────┐
│ ← Back    Player Registration       │
├─────────────────────────────────────┤
│ Step 2 of 4                         │
│ ▓▓▓▓▓░░░░░░░                       │ ← Progress bar
│                                     │
│ Basic Information                   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ First Name                      │ │ ← Single column
│ │ Emily                           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Last Name                       │ │
│ │ Davis                           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Date of Birth                   │ │
│ │ 03/15/2015               📅     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Position                        │ │
│ │ Point Guard                  ▼  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Jersey Number (Optional)        │ │
│ │ 15                              │ │
│ └─────────────────────────────────┘ │
│                                     │
│                                     │
│                                     │
│          [Continue]                 │ ← Sticky button
└─────────────────────────────────────┘

CSS Implementation:
.mobile-form {
  padding: 16px;
  padding-bottom: 80px; /* Space for sticky button */
}

.form-progress {
  margin-bottom: 24px;
}

.progress-bar {
  height: 4px;
  background: var(--surface-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 300ms ease;
}

.form-field {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--on-surface);
}

.form-input {
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: 1px solid var(--outline);
  border-radius: 8px;
  font-size: 16px; /* Prevents zoom on iOS */
  background: var(--surface-primary);
}

.form-input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
  border-color: var(--color-primary);
}

.sticky-button {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  height: 48px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  z-index: 10;
}
```

---

## 3. Tablet Layouts (768px - 1023px)

### 3.1 Tablet Navigation Pattern

```
Tablet Split-View Layout:
┌─────────────────────────────────────────────────────────┐
│ GameTriq League    🔔(3)  📊  ⚙️  👤 Profile          │ ← Header
├───────────────────┬─────────────────────────────────────┤
│ ┌─ Quick Nav ───┐ │                                     │
│ │ 🏠 Dashboard  │ │                                     │
│ │ 👥 My Teams   │ │                                     │
│ │ 📊 Statistics │ │           Main Content              │
│ │ 📅 Schedule   │ │                                     │
│ │ 💬 Messages   │ │                                     │
│ │ 🏆 Tournaments│ │                                     │
│ └───────────────┘ │                                     │
│                   │                                     │
│ ┌─ Live Games ──┐ │                                     │
│ │ 🔴 Eagles     │ │                                     │
│ │   52-48       │ │                                     │
│ │                                     │
│ │ ⏰ Hawks      │ │                                     │
│ │   45-42       │ │                                     │
│ └───────────────┘ │                                     │
└───────────────────┴─────────────────────────────────────┘

CSS Grid Implementation:
.tablet-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: 64px 1fr;
  height: 100vh;
  height: 100dvh;
}

.tablet-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--surface-primary);
  border-bottom: 1px solid var(--outline);
}

.tablet-sidebar {
  background: var(--surface-secondary);
  padding: 24px 16px;
  overflow-y: auto;
  border-right: 1px solid var(--outline);
}

.tablet-main {
  padding: 24px;
  overflow-y: auto;
}
```

### 3.2 Tablet Dashboard Layout

```
Tablet Dashboard (Landscape):
┌─────────────────────────────────────────────────────────────────────┐
│ GameTriq Admin Dashboard                    🔔(3)  ⚙️  👤 Profile  │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─ Today's Overview ────┐ ┌─ Live Games ────────────────────────┐   │
│ │ 🏀 Active: 8 games    │ │ 🔴 Court A: Eagles 52-48 Hawks     │   │
│ │ 📊 Online: 247 users  │ │    Q2 8:45 | 127 watching         │   │
│ │ 🚨 Issues: 2 pending  │ │                                   │   │
│ │ 💰 Revenue: $1,240    │ │ 🔴 Court B: Lions 38-35 Wolves    │   │
│ └───────────────────────┘ │    Q3 2:13 | 89 watching          │   │
│                           │                                   │   │
│ ┌─ Quick Actions ───────┐ │ ⏰ Court C: Tigers vs Bears       │   │
│ │ [➕ New League]       │ │    Starts 6:00 PM                 │   │
│ │ [👥 Add Users]        │ │                                   │   │
│ │ [📅 Schedule Games]   │ │ [📊 All Games] [📺 Broadcast]     │   │
│ │ [🏆 Create Tournament]│ └───────────────────────────────────────┘   │
│ └───────────────────────┘                                           │
│                                                                     │
│ ┌─ League Analytics ────────────────┐ ┌─ Recent Activity ───────┐   │
│ │    📈 Registration Growth         │ │ • Eagles won 65-52      │   │
│ │  ┌─────────────────────────────┐  │ │ • New player registered │   │
│ │  │ ▄▃▆█▅▄▇▆▃▄▆█             │  │ │ • Payment completed     │   │
│ │  │ Jan  Feb  Mar  Apr         │  │ │ • Referee assigned      │   │
│ │  └─────────────────────────────┘  │ │ • Schedule updated      │   │
│ │                                   │ │                         │   │
│ │ Current: 1,247 (+15% vs last)     │ │ [View All Activity]     │   │
│ │                                   │ └─────────────────────────┘   │
│ │ [📊 Full Report]                  │                               │
│ └───────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘

CSS Grid for Tablet:
.tablet-dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto 1fr;
  gap: 24px;
  padding: 24px;
}

.overview-card {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
}

.live-games-card {
  grid-column: 2 / 3;
  grid-row: 1 / 3; /* Spans two rows */
}

.quick-actions-card {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
}

.analytics-card {
  grid-column: 1 / 2;
  grid-row: 3 / 4;
}

.activity-card {
  grid-column: 2 / 3;
  grid-row: 3 / 4;
}
```

### 3.3 Tablet Live Game Layout

```
Tablet Live Game (Coach Interface):
┌─────────────────────────────────────────────────────────────────────┐
│ 🏀 LIVE: Eagles vs Hawks | Q2 8:45                    [⚙️] [📊] [❌] │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─ Scoreboard ──────────┐ ┌─ Game Clock ─┐ ┌─ Quick Controls ────┐ │
│ │   EAGLES  52 : 48  HAWKS │ │    8:45     │ │ [⏰ Timeout]        │ │
│ │   (HOME)       (AWAY)  │ │      Q2       │ │ [↔️ Substitute]     │ │
│ │                        │ │               │ │ [📝 Note]           │ │
│ │   TO: ●●○    ●○○       │ │ Shot: 18 sec  │ │ [🚨 Emergency]      │ │
│ │   Fouls: 4      3      │ └───────────────┘ └─────────────────────┘ │
│ └────────────────────────┘                                           │
│                                                                     │
│ ┌─ Active Lineup ───────────────────┐ ┌─ Available Bench ──────────┐ │
│ │ PG: #12 Smith (22 min) ●●●○○     │ │ #8 Lee (G)      ●●●●●      │ │
│ │     8 pts, 3 ast, 2 reb          │ │ #19 Clark (F)   ●●●●●      │ │
│ │                                  │ │ #7 Miller (G)   ●●●●●      │ │
│ │ SG: #23 Johnson (18 min) ●●●●○   │ │ #31 Taylor (F)  ●●●●●      │ │
│ │     12 pts, 1 ast, 4 reb         │ │ #25 White (C)   ●●●●●      │ │
│ │                                  │ │                             │ │
│ │ SF: #15 Davis (20 min) ●●○○○     │ │ Suggested Sub:              │ │
│ │     6 pts, 2 ast, 5 reb ⚠️       │ │ OUT: Davis (tired)         │ │
│ │                                  │ │ IN:  Clark (fresh)         │ │
│ │ PF: #42 Wilson (15 min) ●●●●●    │ │                             │ │
│ │     9 pts, 1 ast, 3 reb          │ │ [🔄 Make Substitution]     │ │
│ │                                  │ └─────────────────────────────┘ │
│ │ C:  #34 Brown (19 min) ●●●○○     │                               │
│ │     4 pts, 0 ast, 6 reb          │                               │
│ └──────────────────────────────────┘                               │
│                                                                     │
│ ┌─ Game Notes ──────────────────────┐ ┌─ Team Stats ──────────────┐ │
│ │ • Hawks weak on left side         │ │ FG:  21/40 (52.5%)        │ │
│ │ • Double team their #23           │ │ 3PT: 6/15 (40.0%)         │ │
│ │ • Run "Eagle" play after timeout  │ │ FT:  4/6 (66.7%)          │ │
│ │                                   │ │ REB: 18 (8 off, 10 def)   │ │
│ │ [✏️ Add Note] [📋 View Strategy]   │ │ AST: 12  TO: 8  STL: 5    │ │
│ └───────────────────────────────────┘ └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

CSS Layout:
.tablet-live-game {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  padding: 16px;
  height: 100vh;
}

.game-header {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: 8px;
}

.scoreboard-section {
  display: flex;
  gap: 16px;
}

.active-lineup {
  grid-column: 1 / 2;
}

.bench-section {
  grid-column: 2 / 3;
}

.game-notes {
  grid-column: 1 / 2;
}

.team-stats {
  grid-column: 2 / 3;
}
```

---

## 4. Desktop Layouts (1024px+)

### 4.1 Desktop Navigation Structure

```
Desktop Multi-Panel Layout:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ GameTriq League                    🔍 Search    🔔(3)  ⚙️  📊  👤 Admin Profile    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Main Navigation ──┐ ┌─ Content Area ──────────────────────┐ ┌─ Info Panel ────┐  │
│ │ 🏠 Dashboard       │ │                                     │ │ 🔴 Live Games   │  │
│ │ 👥 League Mgmt     │ │                                     │ │ Eagles 52-48    │  │
│ │ 🏀 Team Mgmt       │ │                                     │ │ Hawks Q2 8:45   │  │
│ │ 📊 Statistics      │ │           Primary Content           │ │                 │  │
│ │ 📅 Scheduling      │ │                                     │ │ ⚠️ Alerts       │  │
│ │ 💰 Financial       │ │                                     │ │ Heat warning    │  │
│ │ 🏆 Tournaments     │ │                                     │ │ Payment due     │  │
│ │ ⚙️ Settings        │ │                                     │ │                 │  │
│ │                    │ │                                     │ │ 📈 Quick Stats  │  │
│ │ ─────────────────  │ │                                     │ │ Users: 247      │  │
│ │ 🚨 Emergency       │ │                                     │ │ Games: 12       │  │
│ │ 📞 Support         │ │                                     │ │ Revenue: $1.2K  │  │
│ │ 📋 Documentation   │ │                                     │ │                 │  │
│ └────────────────────┘ └─────────────────────────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘

CSS Grid System:
.desktop-layout {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  grid-template-rows: 72px 1fr;
  height: 100vh;
  min-height: 600px;
}

.desktop-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: var(--surface-primary);
  border-bottom: 1px solid var(--outline);
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.desktop-sidebar {
  grid-row: 2;
  padding: 24px;
  background: var(--surface-secondary);
  overflow-y: auto;
  border-right: 1px solid var(--outline);
}

.desktop-main {
  grid-row: 2;
  padding: 32px;
  overflow-y: auto;
  background: var(--surface-background);
}

.desktop-info-panel {
  grid-row: 2;
  padding: 24px;
  background: var(--surface-primary);
  overflow-y: auto;
  border-left: 1px solid var(--outline);
}
```

### 4.2 Desktop Dashboard Layout

```
Desktop Admin Dashboard:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ GameTriq League Management           🔍 Global Search    🔔(3) ⚙️ 📊 👤 Profile    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Navigation ──────┐ ┌─ Main Dashboard ──────────────────────┐ ┌─ Live Panel ────┐ │
│ │ 🏠 Dashboard      │ │                                       │ │ 🔴 Live Games   │ │
│ │ 👥 League Mgmt    │ │ ┌─ KPI Overview ─────────────────────┐ │ │ Court A:        │ │
│ │ 🏀 Team Mgmt      │ │ │ 📊 247 Users  💰 $12.4K  🏀 12   │ │ │ Eagles 52-48    │ │
│ │ 📊 Statistics     │ │ │    Online     Revenue    Active   │ │ │ Hawks Q2 8:45   │ │
│ │ 📅 Scheduling     │ │ │                         Games     │ │ │                 │ │
│ │ 💰 Financial      │ │ └───────────────────────────────────┘ │ │ Court B:        │ │
│ │ 🏆 Tournaments    │ │                                       │ │ Lions 38-35     │ │
│ │ ⚙️ Settings       │ │ ┌─ Registration Trends ──┐ ┌─ Revenue ─┐ │ │ Wolves Q3 2:13  │ │
│ │                   │ │ │     📈 Growth Chart     │ │  💰 Chart │ │ │                 │ │
│ │ ─────────────────  │ │ │ ┌─────────────────────┐ │ │ ┌─────────┐ │ │ [📺 Broadcast]  │ │
│ │ 🚨 Emergency      │ │ │ │ ▄▃▆█▅▄▇▆▃▄▆█       │ │ │ │ ▄▇▃▄▆█ │ │ │                 │ │
│ │ 📞 Support        │ │ │ │ Jan Feb Mar Apr     │ │ │ │ Q1-Q4   │ │ │ ⚠️ Alerts       │ │
│ │ 📋 Documentation  │ │ │ └─────────────────────┘ │ │ └─────────┘ │ │ • Heat warning  │ │
│ │                   │ │ │ Current: 1,247 players  │ │ $4.2K/mo  │ │ • Payment overdue│ │
│ │                   │ │ │ Growth: +15% vs last mo │ │ +12% MoM  │ │ • Server issue   │ │
│ │                   │ │ └─────────────────────────┘ └───────────┘ │ │                 │ │
│ │                   │ │                                       │ │ 📈 Quick Stats  │ │
│ │                   │ │ ┌─ Recent Activity ────┐ ┌─ Actions ───┐ │ │ Registrations   │ │
│ │                   │ │ │ • Eagles won 65-52    │ │ [➕ League]  │ │ │ Today: 23       │ │
│ │                   │ │ │ • New team: Panthers  │ │ [👥 Users]   │ │ │ Week: 156       │ │
│ │                   │ │ │ • Payment: Johnson    │ │ [📅 Game]    │ │ │ Month: 689      │ │
│ │                   │ │ │ • Referee: Game #234  │ │ [🏆 Tournament]│ │                 │ │
│ │                   │ │ │ • Schedule updated    │ │ [📊 Report]  │ │ │ [📈 Full Report]│ │
│ │                   │ │ │                       │ │              │ │ │                 │ │
│ │                   │ │ │ [View All Activity]   │ │ [📋 Export]  │ │ │                 │ │
│ │                   │ │ └───────────────────────┘ └─────────────┘ │ └─────────────────┘ │
│ └───────────────────┘ └───────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

CSS Grid for Desktop Dashboard:
.desktop-dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto 1fr;
  gap: 24px;
  padding: 32px;
  max-width: 1200px;
}

.kpi-overview {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.chart-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  grid-column: 1 / -1;
}

.activity-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  grid-column: 1 / -1;
}
```

### 4.3 Desktop Live Game Operations

```
Desktop Game Operations Center:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Live Game Operations Center                 [📊 Analytics] [📺 Broadcast] [⚙️ Settings] │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Game Selection ──┐ ┌─ Primary Game View ─────────────────────┐ ┌─ Game Stats ───┐ │
│ │ 🔴 Court A        │ │                                         │ │ Quarter Stats   │ │
│ │ Eagles vs Hawks   │ │        EAGLES  52  :  48  HAWKS        │ │ Q1: 15-12      │ │
│ │ Q2 8:45          │ │            Q2    8:45                   │ │ Q2: 37-36      │ │
│ │ [📊] [📺] [⚙️]    │ │                                         │ │ Q3: --         │ │
│ │                   │ │ ┌─ Live Controls ─────────────────────┐ │ │ Q4: --         │ │
│ │ 🔴 Court B        │ │ │ [▶️ Resume] [⏸️ Pause] [⏹️ Stop]    │ │ │                │ │
│ │ Lions vs Wolves   │ │ │                                     │ │ │ Team Comparison │ │
│ │ Q3 2:13          │ │ │ Clock: 8:45  Shot: 18  Period: Q2   │ │ │ FG%  52% | 45%  │ │
│ │ [📊] [📺] [⚙️]    │ │ │                                     │ │ │ 3P%  40% | 33%  │ │
│ │                   │ │ │ [⏰ Timeout] [↔️ Sub] [⚠️ Foul]     │ │ │ FT%  67% | 80%  │ │
│ │ ⏰ Court C        │ │ └─────────────────────────────────────┘ │ │ REB   18 | 16   │ │
│ │ Tigers vs Bears   │ │                                         │ │ AST   12 | 9    │ │
│ │ Starts 6:00 PM    │ │ ┌─ Eagles Lineup ──┐ ┌─ Hawks Lineup ─┐ │ │ TO     8 | 11   │ │
│ │ [📅] [📋] [⚙️]    │ │ │ #12 Smith  8pts  │ │ #11 Miller 11pts│ │ │                │ │
│ │                   │ │ │ #23 Johnson 12pts│ │ #22 Taylor 9pts │ │ │ [📊 Live Stats] │ │
│ │ ┌─ Officials ───┐  │ │ │ #15 Davis  6pts  │ │ #33 Clark  8pts │ │ │                │ │
│ │ │ Referee:      │  │ │ │ #42 Wilson 9pts  │ │ #44 White  7pts │ │ │ ⚠️ Alerts       │ │
│ │ │ John Smith    │  │ │ │ #34 Brown  4pts  │ │ #55 Green  5pts │ │ │ • Heat warning  │ │
│ │ │               │  │ │ └──────────────────┘ └─────────────────┘ │ │ • Timeout called │ │
│ │ │ Scorekeeper:  │  │ │                                         │ │ • Foul limit    │ │
│ │ │ Sarah Davis   │  │ │ ┌─ Play-by-Play Feed ─────────────────┐ │ │                │ │
│ │ │               │  │ │ │ 8:45 - Eagles timeout               │ │ │ 📺 Broadcast    │ │
│ │ │ [📞 Contact]  │  │ │ │ 8:52 - SCORE! Davis 2-pointer       │ │ │ 👥 127 watching │ │
│ │ └───────────────┘  │ │ │ 9:01 - Hawks miss 3-pointer         │ │ │ 📹 Recording    │ │
│ └───────────────────┘ │ │ │ 9:15 - Johnson defensive rebound    │ │ │                │ │
│                       │ │ │ 9:23 - Smith makes free throw       │ │ │ [📱 Share Feed] │ │
│                       │ │ │                                     │ │ │                │ │
│                       │ │ │ [📝 Add Play] [📊 Export]           │ │ │                │ │
│                       │ │ └─────────────────────────────────────┘ │ │                │ │
│                       │ └─────────────────────────────────────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘

CSS Layout:
.desktop-game-ops {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 24px;
  padding: 24px;
  height: calc(100vh - 72px);
}

.game-selection {
  overflow-y: auto;
}

.primary-game {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 16px;
  overflow-y: auto;
}

.game-scoreboard {
  text-align: center;
  font-size: 48px;
  font-family: var(--font-mono);
  font-weight: 700;
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: 24px;
  border-radius: 12px;
}

.live-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--surface-secondary);
  border-radius: 8px;
}

.team-lineups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.game-stats {
  overflow-y: auto;
}
```

---

## 5. Basketball-Specific Responsive Patterns

### 5.1 Scoreboard Responsive Behavior

```css
/* Scoreboard scales based on available space */
.responsive-scoreboard {
  display: grid;
  grid-template-areas: 
    "home-score divider away-score"
    "home-name divider away-name"
    "home-timeouts divider away-timeouts";
  grid-template-columns: 1fr auto 1fr;
  gap: clamp(8px, 2vw, 24px);
  padding: clamp(16px, 4vw, 32px);
  text-align: center;
}

.score-display {
  font-size: clamp(28px, 8vw, 64px);
  font-family: var(--font-mono);
  font-weight: 700;
  line-height: 1;
}

.team-name {
  font-size: clamp(14px, 3vw, 20px);
  font-weight: 600;
  margin-top: 8px;
}

/* Mobile: Stack vertically for very small screens */
@media (max-width: 320px) {
  .responsive-scoreboard {
    grid-template-areas:
      "home-name"
      "home-score"
      "divider"
      "away-score"
      "away-name";
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

/* Tablet Landscape: Wider layout */
@media (min-width: 768px) and (orientation: landscape) {
  .responsive-scoreboard {
    grid-template-areas:
      "home-name divider away-name"
      "home-score divider away-score"
      "home-stats divider away-stats";
    grid-template-columns: 2fr auto 2fr;
  }
  
  .team-stats {
    grid-area: home-stats;
    font-size: 12px;
    opacity: 0.8;
  }
}
```

### 5.2 Game Clock Responsive Design

```css
/* Game clock adapts to container size */
.game-clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-basketball-court);
  color: var(--color-on-primary);
  border-radius: 12px;
  padding: clamp(16px, 4vw, 32px);
}

.clock-time {
  font-family: var(--font-mono);
  font-size: clamp(32px, 12vw, 96px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
}

.clock-period {
  font-size: clamp(14px, 3vw, 24px);
  font-weight: 600;
  margin-top: 8px;
  opacity: 0.9;
}

.shot-clock {
  font-size: clamp(18px, 4vw, 32px);
  font-weight: 600;
  margin-top: 16px;
  color: var(--color-warning);
}

/* Different layouts by screen size */
@media (max-width: 480px) {
  .game-clock {
    min-height: 120px;
  }
}

@media (min-width: 768px) {
  .game-clock {
    min-height: 200px;
  }
  
  .clock-controls {
    display: flex;
    gap: 16px;
    margin-top: 24px;
  }
}

@media (min-width: 1024px) {
  .game-clock-large {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    grid-template-areas: "time controls shot";
    align-items: center;
    min-height: 160px;
  }
  
  .clock-time {
    grid-area: time;
  }
  
  .clock-controls {
    grid-area: controls;
  }
  
  .shot-clock {
    grid-area: shot;
  }
}
```

### 5.3 Player Roster Responsive Grid

```css
/* Player roster adapts to screen size */
.responsive-roster {
  display: grid;
  gap: clamp(8px, 2vw, 16px);
  padding: 16px;
}

/* Mobile: Single column */
@media (max-width: 767px) {
  .responsive-roster {
    grid-template-columns: 1fr;
  }
  
  .player-card {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    grid-template-areas: "photo info actions";
    gap: 12px;
    align-items: center;
    padding: 12px;
    background: var(--surface-primary);
    border-radius: 8px;
  }
  
  .player-photo {
    grid-area: photo;
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }
  
  .player-info {
    grid-area: info;
  }
  
  .player-actions {
    grid-area: actions;
    display: flex;
    gap: 8px;
  }
}

/* Tablet: Two columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .responsive-roster {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .player-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px;
  }
  
  .player-photo {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin-bottom: 12px;
  }
}

/* Desktop: Three or four columns */
@media (min-width: 1024px) {
  .responsive-roster {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
  
  .player-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px;
  }
  
  .player-photo {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin-bottom: 16px;
  }
}
```

### 5.4 Tournament Bracket Responsive Layout

```css
/* Tournament bracket responsive design */
.tournament-bracket {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 24px;
  background: var(--surface-secondary);
}

.bracket-container {
  display: flex;
  gap: clamp(24px, 4vw, 64px);
  min-width: min-content;
  align-items: center;
}

.bracket-round {
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2vw, 32px);
  min-width: clamp(150px, 20vw, 200px);
}

.bracket-game {
  background: var(--surface-primary);
  border-radius: 8px;
  padding: clamp(12px, 2vw, 16px);
  border: 1px solid var(--outline);
  position: relative;
}

.bracket-team {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(6px, 1vw, 8px) 0;
  font-size: clamp(12px, 2vw, 14px);
}

/* Mobile: Simplified bracket */
@media (max-width: 767px) {
  .tournament-bracket {
    padding: 16px;
  }
  
  .bracket-container {
    gap: 16px;
  }
  
  .bracket-round {
    min-width: 120px;
  }
  
  .bracket-game {
    font-size: 12px;
  }
  
  /* Hide connector lines on mobile */
  .bracket-connector {
    display: none;
  }
}

/* Tablet and Desktop: Full bracket with connectors */
@media (min-width: 768px) {
  .bracket-game::after {
    content: '';
    position: absolute;
    right: -32px;
    top: 50%;
    width: 24px;
    height: 2px;
    background: var(--outline);
    transform: translateY(-1px);
  }
  
  .bracket-round:last-child .bracket-game::after {
    display: none;
  }
}
```

---

## 6. Touch Interaction Guidelines

### 6.1 Touch Target Specifications

```css
/* Minimum touch targets */
:root {
  --touch-target-min: 44px;     /* iOS minimum */
  --touch-target-comfortable: 48px; /* Android minimum */
  --touch-target-large: 56px;   /* Easy reach */
  --touch-target-xl: 64px;      /* Emergency actions */
}

/* Basketball-specific touch targets */
.scorekeeper-button {
  min-width: var(--touch-target-large);
  min-height: var(--touch-target-large);
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
}

.emergency-button {
  min-width: var(--touch-target-xl);
  min-height: var(--touch-target-xl);
  border-radius: 50%;
  font-size: 24px;
  background: var(--color-error);
  color: var(--color-on-error);
}

.coach-quick-action {
  min-width: var(--touch-target-comfortable);
  min-height: var(--touch-target-comfortable);
  margin: 4px; /* Spacing between targets */
}

/* Touch feedback */
.touch-feedback {
  position: relative;
  overflow: hidden;
}

.touch-feedback::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.touch-feedback:active::after {
  width: 200px;
  height: 200px;
}
```

### 6.2 Gesture Support

```css
/* Swipe gestures for mobile */
.swipeable {
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
}

/* Prevent zoom on double tap for game controls */
.game-controls {
  touch-action: manipulation;
}

/* Pull-to-refresh support */
.refresh-container {
  overscroll-behavior: contain;
}

/* Pinch-to-zoom for shot charts and statistics */
.zoomable {
  touch-action: pinch-zoom;
}

/* Scroll momentum for lists */
.scrollable-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

### 6.3 Thumb Navigation Zones

```css
/* Optimize for thumb reach on large phones */
.thumb-navigation {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

/* Easy reach zone (bottom 1/3 of screen) */
.thumb-zone-easy {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface-primary);
  padding: 16px;
  border-top: 1px solid var(--outline);
}

/* Difficult reach zone (top 1/3 of screen) */
.thumb-zone-difficult {
  /* Avoid critical actions in this area */
  padding-top: max(16px, env(safe-area-inset-top));
}

/* Thumb-friendly button layout */
.thumb-buttons {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}

.thumb-button {
  flex: 1;
  max-width: 120px;
  min-height: 48px;
  border-radius: 24px;
  font-weight: 600;
}

@media (max-width: 480px) {
  /* Single-handed use optimization */
  .thumb-buttons {
    justify-content: flex-end;
    padding-right: 24px;
  }
  
  .primary-action {
    margin-right: 0;
  }
  
  .secondary-action {
    margin-left: 8px;
  }
}
```

---

## 7. Performance Optimizations

### 7.1 Mobile Performance Strategies

```css
/* Hardware acceleration for animations */
.accelerated {
  transform: translateZ(0);
  will-change: transform;
}

/* Optimize repaints and reflows */
.game-clock {
  contain: layout style paint;
}

.scoreboard {
  contain: layout style;
}

/* Efficient scrolling */
.scroll-container {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}

/* Reduce paint complexity */
.simplified-mobile {
  box-shadow: none;
  border-radius: 4px; /* Simpler than complex curves */
}

@media (max-width: 767px) {
  /* Disable expensive effects on mobile */
  .desktop-only-effects {
    backdrop-filter: none;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }
}
```

### 7.2 Image Optimization

```css
/* Responsive images */
.responsive-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  loading: lazy;
}

/* Basketball-specific image sizes */
.player-photo-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.player-photo-medium {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.player-photo-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}

/* Team logo optimization */
.team-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  background: var(--surface-secondary);
  border-radius: 4px;
}

/* Court background with performance considerations */
.court-background {
  background: linear-gradient(
    45deg,
    var(--basketball-court) 25%,
    transparent 25%
  );
  background-size: 20px 20px;
  /* Use CSS patterns instead of images when possible */
}
```

### 7.3 Layout Performance

```css
/* Use CSS Grid and Flexbox efficiently */
.efficient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  /* Avoid complex nested layouts */
}

/* Minimize DOM updates for live scores */
.live-score-container {
  contain: strict;
}

.score-value {
  /* Use transform instead of changing layout properties */
  transform: scale(var(--score-scale, 1));
  transition: transform 0.2s ease;
}

/* Efficient animation */
@keyframes score-update {
  0% { --score-scale: 1; }
  50% { --score-scale: 1.1; }
  100% { --score-scale: 1; }
}

.score-change {
  animation: score-update 0.3s ease;
}
```

---

## 8. Offline Layout Considerations

### 8.1 Offline-First Design

```css
/* Offline state styling */
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--color-warning);
  color: var(--color-on-warning);
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  transform: translateY(-100%);
  transition: transform 0.3s ease;
}

.offline-banner.visible {
  transform: translateY(0);
}

/* Offline content availability */
.content-offline-available {
  position: relative;
}

.content-offline-available::after {
  content: '📱';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 12px;
  opacity: 0.7;
}

.content-online-only {
  opacity: 0.5;
  pointer-events: none;
}

.content-online-only::before {
  content: '🌐 Online Required';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface-primary);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--on-surface-variant);
  z-index: 1;
}
```

### 8.2 Progressive Loading

```css
/* Skeleton screens for loading states */
.skeleton {
  background: linear-gradient(90deg, 
    var(--surface-secondary) 25%,
    var(--surface-tertiary) 50%,
    var(--surface-secondary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 2s infinite ease-in-out;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 1em;
  margin: 0.5em 0;
}

.skeleton-button {
  height: 48px;
  width: 120px;
  border-radius: 24px;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

/* Progressive image loading */
.progressive-image {
  background: var(--surface-secondary);
  position: relative;
  overflow: hidden;
}

.progressive-image::before {
  content: '🏀';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  opacity: 0.3;
}

.progressive-image img {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.progressive-image img.loaded {
  opacity: 1;
}
```

### 8.3 Critical CSS Inlining

```html
<!-- Critical CSS for above-the-fold content -->
<style>
/* Basketball scoreboard critical styles */
.critical-scoreboard {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  padding: 16px;
  background: #ff9800;
  color: white;
  text-align: center;
  font-family: 'Roboto Mono', monospace;
}

.critical-score {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

@media (min-width: 768px) {
  .critical-score {
    font-size: 48px;
  }
}

/* Critical navigation */
.critical-nav {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.critical-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
  min-height: 48px;
  padding: 6px 12px;
  color: #424242;
  text-decoration: none;
  font-size: 12px;
}
</style>
```

---

## Implementation Guidelines

### CSS Custom Properties for Responsive Design
```css
:root {
  /* Responsive spacing */
  --spacing-xs: clamp(4px, 1vw, 8px);
  --spacing-sm: clamp(8px, 2vw, 16px);
  --spacing-md: clamp(16px, 4vw, 24px);
  --spacing-lg: clamp(24px, 6vw, 32px);
  
  /* Responsive typography */
  --text-xs: clamp(10px, 2vw, 12px);
  --text-sm: clamp(12px, 2.5vw, 14px);
  --text-base: clamp(14px, 3vw, 16px);
  --text-lg: clamp(16px, 4vw, 20px);
  --text-xl: clamp(20px, 5vw, 24px);
  --text-2xl: clamp(24px, 6vw, 32px);
  
  /* Basketball-specific responsive values */
  --scoreboard-height: clamp(80px, 20vh, 200px);
  --court-aspect-ratio: 1.8; /* Basketball court proportions */
  --touch-target: clamp(44px, 12vw, 56px);
}
```

### Container Queries (Future Enhancement)
```css
/* Container-based responsive design */
@container (min-width: 400px) {
  .game-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@container (min-width: 600px) {
  .game-card {
    grid-template-columns: 1fr 2fr 1fr;
  }
}
```

### JavaScript for Dynamic Layouts
```javascript
// Responsive layout utilities
const LayoutUtils = {
  // Detect device capabilities
  isTouchDevice: () => 'ontouchstart' in window,
  
  // Get optimal grid columns based on container width
  getOptimalColumns: (containerWidth, itemMinWidth = 200) => {
    return Math.floor(containerWidth / itemMinWidth) || 1;
  },
  
  // Adjust for basketball court aspect ratio
  calculateCourtDimensions: (containerWidth) => {
    const aspectRatio = 1.8;
    const width = Math.min(containerWidth, 800);
    const height = width / aspectRatio;
    return { width, height };
  },
  
  // Safe area detection for mobile devices
  getSafeAreaInsets: () => ({
    top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0,
    bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0,
  })
};
```

---

**Mobile Layouts Status**: Complete  
**Next Phase**: Accessibility Compliance Audit  
**Dependencies**: Component library, design system tokens  
**Review Required**: UX team, mobile developers, accessibility team