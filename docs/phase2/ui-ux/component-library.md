# Component Library - Basketball League Management Platform
## Phase 2 UI/UX Design System

**Document ID:** COMP-BLMP-001  
**Version:** 1.0  
**Date:** August 8, 2025  
**Author:** Sports UI/UX Designer  
**Status:** Phase 2 Component Specifications  

---

## Executive Summary

This document provides comprehensive specifications for all reusable components in the Basketball League Management Platform Phase 2. The component library follows Material Design 3 principles, ensures accessibility compliance (WCAG 2.1 AA), and supports multi-generational users with responsive, touch-friendly interfaces optimized for basketball league management.

### Component Architecture Principles
- **Atomic Design**: Atoms → Molecules → Organisms → Templates
- **Accessibility First**: WCAG 2.1 AA compliance built-in
- **Mobile Optimized**: Touch-friendly with 48px minimum targets
- **Basketball Context**: Sport-specific components and terminology
- **Multi-Generational**: Age-appropriate variations (6-60+ years)
- **Offline Support**: Components work without connectivity

---

## Table of Contents

1. [Foundational Atoms](#1-foundational-atoms)
2. [Navigation Components](#2-navigation-components)
3. [Data Display Components](#3-data-display-components)
4. [Form & Input Components](#4-form--input-components)
5. [Basketball-Specific Components](#5-basketball-specific-components)
6. [Live Game Components](#6-live-game-components)
7. [Communication Components](#7-communication-components)
8. [Safety & Emergency Components](#8-safety--emergency-components)
9. [Layout & Container Components](#9-layout--container-components)
10. [Component States & Interactions](#10-component-states--interactions)

---

## 1. Foundational Atoms

### 1.1 Buttons

#### Primary Button
```
Component: PrimaryButton
Usage: Main call-to-action buttons
Props: {
  label: string
  size: 'small' | 'medium' | 'large' | 'xl'
  disabled: boolean
  loading: boolean
  icon?: IconName
  onClick: function
  ariaLabel?: string
}

Variants:
┌─────────────────────────────────────┐
│           [PRIMARY ACTION]          │ // Default
│           [Primary Action]          │ // Medium
│         [Primary Action]            │ // Small
│                                     │
│        [🔄 Loading...]              │ // Loading state
│        [❌ Disabled Action]         │ // Disabled state
└─────────────────────────────────────┘

Specifications:
- Min Height: 48px (touch target)
- Border Radius: 24px (rounded)
- Typography: Title Medium (16px)
- Padding: 16px horizontal, 12px vertical
- Elevation: 2dp default, 4dp hover
- Focus: 2px outline with theme color
- Animation: 200ms ease-in-out
```

#### Secondary Button
```
Component: SecondaryButton
Usage: Secondary actions, navigation
Props: Same as PrimaryButton

Variants:
┌─────────────────────────────────────┐
│          [Secondary Action]         │ // Default
│          [🔗 With Icon]             │ // With icon
│          [Ghost Style]              │ // Text only
└─────────────────────────────────────┘

Specifications:
- Background: Transparent with border
- Border: 1px solid theme color
- Typography: Title Medium (16px)
- Hover: Background fills with theme color
```

#### Icon Button
```
Component: IconButton
Usage: Single action icons
Props: {
  icon: IconName
  size: 'small' | 'medium' | 'large'
  variant: 'standard' | 'filled' | 'outlined'
  disabled: boolean
  onClick: function
  ariaLabel: string (required)
  badge?: number
}

Variants:
┌─────────────────────────────────────┐
│  [📱] [🔔] [⚙️] [❓] [🚨]           │
│                                     │
│  [📱8] Standard with badge          │
│  [🔔]  Filled variant              │
│  [⚙️]  Outlined variant            │
└─────────────────────────────────────┘

Specifications:
- Min Size: 48x48px (touch target)
- Icon Size: 24px (medium), 20px (small), 28px (large)
- Border Radius: 50% (circular)
- Focus: 2px outline
- Badge: 16x16px, positioned top-right
```

### 1.2 Typography

#### Text Component
```
Component: Text
Usage: All text content
Props: {
  variant: 'display' | 'headline' | 'title' | 'body' | 'label'
  size: 'small' | 'medium' | 'large'
  weight: 'regular' | 'medium' | 'bold'
  color: 'primary' | 'secondary' | 'error' | 'success'
  align: 'left' | 'center' | 'right'
  children: ReactNode
}

Typography Scale:
┌─────────────────────────────────────┐
│ DISPLAY LARGE (32px/40px)           │
│ Headline Medium (24px/32px)         │
│ Title Large (20px/28px)             │
│ Body Large (16px/24px)              │
│ Label Medium (14px/20px)            │
│ Label Small (12px/16px)             │
└─────────────────────────────────────┘
```

### 1.3 Icons

#### Sport Icons
```
Basketball-Specific Icons:
🏀 Basketball
🏃 Player Running
🦓 Referee
📊 Statistics
⏰ Game Clock
🏆 Trophy/Tournament
⚡ Substitution
💪 Team Spirit
🎯 Accuracy/Shot
📱 Mobile/App

Standard Icons:
✓ Success/Check
❌ Error/Close
⚠️ Warning
ℹ️ Information
📅 Calendar
👤 Profile
🔔 Notifications
⚙️ Settings
📍 Location
💬 Messages
```

---

## 2. Navigation Components

### 2.1 Bottom Navigation (Mobile)

```
Component: BottomNavigation
Usage: Primary mobile navigation
Props: {
  items: NavigationItem[]
  activeIndex: number
  onItemSelect: function
  badge?: { [key: string]: number }
}

Layout:
┌─────────────────────────────────────┐
│ [🏠] [👥] [📊] [💬] [👤]            │
│ Home Team Stats Chat Profile        │
└─────────────────────────────────────┘

Specifications:
- Height: 72px
- Items: Max 5 items
- Touch Target: Min 48px
- Badge Support: Notification counts
- Safe Area: iOS bottom padding
- Accessibility: Role="tablist"
```

### 2.2 Top App Bar

```
Component: TopAppBar
Usage: Page headers with actions
Props: {
  title: string
  leftAction?: 'menu' | 'back'
  rightActions?: ActionItem[]
  onLeftAction: function
  elevated?: boolean
}

Variants:
┌─────────────────────────────────────┐
│ ☰ GameTriq League    🔔(3) ⚙️ 👤   │ // With menu
│ ← Back to Dashboard  📊 📱 ⚙️       │ // With back
│ Game Center          🚨 📊 💬       │ // With actions
└─────────────────────────────────────┘

Specifications:
- Height: 64px (72px with safe area)
- Title: Headline Small (20px)
- Actions: 48x48px touch targets
- Elevation: 0dp (default), 2dp (elevated)
```

### 2.3 Side Navigation (Tablet/Desktop)

```
Component: SideNavigation
Usage: Persistent navigation on larger screens
Props: {
  items: NavigationItem[]
  collapsed?: boolean
  selectedKey: string
  onItemSelect: function
}

Layout (Expanded):
┌─────────────────────────────────────┐
│ 🏀 GameTriq                         │
│                                     │
│ 🏠 Dashboard                        │
│ 👥 My Teams                         │
│ 📊 Statistics                       │
│ 📅 Schedule                         │
│ 💬 Messages                         │
│ 🏆 Tournaments                      │
│ ⚙️ Settings                         │
│                                     │
│ ────────────────                    │
│ 👤 User Profile                     │
│ 📱 Help & Support                   │
└─────────────────────────────────────┘

Specifications:
- Width: 280px (expanded), 72px (collapsed)
- Item Height: 48px
- Group Spacing: 16px
- Selection: Background highlight
```

---

## 3. Data Display Components

### 3.1 Scoreboard Component

```
Component: Scoreboard
Usage: Display game scores prominently
Props: {
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  homeScore: number
  awayScore: number
  period: string
  timeRemaining: string
  isLive?: boolean
  size?: 'compact' | 'standard' | 'large'
}

Layout (Standard):
┌─────────────────────────────────────┐
│     🔴 LIVE | Q2 8:45               │
│                                     │
│    EAGLES  52  :  48  HAWKS         │
│    (HOME)         (VISITOR)         │
│                                     │
│ Timeouts: ●●○     ●○○               │
│ Team Fouls: 4      3                │
└─────────────────────────────────────┘

Compact Version:
┌─────────────────────────────────────┐
│ 🔴 Eagles 52-48 Hawks | Q2 8:45     │
└─────────────────────────────────────┘

Specifications:
- Live Indicator: Red dot animation
- Score Typography: Display Large (32px)
- Team Names: Title Medium (16px)
- Auto-update: Every 10 seconds
- Accessibility: Live region announcements
```

### 3.2 Player Card

```
Component: PlayerCard
Usage: Display player information
Props: {
  player: PlayerInfo
  variant: 'compact' | 'detailed' | 'stats'
  showPhoto?: boolean
  showStats?: boolean
  actions?: ActionItem[]
}

Layouts:
┌─── Compact ─────────────────────────┐
│ 📸 #15 Emily Davis                  │
│     Guard • Eagles • 10 pts        │
└─────────────────────────────────────┘

┌─── Detailed ───────────────────────┐
│ ┌─────┐ #15 Emily Davis            │
│ │ 📸  │ Position: Point Guard      │
│ │     │ Team: Eagles               │
│ │     │ Age: 10 • Grade: 5th       │
│ └─────┘                            │
│                                    │
│ Season Averages:                   │
│ 🏀 Points: 8.2  📊 Rebounds: 4.1  │
│ ⚡ Assists: 3.5  🎯 FG%: 47%       │
│                                    │
│ [📊 Full Stats] [📸 Photos]        │
└─────────────────────────────────────┘

Specifications:
- Photo: 64x64px (compact), 80x80px (detailed)
- Jersey Number: Prominent display
- Stats: Icon + value pairs
- Touch Target: Min 48px for actions
```

### 3.3 Team Roster

```
Component: TeamRoster
Usage: Display team member lists
Props: {
  players: PlayerInfo[]
  showStats?: boolean
  sortBy?: 'name' | 'number' | 'position'
  onPlayerSelect?: function
  actions?: RosterAction[]
}

Layout:
┌─────────────────────────────────────┐
│ Eagles Roster (12 players)          │
│                                     │
│ ┌─ Starters ─────────────────────┐  │
│ │ #12 Smith (PG)    8.2 pts     │  │
│ │ #15 Davis (SG)   12.5 pts     │  │
│ │ #23 Johnson (SF)  6.8 pts     │  │
│ │ #42 Wilson (PF)   9.1 pts     │  │
│ │ #34 Brown (C)     7.3 pts     │  │
│ └───────────────────────────────┘  │
│                                    │
│ ┌─ Bench ───────────────────────┐   │
│ │ #8 Lee (G)        4.2 pts     │   │
│ │ #19 Clark (F)     3.8 pts     │   │
│ │ #7 Miller (G)     2.1 pts     │   │
│ │ └─────────────────────────────┘   │
│                                    │
│ [➕ Add Player] [📊 Team Stats]     │
└─────────────────────────────────────┘

Specifications:
- Grouping: Starters/Bench or by Position
- Sorting: Name, Number, Position, Stats
- Actions: Add, Remove, Edit players
- Search: Filter by name or number
```

### 3.4 Statistics Dashboard

```
Component: StatsDashboard
Usage: Display performance metrics
Props: {
  data: StatsData
  period: 'game' | 'season' | 'career'
  chartType?: 'line' | 'bar' | 'pie'
  compareWith?: ComparisonData
}

Layout:
┌─────────────────────────────────────┐
│ Player Statistics | Season          │
│ [Game] [Season] [Career]            │
│                                     │
│ ┌─── Scoring ───────────────────┐   │
│ │ Points Per Game: 15.8         │   │
│ │ ┌─────────────────────────┐   │   │
│ │ │ ▃▅▇▃▆▄▇▅▃▆█▄▇▅         │   │   │
│ │ │ Games 1-15              │   │   │
│ │ └─────────────────────────┘   │   │
│ │ Season High: 28 points        │   │
│ │ Field Goal %: 47.2%           │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌─── Comparison ────────────────┐    │
│ │      You  vs  Team Avg       │    │
│ │ PPG   15.8  >   12.3  📈     │    │
│ │ REB    6.2  <    7.1  📉     │    │
│ │ AST    4.1  =    4.0  ➡️      │    │
│ └─────────────────────────────────   │
│                                     │
│ [📊 Full Report] [📱 Share]         │
└─────────────────────────────────────┘

Specifications:
- Chart Library: React Chart.js
- Responsive: Adapts to screen size
- Accessibility: Data tables as fallback
- Export: PDF, CSV, Image formats
```

---

## 4. Form & Input Components

### 4.1 Text Input

```
Component: TextInput
Usage: Single-line text entry
Props: {
  label: string
  value: string
  onChange: function
  type: 'text' | 'email' | 'password' | 'number'
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
  maxLength?: number
}

States:
┌─────────────────────────────────────┐
│ Player Name                         │
│ ┌─────────────────────────────────┐ │
│ │ Enter player name               │ │ // Placeholder
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Emily Davis                     │ │ // Filled
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Required field missing          │ │ // Error
│ └─────────────────────────────────┘ │
│ ⚠️ This field is required           │
└─────────────────────────────────────┘

Specifications:
- Min Height: 48px
- Padding: 16px horizontal, 12px vertical
- Border Radius: 8px
- Typography: Body Large (16px)
- Error State: Red border + error message
- Focus: Theme color border
```

### 4.2 Select Dropdown

```
Component: Select
Usage: Choose from predefined options
Props: {
  label: string
  value: string | string[]
  options: SelectOption[]
  onChange: function
  multiple?: boolean
  searchable?: boolean
  placeholder?: string
  error?: string
}

Layout:
┌─────────────────────────────────────┐
│ Team Position                       │
│ ┌─────────────────────────────────┐ │
│ │ Point Guard                  ▼ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Dropdown Open ─────────────────┐ │
│ │ ✓ Point Guard                   │ │
│ │   Shooting Guard                │ │
│ │   Small Forward                 │ │
│ │   Power Forward                 │ │
│ │   Center                        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

Specifications:
- Option Height: 48px minimum
- Max Visible: 6 options (scroll for more)
- Search: Filter options by typing
- Multi-select: Checkboxes + tags
- Mobile: Native picker on iOS/Android
```

### 4.3 Date/Time Picker

```
Component: DateTimePicker
Usage: Schedule games and events
Props: {
  label: string
  value: Date
  onChange: function
  mode: 'date' | 'time' | 'datetime'
  minDate?: Date
  maxDate?: Date
  excludeDates?: Date[]
}

Layout:
┌─────────────────────────────────────┐
│ Game Date & Time                    │
│ ┌─────────────────────────────────┐ │
│ │ 03/15/2025    4:00 PM         📅│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Calendar Picker ──────────────┐  │
│ │    March 2025       < >         │  │
│ │ Su Mo Tu We Th Fr Sa            │  │
│ │              1  2  3  4         │  │
│ │  5  6  7  8  9 10 11            │  │
│ │ 12 13 14[15]16 17 18            │  │
│ │ 19 20 21 22 23 24 25            │  │
│ │ 26 27 28 29 30 31               │  │
│ │                                 │  │
│ │ Time: [4][00] [PM]              │  │
│ │ [Cancel] [Select]               │  │
│ └─────────────────────────────────┘  │
└─────────────────────────────────────┘

Specifications:
- Calendar: Month view with navigation
- Time: 12-hour format with AM/PM
- Blackout Dates: Visually disabled
- Mobile: Native date/time pickers
- Validation: Min/max date constraints
```

### 4.4 File Upload

```
Component: FileUpload
Usage: Upload photos, documents
Props: {
  label: string
  accept: string
  multiple?: boolean
  maxSize?: number
  onUpload: function
  onError: function
  preview?: boolean
}

States:
┌─────────────────────────────────────┐
│ Team Photo                          │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │         📷 Upload Photo         │ │
│ │    Drag & drop or click         │ │
│ │                                 │ │
│ │    Max size: 5MB                │ │
│ │    Format: JPG, PNG             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ With Preview ──────────────────┐ │
│ │ ┌─────┐ team-photo.jpg         │ │
│ │ │ 📸  │ 2.3 MB • Uploaded      │ │
│ │ │     │ [❌ Remove]            │ │
│ │ └─────┘                        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

Specifications:
- Drag & Drop: Visual feedback
- Progress Bar: Upload progress
- Preview: Thumbnail for images
- Validation: File size and type
- Error Handling: Clear error messages
```

---

## 5. Basketball-Specific Components

### 5.1 Game Clock

```
Component: GameClock
Usage: Display and control game time
Props: {
  minutes: number
  seconds: number
  isRunning: boolean
  period: string
  onStart: function
  onPause: function
  onReset: function
  size?: 'compact' | 'standard' | 'large'
}

Layout (Standard):
┌─────────────────────────────────────┐
│           🏀 GAME CLOCK             │
│                                     │
│               8:45                  │
│            QUARTER 2                │
│                                     │
│ [▶️ START] [⏸️ PAUSE] [⏹️ RESET]    │
│                                     │
│ Shot Clock: 18 seconds              │
└─────────────────────────────────────┘

Compact Version:
┌─────────────────────────────────────┐
│ Q2 8:45 [⏸️]                        │
└─────────────────────────────────────┘

Large Version (Referee Interface):
┌─────────────────────────────────────┐
│                                     │
│               8:45                  │ // 72px font
│            QUARTER 2                │
│                                     │
│    [▶️ START]    [⏸️ PAUSE]          │
│                                     │
│         [⏹️ RESET CLOCK]            │
│                                     │
│ Shot Clock:        18               │ // 48px font
│                                     │
│ [🔄 Reset Shot Clock]               │
└─────────────────────────────────────┘

Specifications:
- Time Display: Monospace font (Roboto Mono)
- Color Coding: Green (running), Red (stopped), Yellow (warning)
- Sound: Optional audio alerts
- Precision: Hundredths of seconds
- Offline: Continues running without connection
```

### 5.2 Shot Chart

```
Component: ShotChart
Usage: Visual representation of shot attempts
Props: {
  shots: ShotAttempt[]
  courtSize: 'half' | 'full'
  player?: string
  team?: string
  interactive?: boolean
  onShotSelect?: function
}

Layout:
┌─────────────────────────────────────┐
│        🏀 SHOT CHART                │
│                                     │
│    ┌─────────────────────────┐      │
│    │         🏀             │      │ // Basket
│    │    ●  ○  ●  ○  ●        │      │ // Made/Missed
│    │  ○    ●    ●    ○       │      │
│    │ ●  ●    ○    ●  ●       │      │
│    │   ○  ●  ●  ○  ●  ○      │      │
│    │  ●    ○    ○    ●       │      │
│    │    ●  ○  ●  ○  ●        │      │
│    │ ________________________ │      │ // 3-point line
│    │                         │      │
│    └─────────────────────────┘      │
│                                     │
│ Legend: ● Made (65%) ○ Missed (35%) │
│                                     │
│ [🎯 By Zone] [👤 By Player]         │
└─────────────────────────────────────┘

Specifications:
- Court SVG: Accurate basketball court proportions
- Shot Markers: Color-coded by result
- Zone Analysis: Field goal % by court area
- Interactive: Click shots for details
- Responsive: Scales to container size
```

### 5.3 Substitution Board

```
Component: SubstitutionBoard
Usage: Manage player substitutions
Props: {
  onCourt: Player[]
  onBench: Player[]
  onSubstitute: function
  energyTracking?: boolean
  foulTracking?: boolean
}

Layout:
┌─────────────────────────────────────┐
│         ↔️ SUBSTITUTIONS            │
│                                     │
│ ┌─ On Court (5) ──────────────────┐ │
│ │ 🏃#12 Smith (PG)    22min  F:2  │ │
│ │    Energy: ●●●○○               │ │
│ │                                │ │
│ │ 🏃#15 Davis (SG)    18min  F:1  │ │
│ │    Energy: ●●●●○               │ │
│ │                                │ │
│ │ 🏃#23 Johnson (SF)  20min  F:3  │ │ // Needs rest
│ │    Energy: ●●○○○  ⚠️            │ │
│ │                                │ │
│ │ [↔️ Substitute Johnson]         │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌─ Available Bench (7) ──────────┐  │
│ │ 🪑#8 Lee (G)      Fresh ●●●●●   │  │ // Ready
│ │ 🪑#19 Clark (F)   Fresh ●●●●●   │  │
│ │ 🪑#7 Miller (G)   Fresh ●●●●●   │  │
│ │                                │  │
│ │ [📋 View All Bench]            │  │
│ └────────────────────────────────┘  │
│                                    │
│ [🔄 Quick Sub] [⏰ Scheduled Subs]  │
└─────────────────────────────────────┘

Specifications:
- Energy Tracking: Visual indicators (●●○○○)
- Foul Count: Current personal fouls
- Position Matching: Suggest logical substitutions
- Quick Actions: One-tap substitutions
- Schedule: Plan substitutions for future stoppages
```

### 5.4 Tournament Bracket

```
Component: TournamentBracket
Usage: Display tournament progression
Props: {
  teams: Team[]
  games: Game[]
  format: 'single' | 'double'
  interactive?: boolean
  onGameSelect?: function
}

Layout:
┌─────────────────────────────────────┐
│    🏆 SPRING TOURNAMENT BRACKET     │
│                                     │
│ Round 1   Round 2   Semi    Final   │
│                                     │
│ Eagles ─┐                           │
│   52    │                           │
│         ├─ Eagles ─┐                │
│ Hawks   │    65     │                │
│   48  ──┘          │                │
│                    ├─ Eagles ─┐     │
│ Lions ─┐           │    78     │     │
│   45   │           │           │     │
│        ├─ Lions ───┘           │     │
│ Wolves │    52                 │     │
│   42 ──┘                      │     │
│                               ├─ ?  │
│ Tigers ─┐                     │      │
│   TBD   │                     │      │
│         ├─ ? ─────┐           │      │
│ Bears   │         │           │      │
│   TBD ──┘         │           │      │
│                   ├─ ? ───────┘      │
│ Sharks ─┐         │                  │
│   TBD   │         │                  │
│         ├─ ? ─────┘                  │
│ Panthers│                            │
│   TBD ──┘                            │
│                                     │
│ [🔄 Refresh] [📊 Stats] [📱 Share]  │
└─────────────────────────────────────┘

Specifications:
- Responsive Layout: Scrollable on mobile
- Live Updates: Real-time score updates
- Game Details: Tap for full game information
- Seed Numbers: Display tournament seeding
- Winner Advancement: Automatic progression
```

---

## 6. Live Game Components

### 6.1 Live Score Input

```
Component: LiveScoreInput
Usage: Quick scoring during games
Props: {
  homeTeam: Team
  awayTeam: Team
  onScore: function
  onUndo: function
  activeTeam: 'home' | 'away'
}

Layout:
┌─────────────────────────────────────┐
│     📊 LIVE SCORING                 │
│                                     │
│ Active Team: 🏀 EAGLES              │
│                                     │
│ ┌─ Eagles Players ────────────────┐ │
│ │ #12 Smith     8pts [+2][+3][🆓] │ │
│ │ #15 Davis    12pts [+2][+3][🆓] │ │
│ │ #23 Johnson   6pts [+2][+3][🆓] │ │
│ │ #42 Wilson    9pts [+2][+3][🆓] │ │
│ │ #34 Brown     4pts [+2][+3][🆓] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Last Score: Johnson +3 pointer      │
│ [↩️ UNDO] [🔄 Switch to Hawks]      │
│                                     │
│ ┌─ Quick Stats ───────────────────┐ │
│ │ Team Total: 52 points           │ │
│ │ FG: 21/40 (52.5%)               │ │
│ │ 3PT: 6/15 (40.0%)               │ │
│ │ FT: 4/6 (66.7%)                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [⏰ Timeout] [🔄 Substitution]       │
└─────────────────────────────────────┘

Specifications:
- Touch Targets: 48px minimum for all buttons
- Quick Actions: 2-point, 3-point, free throw
- Undo Function: Revert last 5 actions
- Team Switching: Quick toggle between teams
- Auto-calculation: Running totals and percentages
```

### 6.2 Foul Tracker

```
Component: FoulTracker
Usage: Track personal and team fouls
Props: {
  players: Player[]
  teamFouls: number
  onFoul: function
  onTechnical: function
  bonusStatus: boolean
}

Layout:
┌─────────────────────────────────────┐
│         ⚠️ FOUL TRACKER             │
│                                     │
│ ┌─ Team Fouls ────────────────────┐ │
│ │ Eagles: ||||  (4 fouls)         │ │
│ │ Hawks:  |||   (3 fouls)         │ │
│ │                                 │ │
│ │ 🎯 Bonus: Eagles shooting 1-and-1│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Personal Fouls ────────────────┐ │
│ │ #12 Smith      F: ||    (2)     │ │
│ │ #15 Davis      F: |||   (3)     │ │
│ │ #23 Johnson    F: ||||  (4) ⚠️  │ │ // Warning
│ │ #42 Wilson     F: |     (1)     │ │
│ │ #34 Brown      F: ||    (2)     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Foul Actions ──────────────────┐ │
│ │ [⚠️ Personal] [⚠️ Technical]     │ │
│ │ [⚠️ Flagrant] [⚠️ Unsporting]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [↩️ Undo Foul] [📋 Foul Details]    │
└─────────────────────────────────────┘

Specifications:
- Visual Indicators: Tally marks for easy counting
- Warning System: Alert at 4 personal fouls
- Bonus Tracking: Automatic 1-and-1/double bonus
- Foul Types: Personal, Technical, Flagrant, Unsporting
- Quick Selection: Player dropdown for foul assignment
```

### 6.3 Play-by-Play Feed

```
Component: PlayByPlayFeed
Usage: Live game commentary and actions
Props: {
  plays: PlayAction[]
  autoScroll?: boolean
  enableComments?: boolean
  onAddPlay?: function
}

Layout:
┌─────────────────────────────────────┐
│       📝 PLAY-BY-PLAY               │
│                                     │
│ ┌─ Live Feed ─────────────────────┐ │
│ │ 8:45 - Eagles timeout           │ │
│ │ 8:52 - SCORE! Davis 2-pointer   │ │ // Highlight
│ │ 9:01 - Hawks miss 3-pointer     │ │
│ │ 9:15 - Johnson defensive rebound │ │
│ │ 9:23 - Smith makes free throw   │ │
│ │ 9:30 - Wilson steal              │ │
│ │ 9:45 - SCORE! Wilson layup      │ │ // Highlight
│ │ 10:01 - Hawks call timeout      │ │
│ │                                 │ │
│ │ [📝 Add Play] [🔄 Refresh]      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Fan Comments ──────────────────┐ │
│ │ 👥 "Great shot Davis!" - Mom    │ │
│ │ 👥 "Defense!" - Dad             │ │
│ │ 👥 "Let's go Eagles!" - Coach   │ │
│ │                                 │ │
│ │ [💬 Add Comment]                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [📱 Share Feed] [⬇️ Export]         │
└─────────────────────────────────────┘

Specifications:
- Auto-scroll: Newest plays at top
- Time Stamps: Game clock time
- Scoring Highlights: Bold/colored scoring plays
- Comments: Optional fan interaction
- Export: Text or PDF format
```

---

## 7. Communication Components

### 7.1 Team Chat

```
Component: TeamChat
Usage: Team communication and announcements
Props: {
  messages: Message[]
  participants: User[]
  onSendMessage: function
  allowFiles?: boolean
  moderationEnabled?: boolean
}

Layout:
┌─────────────────────────────────────┐
│ 💬 Eagles Team Chat                 │
│ 👥 15 members online                │
│                                     │
│ ┌─ Messages ──────────────────────┐ │
│ │ Coach Mike • 2:30 PM             │ │
│ │ Great practice today team! 🏀    │ │
│ │ Remember game at 4 PM tomorrow   │ │
│ │                                 │ │
│ │ Sarah D • 2:35 PM               │ │
│ │ Can't wait! Go Eagles! 🦅       │ │
│ │                                 │ │
│ │ Parent Lisa • 2:40 PM           │ │
│ │ What time should we arrive?     │ │
│ │                                 │ │
│ │ Coach Mike • 2:41 PM             │ │
│ │ Players by 3:30 PM please       │ │
│ │ 📸 [Team Photo.jpg]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Type a message...               │ │
│ │ [📎] [😊] [📷]           [SEND] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [📋 Participants] [⚙️ Settings]     │
└─────────────────────────────────────┘

Specifications:
- Real-time: WebSocket connection
- File Sharing: Images, documents (max 10MB)
- Emojis: Basketball and general emoji picker
- Moderation: Coach approval for youth teams
- Notifications: Push notifications for new messages
```

### 7.2 Announcement Banner

```
Component: AnnouncementBanner
Usage: Important league/team announcements
Props: {
  announcement: Announcement
  type: 'info' | 'warning' | 'emergency'
  dismissible?: boolean
  onDismiss?: function
  actions?: ActionItem[]
}

Variants:
┌─────────────────────────────────────┐
│ ℹ️ Info: Game time changed to 5 PM  │
│    [View Details] [❌]              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚠️ Weather Alert: Heat warning      │
│    Extra water breaks required     │
│    [Safety Protocol] [❌]           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🚨 Emergency: Game canceled         │
│    Facility issue - all games off  │
│    [More Info] [Contact] [❌]       │
└─────────────────────────────────────┘

Specifications:
- Color Coding: Blue (info), Orange (warning), Red (emergency)
- Auto-dismiss: After set time period
- Persistent: Emergency announcements stay until read
- Actions: Up to 2 action buttons
- Accessibility: Announced to screen readers
```

### 7.3 Notification Center

```
Component: NotificationCenter
Usage: Centralized notification management
Props: {
  notifications: Notification[]
  onMarkRead: function
  onMarkAllRead: function
  groupByDate?: boolean
}

Layout:
┌─────────────────────────────────────┐
│ 🔔 Notifications (8 new)            │
│ [Mark All Read] [Settings]          │
│                                     │
│ ┌─ Today ─────────────────────────┐ │
│ │ ● 3:45 PM - Game Result         │ │ // Unread
│ │   Eagles win 65-52! View stats  │ │
│ │                                 │ │
│ │ ● 2:30 PM - Payment Reminder    │ │ // Unread
│ │   Team fees due March 20        │ │
│ │                                 │ │
│ │ ○ 1:15 PM - New Team Photo      │ │ // Read
│ │   Coach uploaded team picture   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Yesterday ─────────────────────┐ │
│ │ ● 6:00 PM - Schedule Change     │ │ // Unread
│ │   Tomorrow's game moved to 5PM  │ │
│ │                                 │ │
│ │ ○ 4:30 PM - Practice Reminder   │ │ // Read
│ │   Don't forget tonight's practice│ │
│ └─────────────────────────────────┘ │
│                                     │
│ [📱 Push Settings] [📧 Email Prefs]  │
└─────────────────────────────────────┘

Specifications:
- Grouping: By date (Today, Yesterday, This Week)
- Read Status: Visual indicators (●/○)
- Action Items: Tap to view details or take action
- Filtering: By type (games, payments, announcements)
- Settings: Push, email, SMS preferences
```

---

## 8. Safety & Emergency Components

### 8.1 Emergency Button

```
Component: EmergencyButton
Usage: Quick access to emergency services
Props: {
  type: 'medical' | 'fire' | 'security'
  onPress: function
  confirmationRequired?: boolean
  contactInfo?: ContactInfo
}

Layout:
┌─────────────────────────────────────┐
│        🚨 EMERGENCY                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │         🚑 MEDICAL              │ │
│ │      Emergency Call             │ │ // Large, red
│ │     Contacts 911 + Staff        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │         🔥 FACILITY             │ │
│ │      Emergency Call             │ │
│ │    Fire/Building/Safety         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │         👮 SECURITY             │ │
│ │      Emergency Call             │ │
│ │     Incident Reporting          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Quick Contacts: (602) 555-HELP     │
└─────────────────────────────────────┘

Confirmation Dialog:
┌─────────────────────────────────────┐
│        🚨 CONFIRM EMERGENCY         │
│                                     │
│ Call emergency services and notify  │
│ facility staff immediately?         │
│                                     │
│ This action will:                   │
│ • Dial 911 automatically           │
│ • Alert all staff members          │
│ • Log incident in system           │
│                                     │
│ [❌ CANCEL] [🚨 CONFIRM EMERGENCY]  │
└─────────────────────────────────────┘

Specifications:
- High Visibility: Red background, large buttons
- Quick Access: Always visible, no deep menus
- Confirmation: Prevent accidental activation
- Auto-dial: Direct connection to emergency services
- Logging: All emergency activations recorded
```

### 8.2 Heat Safety Monitor

```
Component: HeatSafetyMonitor
Usage: Phoenix-specific heat monitoring
Props: {
  temperature: number
  heatIndex: number
  uvIndex: number
  onProtocolChange: function
}

Layout:
┌─────────────────────────────────────┐
│ 🌡️ Heat Safety - Phoenix           │
│                                     │
│ ┌─ Current Conditions ────────────┐ │
│ │ Temperature: 108°F              │ │
│ │ Heat Index: 115°F               │ │
│ │ UV Index: 10 (Extreme)          │ │
│ │ Humidity: 18%                   │ │
│ │                                 │ │
│ │ Status: 🔴 RED ALERT            │ │ // Critical
│ │ Action: Consider Cancellation   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Active Protocols ──────────────┐ │
│ │ ✅ Water breaks every 6 minutes  │ │
│ │ ✅ Shade required between plays  │ │
│ │ ✅ Game shortened to 4 min qtrs  │ │
│ │ ✅ Medical staff mandatory       │ │
│ │ ⚠️ Consider game cancellation    │ │
│ │                                 │ │
│ │ Next Check: 10 minutes          │ │
│ │ [🔄 Update Now]                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Heat Illness Warning ──────────┐ │
│ │ Watch for these symptoms:       │ │
│ │ • Excessive sweating/no sweat   │ │
│ │ • Nausea, dizziness, weakness   │ │
│ │ • Rapid pulse, confusion        │ │
│ │                                 │ │
│ │ [🚑 Emergency Protocol]         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [📊 History] [⚙️ Settings] [📱 Alert]│
└─────────────────────────────────────┘

Heat Index Color Codes:
- 🟢 Green (< 90°F): Normal play
- 🟡 Yellow (90-99°F): Caution advised
- 🟠 Orange (100-109°F): Enhanced protocols
- 🔴 Red (110°F+): Consider cancellation

Specifications:
- Real-time Updates: Weather API integration
- Auto-alerts: Push notifications at threshold changes
- Protocol Automation: Suggests safety measures
- History Tracking: Weather conditions log
- Compliance: Follows Arizona youth sports guidelines
```

### 8.3 Incident Report Form

```
Component: IncidentReportForm
Usage: Document safety incidents
Props: {
  onSubmit: function
  incidentTypes: string[]
  witnesses?: User[]
  location?: string
}

Layout:
┌─────────────────────────────────────┐
│ 📋 Incident Report Form             │
│                                     │
│ ┌─ Incident Details ──────────────┐ │
│ │ Date/Time: 03/15/25 4:23 PM     │ │ // Auto-filled
│ │ Location: Main Gym Court A      │ │
│ │                                 │ │
│ │ Incident Type:                  │ │
│ │ ○ Player Injury                 │ │
│ │ ● Equipment Malfunction         │ │
│ │ ○ Facility Issue                │ │
│ │ ○ Weather Related               │ │
│ │ ○ Other                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ People Involved ───────────────┐ │
│ │ Players:                        │ │
│ │ [+ Add Player]                  │ │
│ │                                 │ │
│ │ Staff/Officials:                │ │
│ │ John Smith (Referee)            │ │
│ │ [+ Add Staff]                   │ │
│ │                                 │ │
│ │ Witnesses:                      │ │
│ │ Mike Johnson (Coach)            │ │
│ │ [+ Add Witness]                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Description ───────────────────┐ │
│ │ Describe what happened...       │ │
│ │                                 │ │
│ │ (Required minimum 50 characters) │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Actions Taken ─────────────────┐ │
│ │ Immediate response actions...   │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [📷 Add Photos] [📁 Attach Files]   │
│                                     │
│ [💾 Save Draft] [📤 Submit Report]  │
└─────────────────────────────────────┘

Specifications:
- Auto-population: Date, time, location from context
- Required Fields: Incident type, description, actions
- File Attachments: Photos, documents
- Draft Saving: Auto-save every 30 seconds
- Submission: Email to admin + system storage
```

---

## 9. Layout & Container Components

### 9.1 Page Layout

```
Component: PageLayout
Usage: Consistent page structure
Props: {
  title?: string
  showBackButton?: boolean
  actions?: ActionItem[]
  bottomNavigation?: boolean
  children: ReactNode
}

Structure:
┌─────────────────────────────────────┐
│ [Header/App Bar]                    │ // 64px height
├─────────────────────────────────────┤
│                                     │
│                                     │
│        [Main Content Area]          │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [Bottom Navigation]                 │ // 72px height
└─────────────────────────────────────┘

Specifications:
- Safe Areas: iOS notch/home indicator support
- Scroll Behavior: Header collapse on scroll
- Accessibility: Skip to main content link
- Loading States: Skeleton screens during load
```

### 9.2 Card Container

```
Component: Card
Usage: Content grouping and elevation
Props: {
  elevation?: 0 | 1 | 2 | 3 | 4
  padding?: 'none' | 'small' | 'medium' | 'large'
  clickable?: boolean
  onClick?: function
  children: ReactNode
}

Variants:
┌─────────────────────────────────────┐
│ Regular Card (elevation 1)          │
│                                     │
│ Content goes here with standard     │
│ padding and rounded corners.        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Clickable Card (elevation 2)        │ // Hover effect
│                                     │
│ Interactive card with press states  │
│ and accessibility support.          │
└─────────────────────────────────────┘

Specifications:
- Border Radius: 12px
- Padding Options: 8px, 16px, 24px, 32px
- Elevation: Drop shadow levels
- Interactive: Press/hover states for clickable cards
```

### 9.3 List Component

```
Component: List
Usage: Vertical content lists
Props: {
  items: ListItem[]
  itemRenderer: function
  onItemSelect?: function
  separators?: boolean
  emptyState?: ReactNode
}

Layout:
┌─────────────────────────────────────┐
│ ┌─ List Item ─────────────────────┐ │
│ │ 📸 Primary Text                 │ │
│ │    Secondary text line          │ │
│ │                          [>]   │ │ // Action
│ └─────────────────────────────────┘ │
│ ────────────────────────────────────  │ // Separator
│ ┌─ List Item ─────────────────────┐ │
│ │ 🏀 Another Item                 │ │
│ │    With supporting text         │ │
│ │                          [❤️]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [🔄 Load More Items]                │
└─────────────────────────────────────┘

Empty State:
┌─────────────────────────────────────┐
│                                     │
│           📭                        │
│       No items found                │
│                                     │
│ Try adjusting your search or        │
│ add new items to get started.       │
│                                     │
│        [+ Add Item]                 │
└─────────────────────────────────────┘

Specifications:
- Item Height: Minimum 48px
- Avatar/Icon: 40px diameter
- Text Hierarchy: Primary (16px), Secondary (14px)
- Actions: Right-aligned, accessible
- Infinite Scroll: Load more items on scroll
```

### 9.4 Modal Dialog

```
Component: Modal
Usage: Overlay dialogs and confirmations
Props: {
  title: string
  open: boolean
  onClose: function
  size?: 'small' | 'medium' | 'large' | 'fullscreen'
  closeOnBackdrop?: boolean
  children: ReactNode
}

Layout:
┌─────────────────────────────────────┐
│ ████████ Backdrop ████████████████  │
│ ████████████████████████████████    │
│ ████ ┌─────────────────────────┐ ██ │
│ ████ │ Dialog Title        [❌]│ ██ │
│ ████ ├─────────────────────────┤ ██ │
│ ████ │                         │ ██ │
│ ████ │   Dialog Content        │ ██ │
│ ████ │                         │ ██ │
│ ████ │                         │ ██ │
│ ████ ├─────────────────────────┤ ██ │
│ ████ │ [Cancel]      [Confirm] │ ██ │
│ ████ └─────────────────────────┘ ██ │
│ ████████████████████████████████    │
└─────────────────────────────────────┘

Mobile Fullscreen:
┌─────────────────────────────────────┐
│ ← Back    Dialog Title         [✓]  │ // Full screen
├─────────────────────────────────────┤
│                                     │
│         Full screen content         │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│          [Action Buttons]           │
└─────────────────────────────────────┘

Specifications:
- Backdrop: Semi-transparent overlay
- Animation: Slide up from bottom (mobile), fade in (desktop)
- Focus Management: Trap focus within modal
- Escape: Close on ESC key
- Max Width: 90% of viewport, max 600px
```

---

## 10. Component States & Interactions

### 10.1 Loading States

```
Skeleton Loading:
┌─────────────────────────────────────┐
│ ████████ Loading Content ███████    │
│                                     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓                       │ // Shimmer effect
│ ▓▓▓▓▓▓▓▓                           │
│                                     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                 │
│ ▓▓▓▓▓▓▓▓▓▓▓                        │
│                                     │
│ [▓▓▓▓▓▓▓] [▓▓▓▓▓▓▓▓▓]               │
└─────────────────────────────────────┘

Spinner Loading:
┌─────────────────────────────────────┐
│                                     │
│              ⏳                     │ // Animated
│          Loading...                 │
│                                     │
└─────────────────────────────────────┘
```

### 10.2 Error States

```
Error Message:
┌─────────────────────────────────────┐
│            ⚠️ Error                 │
│                                     │
│ Something went wrong while loading  │
│ this content. Please try again.     │
│                                     │
│     [🔄 Try Again] [📞 Support]     │
└─────────────────────────────────────┘

Form Field Error:
┌─────────────────────────────────────┐
│ Email Address                       │
│ ┌─────────────────────────────────┐ │
│ │ invalid-email                   │ │ // Red border
│ └─────────────────────────────────┘ │
│ ⚠️ Please enter a valid email       │ // Error text
└─────────────────────────────────────┘
```

### 10.3 Success States

```
Success Message:
┌─────────────────────────────────────┐
│            ✅ Success               │
│                                     │
│ Your changes have been saved        │
│ successfully!                       │
│                                     │
│          [Continue]                 │
└─────────────────────────────────────┘

Form Success:
┌─────────────────────────────────────┐
│ Team Name                           │
│ ┌─────────────────────────────────┐ │
│ │ Phoenix Eagles                  │ │ // Green border
│ └─────────────────────────────────┘ │
│ ✅ Team name is available           │ // Success text
└─────────────────────────────────────┘
```

### 10.4 Interactive States

```
Button States:
[Primary Button]     // Default
[Primary Button]     // Hover (darker)
[Primary Button]     // Active (pressed)
[Primary Button]     // Focus (outline)
[❌ Disabled]        // Disabled (grayed)

Touch Feedback:
- Buttons: Scale down 95% on press
- Cards: Elevation increase on press
- List Items: Background highlight
- Icons: Ripple effect on tap
```

---

## Accessibility Specifications

### Screen Reader Support
- All components include proper ARIA labels
- Interactive elements have descriptive names
- Form controls associated with labels
- Live regions for dynamic content updates
- Logical heading hierarchy (h1 → h6)

### Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order throughout components
- Skip links for main navigation
- Focus indicators clearly visible
- Escape key support for modals

### Color & Contrast
- WCAG 2.1 AA contrast ratios (4.5:1 minimum)
- Color not sole means of communication
- High contrast mode support
- Color-blind friendly palettes
- Alternative text for all images

### Touch & Motor
- Minimum 48x48px touch targets
- Adequate spacing between elements
- Support for assistive touch devices
- Voice control compatibility
- Reduced motion preferences

---

## Implementation Guidelines

### Development Standards
- TypeScript for type safety
- React 18+ with hooks
- Styled-components for theming
- Storybook for component documentation
- Jest + Testing Library for tests

### Performance
- Lazy loading for large components
- Memoization for expensive calculations
- Virtualization for long lists
- Progressive image loading
- Bundle size optimization

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 13+
- Android Chrome 80+
- Progressive enhancement
- Graceful degradation

---

**Component Library Status**: Complete  
**Next Phase**: Design System Documentation  
**Dependencies**: Design tokens, icon library, testing framework  
**Review Required**: Development team, accessibility team, product owner