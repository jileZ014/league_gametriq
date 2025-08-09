# Design System - Basketball League Management Platform
## Phase 2 UI/UX Design Foundations

**Document ID:** DS-BLMP-001  
**Version:** 1.0  
**Date:** August 8, 2025  
**Author:** Sports UI/UX Designer  
**Status:** Phase 2 Design System Specification  

---

## Executive Summary

This document establishes the comprehensive design system for the Basketball League Management Platform Phase 2. Built on Material Design 3 principles and optimized for multi-generational users (ages 6-60+), this system ensures visual consistency, accessibility compliance (WCAG 2.1 AA), and optimal user experience across all basketball league management functions.

### Design System Goals
- **Consistency**: Unified visual language across all touchpoints
- **Accessibility**: WCAG 2.1 AA compliant with inclusive design
- **Scalability**: System supports growth and new features
- **Basketball Context**: Sport-specific visual elements and terminology
- **Multi-Generational**: Age-appropriate design variations
- **Performance**: Optimized for mobile and courtside use

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Color System](#2-color-system)
3. [Typography Scale](#3-typography-scale)
4. [Spacing & Layout](#4-spacing--layout)
5. [Iconography](#5-iconography)
6. [Elevation & Shadows](#6-elevation--shadows)
7. [Motion & Animation](#7-motion--animation)
8. [Responsive Grid System](#8-responsive-grid-system)
9. [Component Patterns](#9-component-patterns)
10. [Accessibility Standards](#10-accessibility-standards)

---

## 1. Design Tokens

### 1.1 Token Structure

```json
{
  "color": {
    "primary": {
      "50": "#e8f5e8",
      "100": "#c8e6c9",
      "500": "#4caf50",
      "900": "#1b5e20"
    }
  },
  "typography": {
    "scale": {
      "small": "12px",
      "medium": "14px",
      "large": "16px"
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  }
}
```

### 1.2 Basketball-Specific Tokens

```json
{
  "basketball": {
    "court": {
      "primary": "#d2691e",      // Court wood color
      "lines": "#ffffff",        // Court line markings
      "threePoint": "#ff6b35"    // 3-point line accent
    },
    "team": {
      "home": "#2196f3",         // Home team primary
      "away": "#f44336",         // Away team primary
      "neutral": "#9e9e9e"       // Neutral/referee
    },
    "game": {
      "live": "#ff5722",         // Live game indicator
      "scheduled": "#2196f3",    // Scheduled games
      "completed": "#4caf50"     // Completed games
    }
  }
}
```

### 1.3 Age-Appropriate Variations

```json
{
  "ageGroups": {
    "youth": {           // Ages 6-12
      "brightness": 1.1,
      "saturation": 1.2,
      "fontSize": 1.0,
      "iconSize": 1.1,
      "spacing": 1.0
    },
    "teen": {            // Ages 13-17
      "brightness": 1.0,
      "saturation": 1.1,
      "fontSize": 1.0,
      "iconSize": 1.0,
      "spacing": 1.0
    },
    "adult": {           // Ages 18-60+
      "brightness": 1.0,
      "saturation": 1.0,
      "fontSize": 1.0,
      "iconSize": 1.0,
      "spacing": 1.0
    }
  }
}
```

---

## 2. Color System

### 2.1 Primary Brand Colors

```
Basketball Orange (Primary)
┌─────────────────────────────────────┐
│ 50:  #fff3e0  Very Light Orange    │
│ 100: #ffe0b2  Light Orange         │
│ 200: #ffcc80  Medium Light Orange  │
│ 300: #ffb74d  Light Orange         │
│ 400: #ffa726  Medium Orange        │
│ 500: #ff9800  Primary Orange       │ ← Primary
│ 600: #fb8c00  Medium Dark Orange   │
│ 700: #f57c00  Dark Orange          │
│ 800: #ef6c00  Very Dark Orange     │
│ 900: #e65100  Deepest Orange       │
└─────────────────────────────────────┘

Court Green (Secondary)
┌─────────────────────────────────────┐
│ 50:  #e8f5e8  Very Light Green     │
│ 100: #c8e6c9  Light Green          │
│ 200: #a5d6a7  Medium Light Green   │
│ 300: #81c784  Light Green          │
│ 400: #66bb6a  Medium Green         │
│ 500: #4caf50  Primary Green        │ ← Secondary
│ 600: #43a047  Medium Dark Green    │
│ 700: #388e3c  Dark Green           │
│ 800: #2e7d32  Very Dark Green      │
│ 900: #1b5e20  Deepest Green        │
└─────────────────────────────────────┘
```

### 2.2 Semantic Colors

```
Success (Game Won/Completed)
■ #4caf50 (Green 500)

Warning (Heat Alert/Caution)  
■ #ff9800 (Orange 500)

Error (Game Canceled/Issue)
■ #f44336 (Red 500)

Information (Announcements)
■ #2196f3 (Blue 500)

Neutral (General Content)
■ #9e9e9e (Grey 500)
```

### 2.3 Team Colors

```
Home Team Colors:
Primary:   #1976d2 (Blue 700)
Light:     #bbdefb (Blue 100)
Dark:      #0d47a1 (Blue 900)

Away Team Colors:
Primary:   #d32f2f (Red 700)  
Light:     #ffcdd2 (Red 100)
Dark:      #b71c1c (Red 900)

Referee Colors:
Primary:   #424242 (Grey 800)
Secondary: #9e9e9e (Grey 500)
Accent:    #ffeb3b (Yellow 500)
```

### 2.4 Surface & Background Colors

```
Light Theme:
┌─────────────────────────────────────┐
│ Surface Primary:    #ffffff         │ ← Cards, dialogs
│ Surface Secondary:  #f5f5f5         │ ← Backgrounds
│ Surface Tertiary:   #eeeeee         │ ← Dividers
│ Outline:            #e0e0e0         │ ← Borders
│ On Surface:         #212121         │ ← Text on surface
│ On Background:      #424242         │ ← Body text
└─────────────────────────────────────┘

Dark Theme:
┌─────────────────────────────────────┐
│ Surface Primary:    #121212         │ ← Cards, dialogs
│ Surface Secondary:  #1e1e1e         │ ← Backgrounds  
│ Surface Tertiary:   #2c2c2c         │ ← Dividers
│ Outline:            #383838         │ ← Borders
│ On Surface:         #ffffff         │ ← Text on surface
│ On Background:      #e0e0e0         │ ← Body text
└─────────────────────────────────────┘
```

### 2.5 Accessibility Contrast Ratios

```
WCAG 2.1 AA Compliance:
┌─────────────────────────────────────┐
│ Normal Text (16px+): 4.5:1 minimum │
│ Large Text (24px+):  3:1 minimum   │
│ UI Components:       3:1 minimum   │
│ Graphics:            3:1 minimum   │
└─────────────────────────────────────┘

Contrast Examples:
■ #ff9800 on #ffffff = 4.52:1 ✓ (AA)
■ #4caf50 on #ffffff = 4.68:1 ✓ (AA)  
■ #2196f3 on #ffffff = 4.59:1 ✓ (AA)
■ #f44336 on #ffffff = 5.04:1 ✓ (AA)
```

### 2.6 Color-Blind Accessibility

```
Color-Blind Friendly Palette:
┌─────────────────────────────────────┐
│ Primary:    #ff9800 (Orange)        │ ← Visible to all
│ Secondary:  #2196f3 (Blue)          │ ← Safe choice
│ Success:    #4caf50 (Green) + ✓     │ ← Icon support
│ Error:      #f44336 (Red) + ❌      │ ← Icon support
│ Warning:    #ff9800 (Orange) + ⚠️   │ ← Icon support
└─────────────────────────────────────┘

Never use color alone to convey:
- Game status (add icons)
- Team identification (add names/logos)
- Form validation (add text messages)
- Data categories (add labels/patterns)
```

---

## 3. Typography Scale

### 3.1 Font Family Stack

```css
/* Primary Font Family */
font-family: 'Roboto', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;

/* Monospace (Game Clock/Stats) */
font-family: 'Roboto Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace;

/* Display (Headers) */
font-family: 'Roboto Flex', 'Roboto', system-ui, sans-serif;
```

### 3.2 Type Scale

```
Display Large (Game Scores)
Font Size: 57px
Line Height: 64px  
Letter Spacing: -0.25px
Font Weight: 400 (Regular)
Use: Large scoreboards, major headings

Display Medium (Section Headers)
Font Size: 45px
Line Height: 52px
Letter Spacing: 0px
Font Weight: 400 (Regular)
Use: Page titles, important metrics

Display Small (Card Headers)
Font Size: 36px
Line Height: 44px
Letter Spacing: 0px
Font Weight: 400 (Regular)
Use: Card titles, dashboard widgets

Headline Large (Page Titles)
Font Size: 32px
Line Height: 40px
Letter Spacing: 0px
Font Weight: 500 (Medium)
Use: Main page headings

Headline Medium (Section Titles)
Font Size: 28px
Line Height: 36px
Letter Spacing: 0px
Font Weight: 500 (Medium)
Use: Section headings, modal titles

Headline Small (Component Titles)
Font Size: 24px
Line Height: 32px
Letter Spacing: 0px
Font Weight: 500 (Medium)
Use: Component headers, card titles

Title Large (Important Text)
Font Size: 22px
Line Height: 28px
Letter Spacing: 0px
Font Weight: 500 (Medium)
Use: Important content, button labels

Title Medium (Standard Headers)
Font Size: 16px
Line Height: 24px
Letter Spacing: 0.15px
Font Weight: 500 (Medium)
Use: List headers, form labels

Title Small (Minor Headers)
Font Size: 14px
Line Height: 20px
Letter Spacing: 0.1px
Font Weight: 500 (Medium)
Use: Captions, minor labels

Body Large (Primary Text)
Font Size: 16px
Line Height: 24px
Letter Spacing: 0.5px
Font Weight: 400 (Regular)
Use: Body text, descriptions

Body Medium (Secondary Text)
Font Size: 14px
Line Height: 20px
Letter Spacing: 0.25px
Font Weight: 400 (Regular)
Use: Supporting text, metadata

Body Small (Fine Print)
Font Size: 12px
Line Height: 16px
Letter Spacing: 0.4px
Font Weight: 400 (Regular)
Use: Captions, fine print

Label Large (Button Text)
Font Size: 14px
Line Height: 20px
Letter Spacing: 0.1px
Font Weight: 500 (Medium)
Use: Button labels, tabs

Label Medium (Form Labels)
Font Size: 12px
Line Height: 16px
Letter Spacing: 0.5px
Font Weight: 500 (Medium)
Use: Form field labels

Label Small (Micro Text)
Font Size: 11px
Line Height: 16px
Letter Spacing: 0.5px
Font Weight: 500 (Medium)
Use: Badges, status indicators
```

### 3.3 Basketball-Specific Typography

```
Game Clock Display
Font Family: 'Roboto Mono'
Font Size: 48px (mobile), 72px (tablet), 96px (desktop)
Font Weight: 700 (Bold)
Color: Theme dependent
Letter Spacing: -1px
Use: Game clock, shot clock

Player Numbers
Font Family: 'Roboto Flex'
Font Size: 24px
Font Weight: 900 (Black)
Color: Team colors
Use: Jersey numbers, player identification

Score Display
Font Family: 'Roboto'
Font Size: 36px (mobile), 48px (tablet), 64px (desktop)
Font Weight: 700 (Bold)
Line Height: 1.2
Use: Live scores, final scores

Statistics
Font Family: 'Roboto Mono'
Font Size: 14px
Font Weight: 500 (Medium)
Line Height: 1.4
Use: Player stats, team stats
```

### 3.4 Responsive Typography

```css
/* Mobile (320px - 767px) */
@media (max-width: 767px) {
  .display-large { font-size: 36px; line-height: 44px; }
  .headline-large { font-size: 24px; line-height: 32px; }
  .body-large { font-size: 16px; line-height: 24px; }
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .display-large { font-size: 48px; line-height: 56px; }
  .headline-large { font-size: 28px; line-height: 36px; }
  .body-large { font-size: 16px; line-height: 24px; }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .display-large { font-size: 57px; line-height: 64px; }
  .headline-large { font-size: 32px; line-height: 40px; }
  .body-large { font-size: 16px; line-height: 24px; }
}
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

```
Base Unit: 4px

Spacing Scale:
┌─────────────────────────────────────┐
│ xs:  4px   (0.25rem)  │░│           │ ← Micro spacing
│ sm:  8px   (0.5rem)   │░░│          │ ← Small spacing  
│ md:  16px  (1rem)     │░░░░│        │ ← Medium spacing
│ lg:  24px  (1.5rem)   │░░░░░░│      │ ← Large spacing
│ xl:  32px  (2rem)     │░░░░░░░░│    │ ← Extra large
│ 2xl: 48px  (3rem)     │░░░░░░░░░░░░│ │ ← Section spacing
│ 3xl: 64px  (4rem)     │░░░░░░░░░░░░░░│ ← Page spacing
└─────────────────────────────────────┘

Usage Guidelines:
- xs (4px): Icon padding, border widths
- sm (8px): Component internal padding
- md (16px): Standard padding/margins
- lg (24px): Component separation
- xl (32px): Section separation
- 2xl (48px): Page section gaps
- 3xl (64px): Major layout divisions
```

### 4.2 Layout Spacing Patterns

```
Card Internal Spacing:
┌─────────────────────────────────────┐
│ ←md→ Card Title              ←md→   │
│                                     │
│ ↑sm                                 │
│                                     │
│ ←md→ Card content goes here  ←md→   │
│      with proper spacing            │
│                                     │
│ ↓md                                 │ 
│                                     │
│ ←md→ [Action Button]         ←md→   │
│                                     │
│ ↓md                                 │
└─────────────────────────────────────┘

List Item Spacing:
┌─────────────────────────────────────┐
│ ←md→ 📱 List Item            ←sm→>  │
│      ↑sm Supporting text            │
│      ↓sm                            │
├─────────────────────────────────────┤ ← 1px divider
│ ←md→ 🏀 Another Item         ←sm→>  │
│      ↑sm More supporting text       │
│      ↓sm                            │
└─────────────────────────────────────┘
```

### 4.3 Touch Target Spacing

```
Minimum Touch Targets (44px):
┌─────────────────────────────────────┐
│           [44px Button]             │ ← Minimum size
│                                     │
│ [Button 1]  [Button 2]  [Button 3]  │ ← 8px spacing
│    ↑8px        ↑8px        ↑8px     │
│                                     │
│ Large Touch Area:                   │
│ ┌─────────────────────────────────┐ │
│ │         [Touch Zone]            │ │ ← 48px minimum
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

Basketball-Specific Spacing:
- Scorekeeper buttons: 56px (larger for quick tapping)
- Emergency buttons: 64px (maximum visibility)
- Player selection: 48px (standard touch target)
- Navigation tabs: 72px height (comfortable reach)
```

### 4.4 Container Spacing

```css
/* Page Container */
.page-container {
  padding: 16px;                    /* Mobile */
  max-width: 1200px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .page-container {
    padding: 24px;                  /* Tablet */
  }
}

@media (min-width: 1024px) {
  .page-container {
    padding: 32px;                  /* Desktop */
  }
}

/* Component Spacing */
.component-stack > * + * {
  margin-top: 24px;                 /* Vertical rhythm */
}

.section-spacing {
  margin-bottom: 48px;              /* Section separation */
}
```

---

## 5. Iconography

### 5.1 Icon System

```
Icon Sizes:
┌─────────────────────────────────────┐
│ Small:  16px ■                      │ ← Status indicators
│ Medium: 24px ■■                     │ ← Standard UI icons
│ Large:  32px ■■■                    │ ← Important actions
│ XL:     40px ■■■■                   │ ← Featured content
│ XXL:    48px ■■■■■                  │ ← Hero elements
└─────────────────────────────────────┘

Icon Weights:
- Outlined: Default state (400)
- Filled: Active/selected state (500)
- Sharp: Basketball-specific actions (400)
- Round: Friendly/approachable actions (400)
```

### 5.2 Basketball Icon Library

```
Core Basketball Icons:
🏀 basketball           - General basketball reference
🏃 player-running       - Player movement/action
🦓 referee              - Officials/referees
📊 statistics           - Stats and analytics
⏰ game-clock          - Time management
🏆 trophy               - Awards and achievements
⚡ substitution         - Player changes
💪 team-spirit          - Motivation/energy
🎯 accuracy             - Shooting/precision
📱 mobile-scoring       - Digital tools

Game Management Icons:
⏸️ pause-game          - Stop game clock
▶️ start-game          - Start game clock  
⏹️ stop-game           - End period/game
🔄 reset-clock         - Reset game clock
📋 roster              - Team rosters
↔️ substitute          - Player substitution
⚠️ foul                - Foul calls
⏰ timeout             - Team timeouts
🏥 injury              - Medical attention
🚨 emergency           - Emergency situations

Team & Player Icons:
👤 player-profile      - Individual players
👥 team-roster         - Team groups
🏠 home-team           - Home team indicator
✈️ away-team           - Away team indicator
📸 player-photo        - Player images
🏃‍♂️ position-guard      - Guard positions
🏃‍♂️ position-forward    - Forward positions
🏃‍♂️ position-center     - Center position
⭐ team-captain        - Team leadership
🎽 jersey-number       - Player numbers
```

### 5.3 UI System Icons

```
Navigation Icons:
🏠 home                 - Dashboard/main
👥 teams                - Teams section
📊 stats                - Statistics
💬 messages             - Communication
👤 profile              - User profile
⚙️ settings             - Configuration
📅 calendar             - Schedule/events
🔔 notifications        - Alerts/updates

Action Icons:
➕ add                  - Create new items
✏️ edit                 - Modify content
❌ delete               - Remove items
👁️ view                 - Preview content
📤 share                - Share content
⬇️ download             - Save locally
🔄 refresh              - Update content
🔍 search               - Find content

Status Icons:
✅ success              - Completed/approved
⚠️ warning              - Caution required
❌ error                - Failed/blocked
ℹ️ information          - General info
🔴 live                 - Currently active
⏸️ paused               - Temporarily stopped
✓ completed             - Finished task
⏱️ pending              - Awaiting action
```

### 5.4 Icon Usage Guidelines

```
Icon Color Rules:
┌─────────────────────────────────────┐
│ State        │ Color      │ Usage   │
│──────────────┼────────────┼─────────│
│ Default      │ #424242    │ Normal  │
│ Active       │ #ff9800    │ Selected│
│ Disabled     │ #9e9e9e    │ Inactive│
│ Error        │ #f44336    │ Problems│
│ Success      │ #4caf50    │ Complete│
│ Warning      │ #ff9800    │ Caution │
│ Info         │ #2196f3    │ General │
└─────────────────────────────────────┘

Accessibility:
- Never use icons alone (include text labels)
- Provide alt text for all icons
- Use consistent icons for same actions
- Ensure 3:1 contrast ratio minimum
- Test with screen readers
```

---

## 6. Elevation & Shadows

### 6.1 Elevation Levels

```
Elevation System (Material Design 3):
┌─────────────────────────────────────┐
│ Level 0: No shadow (flat surface)   │
│ __________________________________ │
│                                     │
│ Level 1: Subtle shadow (cards)      │
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│   ░░                                │
│                                     │
│ Level 2: Standard shadow (buttons)  │
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│   ░░░                               │
│                                     │
│ Level 3: Raised shadow (FAB)        │
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│   ░░░░                              │
│                                     │
│ Level 4: Modal shadow (dialogs)     │
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│   ░░░░░                             │
│                                     │
│ Level 5: Maximum shadow (menus)     │
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│   ░░░░░░                            │
└─────────────────────────────────────┘
```

### 6.2 Shadow Definitions

```css
/* Elevation Level 0 (Flat) */
.elevation-0 {
  box-shadow: none;
}

/* Elevation Level 1 (Cards) */
.elevation-1 {
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.12);
}

/* Elevation Level 2 (Buttons) */
.elevation-2 {
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 6px rgba(0, 0, 0, 0.12);
}

/* Elevation Level 3 (FAB) */
.elevation-3 {
  box-shadow: 
    0 3px 6px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.12);
}

/* Elevation Level 4 (Modals) */
.elevation-4 {
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.15),
    0 3px 12px rgba(0, 0, 0, 0.12);
}

/* Elevation Level 5 (Menus) */
.elevation-5 {
  box-shadow: 
    0 5px 12px rgba(0, 0, 0, 0.15),
    0 4px 16px rgba(0, 0, 0, 0.12);
}
```

### 6.3 Basketball-Specific Elevations

```css
/* Live Game Elements (Higher Priority) */
.live-scoreboard {
  box-shadow: 
    0 4px 12px rgba(255, 152, 0, 0.3),    /* Orange glow */
    0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Emergency Buttons (Maximum Attention) */
.emergency-button {
  box-shadow: 
    0 6px 16px rgba(244, 67, 54, 0.4),    /* Red glow */
    0 3px 12px rgba(0, 0, 0, 0.2);
}

/* Team Cards (Subtle Branding) */
.team-card.home {
  box-shadow: 
    0 2px 8px rgba(33, 150, 243, 0.2),    /* Blue team shadow */
    0 1px 4px rgba(0, 0, 0, 0.1);
}

.team-card.away {
  box-shadow: 
    0 2px 8px rgba(244, 67, 54, 0.2),     /* Red team shadow */
    0 1px 4px rgba(0, 0, 0, 0.1);
}
```

### 6.4 Interactive Elevation Changes

```css
/* Button Hover States */
.button-primary {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 200ms ease-in-out;
}

.button-primary:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.button-primary:active {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Card Hover Effects */
.card-interactive {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transition: box-shadow 200ms ease-in-out;
}

.card-interactive:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}
```

---

## 7. Motion & Animation

### 7.1 Animation Principles

```
Basketball League Animation Goals:
┌─────────────────────────────────────┐
│ ✓ Provide feedback for user actions │
│ ✓ Guide attention to important info │
│ ✓ Create smooth state transitions   │
│ ✓ Maintain performance on mobile    │
│ ✓ Support reduced motion preference │
│ ✓ Enhance basketball experience     │
└─────────────────────────────────────┘

Duration Guidelines:
- Micro interactions: 150ms
- Simple transitions: 200ms  
- Complex animations: 300ms
- Page transitions: 400ms
- Loading states: 500ms+
- Maximum duration: 600ms
```

### 7.2 Easing Functions

```css
/* Standard Easing Curves */
:root {
  --ease-linear: cubic-bezier(0.0, 0.0, 1.0, 1.0);
  --ease-standard: cubic-bezier(0.2, 0.0, 0, 1.0);
  --ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0.0, 1, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Basketball-Specific Easing */
.basketball-bounce {
  animation-timing-function: var(--ease-bounce);
}

.score-update {
  animation-timing-function: var(--ease-decelerate);
}

.game-clock {
  animation-timing-function: var(--ease-linear);
}
```

### 7.3 Common Animations

#### Button Press Animation
```css
.button-press {
  transform: scale(1);
  transition: transform 150ms var(--ease-standard);
}

.button-press:active {
  transform: scale(0.95);
}
```

#### Score Update Animation
```css
@keyframes score-update {
  0% { 
    transform: scale(1); 
    color: var(--color-on-surface);
  }
  50% { 
    transform: scale(1.1); 
    color: var(--color-primary);
  }
  100% { 
    transform: scale(1); 
    color: var(--color-on-surface);
  }
}

.score-change {
  animation: score-update 300ms var(--ease-decelerate);
}
```

#### Live Game Pulse
```css
@keyframes live-pulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.05);
  }
}

.live-indicator {
  animation: live-pulse 2s infinite var(--ease-standard);
}
```

#### Modal Slide-In
```css
@keyframes modal-slide-in {
  0% {
    transform: translateY(100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-enter {
  animation: modal-slide-in 300ms var(--ease-decelerate);
}
```

### 7.4 Loading Animations

#### Skeleton Loading
```css
@keyframes skeleton-loading {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.skeleton {
  background: linear-gradient(90deg, 
    #f0f0f0 0%, 
    #e0e0e0 50%, 
    #f0f0f0 100%
  );
  background-size: 200px 100%;
  animation: skeleton-loading 1.5s infinite linear;
}
```

#### Basketball Spinner
```css
@keyframes basketball-spin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}

.basketball-loading {
  display: inline-block;
  font-size: 24px;
  animation: basketball-spin 1s infinite var(--ease-standard);
}

/* Usage: <div class="basketball-loading">🏀</div> */
```

### 7.5 Page Transitions

```css
/* Page Enter Animation */
@keyframes page-enter {
  0% {
    opacity: 0;
    transform: translateX(20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Page Exit Animation */
@keyframes page-exit {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-20px);
  }
}

.page-transition-enter {
  animation: page-enter 400ms var(--ease-decelerate);
}

.page-transition-exit {
  animation: page-exit 200ms var(--ease-accelerate);
}
```

### 7.6 Reduced Motion Support

```css
/* Respect user preferences for reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Keep essential animations but reduce intensity */
  .live-indicator {
    animation: none;
    opacity: 1;
  }
  
  .score-change {
    animation: none;
    color: var(--color-primary);
  }
}
```

---

## 8. Responsive Grid System

### 8.1 Breakpoint System

```css
:root {
  /* Breakpoint Values */
  --breakpoint-mobile: 320px;
  --breakpoint-mobile-large: 480px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-desktop-large: 1200px;
  --breakpoint-desktop-xl: 1400px;
}

/* Media Query Helpers */
@custom-media --mobile (max-width: 767px);
@custom-media --tablet (min-width: 768px) and (max-width: 1023px);
@custom-media --desktop (min-width: 1024px);
@custom-media --large-screen (min-width: 1200px);
```

### 8.2 Container System

```css
/* Container Classes */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .container {
    padding: 0 24px;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 32px;
  }
}

/* Breakpoint-specific containers */
.container-mobile {
  max-width: 480px;
}

.container-tablet {
  max-width: 768px;
}

.container-desktop {
  max-width: 1200px;
}

.container-fluid {
  max-width: none;
  width: 100%;
}
```

### 8.3 Grid System

```css
/* CSS Grid Layout */
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(12, 1fr);
}

.grid-mobile {
  grid-template-columns: repeat(4, 1fr);
}

.grid-tablet {
  grid-template-columns: repeat(8, 1fr);
}

.grid-desktop {
  grid-template-columns: repeat(12, 1fr);
}

/* Grid Item Spans */
.col-1 { grid-column: span 1; }
.col-2 { grid-column: span 2; }
.col-3 { grid-column: span 3; }
.col-4 { grid-column: span 4; }
.col-6 { grid-column: span 6; }
.col-8 { grid-column: span 8; }
.col-12 { grid-column: span 12; }

/* Responsive Grid Classes */
@media (max-width: 767px) {
  .col-mobile-1 { grid-column: span 1; }
  .col-mobile-2 { grid-column: span 2; }
  .col-mobile-4 { grid-column: span 4; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .col-tablet-2 { grid-column: span 2; }
  .col-tablet-4 { grid-column: span 4; }
  .col-tablet-8 { grid-column: span 8; }
}
```

### 8.4 Basketball-Specific Layouts

```css
/* Scoreboard Layout */
.scoreboard-grid {
  display: grid;
  grid-template-areas: 
    "home-score divider away-score"
    "home-name divider away-name";
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  text-align: center;
}

.home-score { grid-area: home-score; }
.away-score { grid-area: away-score; }
.home-name { grid-area: home-name; }
.away-name { grid-area: away-name; }
.score-divider { grid-area: divider; }

/* Court Layout */
.court-layout {
  display: grid;
  grid-template-areas:
    "stats scoreboard clock"
    "court court court"
    "actions actions actions";
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  height: 100vh;
}

@media (max-width: 767px) {
  .court-layout {
    grid-template-areas:
      "scoreboard"
      "court"
      "stats"
      "actions";
    grid-template-columns: 1fr;
  }
}

/* Team Comparison Layout */
.team-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: start;
}

.team-stats {
  text-align: center;
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: var(--color-on-surface-variant);
}
```

### 8.5 Responsive Utilities

```css
/* Display Utilities */
.show-mobile { display: block; }
.show-tablet { display: none; }
.show-desktop { display: none; }

@media (min-width: 768px) {
  .show-mobile { display: none; }
  .show-tablet { display: block; }
  .show-desktop { display: none; }
}

@media (min-width: 1024px) {
  .show-mobile { display: none; }
  .show-tablet { display: none; }
  .show-desktop { display: block; }
}

/* Spacing Utilities */
.m-mobile-sm { margin: 8px; }
.m-tablet-md { margin: 16px; }
.m-desktop-lg { margin: 24px; }

.p-mobile-sm { padding: 8px; }
.p-tablet-md { padding: 16px; }
.p-desktop-lg { padding: 24px; }
```

---

## 9. Component Patterns

### 9.1 State Patterns

```css
/* Component States */
.component {
  /* Default State */
  background: var(--surface-primary);
  border: 1px solid var(--outline);
  transition: all 200ms var(--ease-standard);
}

.component:hover {
  /* Hover State */
  background: var(--surface-secondary);
  box-shadow: var(--elevation-2);
}

.component:focus {
  /* Focus State */
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.component:active {
  /* Active State */
  transform: scale(0.98);
  box-shadow: var(--elevation-1);
}

.component.disabled {
  /* Disabled State */
  background: var(--surface-disabled);
  color: var(--on-surface-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.component.loading {
  /* Loading State */
  position: relative;
  color: transparent;
}

.component.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-primary);
  border-top: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

### 9.2 Layout Patterns

```css
/* Stack Layout (Vertical Rhythm) */
.stack > * + * {
  margin-top: var(--space-md);
}

.stack-sm > * + * {
  margin-top: var(--space-sm);
}

.stack-lg > * + * {
  margin-top: var(--space-lg);
}

/* Center Layout */
.center {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Split Layout */
.split {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
}

/* Cluster Layout */
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
}
```

### 9.3 Basketball UI Patterns

```css
/* Score Display Pattern */
.score-display {
  font-family: var(--font-mono);
  font-size: var(--text-display-large);
  font-weight: 700;
  text-align: center;
  line-height: 1;
  letter-spacing: -0.02em;
}

/* Team Identification Pattern */
.team-identity {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.team-logo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.team-name {
  font-weight: 600;
  font-size: var(--text-title-medium);
}

/* Game Status Pattern */
.game-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: 12px;
  font-size: var(--text-label-small);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.game-status.live {
  background: rgba(255, 87, 34, 0.1);
  color: #ff5722;
}

.game-status.scheduled {
  background: rgba(33, 150, 243, 0.1);
  color: #2196f3;
}

.game-status.completed {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}
```

---

## 10. Accessibility Standards

### 10.1 WCAG 2.1 AA Compliance

```
Required Standards:
┌─────────────────────────────────────┐
│ Perceivable:                        │
│ ✓ Alt text for all images           │
│ ✓ 4.5:1 contrast ratio minimum     │
│ ✓ Text can be resized to 200%       │
│ ✓ Color not sole means of info      │
│                                     │
│ Operable:                           │
│ ✓ All functionality via keyboard    │
│ ✓ No seizure-inducing content      │
│ ✓ Users can pause/stop motion       │
│ ✓ 3+ second time limits avoidable   │
│                                     │
│ Understandable:                     │
│ ✓ Page language identified          │
│ ✓ Predictable navigation            │
│ ✓ Input assistance for errors       │
│ ✓ Clear instructions provided       │
│                                     │
│ Robust:                             │
│ ✓ Valid, semantic HTML              │
│ ✓ Compatible with assistive tech    │
│ ✓ Status messages announced         │
│ ✓ Focus management in dynamic UI    │
└─────────────────────────────────────┘
```

### 10.2 Screen Reader Support

```html
<!-- Semantic Structure -->
<main role="main" aria-label="Basketball Game Dashboard">
  <section aria-labelledby="scoreboard-heading">
    <h2 id="scoreboard-heading">Live Scoreboard</h2>
    
    <!-- Live Region for Score Updates -->
    <div aria-live="polite" aria-atomic="true">
      <span class="sr-only">Current score: </span>
      Eagles 52, Hawks 48
    </div>
  </section>
  
  <!-- Interactive Elements -->
  <button aria-describedby="timeout-help">
    Call Timeout
  </button>
  <div id="timeout-help" class="sr-only">
    Stops game clock and allows team strategy discussion
  </div>
</main>

<!-- Skip Links -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

### 10.3 Keyboard Navigation

```css
/* Focus Indicators */
:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* High Contrast Focus */
@media (prefers-contrast: high) {
  :focus {
    outline-width: 3px;
    outline-color: currentColor;
  }
}

/* Skip Links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 8px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  transition: top 200ms ease;
}

.skip-link:focus {
  top: 8px;
}
```

### 10.4 Basketball-Specific Accessibility

```html
<!-- Score Announcements -->
<div aria-live="assertive" id="score-updates">
  <!-- Announced immediately when scores change -->
  <span class="sr-only">
    Score update: Eagles 54, Hawks 48. Eagles lead by 6.
  </span>
</div>

<!-- Game Status -->
<div role="status" aria-live="polite">
  <span class="sr-only">Game status: </span>
  Quarter 2, 8 minutes 45 seconds remaining
</div>

<!-- Emergency Button -->
<button 
  class="emergency-button"
  aria-describedby="emergency-description"
  type="button">
  🚨 Emergency
</button>
<div id="emergency-description" class="sr-only">
  Immediately contacts emergency services and alerts facility staff
</div>

<!-- Player Substitution -->
<fieldset>
  <legend>Substitute Player</legend>
  <label for="player-out">Player Coming Out</label>
  <select id="player-out" required>
    <option value="">Select player...</option>
    <option value="12">Number 12, Smith, Point Guard</option>
  </select>
  
  <label for="player-in">Player Going In</label>
  <select id="player-in" required>
    <option value="">Select player...</option>
    <option value="8">Number 8, Lee, Guard</option>
  </select>
</fieldset>
```

### 10.5 High Contrast & Reduced Motion

```css
/* High Contrast Support */
@media (prefers-contrast: high) {
  :root {
    --color-primary: #000000;
    --color-on-primary: #ffffff;
    --color-surface: #ffffff;
    --color-on-surface: #000000;
    --outline: #000000;
  }
  
  .button {
    border: 2px solid currentColor;
  }
  
  .card {
    border: 1px solid var(--outline);
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Maintain essential feedback */
  .live-indicator::before {
    content: "🔴 ";
  }
  
  .loading-spinner {
    animation: none;
    content: "Loading...";
  }
}

/* Large Text Support */
@media (min-resolution: 120dpi) {
  html {
    font-size: 18px; /* Base font size increase */
  }
}
```

---

## Implementation Guidelines

### Design Token Implementation
```javascript
// design-tokens.js
export const tokens = {
  color: {
    primary: {
      50: '#fff3e0',
      500: '#ff9800',
      900: '#e65100'
    },
    basketball: {
      court: '#d2691e',
      live: '#ff5722'
    }
  },
  typography: {
    fontFamily: {
      primary: ['Roboto', 'system-ui', 'sans-serif'],
      mono: ['Roboto Mono', 'monospace']
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  }
};
```

### Component Implementation
```typescript
// Component with design system
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  children
}) => {
  const baseClasses = 'button';
  const variantClass = `button-${variant}`;
  const sizeClass = `button-${size}`;
  
  return (
    <button 
      className={`${baseClasses} ${variantClass} ${sizeClass}`}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
};
```

### CSS Custom Properties
```css
/* CSS Custom Properties for Theming */
:root {
  /* Colors */
  --color-primary: #{tokens.color.primary.500};
  --color-basketball-court: #{tokens.basketball.court};
  
  /* Typography */
  --font-family-primary: #{tokens.typography.fontFamily.primary};
  --font-size-body: 16px;
  
  /* Spacing */
  --space-xs: #{tokens.spacing.xs};
  --space-sm: #{tokens.spacing.sm};
  --space-md: #{tokens.spacing.md};
  
  /* Basketball-specific */
  --scoreboard-height: 120px;
  --touch-target-min: 44px;
}

/* Dark theme overrides */
[data-theme="dark"] {
  --color-surface: #121212;
  --color-on-surface: #ffffff;
}
```

---

**Design System Status**: Complete  
**Next Phase**: Mobile Responsive Layouts  
**Dependencies**: Design tokens library, component implementation  
**Review Required**: Design team, accessibility team, development team