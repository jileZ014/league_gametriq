# Wireframes - Basketball League Management Platform
## Phase 2 UI/UX Design

**Document ID:** WIRE-BLMP-001  
**Version:** 1.0  
**Date:** August 8, 2025  
**Author:** Sports UI/UX Designer  
**Status:** Phase 2 Wireframe Specifications  

---

## Executive Summary

This document provides comprehensive wireframes for all user journeys in the Basketball League Management Platform Phase 2. The wireframes follow Material Design 3 principles, support multi-generational users (ages 6-60+), and emphasize mobile-first responsive design for optimal courtside use.

### Key Design Principles
- **Mobile-First**: Optimized for smartphones and tablets
- **Age-Appropriate**: Simple interfaces for children, comprehensive for adults
- **Touch-Friendly**: Large tap targets (48px minimum)
- **High Contrast**: Readable in outdoor/gym lighting conditions
- **Quick Actions**: Essential functions within 2 taps
- **Offline-Capable**: Core functions work without connectivity

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [League Administrator Screens](#2-league-administrator-screens)
3. [Coach Interface](#3-coach-interface)
4. [Parent Portal](#4-parent-portal)
5. [Player Dashboard](#5-player-dashboard)
6. [Referee Interface](#6-referee-interface)
7. [Scorekeeper Console](#7-scorekeeper-console)
8. [Live Game Experience](#8-live-game-experience)
9. [Tournament Brackets](#9-tournament-brackets)
10. [Emergency & Safety](#10-emergency--safety)

---

## 1. Authentication Flow

### 1.1 Welcome Screen

```
┌─────────────────────────────────────┐
│  📱 GAMETRIQ LEAGUE MANAGEMENT      │
│                                     │
│         🏀 Welcome Back!            │
│                                     │
│  ┌─────────────────────────────────┐│
│  │  Enter Email                    ││
│  │  user@example.com               ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │  Password                       ││
│  │  ••••••••••                     ││
│  └─────────────────────────────────┘│
│                                     │
│  [👁 Show] [🔒 Forgot Password?]    │
│                                     │
│  ┌─────────────────────────────────┐│
│  │         SIGN IN                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ────────── OR ──────────           │
│                                     │
│  [🔵 Sign in with Google]           │
│  [🍎 Sign in with Apple]            │
│                                     │
│  New to Gametriq? [Sign Up]         │
│                                     │
│  [⚙️ Settings] [❓ Help] [🌐 Lang]   │
└─────────────────────────────────────┘
```

### 1.2 Role Selection Screen

```
┌─────────────────────────────────────┐
│      Choose Your Primary Role       │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 👤 League Administrator         ││
│  │ Manage leagues, teams & users   ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🏀 Team Coach                   ││
│  │ Manage team roster & games      ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 👨‍👩‍👧‍👦 Parent/Guardian           ││
│  │ Follow your child's progress    ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🏃 Player                       ││
│  │ View stats & team info          ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🦓 Referee                      ││
│  │ Officiate games & manage calls  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📊 Scorekeeper                  ││
│  │ Record scores & statistics      ││
│  └─────────────────────────────────┘│
│                                     │
│  You can switch roles anytime       │
└─────────────────────────────────────┘
```

---

## 2. League Administrator Screens

### 2.1 Admin Dashboard

```
┌─────────────────────────────────────┐
│ ☰ GameTriq Admin  🔔(3)  👤 Profile │
│                                     │
│ ┌─── Quick Actions ───────────────┐  │
│ │ [➕ New League] [👥 Add Users]  │  │
│ │ [📅 Schedule] [🏆 Tournament]   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Today's Overview ──────────────┐│
│ │ 🏀 Active Games: 12             ││
│ │ 📊 Players Online: 247          ││
│ │ 🚨 Pending Issues: 3            ││
│ │ 💰 Pending Payments: $1,240     ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─── League Performance ──────────┐ │
│ │     📈 Registration Trends      │ │
│ │   ┌─────────────────────────┐   │ │
│ │   │  ▄▃▄▇█▅▆█▄▇█           │   │ │
│ │   │ Week    Registrations   │   │ │
│ │   └─────────────────────────┘   │ │
│ │ Current: 1,247 (+23 this week)  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─── Recent Activity ─────────────┐ │
│ │ • New team registered: Eagles   │ │
│ │ • Payment completed: Johnson    │ │  
│ │ • Game result: Hawks 85-72     │ │
│ │ • Referee assigned: Game #234   │ │
│ │ [View All Activity]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [🏠 Dashboard] [🏀 Leagues] [📊 Reports]│
│ [👥 Users] [💰 Finance] [⚙️ Settings]  │
└─────────────────────────────────────┘
```

### 2.2 League Management

```
┌─────────────────────────────────────┐
│ ← Back    Phoenix Youth League      │
│                                     │
│ ┌─── League Settings ─────────────┐  │
│ │ Status: ●Active (234 players)   │  │
│ │ Season: Spring 2025             │  │
│ │ Age Groups: 8U, 10U, 12U, 14U   │  │
│ │ [📝 Edit] [📋 Clone] [🗄️ Archive] │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Teams (8) ───────────────────┐  │
│ │ 🏀 Eagles           Players: 12  │  │
│ │    Coach: Mike Johnson          │  │
│ │    Record: 8-2                  │  │
│ │                                 │  │
│ │ 🏀 Hawks            Players: 11  │  │
│ │    Coach: Sarah Davis           │  │
│ │    Record: 7-3                  │  │
│ │                                 │  │
│ │ 🏀 Wolves           Players: 13  │  │
│ │    Coach: Tom Wilson            │  │
│ │    Record: 6-4                  │  │
│ │                                 │  │
│ │ [+ Add Team] [View All Teams]   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Upcoming Games ──────────────┐  │
│ │ Today - 4:00 PM                 │  │
│ │ Eagles vs Hawks | Court A       │  │
│ │ Referee: John Smith             │  │
│ │                                 │  │
│ │ Tomorrow - 2:00 PM              │  │
│ │ Wolves vs Lions | Court B       │  │
│ │ Referee: Pending Assignment     │  │
│ │                                 │  │
│ │ [📅 View Schedule] [⚙️ Manage]   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📊 Statistics] [💰 Finance] [📝 Reports]│
└─────────────────────────────────────┘
```

### 2.3 Schedule Builder

```
┌─────────────────────────────────────┐
│ ← Back    Schedule Builder          │
│                                     │
│ ┌─── Schedule Settings ───────────┐  │
│ │ Season: Spring 2025             │  │
│ │ Start Date: Mar 1, 2025         │  │
│ │ End Date: May 30, 2025          │  │
│ │ Game Duration: 40 min + 10 min  │  │
│ │ [⚙️ Advanced Settings]           │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Auto-Schedule Options ───────┐  │
│ │ ☑️ Avoid team conflicts          │  │
│ │ ☑️ Balance home/away games       │  │
│ │ ☑️ Consider coach availability   │  │
│ │ ☑️ Heat safety (Phoenix rules)   │  │
│ │ ☑️ Referee availability          │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Venue Constraints ───────────┐  │
│ │ 🏀 Main Gym         Available:   │  │
│ │    Mon-Fri: 4PM-10PM            │  │
│ │    Sat-Sun: 8AM-8PM             │  │
│ │                                 │  │
│ │ 🏀 Practice Court   Available:   │  │
│ │    Mon-Fri: 6PM-10PM            │  │
│ │    Weekends: Full Day           │  │
│ │                                 │  │
│ │ [📅 Blackout Dates]             │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─────────────────────────────────┐  │
│ │        🤖 GENERATE SCHEDULE      │  │
│ │                                 │  │
│ │   AI will create optimal        │  │
│ │   schedule in ~30 seconds       │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📋 Manual Schedule] [📁 Templates]  │
└─────────────────────────────────────┘
```

---

## 3. Coach Interface

### 3.1 Coach Dashboard

```
┌─────────────────────────────────────┐
│ ☰ GameTriq Coach 🔔(2)  👤 Mike J.  │
│                                     │
│ ┌─── My Team: Eagles ─────────────┐  │
│ │ Record: 8-2  |  Next: Today 4PM │  │
│ │ vs Hawks @ Main Gym             │  │
│ │                                 │  │
│ │ [🏃 Lineup] [📊 Stats] [📋 Roster] │ │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Today's Game Prep ───────────┐  │
│ │ ⏰ Game Time: 4:00 PM            │  │
│ │ 📍 Location: Main Gym Court A    │  │
│ │ 🦓 Referee: John Smith          │  │
│ │                                 │  │
│ │ ☑️ Roster submitted              │  │
│ │ ☑️ Equipment checked             │  │
│ │ ⚠️ Starting lineup pending       │  │
│ │                                 │  │
│ │ [⚡ Quick Actions]               │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Player Status ───────────────┐  │
│ │ Available (10):                 │  │
│ │ • James Smith     • Amy Davis    │  │
│ │ • Mike Johnson    • Sarah Lee    │  │
│ │ • Tom Wilson      • Lisa Brown   │  │
│ │                                 │  │
│ │ Unavailable (2):                │  │
│ │ • John Doe (injured)            │  │
│ │ • Jane Smith (sick)             │  │
│ │                                 │  │
│ │ [📝 Update Status]              │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Quick Actions ───────────────┐  │
│ │ [📱 Team Message] [📅 Practice]  │  │
│ │ [📈 Game Plan] [🏆 Subs Plan]    │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🏠 Home] [👥 Team] [📊 Stats] [💬 Chat]│
└─────────────────────────────────────┘
```

### 3.2 Live Game Coaching Interface

```
┌─────────────────────────────────────┐
│ 🏀 LIVE: Eagles vs Hawks  Q2 8:45   │
│                                     │
│ ┌─── Scoreboard ──────────────────┐  │
│ │     Eagles  52  :  48  Hawks    │  │
│ │                                 │  │
│ │  Timeouts: ●●○   Shot Clock: 18 │  │
│ │  Fouls: 4        Team Fouls: 3  │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Active Lineup ───────────────┐  │
│ │ PG: #12 Smith    (2pts, 3ast)   │  │
│ │ SG: #23 Johnson  (8pts, 1reb)   │  │
│ │ SF: #15 Davis    (12pts, 4reb)  │  │
│ │ PF: #42 Wilson   (6pts, 2blk)   │  │
│ │ C:  #34 Brown    (4pts, 5reb)   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Quick Subs ──────────────────┐  │
│ │ Ready: #8 Lee, #19 Clark        │  │
│ │                                 │  │
│ │ [↔️ Substitute] [⏸️ Timeout]      │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Game Notes ──────────────────┐  │
│ │ • Hawks weak on left side       │  │
│ │ • Double team their #23         │  │
│ │ • Run play "Eagle" after TO     │  │
│ │                                 │  │
│ │ [✏️ Add Note] [📋 View All]       │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📊 Live Stats] [📝 Strategy] [👥 Bench]│
└─────────────────────────────────────┘
```

### 3.3 Player Substitution Manager

```
┌─────────────────────────────────────┐
│ ↔️ Substitution Manager              │
│                                     │
│ ┌─── On Court (5) ────────────────┐  │
│ │ 🏃 #12 Smith (PG)   22 min      │  │
│ │    Energy: ●●●○○   Fouls: 2      │  │
│ │                                 │  │
│ │ 🏃 #23 Johnson (SG) 18 min      │  │
│ │    Energy: ●●●●○   Fouls: 1      │  │
│ │                                 │  │
│ │ 🏃 #15 Davis (SF)   20 min      │  │
│ │    Energy: ●●○○○   Fouls: 3      │  │
│ │                                 │  │
│ │ 🏃 #42 Wilson (PF)  15 min      │  │
│ │    Energy: ●●●●●   Fouls: 0      │  │
│ │                                 │  │
│ │ 🏃 #34 Brown (C)    19 min      │  │
│ │    Energy: ●●●○○   Fouls: 2      │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Available Bench (7) ─────────┐  │
│ │ 🪑 #8 Lee (G)       Fresh ●●●●● │  │
│ │ 🪑 #19 Clark (F)    Fresh ●●●●● │  │
│ │ 🪑 #7 Miller (G)    Fresh ●●●●● │  │
│ │ 🪑 #31 Taylor (F)   Fresh ●●●●● │  │
│ │ 🪑 #25 White (C)    Fresh ●●●●● │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Suggested Substitution ──────┐  │
│ │ 🔄 Sub OUT: #15 Davis (tired)   │  │
│ │    Sub IN:  #19 Clark (fresh)   │  │
│ │                                 │  │
│ │    Reason: Energy management     │  │
│ │    Next stoppage: ~2 minutes    │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🔄 Make Sub] [⏰ Schedule Sub] [❌ Cancel]│
└─────────────────────────────────────┘
```

---

## 4. Parent Portal

### 4.1 Parent Dashboard

```
┌─────────────────────────────────────┐
│ ☰ GameTriq Parent 🔔(5) 👤 Lisa D.  │
│                                     │
│ ┌─── My Players ──────────────────┐  │
│ │ 🏀 Emily Davis (Eagles, 10U)     │  │
│ │    Next Game: Today 4:00 PM     │  │
│ │    Season Stats: 8.2 ppg, 4.1 r │  │
│ │    [📊 View Stats] [📸 Photos]   │  │
│ │                                 │  │
│ │ 🏀 Alex Davis (Hawks, 8U)       │  │
│ │    Next Game: Tomorrow 2:00 PM  │  │
│ │    Season Stats: 6.5 ppg, 5.2 r │  │
│ │    [📊 View Stats] [📸 Photos]   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Today's Schedule ─────────────┐  │
│ │ ⏰ Emily's Game - 4:00 PM        │  │
│ │ 🏀 Eagles vs Hawks @ Main Gym   │  │
│ │ 📍 123 Sports Complex Dr        │  │
│ │ 🌡️ Heat Index: YELLOW (Safe)     │  │
│ │                                 │  │
│ │ [📍 Directions] [📅 Add to Cal]  │  │
│ │ [👥 Carpool] [📱 Live Updates]   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Notifications ───────────────┐  │
│ │ 🔔 Game reminder: Eagles 4PM     │  │
│ │ 💰 Payment due: Hawks team fees  │  │
│ │ 📸 New photos: Eagles vs Lions   │  │
│ │ 📝 Practice canceled: Thursday   │  │
│ │ 🏆 Tournament invite: Spring Cup │  │
│ │                                 │  │
│ │ [View All Notifications]        │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Quick Actions ───────────────┐  │
│ │ [💰 Pay Fees] [📅 View Schedule] │  │
│ │ [📱 Team Chat] [🚨 Emergency]    │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🏠 Home] [👥 Teams] [📊 Stats] [💬 Chat]│
└─────────────────────────────────────┘
```

### 4.2 Game Day Experience (Parent View)

```
┌─────────────────────────────────────┐
│ 🏀 LIVE: Eagles vs Hawks             │
│                                     │
│ ┌─── Live Score ──────────────────┐  │
│ │      Eagles  52  :  48  Hawks   │  │
│ │           Q2 8:45               │  │
│ │                                 │  │
│ │ 🏀 Emily Davis is Playing        │  │
│ │    8 pts, 4 reb, 2 ast          │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Emily's Performance ─────────┐  │
│ │ Playing Time: 18 minutes        │  │
│ │ Field Goals: 3/6 (50%)          │  │
│ │ Free Throws: 2/2 (100%)         │  │
│ │ Rebounds: 4 (2 off, 2 def)      │  │
│ │ Assists: 2                      │  │
│ │ Steals: 1                       │  │
│ │                                 │  │
│ │ [📊 Full Stats] [📈 Season Comp] │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Game Highlights ─────────────┐  │
│ │ 📹 Emily's 3-pointer | 12:34    │  │
│ │ 📸 Great defense play | 08:45   │  │
│ │ 🏀 Assist to Smith | 06:12      │  │
│ │                                 │  │
│ │ [📱 Share Highlights]           │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Team Parents ────────────────┐  │
│ │ 👥 15 parents watching          │  │
│ │ 💬 "Great shot Emily!" - Mike   │  │
│ │ 💬 "Defense looks strong" - Ann │  │
│ │ 💬 "Go Eagles!" - Tom           │  │
│ │                                 │  │
│ │ [💬 Join Chat] [📣 Cheer]       │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📊 Full Game] [📸 Photos] [🎥 Video]  │
└─────────────────────────────────────┘
```

### 4.3 Payment & Registration

```
┌─────────────────────────────────────┐
│ ← Back    Payment Center             │
│                                     │
│ ┌─── Outstanding Balances ────────┐  │
│ │ 🏀 Eagles Team Fee    $125.00   │  │
│ │    Due: March 15, 2025          │  │
│ │    Player: Emily Davis          │  │
│ │                                 │  │
│ │ 🏆 Spring Tournament  $45.00    │  │
│ │    Due: March 20, 2025          │  │
│ │    Optional                     │  │
│ │                                 │  │
│ │ 👕 Team Jersey       $25.00     │  │
│ │    Due: ASAP                    │  │
│ │    Size: Youth Medium           │  │
│ │                                 │  │
│ │ Total Due: $195.00              │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Payment Options ─────────────┐  │
│ │ ☑️ Pay All Now                   │  │
│ │ ○ Select Individual Items       │  │
│ │ ○ Payment Plan (3 months)       │  │
│ │                                 │  │
│ │ Payment Method:                 │  │
│ │ ○ Credit/Debit Card             │  │
│ │ ○ Bank Transfer (ACH)           │  │
│ │ ○ PayPal                        │  │
│ │ ○ Venmo                         │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Financial Assistance ───────┐  │
│ │ Need help with fees?            │  │
│ │ Apply for scholarship program   │  │
│ │                                 │  │
│ │ [📋 Apply for Aid]              │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─────────────────────────────────┐  │
│ │           💳 PAY NOW            │  │
│ │                                 │  │
│ │    Secure Payment by Stripe     │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📧 Email Receipt] [📱 Save Card]     │
└─────────────────────────────────────┘
```

---

## 5. Player Dashboard

### 5.1 Player Home (Age 8-12)

```
┌─────────────────────────────────────┐
│ 🏀 Hi Emily! Welcome Back!          │
│                                     │
│ ┌─── My Team: Eagles ─────────────┐  │
│ │   ⭐ Season Record: 8 Wins - 2   │  │
│ │                                 │  │
│ │   🏆 Next Game: TODAY!          │  │
│ │   🕒 4:00 PM vs Hawks           │  │
│ │   📍 Main Gym                   │  │
│ │                                 │  │
│ │   [🎮 Game Ready?] [👥 Team]    │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── My Basketball Card ──────────┐  │
│ │  ┌─────┐  Emily Davis #15       │  │
│ │  │ 📸  │  Position: Guard       │  │
│ │  │     │  Team: Eagles          │  │
│ │  │     │  Age: 10               │  │
│ │  └─────┘                       │  │
│ │                                 │  │
│ │  🏀 Points Per Game: 8.2        │  │
│ │  ⚡ Best Game: 16 points        │  │
│ │  🎯 Free Throw: 85%             │  │
│ │  🏆 Team MVP: 2 times           │  │
│ │                                 │  │
│ │  [📊 See All Stats] [📸 Update]  │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Fun Stuff ───────────────────┐  │
│ │ 🌟 Achievements Unlocked:        │  │
│ │ 🏆 First Basket                 │  │
│ │ 🎯 Perfect Free Throw Game      │  │
│ │ 🤝 Great Teammate               │  │
│ │ ⚡ Most Improved                │  │
│ │                                 │  │
│ │ [🏆 View All Badges]            │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Team Messages ───────────────┐  │
│ │ 👨‍🏫 Coach Mike: "Great practice! │  │
│ │    Remember to drink water!"    │  │
│ │                                 │  │
│ │ 🏀 Sarah: "Good luck today!"    │  │
│ │                                 │  │
│ │ [💬 Team Chat]                  │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🏠 Home] [👥 Team] [📊 Stats] [🎮 Fun]│
└─────────────────────────────────────┘
```

### 5.2 Player Stats (Age 13-18)

```
┌─────────────────────────────────────┐
│ ← Back    Player Statistics          │
│                                     │
│ ┌─── Season Overview ─────────────┐  │
│ │ Alex Johnson #23                │  │
│ │ Position: Small Forward         │  │
│ │ Games Played: 10/10             │  │
│ │ Minutes: 28.5 per game          │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Scoring ─────────────────────┐  │
│ │ Points Per Game:     15.8       │  │
│ │ Field Goal %:        47.2%      │  │
│ │ 3-Point %:           38.5%      │  │
│ │ Free Throw %:        82.4%      │  │
│ │ Season High:         28 points  │  │
│ │                                 │  │
│ │ [📈 Shooting Chart] [🎯 Goals]   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── All-Around Stats ────────────┐  │
│ │ Rebounds/Game:       6.2        │  │
│ │ Assists/Game:        3.8        │  │
│ │ Steals/Game:         1.5        │  │
│ │ Blocks/Game:         0.8        │  │
│ │ Turnovers/Game:      2.1        │  │
│ │                                 │  │
│ │ Player Efficiency:   18.4       │  │
│ │ Team Ranking:        #2         │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Progress Tracking ───────────┐  │
│ │   📊 Improvement This Season    │  │
│ │   ┌─────────────────────────┐   │  │
│ │   │ PPG  ─────────●─────    │   │  │
│ │   │ FG%  ───────●───────    │   │  │
│ │   │ AST  ─────●─────────    │   │  │
│ │   │ REB  ───────●───────    │   │  │
│ │   └─────────────────────────┘   │  │
│ │                                 │  │
│ │ [🎯 Set Goals] [📈 Compare]      │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📊 Game Log] [🏆 Awards] [📱 Share]  │
└─────────────────────────────────────┘
```

---

## 6. Referee Interface

### 6.1 Referee Dashboard

```
┌─────────────────────────────────────┐
│ ☰ GameTriq Referee 🔔(4) 👤 John S. │
│                                     │
│ ┌─── Today's Assignments ─────────┐  │
│ │ 🏀 Game #1: 2:00 PM             │  │
│ │ Eagles vs Hawks | Court A       │  │
│ │ Age Group: 10U                  │  │
│ │ ⏰ Arrive by: 1:45 PM           │  │
│ │                                 │  │
│ │ 🏀 Game #2: 4:30 PM             │  │
│ │ Lions vs Wolves | Court B       │  │
│ │ Age Group: 12U                  │  │
│ │ ⏰ Arrive by: 4:15 PM           │  │
│ │                                 │  │
│ │ [📍 Venue Info] [🚗 Directions]  │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Ref Tools ───────────────────┐  │
│ │ [⏱️ Game Clock] [📋 Score Sheet] │  │
│ │ [📏 Rule Book] [📞 Emergency]    │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Upcoming Availability ───────┐  │
│ │ This Week: 6 games available    │  │
│ │ Mon: Available                  │  │
│ │ Tue: Not Available              │  │
│ │ Wed: Available                  │  │
│ │ Thu: Available (Evening only)   │  │
│ │ Fri: Available                  │  │
│ │ Sat: Available                  │  │
│ │ Sun: Not Available              │  │
│ │                                 │  │
│ │ [📅 Update Schedule]            │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Season Stats ────────────────┐  │
│ │ Games Officiated: 47            │  │
│ │ Average Rating: 4.8/5.0         │  │
│ │ No-Shows: 0                     │  │
│ │ Earnings This Month: $470       │  │
│ │                                 │  │
│ │ [📊 Full Stats] [💰 Payments]    │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🏠 Home] [📅 Games] [💰 Pay] [⚙️ Profile]│
└─────────────────────────────────────┘
```

### 6.2 Pre-Game Check-in

```
┌─────────────────────────────────────┐
│ 🏀 Pre-Game Check-in                │
│    Eagles vs Hawks | 2:00 PM       │
│                                     │
│ ┌─── Game Information ────────────┐  │
│ │ Game ID: #2025-0315-001         │  │
│ │ Venue: Phoenix Youth Center     │  │
│ │ Court: A                        │  │
│ │ Age Group: 10U Division         │  │
│ │ Game Length: 4x8 minute qtrs   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Pre-Game Checklist ──────────┐  │
│ │ ☑️ Arrived at venue 15 min early│  │
│ │ ☑️ Court inspection complete     │  │
│ │ ☑️ Equipment check (ball, clock) │  │
│ │ ☑️ Team rosters verified        │  │
│ │ ☑️ Coach credentials checked    │  │
│ │ ○ Player eligibility confirmed │  │
│ │ ○ Medical forms reviewed        │  │
│ │ ○ Starting lineups received     │  │
│ │                                 │  │
│ │ [📋 Complete Checklist]         │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Team Information ────────────┐  │
│ │ 🏀 Eagles: Coach Mike Johnson   │  │
│ │ Players Present: 10/12          │  │
│ │ Eligible to Play: 10            │  │
│ │                                 │  │
│ │ 🏀 Hawks: Coach Sarah Davis     │  │
│ │ Players Present: 11/12          │  │
│ │ Eligible to Play: 11            │  │
│ │                                 │  │
│ │ [⚠️ Report Issues]               │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─────────────────────────────────┐  │
│ │        🏀 START GAME            │  │
│ │                                 │  │
│ │    All checks complete          │  │
│ │    Ready to officiate           │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📞 Support] [📋 Rules] [❌ Cancel Game]│
└─────────────────────────────────────┘
```

### 6.3 Game Officiating Interface

```
┌─────────────────────────────────────┐
│ 🏀 OFFICIATING: Eagles vs Hawks      │
│              Q2 8:45                │
│                                     │
│ ┌─── Score Control ───────────────┐  │
│ │     Eagles  52  :  48  Hawks    │  │
│ │                                 │  │
│ │ [🏀+2] [🏀+3] [🆓+1]             │  │
│ │                                 │  │
│ │ Last: Hawks +2 (#23 Johnson)    │  │
│ │ [↩️ Undo] [✏️ Correct]           │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Game Clock ──────────────────┐  │
│ │        ⏰ 8:45                  │  │
│ │                                 │  │
│ │ [▶️ Start] [⏸️ Pause] [⏹️ Stop] │  │
│ │                                 │  │
│ │ Timeouts: Eagles ●●○  Hawks ●○○ │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Foul Management ─────────────┐  │
│ │ Team Fouls:                     │  │
│ │ Eagles: ||||   (4)              │  │
│ │ Hawks:  |||    (3)              │  │
│ │                                 │  │
│ │ Bonus: Hawks shooting 1-and-1   │  │
│ │                                 │  │
│ │ [⚠️ Personal Foul] [⚠️ Technical] │  │
│ │ [⚠️ Flagrant] [⚠️ Unsporting]    │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Quick Actions ───────────────┐  │
│ │ [⏰ Timeout] [🔄 Substitution]   │  │
│ │ [🏥 Injury] [🚫 Violation]       │  │
│ │ [📝 Note] [🆘 Emergency]        │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📊 Stats] [📋 Roster] [⚙️ Settings]   │
└─────────────────────────────────────┘
```

---

## 7. Scorekeeper Console

### 7.1 Scorekeeper Interface

```
┌─────────────────────────────────────┐
│ 📊 SCORING: Eagles vs Hawks          │
│               Q2 8:45               │
│                                     │
│ ┌─── Official Score ──────────────┐  │
│ │     EAGLES  52  :  48  HAWKS    │  │
│ │       (HOME)        (VISITOR)   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Scoring Actions ─────────────┐  │
│ │ Active Team: EAGLES             │  │
│ │                                 │  │
│ │ ┌─ Eagles Roster ──────────────┐ │  │
│ │ │#12 Smith    2pts [+2][+3][🆓]│ │  │
│ │ │#23 Johnson  8pts [+2][+3][🆓]│ │  │
│ │ │#15 Davis   12pts [+2][+3][🆓]│ │  │
│ │ │#42 Wilson   6pts [+2][+3][🆓]│ │  │
│ │ │#34 Brown    4pts [+2][+3][🆓]│ │  │
│ │ └─────────────────────────────┘ │  │
│ │                                 │  │
│ │ [🔄 Switch to Hawks]            │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Play-by-Play ────────────────┐  │
│ │ 8:45 - Hawks timeout            │  │
│ │ 8:52 - Eagles #15 made 2-pt     │  │
│ │ 9:01 - Hawks #11 missed 3-pt    │  │
│ │ 9:15 - Eagles #23 rebound       │  │
│ │ 9:23 - Eagles #12 made FT 1/2   │  │
│ │                                 │  │
│ │ [📝 Add Play] [↩️ Undo Last]     │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Game Status ─────────────────┐  │
│ │ Period: Q2  |  Time: 8:45       │  │
│ │ TO: Eagles ●●○ | Hawks ●○○       │  │
│ │ Fouls: Eagles 4 | Hawks 3       │  │
│ │                                 │  │
│ │ [⏰ Timeout] [⏸️ Halt Time]       │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📊 Box Score] [📱 Publish] [💾 Save] │
└─────────────────────────────────────┘
```

### 7.2 Statistics Dashboard

```
┌─────────────────────────────────────┐
│ 📊 Live Statistics Dashboard         │
│    Eagles vs Hawks | Q2 8:45       │
│                                     │
│ ┌─── Team Totals ─────────────────┐  │
│ │        Eagles  |  Hawks         │  │
│ │ FG:    21/40   |  19/42         │  │
│ │ 3PT:   6/15    |  4/18          │  │
│ │ FT:    4/6     |  6/8           │  │
│ │ REB:   18      |  16            │  │
│ │ AST:   12      |  9             │  │
│ │ TO:    8       |  11            │  │
│ │ STL:   5       |  3             │  │
│ │ BLK:   2       |  4             │  │
│ │ PF:    4       |  3             │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Leading Scorers ─────────────┐  │
│ │ 🏀 Eagles:                      │  │
│ │ #15 Davis      12 pts (5/8 FG)  │  │
│ │ #23 Johnson     8 pts (3/6 FG)  │  │
│ │ #42 Wilson      6 pts (3/4 FG)  │  │
│ │                                 │  │
│ │ 🏀 Hawks:                       │  │
│ │ #11 Miller     11 pts (4/9 FG)  │  │
│ │ #22 Taylor      9 pts (3/7 FG)  │  │
│ │ #33 Clark       8 pts (4/5 FG)  │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Key Stats ───────────────────┐  │
│ │ Largest Lead: Eagles by 8       │  │
│ │ Lead Changes: 4                 │  │
│ │ Times Tied: 3                   │  │
│ │ Fast Break Points: E-6, H-4     │  │
│ │ Points in Paint: E-20, H-16     │  │
│ │ Bench Points: E-8, H-12         │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [📱 Share Stats] [📊 Full Report] [⬇️ Export]│
└─────────────────────────────────────┘
```

---

## 8. Live Game Experience

### 8.1 Live Game Viewer (Fans/Parents)

```
┌─────────────────────────────────────┐
│ 🔴 LIVE | Eagles vs Hawks            │
│                                     │
│ ┌─── Live Scoreboard ─────────────┐  │
│ │    🏀 EAGLES  52 : 48  HAWKS 🏀 │  │
│ │           Q2    8:45            │  │
│ │                                 │  │
│ │ Next: Eagles ball out of bounds  │  │
│ │ TO Remaining: ●●○     ●○○        │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Live Commentary ─────────────┐  │
│ │ 8:45 - Eagles call timeout      │  │
│ │ 8:52 - SCORE! Davis 2-pointer   │  │
│ │ 9:01 - Hawks miss from downtown  │  │
│ │ 9:15 - Great rebound Johnson!   │  │
│ │ 9:23 - Free throw good, 1 of 2  │  │
│ │                                 │  │
│ │ Auto-updating every 10 seconds  │  │
│ │ [🔄 Refresh Now]                │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Fan Interaction ─────────────┐  │
│ │ 👥 247 fans watching online     │  │
│ │                                 │  │
│ │ 📣 Cheer for your team:         │  │
│ │ [🦅 Go Eagles!] [🦅 Defense!]    │  │
│ │ [🦅 Let's Go!]  [🦅 Shoot!]      │  │
│ │                                 │  │
│ │ Recent Cheers:                  │  │
│ │ 💙 "Great shot!" - 12 fans      │  │
│ │ ❤️ "Defense!" - 8 fans          │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Quick Actions ───────────────┐  │
│ │ [📊 Full Stats] [📸 Photos]      │  │
│ │ [📱 Share Game] [🏆 Highlights]  │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [💬 Fan Chat] [🎯 Player Focus] [📹 Video]│
└─────────────────────────────────────┘
```

### 8.2 Player Focus View

```
┌─────────────────────────────────────┐
│ 👁️ PLAYER FOCUS: Emily Davis #15    │
│                                     │
│ ┌─── Live Player Stats ───────────┐  │
│ │   📸 Emily Davis                │  │
│ │   Position: Guard               │  │
│ │   Currently: On Court           │  │
│ │   Playing Time: 18:23           │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Today's Performance ─────────┐  │
│ │ Points: 12 (season high!)       │  │
│ │ Field Goals: 5/8 (62.5%)        │  │
│ │ 3-Pointers: 2/4 (50.0%)         │  │
│ │ Free Throws: 0/0 (--%)          │  │
│ │ Rebounds: 4 (2 off, 2 def)      │  │
│ │ Assists: 3                      │  │
│ │ Steals: 1                       │  │
│ │ Turnovers: 2                    │  │
│ │                                 │  │
│ │ Player Efficiency: +8           │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Recent Plays ────────────────┐  │
│ │ 8:52 - Made 2-point shot        │  │
│ │ 9:15 - Defensive rebound        │  │
│ │ 9:23 - Assist to Johnson        │  │
│ │ 10:01 - Made 3-pointer! 🔥      │  │
│ │ 10:34 - Steal and fast break    │  │
│ │                                 │  │
│ │ [📈 Shot Chart] [📊 All Plays]   │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Parent/Fan Comments ─────────┐  │
│ │ 👥 Lisa D: "Amazing game Em!"   │  │
│ │ 👥 Mike J: "Great hustle!"      │  │
│ │ 👥 Coach: "Perfect defense!"    │  │
│ │                                 │  │
│ │ [💬 Add Comment] [📱 Share]      │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🎯 Other Players] [📊 Team Stats] [🔄 Live]│
└─────────────────────────────────────┘
```

---

## 9. Tournament Brackets

### 9.1 Tournament Overview

```
┌─────────────────────────────────────┐
│ 🏆 Spring Championship Tournament   │
│                                     │
│ ┌─── Tournament Info ─────────────┐  │
│ │ Format: Single Elimination      │  │
│ │ Teams: 16 (10U Division)        │  │
│ │ Dates: March 20-22, 2025        │  │
│ │ Venue: Phoenix Sports Complex   │  │
│ │                                 │  │
│ │ Registration: CLOSED            │  │
│ │ Status: Round 2 In Progress     │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Live Round 2 ────────────────┐  │
│ │ 🔴 LIVE Games:                  │  │
│ │                                 │  │
│ │ Court A: Eagles 52-48 Hawks     │  │
│ │          Q2 8:45 remaining      │  │
│ │                                 │  │
│ │ Court B: Lions 38-35 Wolves     │  │
│ │          Q3 2:13 remaining      │  │
│ │                                 │  │
│ │ [📱 Watch Live] [📊 Live Stats]  │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Bracket Navigation ──────────┐  │
│ │ [🔄 Round 1] [●Round 2] [○Semi]  │  │
│ │ [○Final] [○Champion]            │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Quick Actions ───────────────┐  │
│ │ [📅 Full Schedule] [🏆 Results]  │  │
│ │ [📊 Team Stats] [📸 Photos]      │  │
│ │ [🎫 Spectator Info]             │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🏆 Bracket] [📅 Schedule] [🏆 Awards]  │
└─────────────────────────────────────┘
```

### 9.2 Interactive Bracket Display

```
┌─────────────────────────────────────┐
│ 🏆 Tournament Bracket - Round 2      │
│                                     │
│ ┌─── Championship Path ───────────┐  │
│ │                                 │  │
│ │ Round 2    Semifinals    Final   │  │
│ │                                 │  │
│ │ Eagles ──┐                      │  │
│ │   52     │                      │  │
│ │          ├── ?                  │  │
│ │ Hawks    │                      │  │
│ │   48●    ┘                      │  │
│ │                ┌── ?             │  │
│ │ Lions ──┐      │               │  │
│ │   45    │      │                 │  │
│ │         ├── ?  ┼── Champion     │  │
│ │ Wolves  │      │                 │  │
│ │   42●   ┘      │                 │  │
│ │                └── ?             │  │
│ │ Tigers ──┐                      │  │
│ │   TBD    │                      │  │
│ │          ├── ?                  │  │
│ │ Bears    │                      │  │
│ │   TBD    ┘                      │  │
│ │                                 │  │
│ │ Sharks ──┐                      │  │
│ │   TBD    │                      │  │
│ │          ├── ?                  │  │
│ │ Panthers │                      │  │
│ │   TBD    ┘                      │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Game Details ────────────────┐  │
│ │ 🔴 LIVE: Eagles vs Hawks        │  │
│ │ Court A | 2:00 PM Start         │  │
│ │ Score: Eagles 52-48 Hawks       │  │
│ │ Status: Q2 8:45 remaining       │  │
│ │                                 │  │
│ │ Winner advances to Semifinals   │  │
│ │ vs Lions (45-42 over Wolves)    │  │
│ │                                 │  │
│ │ [📱 Watch Live] [📊 Stats]       │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🔄 Refresh] [📱 Share] [🏆 Predictions]│
└─────────────────────────────────────┘
```

---

## 10. Emergency & Safety

### 10.1 Emergency Response Interface

```
┌─────────────────────────────────────┐
│ 🚨 EMERGENCY RESPONSE CENTER         │
│                                     │
│ ┌─── IMMEDIATE EMERGENCIES ────────┐ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │         🚑 MEDICAL          │ │ │
│ │ │      Emergency Call         │ │ │
│ │ │     Contacts 911 + Staff    │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │         🔥 FACILITY         │ │ │
│ │ │      Emergency Call         │ │ │
│ │ │    Fire/Building/Safety     │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │         👮 SECURITY         │ │ │
│ │ │      Emergency Call         │ │ │
│ │ │     Incident Reporting      │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─── WEATHER & SAFETY ────────────┐  │
│ │ 🌡️ Heat Index: 95°F (YELLOW)    │  │
│ │ Status: Caution Advised         │  │
│ │                                 │  │
│ │ • Frequent water breaks         │  │
│ │ • Shade breaks every 15 min     │  │
│ │ • Monitor player condition      │  │
│ │                                 │  │
│ │ ⚠️ Air Quality: GOOD            │  │
│ │ 🌪️ Severe Weather: None          │  │
│ │                                 │  │
│ │ [🌡️ Full Weather] [📋 Protocols] │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── QUICK CONTACTS ──────────────┐  │
│ │ 📞 Venue Manager: (602)555-0100 │  │
│ │ 🏥 Medical Staff: (602)555-0200 │  │
│ │ 👮 Security: (602)555-0300      │  │
│ │ 🔧 Maintenance: (602)555-0400   │  │
│ │                                 │  │
│ │ [📋 Full Directory] [📍 Location] │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [❌ Close] [📋 Incident Report] [🔔 Alert]│
└─────────────────────────────────────┘
```

### 10.2 Heat Safety Monitor (Phoenix-Specific)

```
┌─────────────────────────────────────┐
│ 🌡️ Heat Safety Monitor - Phoenix   │
│                                     │
│ ┌─── Current Conditions ──────────┐  │
│ │ Temperature: 103°F              │  │
│ │ Heat Index: 108°F               │  │
│ │ Humidity: 15%                   │  │
│ │ UV Index: 9 (Very High)         │  │
│ │                                 │  │
│ │ Status: 🟠 ORANGE ALERT         │  │
│ │ Action Required: Enhanced       │  │
│ │ Safety Protocols                │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Safety Protocols Active ─────┐  │
│ │ ✅ Water breaks every 10 minutes │  │
│ │ ✅ Shade breaks mandatory       │  │
│ │ ✅ Game length reduced to 6 min │  │
│ │ ✅ Officials monitoring closely  │  │
│ │ ✅ Medical staff on standby     │  │
│ │ ⚠️ Consider postponement        │  │
│ │                                 │  │
│ │ Next Check: 15 minutes          │  │
│ │ [🔄 Update Now]                 │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Heat Illness Signs ──────────┐  │
│ │ Watch for these symptoms:       │  │
│ │ • Excessive sweating            │  │
│ │ • Nausea or vomiting            │  │
│ │ • Dizziness or weakness         │  │
│ │ • Rapid heartbeat               │  │
│ │ • Confusion                     │  │
│ │                                 │  │
│ │ ⚠️ If observed: Stop activity   │  │
│ │ immediately and cool player     │  │
│ │                                 │  │
│ │ [🚑 Emergency Protocol]         │  │
│ └─────────────────────────────────┘  │
│                                     │
│ ┌─── Communication ───────────────┐  │
│ │ 📢 Auto-alerts sent to:         │  │
│ │ • All coaches (8)               │  │
│ │ • Referees (4)                  │  │
│ │ • Parents (127)                 │  │
│ │ • Venue staff (6)               │  │
│ │                                 │  │
│ │ [📱 Send Update] [📋 Log Action] │  │
│ └─────────────────────────────────┘  │
│                                     │
│ [🌡️ Forecast] [📊 History] [⚙️ Settings]│
└─────────────────────────────────────┘
```

---

## Mobile-Responsive Considerations

### Mobile Navigation Pattern

```
┌─────────────────────────────────────┐
│ GameTriq  🔔(3)  ☰               │
│                                     │
│ [Content Area]                      │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [🏠] [👥] [📊] [💬] [👤] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Tablet Layout (Landscape)

```
┌─────────────────────────────────────────────────────────────┐
│ GameTriq League      🔔(3)  👤 Profile    ⚙️ Settings      │
│                                                             │
│ ┌─── Left Panel ──┐  ┌─── Main Content ─────────────────┐  │
│ │ Quick Actions   │  │                                   │  │
│ │ • Dashboard     │  │    Primary Content Area          │  │
│ │ • My Teams      │  │                                   │  │
│ │ • Schedule      │  │                                   │  │
│ │ • Stats         │  │                                   │  │
│ │ • Messages      │  │                                   │  │
│ │                 │  │                                   │  │
│ │ Recent Activity │  │                                   │  │
│ │ • Game updates  │  │                                   │  │
│ │ • Notifications │  │                                   │  │
│ │ • Alerts        │  │                                   │  │
│ └─────────────────┘  └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Accessibility Features

### High Contrast Mode

```
┌─────────────────────────────────────┐
│ ████ HIGH CONTRAST MODE ████        │
│                                     │
│ ████ LIVE GAME ████                 │
│ Eagles vs Hawks                     │
│                                     │
│ ████ SCORE ████                     │
│     52    :    48                   │
│   EAGLES    HAWKS                   │
│                                     │
│ ████ TIME ████                      │
│   Q2  8:45                          │
│                                     │
│ ████ ACTIONS ████                   │
│ ██ WATCH LIVE ██                    │
│ ██ VIEW STATS ██                    │
│ ██ TEAM CHAT  ██                    │
│                                     │
│ ████████████████████████████████    │
└─────────────────────────────────────┘
```

### Screen Reader Optimized

```
<Screen Reader Annotations>

Main Navigation: "Home, Teams, Statistics, Messages, Profile"

Live Game Section:
- Heading Level 1: "Live Game Eagles versus Hawks"
- Heading Level 2: "Current Score"
- "Eagles 52, Hawks 48"
- "Quarter 2, 8 minutes 45 seconds remaining"

Button Group:
- Button: "Watch Live Game, opens live scoring interface"
- Button: "View Statistics, opens team statistics"
- Button: "Open Team Chat, opens messaging interface"

Status Updates:
- Live Region: "Score updated: Eagles 54, Hawks 48"
- Live Region: "New message in team chat"
- Live Region: "Game status: Quarter 3 started"
```

---

## Wireframe Summary

This comprehensive wireframe documentation covers all major user journeys and interfaces for the Basketball League Management Platform Phase 2. Key highlights:

### Design Principles Applied
- **Mobile-First**: All layouts optimized for smartphone use
- **Touch-Friendly**: 48px minimum touch targets
- **Age-Appropriate**: Simplified interfaces for young players
- **High Contrast**: Readable in various lighting conditions
- **Quick Actions**: Essential functions within 2 taps
- **Offline Capable**: Core functions work without connectivity

### Basketball-Specific Features
- Live scoring with offline sync
- Real-time game clock management
- Heat safety monitoring for Phoenix
- Tournament bracket visualization
- Referee assignment and management
- Player substitution tracking
- Statistics dashboard for all roles
- Emergency response protocols

### Accessibility Compliance
- WCAG 2.1 Level AA compliant
- High contrast mode available
- Screen reader optimized
- Keyboard navigation support
- Voice commands for scoring
- Large text options
- Color-blind friendly palettes

All wireframes are designed to be responsive across mobile, tablet, and desktop devices while maintaining consistency in user experience and visual hierarchy.

---

**Document Status**: Complete  
**Next Phase**: Component Library Development  
**Review Required**: UX Team, Product Owner, Technical Lead