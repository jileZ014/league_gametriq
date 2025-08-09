# User Flow Diagrams - Basketball League Management Platform
## Phase 2 UI/UX Journey Maps

**Document ID:** UF-BLMP-001  
**Version:** 1.0  
**Date:** August 8, 2025  
**Author:** Sports UI/UX Designer  
**Status:** Phase 2 User Flow Specifications  

---

## Executive Summary

This document provides comprehensive user flow diagrams for all six primary personas in the Basketball League Management Platform Phase 2. Each flow maps the complete user journey from entry point to goal completion, considering basketball-specific scenarios, multi-generational users, and various device contexts.

### User Flow Principles
- **Goal-Oriented**: Each flow leads to specific user objectives
- **Basketball Context**: Flows consider game-day scenarios and sports environments
- **Multi-Device**: Optimized for mobile, tablet, and desktop usage
- **Error-Resilient**: Alternative paths for common failure scenarios
- **Accessibility-First**: Flows work for all users including assistive technology users

---

## Table of Contents

1. [Flow Diagram Conventions](#1-flow-diagram-conventions)
2. [League Administrator Flows](#2-league-administrator-flows)
3. [Coach User Flows](#3-coach-user-flows)
4. [Parent User Flows](#4-parent-user-flows)
5. [Player User Flows](#5-player-user-flows)
6. [Referee User Flows](#6-referee-user-flows)
7. [Scorekeeper User Flows](#7-scorekeeper-user-flows)
8. [Cross-Persona Flows](#8-cross-persona-flows)

---

## 1. Flow Diagram Conventions

### 1.1 Symbols and Notation

```
Flow Symbols:
┌─────────┐  Page/Screen
│ Screen  │  
└─────────┘

┌─────────┐  Decision Point
│ Choice? │
└────┬────┘
     │
     ▼

→ User Action
⚡ System Action  
⚠️ Error State
✅ Success State
🏀 Basketball-specific action
📱 Mobile-specific flow
⌚ Time-sensitive action

Entry Points:
🌐 Web browser entry
📱 Mobile app launch
🔔 Push notification
📧 Email link
📞 Phone call/text
```

### 1.2 Basketball-Specific Flow Elements

```
Basketball Context Indicators:
🏀 Game-related action
⏰ Time-sensitive (game clock)
🏆 Tournament-specific  
⚡ Live/real-time update
🚨 Emergency procedure
🌡️ Heat safety (Phoenix-specific)
👥 Team communication
📊 Statistics/performance
💰 Payment/financial
📅 Scheduling
```

---

## 2. League Administrator Flows

### 2.1 New League Setup Flow

```
Entry: Admin Dashboard → Create New League

┌─────────────────────────┐
│    Admin Dashboard      │ ←🌐 Web login
└──────────┬──────────────┘
           │ Click "New League"
           ▼
┌─────────────────────────┐
│   League Setup Wizard   │
│   Step 1: Basic Info    │
└──────────┬──────────────┘
           │ Complete form
           ▼
┌─────────────────────────┐
│     Validation          │⚠️→ Error: Fix required fields
└──────────┬──────────────┘
           │ ✅ Valid
           ▼
┌─────────────────────────┐
│   Step 2: Age Groups    │
│   & Divisions           │
└──────────┬──────────────┘
           │ Configure divisions
           ▼
┌─────────────────────────┐
│   Step 3: Schedule      │
│   Preferences           │
└──────────┬──────────────┘
           │ Set schedule rules
           ▼
┌─────────────────────────┐
│   Step 4: Venues &      │
│   Courts                │
└──────────┬──────────────┘
           │ Add venues
           ▼
┌─────────────────────────┐
│   Step 5: Rules &       │
│   Policies              │
└──────────┬──────────────┘
           │ Configure rules
           ▼
┌─────────────────────────┐
│   🌡️ Step 6: Phoenix    │
│   Heat Safety Rules     │
└──────────┬──────────────┘
           │ Set heat protocols
           ▼
┌─────────────────────────┐
│   Review & Confirm      │
│   League Settings       │
└──────────┬──────────────┘
           │ Submit
           ▼
┌─────────────────────────┐
│   ✅ League Created     │
│   Send Invitations?     │
└──────────┬──────────────┘
           │ Yes
           ▼
┌─────────────────────────┐
│   📧 Invite Coaches     │
│   & Team Managers       │
└──────────┬──────────────┘
           │ Invitations sent
           ▼
┌─────────────────────────┐
│   📊 League Dashboard   │
│   Ready for Teams       │
└─────────────────────────┘

Alternative Flows:
- Clone existing league → Skip to Step 6 review
- Import from previous season → Auto-populate data
- Mobile creation → Simplified 3-step flow
```

### 2.2 Game Day Management Flow

```
Entry: Emergency during live game

┌─────────────────────────┐
│   🔴 Live Game Dashboard │ ←🔔 Alert notification
└──────────┬──────────────┘
           │ 🚨 Emergency alert
           ▼
┌─────────────────────────┐
│   🚨 Emergency Type?    │
└─────┬────────┬─────────┘
      │        │
      │Medical │Heat Emergency
      ▼        ▼
┌─────────────────────────┐
│   📞 Immediate Actions  │
│   - Call 911            │
│   - Alert facility staff│
│   - Stop all games      │
└──────────┬──────────────┘
           │ Actions initiated
           ▼
┌─────────────────────────┐
│   📱 Notify All Users   │
│   - Push notifications  │
│   - Email alerts        │
│   - SMS to key contacts │
└──────────┬──────────────┘
           │ Notifications sent
           ▼
┌─────────────────────────┐
│   📋 Incident Logging   │
│   - Document events     │
│   - Record actions      │
│   - Note responders     │
└──────────┬──────────────┘
           │ Log complete
           ▼
┌─────────────────────────┐
│   👥 Parent Updates     │
│   - Player safety status│
│   - Pickup instructions │
│   - Game rescheduling   │
└──────────┬──────────────┘
           │ Updates sent
           ▼
┌─────────────────────────┐
│   ✅ Emergency Handled  │
│   - Follow-up required  │
│   - Insurance reporting │
└─────────────────────────┘
```

---

## 3. Coach User Flows

### 3.1 Pre-Game Preparation Flow

```
Entry: 2 hours before game time

┌─────────────────────────┐
│   📱 Coach Mobile App   │ ←🔔 Game reminder
└──────────┬──────────────┘
           │ Open game prep
           ▼
┌─────────────────────────┐
│   🏀 Today's Game Info  │
│   Eagles vs Hawks 4PM   │
└──────────┬──────────────┘
           │ Start preparation
           ▼
┌─────────────────────────┐
│   👥 Check Player       │
│   Availability          │
└──────────┬──────────────┘
           │ Review roster
           ▼
┌─────────────────────────┐
│   📋 Player Status?     │
│   All available?        │
└─────┬────────┬─────────┘
      │        │
     Yes       No
      │        ▼
      │   ┌─────────────────────────┐
      │   │   ⚠️ Handle Absences    │
      │   │   - Mark unavailable    │
      │   │   - Adjust lineup       │
      │   │   - Notify parents      │
      │   └──────────┬──────────────┘
      │              │
      │              ▼
      └──────────────┬──
                     ▼
┌─────────────────────────┐
│   🏀 Set Starting       │
│   Lineup & Rotations    │
└──────────┬──────────────┘
           │ Lineup confirmed
           ▼
┌─────────────────────────┐
│   📝 Game Plan &        │
│   Strategy Notes        │
└──────────┬──────────────┘
           │ Strategy set
           ▼
┌─────────────────────────┐
│   ⚡ Equipment Check     │
│   - Balls, water        │
│   - First aid kit       │
│   - 🌡️ Heat supplies    │
└──────────┬──────────────┘
           │ Equipment ready
           ▼
┌─────────────────────────┐
│   💬 Team Communication │
│   - Send lineup         │
│   - Game reminders      │
│   - Parent notifications│
└──────────┬──────────────┘
           │ Messages sent
           ▼
┌─────────────────────────┐
│   ✅ Pre-Game Complete  │
│   Ready for departure   │
└─────────────────────────┘
```

### 3.2 Live Game Coaching Flow

```
Entry: At game venue, 30 minutes before tip-off

┌─────────────────────────┐
│   📍 Arrive at Venue    │ ←⏰ 30 min before
└──────────┬──────────────┘
           │ Check-in
           ▼
┌─────────────────────────┐
│   📋 Meet with Officials│
│   - Review roster       │
│   - Discuss rules       │
│   - 🌡️ Heat protocols   │
└──────────┬──────────────┘
           │ Officials briefed
           ▼
┌─────────────────────────┐
│   👥 Team Warm-up       │
│   - Dynamic stretching  │
│   - Shooting drills     │
│   - Last-minute prep    │
└──────────┬──────────────┘
           │ Warm-up complete
           ▼
┌─────────────────────────┐
│   🏀 Game Starts        │
│   Coaching Interface    │
└──────────┬──────────────┘
           │ Throughout game
           ▼
┌─────────────────────────┐
│   ⚡ Live Coaching       │
│   Actions Available:    │
└─┬─┬─┬─┬─┬─┬──────────────┘
  │ │ │ │ │ │
  │ │ │ │ │ └→ ⏰ Call Timeout
  │ │ │ │ └──→ ↔️ Substitution  
  │ │ │ └────→ 📝 Add Note
  │ │ └──────→ 📊 View Stats
  │ └────────→ 💬 Signal Players
  └──────────→ 🚨 Emergency

Each action leads to:
┌─────────────────────────┐
│   Action Confirmation   │
│   Execute or Cancel?    │
└──────────┬──────────────┘
           │ Confirm
           ▼
┌─────────────────────────┐
│   ⚡ System Updates      │
│   - Official scorebook  │
│   - Parent notifications│
│   - Statistics tracking │
└──────────┬──────────────┘
           │ Return to game
           ▼
┌─────────────────────────┐
│   🏀 Continue Coaching  │
│   Monitor game progress │
└─────────────────────────┘

Game End Flow:
┌─────────────────────────┐
│   🏆 Game Complete      │
│   Final score recorded  │
└──────────┬──────────────┘
           │ Post-game
           ▼
┌─────────────────────────┐
│   👥 Team Huddle        │
│   - Discuss performance │
│   - Next game prep      │
│   - Positive messaging  │
└──────────┬──────────────┘
           │ Team dismissed
           ▼
┌─────────────────────────┐
│   📱 Post-Game Tasks    │
│   - Message parents     │
│   - Review statistics   │
│   - Plan next practice  │
└─────────────────────────┘
```

---

## 4. Parent User Flows

### 4.1 Child Registration Flow

```
Entry: Received league invitation email

┌─────────────────────────┐
│   📧 Email Invitation   │ ←📧 From league admin
└──────────┬──────────────┘
           │ Click "Register Player"
           ▼
┌─────────────────────────┐
│   🌐 Registration Page  │
│   Create Account?       │
└─────┬────────┬─────────┘
      │        │
   New User    │Existing User
      │        │
      ▼        ▼
┌─────────────────────────┐
│   👤 Parent Account     │
│   Creation              │
└──────────┬──────────────┘
           │ Account created
           ▼
┌─────────────────────────┐
│   📋 Player Information │
│   Form (Step 1 of 4)    │
└──────────┬──────────────┘
           │ Complete basic info
           ▼
┌─────────────────────────┐
│   📋 Form Validation    │
└─────┬────────┬─────────┘
      │        │
    Valid    ⚠️Error
      │        │
      │        ▼
      │   ┌─────────────────────────┐
      │   │   Fix Required Fields   │
      │   │   - Highlight errors    │
      │   │   - Show help text      │
      │   └──────────┬──────────────┘
      │              │
      └──────────────┴──
                     ▼
┌─────────────────────────┐
│   🏥 Medical Information│
│   Form (Step 2 of 4)    │
└──────────┬──────────────┘
           │ Health details
           ▼
┌─────────────────────────┐
│   📞 Emergency Contacts │
│   Form (Step 3 of 4)    │
└──────────┬──────────────┘
           │ Contact info
           ▼
┌─────────────────────────┐
│   ✍️ COPPA Consent &    │
│   Waivers (Step 4 of 4) │
└──────────┬──────────────┘
           │ Legal agreements
           ▼
┌─────────────────────────┐
│   👤 Photo Upload       │
│   (Optional)            │
└──────────┬──────────────┘
           │ Photo added
           ▼
┌─────────────────────────┐
│   💰 Payment Required   │
│   Registration Fee $125 │
└──────────┬──────────────┘
           │ Process payment
           ▼
┌─────────────────────────┐
│   💳 Payment Method     │
│   - Credit card         │
│   - Bank transfer       │
│   - Payment plan        │
└──────────┬──────────────┘
           │ Payment processed
           ▼
┌─────────────────────────┐
│   ✅ Registration       │
│   Complete!             │
└──────────┬──────────────┘
           │ Success
           ▼
┌─────────────────────────┐
│   📧 Confirmation       │
│   - Email receipt       │
│   - Team assignment     │
│   - Next steps info     │
└──────────┬──────────────┘
           │ Emails sent
           ▼
┌─────────────────────────┐
│   📱 Parent Dashboard   │
│   Access granted        │
└─────────────────────────┘

Alternative Flows:
- Payment plan → Monthly billing setup
- Scholarship needed → Financial aid form
- Multiple children → Streamlined multi-registration
```

### 4.2 Game Day Parent Experience

```
Entry: Game day morning

┌─────────────────────────┐
│   📱 Parent App Opens   │ ←🔔 Game day notification
└──────────┬──────────────┘
           │ Check today's games
           ▼
┌─────────────────────────┐
│   🏀 Today's Games      │
│   Emily: Eagles vs Hawks│
│   4:00 PM @ Main Gym    │
└──────────┬──────────────┘
           │ Tap game details
           ▼
┌─────────────────────────┐
│   📋 Game Information   │
│   - Location & time     │
│   - 🌡️ Weather/heat info │
│   - Parking details     │
└──────────┬──────────────┘
           │ Plan departure
           ▼
┌─────────────────────────┐
│   📍 Navigation Options │
│   - Get directions      │
│   - 👥 Coordinate carpool│
│   - ⏰ Departure reminder│
└──────────┬──────────────┘
           │ Head to game
           ▼
┌─────────────────────────┐
│   📍 Arrive at Venue    │
│   Check-in process      │
└──────────┬──────────────┘
           │ At game
           ▼
┌─────────────────────────┐
│   🏀 Live Game View     │
│   - Current score       │
│   - Emily's stats       │
│   - Game clock          │
└──────────┬──────────────┘
           │ During game
           ▼
┌─────────────────────────┐
│   📱 Parent Features    │
│   Available Options:    │
└─┬─┬─┬─┬─┬──────────────┘
  │ │ │ │ │
  │ │ │ │ └→ 📸 Take photos
  │ │ │ └──→ 💬 Parent chat
  │ │ └────→ 📊 View Emily's stats
  │ └──────→ 🔔 Get score updates
  └────────→ 📱 Share highlights

Real-time Updates:
┌─────────────────────────┐
│   ⚡ Score Update        │
│   Emily scored! 🏀       │
│   Eagles 52-48 Hawks    │
└──────────┬──────────────┘
           │ Continue watching
           ▼
┌─────────────────────────┐
│   🏆 Game Ends          │
│   Eagles win 65-52!     │
│   Emily: 12 pts, 4 reb  │
└──────────┬──────────────┘
           │ Post-game
           ▼
┌─────────────────────────┐
│   📸 Game Highlights    │
│   - Photos available    │
│   - Statistics summary  │
│   - Next game preview   │
└──────────┬──────────────┘
           │ Share & celebrate
           ▼
┌─────────────────────────┐
│   💬 Team Communication │
│   - Congratulate team   │
│   - Plan celebrations   │
│   - Coordinate rides    │
└─────────────────────────┘

Emergency Flow:
┌─────────────────────────┐
│   🚨 Emergency Alert    │ ←⚡ Push notification
│   Game suspended due    │
│   to heat emergency     │
└──────────┬──────────────┘
           │ Immediate action
           ▼
┌─────────────────────────┐
│   📱 Emergency Info     │
│   - Player safety status│
│   - Pickup instructions │
│   - Rescheduling info   │
└──────────┬──────────────┘
           │ Follow instructions
           ▼
┌─────────────────────────┐
│   👥 Parent Coordination│
│   - Communicate w/ others│
│   - Arrange pickup      │
│   - Stay informed       │
└─────────────────────────┘
```

---

## 5. Player User Flows

### 5.1 Youth Player Flow (Ages 6-12)

```
Entry: After school, checking basketball app

┌─────────────────────────┐
│   📱 Hi Emily! 👋       │ ←📱 Open app
│   Welcome back!         │
└──────────┬──────────────┘
           │ See what's new
           ▼
┌─────────────────────────┐
│   🏆 Look what you did! │
│   New achievement:      │
│   🎯 Perfect Free Throws│
└──────────┬──────────────┘
           │ Tap to see more
           ▼
┌─────────────────────────┐
│   📊 Your Basketball    │
│   Numbers (This Week)   │
│   🏀 Points: 38         │
│   💪 Rebounds: 12       │
│   🤝 Assists: 8         │
└──────────┬──────────────┘
           │ Cool! What's next?
           ▼
┌─────────────────────────┐
│   📅 Next Game          │
│   Tomorrow vs Hawks!    │
│   🕐 4:00 PM            │
│   Are you excited? 😊   │
└─────┬────────┬─────────┘
      │        │
   Yes! 😊    I'm nervous 😰
      │        │
      ▼        ▼
┌─────────────────────────┐
│   🌟 Get Ready Tips     │
│   For Tomorrow:         │
│   ✓ Get good sleep      │
│   ✓ Eat healthy lunch   │
│   ✓ Bring water bottle  │
│   ✓ Remember to have fun│
└──────────┬──────────────┘
           │ That helps!
           ▼
┌─────────────────────────┐
│   👥 Team Messages      │
│   Coach Mike: "Great    │
│   practice everyone!"   │
│   Sarah: "Go Eagles!"   │
└──────────┬──────────────┘
           │ Send message
           ▼
┌─────────────────────────┐
│   💬 Quick Responses    │
│   [👍 Great!] [🏀 Can't wait!]│
│   [😊 Thanks coach!] [Type...] │
└──────────┬──────────────┘
           │ Message sent
           ▼
┌─────────────────────────┐
│   📸 Team Photos        │
│   New photos from       │
│   last game! 📷         │
└──────────┬──────────────┘
           │ Look at photos
           ▼
┌─────────────────────────┐
│   🎮 Fun Basketball     │
│   Games & Activities    │
│   - Shot chart coloring │
│   - Basketball trivia   │
│   - Practice reminders  │
└─────────────────────────┘
```

### 5.2 Teen Player Flow (Ages 13-18)

```
Entry: Checking stats after practice

┌─────────────────────────┐
│   📱 Player Dashboard   │ ←📱 Mobile app
│   Alex Johnson #23     │
└──────────┬──────────────┘
           │ Check latest stats
           ▼
┌─────────────────────────┐
│   📊 Season Statistics  │
│   PPG: 15.8 (+0.4)      │
│   REB: 6.2              │
│   AST: 3.8              │
│   FG%: 47.2% (+2.1%)    │
└──────────┬──────────────┘
           │ Improvement! 📈
           ▼
┌─────────────────────────┐
│   🎯 Personal Goals     │
│   Progress This Season: │
│   ▓▓▓▓▓▓░░░░ 60%        │
│   Goal: 18 PPG by March │
└──────────┬──────────────┘
           │ Check game schedule
           ▼
┌─────────────────────────┐
│   📅 Upcoming Games     │
│   Friday vs Hawks       │
│   - Scouting report     │
│   - Matchup analysis    │
│   - Coach's game plan   │
└──────────┬──────────────┘
           │ Study opponents
           ▼
┌─────────────────────────┐
│   🏀 Hawks Team Info    │
│   Key Players:          │
│   #22 Taylor (Guard)    │
│   Strengths: 3-pt shots │
│   Weakness: Left side   │
└──────────┬──────────────┘
           │ Game strategy
           ▼
┌─────────────────────────┐
│   📝 Coach's Notes      │
│   For Alex:             │
│   "Focus on drives to   │
│   basket, they're weak  │
│   defending the paint"  │
└──────────┬──────────────┘
           │ Practice plan
           ▼
┌─────────────────────────┐
│   💪 Training Focus     │
│   This Week:            │
│   ✓ Driving to basket   │
│   ✓ Left-hand dribbling │
│   ✓ Free throw practice │
│   ○ 3-point consistency │
└──────────┬──────────────┘
           │ Track progress
           ▼
┌─────────────────────────┐
│   📈 Skill Development  │
│   Upload practice video │
│   Get coach feedback    │
│   Compare with goals    │
└──────────┬──────────────┘
           │ Team communication
           ▼
┌─────────────────────────┐
│   👥 Team Group Chat    │
│   Plan carpools         │
│   Discuss strategy      │
│   Coordinate practice   │
└─────────────────────────┘
```

---

## 6. Referee User Flows

### 6.1 Game Assignment and Preparation Flow

```
Entry: Referee receives game assignment notification

┌─────────────────────────┐
│   📧 Assignment Email   │ ←📧 League notification
│   Game: Eagles vs Hawks │
│   Saturday 2:00 PM      │
└──────────┬──────────────┘
           │ Accept assignment?
           ▼
┌─────────────────────────┐
│   📋 Assignment Review  │
│   - Teams: Eagles/Hawks │
│   - Level: 10U Division │
│   - Venue: Main Gym     │
│   - Pay: $45            │
└─────┬────────┬─────────┘
      │        │
   Accept    Decline
      │        │
      ▼        ▼
┌─────────────────────────┐
│   ✅ Assignment         │
│   Confirmed             │
└──────────┬──────────────┘
           │ Add to calendar
           ▼
┌─────────────────────────┐
│   📅 Calendar Update    │
│   - Block time slot     │
│   - Set reminders       │
│   - Note travel time    │
└──────────┬──────────────┘
           │ Day of game
           ▼
┌─────────────────────────┐
│   📱 Pre-Game Prep     │
│   2 hours before:       │
│   - Review team rosters │
│   - Check rule updates  │
│   - Prepare equipment   │
└──────────┬──────────────┘
           │ Travel to venue
           ▼
┌─────────────────────────┐
│   📍 Arrive at Venue    │
│   30 minutes early      │
│   Check-in process      │
└──────────┬──────────────┘
           │ Setup procedure
           ▼
┌─────────────────────────┐
│   📋 Pre-Game Checklist │
│   ✓ Court inspection    │
│   ✓ Equipment check     │
│   ✓ Meet coaches        │
│   ✓ Review rosters      │
│   ✓ 🌡️ Heat protocols   │
└──────────┬──────────────┘
           │ Ready to officiate
           ▼
┌─────────────────────────┐
│   🏀 Game Ready         │
│   All checks complete   │
│   Start game            │
└─────────────────────────┘
```

### 6.2 Live Game Officiating Flow

```
Entry: Game tip-off

┌─────────────────────────┐
│   🏀 Game Start         │ ←⏰ Tip-off time
│   Eagles vs Hawks       │
│   Referee interface     │
└──────────┬──────────────┘
           │ Throughout game
           ▼
┌─────────────────────────┐
│   ⚡ Live Officiating    │
│   Actions Available:    │
└─┬─┬─┬─┬─┬─┬──────────────┘
  │ │ │ │ │ │
  │ │ │ │ │ └→ ⏰ Control clock
  │ │ │ │ └──→ ⚠️ Call foul
  │ │ │ └────→ 🚫 Violation
  │ │ └──────→ ⏸️ Timeout
  │ └────────→ ↔️ Substitution
  └──────────→ 🚨 Emergency

Foul Call Flow:
┌─────────────────────────┐
│   ⚠️ Foul Called        │
└──────────┬──────────────┘
           │ Select foul type
           ▼
┌─────────────────────────┐
│   🏀 Foul Type?         │
│   - Personal            │
│   - Technical           │
│   - Flagrant            │
│   - Intentional         │
└──────────┬──────────────┘
           │ Select player
           ▼
┌─────────────────────────┐
│   👤 Which Player?      │
│   Eagles roster shown  │
│   Tap player number    │
└──────────┬──────────────┘
           │ Player selected
           ▼
┌─────────────────────────┐
│   📱 Record Foul        │
│   - Update team fouls   │
│   - Check bonus status  │
│   - Notify scorer       │
└──────────┬──────────────┘
           │ Continue game
           ▼
┌─────────────────────────┐
│   🏀 Resume Play        │
│   Monitor next action   │
└─────────────────────────┘

Emergency Procedures:
┌─────────────────────────┐
│   🚨 Emergency          │
│   Injury on court       │
└──────────┬──────────────┘
           │ Immediate action
           ▼
┌─────────────────────────┐
│   ⏹️ Stop All Activity  │
│   - Stop clock          │
│   - Clear area          │
│   - Signal for help     │
└──────────┬──────────────┘
           │ Medical response
           ▼
┌─────────────────────────┐
│   🏥 Medical Protocol   │
│   - Assess situation    │
│   - Call 911 if needed  │
│   - Document incident   │
└──────────┬──────────────┘
           │ Resolution
           ▼
┌─────────────────────────┐
│   📋 Post-Emergency     │
│   - Complete incident   │
│     report              │
│   - Resume or postpone? │
└─────────────────────────┘

Game End:
┌─────────────────────────┐
│   🏆 Game Complete      │
│   Final: Eagles 65-52   │
└──────────┬──────────────┘
           │ Post-game duties
           ▼
┌─────────────────────────┐
│   📋 Post-Game Tasks    │
│   - Sign scorebook      │
│   - Submit report       │
│   - Process payment     │
└─────────────────────────┘
```

---

## 7. Scorekeeper User Flows

### 7.1 Game Setup and Scoring Flow

```
Entry: Arrive at venue 45 minutes before game

┌─────────────────────────┐
│   📍 Venue Arrival      │ ←⏰ 45 min early
│   Setup scorekeeper     │
│   station               │
└──────────┬──────────────┘
           │ Equipment setup
           ▼
┌─────────────────────────┐
│   💻 Scorekeeper Setup  │
│   - Connect to WiFi     │
│   - Open scoring app    │
│   - Test connectivity   │
└──────────┬──────────────┘
           │ Load game data
           ▼
┌─────────────────────────┐
│   🏀 Game Information   │
│   Load: Eagles vs Hawks │
│   - Team rosters        │
│   - Player numbers      │
│   - Starting lineups    │
└──────────┬──────────────┘
           │ Verify with coaches
           ▼
┌─────────────────────────┐
│   👥 Roster Verification│
│   Meet with coaches:    │
│   - Confirm starters    │
│   - Note any changes    │
│   - Review eligibility  │
└──────────┬──────────────┘
           │ Pre-game complete
           ▼
┌─────────────────────────┐
│   ✅ Ready for Tip-off  │
│   All systems go        │
└──────────┬──────────────┘
           │ Game starts
           ▼
┌─────────────────────────┐
│   🏀 Live Scoring       │
│   Interface Active      │
└──────────┬──────────────┘
           │ Throughout game
           ▼
┌─────────────────────────┐
│   ⚡ Scoring Actions     │
│   Real-time updates:    │
└─┬─┬─┬─┬─┬──────────────┘
  │ │ │ │ │
  │ │ │ │ └→ 📊 Update stats
  │ │ │ └──→ ⚠️ Record foul
  │ │ └────→ ↔️ Substitution
  │ └──────→ ⏰ Timeout
  └────────→ 🏀 Score points

Scoring Flow:
┌─────────────────────────┐
│   🏀 Points Scored      │
│   Which team?           │
└─────┬────────┬─────────┘
      │        │
   Eagles     Hawks
      │        │
      ▼        ▼
┌─────────────────────────┐
│   👤 Which Player?      │
│   Show active roster    │
│   Tap player name/number│
└──────────┬──────────────┘
           │ Select shot type
           ▼
┌─────────────────────────┐
│   🎯 Shot Type?         │
│   [2 Points] [3 Points] │
│   [Free Throw] [Cancel] │
└──────────┬──────────────┘
           │ Points confirmed
           ▼
┌─────────────────────────┐
│   ⚡ Update Everything   │
│   - Team score          │
│   - Player statistics   │
│   - Play-by-play log    │
│   - Broadcast to fans   │
└──────────┬──────────────┘
           │ Continue scoring
           ▼
┌─────────────────────────┐
│   📊 Live Updates Sent  │
│   - Parents notified    │
│   - Stats updated       │
│   - Officials informed  │
└─────────────────────────┘
```

### 7.2 Error Correction and Backup Flow

```
Entry: Mistake identified in scoring

┌─────────────────────────┐
│   ⚠️ Scoring Error       │ ←👤 Coach/Ref notification
│   Need to correct       │
│   last entry            │
└──────────┬──────────────┘
           │ Access corrections
           ▼
┌─────────────────────────┐
│   📋 Recent Actions     │
│   Last 5 entries:       │
│   1. Hawks #22: +2 pts  │ ←Select to edit
│   2. Timeout: Eagles    │
│   3. Sub: Eagles        │
│   4. Eagles #15: +3 pts │
│   5. Foul: Hawks #11    │
└──────────┬──────────────┘
           │ Select incorrect entry
           ▼
┌─────────────────────────┐
│   ✏️ Edit Entry         │
│   Hawks #22: +2 pts     │
│   Change to:            │
│   [Delete] [Change Team]│
│   [Change Player] [Pts] │
└──────────┬──────────────┘
           │ Make correction
           ▼
┌─────────────────────────┐
│   ⚡ Correction Made     │
│   Entry updated:        │
│   Eagles #15: +2 pts    │
│   (was Hawks #22)       │
└──────────┬──────────────┘
           │ Verify correction
           ▼
┌─────────────────────────┐
│   ✅ Confirm Changes    │
│   - Update scoreboard   │
│   - Recalculate stats   │
│   - Log correction      │
│   - Notify officials    │
└──────────┬──────────────┘
           │ Changes applied
           ▼
┌─────────────────────────┐
│   📱 Stakeholder Alerts │
│   - Coach notification  │
│   - Referee update      │
│   - Parent app refresh  │
└─────────────────────────┘

Backup/Recovery Flow:
┌─────────────────────────┐
│   💻 System Failure     │ ←⚡ Technical issue
│   Connection lost       │
└──────────┬──────────────┘
           │ Switch to backup
           ▼
┌─────────────────────────┐
│   📱 Mobile Backup      │
│   - Switch to phone app │
│   - Continue scoring    │
│   - Sync when restored  │
└──────────┬──────────────┘
           │ Maintain scoring
           ▼
┌─────────────────────────┐
│   📋 Paper Backup       │
│   If all digital fails: │
│   - Use paper scorebook │
│   - Manual calculation  │
│   - Enter later         │
└──────────┬──────────────┘
           │ System restored
           ▼
┌─────────────────────────┐
│   🔄 Data Recovery      │
│   - Restore from backup │
│   - Reconcile entries   │
│   - Verify accuracy     │
└──────────┬──────────────┘
           │ Resume normal ops
           ▼
┌─────────────────────────┐
│   ✅ Full System        │
│   Operational           │
└─────────────────────────┘
```

---

## 8. Cross-Persona Flows

### 8.1 Emergency Response Flow (All Users)

```
Entry: Heat emergency declared during games

┌─────────────────────────┐
│   🌡️ Heat Emergency     │ ←⚡ Temperature reaches 110°F
│   Declared by system    │
│   All games suspended   │
└──────────┬──────────────┘
           │ Immediate alerts
           ▼
┌─────────────────────────┐
│   🚨 Multi-Channel      │
│   Alerts Sent:         │
│   - Push notifications  │
│   - SMS messages        │
│   - Email alerts       │
│   - PA announcements    │
└──────────┬──────────────┘
           │ User responses by persona
           ▼

League Admin Flow:
┌─────────────────────────┐
│   📋 Admin Actions      │
│   - Activate heat plan  │
│   - Coordinate staff    │
│   - Manage rescheduling │
│   - Update all users    │
└─────────────────────────┘

Coach Flow:
┌─────────────────────────┐
│   👥 Team Safety        │
│   - Account for players │
│   - Move to cool areas  │
│   - Notify parents      │
│   - Monitor health      │
└─────────────────────────┘

Parent Flow:
┌─────────────────────────┐
│   📱 Parent Response    │
│   - Check child safety  │
│   - Coordinate pickup   │
│   - Follow instructions │
│   - Stay informed       │
└─────────────────────────┘

Player Flow (Age-appropriate):
┌─────────────────────────┐
│   🧒 Youth Players      │
│   - Stay with coaches   │
│   - Drink water         │
│   - Move to shade       │
│   - Wait for parents    │
└─────────────────────────┘

Official Flow:
┌─────────────────────────┐
│   🦓 Referee/Scorer     │
│   - Secure equipment    │
│   - Document situation  │
│   - Assist with safety  │
│   - Report to admin     │
└─────────────────────────┘

All flows converge to:
┌─────────────────────────┐
│   ✅ Emergency Resolved │
│   - All players safe    │
│   - Games rescheduled   │
│   - Incident documented │
│   - Follow-up planned   │
└─────────────────────────┘
```

### 8.2 Payment and Registration Flow (Cross-Persona)

```
Entry: New season registration opens

┌─────────────────────────┐
│   📧 Season Announcement│ ←Admin initiates
│   Registration Now Open │
└──────────┬──────────────┘
           │ Multiple entry points
           ▼

Admin Tasks:
┌─────────────────────────┐
│   👤 Admin Setup        │
│   - Configure fees      │
│   - Set deadlines       │
│   - Enable payments     │
│   - Monitor registration│
└─────────────────────────┘
           ▼
Parent Registration:
┌─────────────────────────┐
│   📋 Parent Registers   │
│   - Complete forms      │
│   - Upload documents    │
│   - Process payments    │
│   - Await team assign   │
└─────────────────────────┘
           ▼
Coach Assignment:
┌─────────────────────────┐
│   👨‍🏫 Coach Gets Team    │
│   - Review roster       │
│   - Contact families    │
│   - Plan first meeting  │
│   - Schedule practices  │
└─────────────────────────┘
           ▼
Player Engagement:
┌─────────────────────────┐
│   🏀 Player Setup       │
│   - Receive login       │
│   - Join team group     │
│   - See schedule        │
│   - Meet teammates      │
└─────────────────────────┘
           ▼
Financial Processing:
┌─────────────────────────┐
│   💰 Payment Flow       │
│   - Process fees        │
│   - Track payments      │
│   - Handle refunds      │
│   - Generate receipts   │
└─────────────────────────┘
           ▼
Season Launch:
┌─────────────────────────┐
│   🏆 Season Begins      │
│   - Teams formed        │
│   - Schedules published │
│   - All users ready     │
│   - Games can start     │
└─────────────────────────┘
```

### 8.3 Tournament Flow (Multi-Persona)

```
Entry: Tournament bracket created

┌─────────────────────────┐
│   🏆 Tournament Created │ ←Admin action
│   16 teams, single elim │
└──────────┬──────────────┘
           │ Stakeholder notifications
           ▼

Coach Preparation:
┌─────────────────────────┐
│   👨‍🏫 Coach Tournament   │
│   Prep Flow:            │
│   - Review bracket      │
│   - Study opponents     │
│   - Prepare team        │
│   - Coordinate logistics│
└─────────────────────────┘

Parent Coordination:
┌─────────────────────────┐
│   👨‍👩‍👧‍👦 Parent Planning   │
│   - Check schedule      │
│   - Plan attendance     │
│   - Coordinate carpool  │
│   - Support team        │
└─────────────────────────┘

Player Excitement:
┌─────────────────────────┐
│   🏀 Player Engagement  │
│   - View bracket        │
│   - Set personal goals  │
│   - Team bonding        │
│   - Mental preparation  │
└─────────────────────────┘

Official Assignment:
┌─────────────────────────┐
│   🦓 Referee Scheduling │
│   - Assign to games     │
│   - Schedule coordination│
│   - Equipment prep      │
│   - Payment processing  │
└─────────────────────────┘

Live Tournament Day:
┌─────────────────────────┐
│   🔴 Live Tournament    │
│   All personas engaged: │
│   - Real-time updates   │
│   - Cross-communication │
│   - Live scoring        │
│   - Photo sharing       │
│   - Bracket progression │
└─────────────────────────┘

Tournament Completion:
┌─────────────────────────┐
│   🏆 Champions Crowned  │
│   - Award ceremony      │
│   - Photo documentation │
│   - Statistics summary  │
│   - Feedback collection │
│   - Season wrap-up      │
└─────────────────────────┘
```

---

## Flow Validation and Testing

### User Flow Testing Checklist

**Flow Completeness**
- [ ] All personas covered
- [ ] Happy paths documented  
- [ ] Error scenarios included
- [ ] Alternative routes provided
- [ ] Basketball-specific needs addressed

**Technical Validation**
- [ ] Mobile responsiveness confirmed
- [ ] Offline capabilities noted
- [ ] Performance considerations included
- [ ] Accessibility paths verified
- [ ] Security checkpoints identified

**User Experience Validation**
- [ ] Age-appropriate flows (6-60+ years)
- [ ] Multi-generational scenarios
- [ ] Emergency procedures clear
- [ ] Communication flows effective
- [ ] Basketball terminology appropriate

**Cross-Platform Consistency**
- [ ] Web and mobile alignment
- [ ] Tablet-specific optimizations
- [ ] Device switching scenarios
- [ ] Data synchronization points
- [ ] Offline-to-online transitions

This comprehensive user flow documentation ensures that all six personas have clear, efficient paths to accomplish their basketball league management goals while maintaining consistency across the platform and providing appropriate alternatives for various scenarios and user capabilities.

---

**User Flows Status**: Complete  
**Next Phase**: Interaction Patterns & Micro-animations  
**Dependencies**: Wireframes, component library, accessibility guidelines  
**Review Required**: UX team, persona representatives, usability testing