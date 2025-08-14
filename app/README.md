# GameTriq Basketball League Management Platform

A comprehensive basketball league management system built with Next.js 14, TypeScript, Supabase, and Tailwind CSS.

## Features

- 🏀 **League Management** - Manage multiple basketball leagues with 80+ leagues and 3,500+ teams
- 👥 **Team & Roster Management** - Complete team and player roster management
- 🏆 **Tournament Brackets** - Interactive tournament bracket generation and management
- 📊 **Live Scoring** - Real-time game scoring with offline-first architecture
- 💳 **Payment Processing** - Stripe integration for registration fees
- 📱 **Mobile-First Design** - Optimized for courtside tablet and phone use
- 🔐 **Role-Based Access** - Admin, coach, referee, parent, and player roles
- 🌡️ **Phoenix Heat Safety** - Heat monitoring for outdoor games

## Project Structure

```
app/
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── dashboard/         # Dashboard pages
│   ├── login/             # Authentication pages
│   ├── register/          
│   ├── tournaments/       # Tournament management
│   ├── teams/             # Team management
│   └── games/             # Game management
├── components/            # React components
│   ├── Navbar.tsx        # Navigation
│   ├── TournamentBracket.tsx
│   ├── TeamRoster.tsx
│   ├── LiveScoreBoard.tsx
│   └── ui/               # UI components
├── lib/                   # Utilities
│   ├── supabase/         # Supabase configuration
│   └── utils.ts          # Helper functions
└── public/               # Static assets
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm 8+
- Supabase account
- Stripe account (for payments)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Environment Variables:**
The `.env.local` file should already be configured with your Supabase and Stripe keys.

3. **Database Setup:**
The Supabase database schema is already configured in `/supabase/schema.sql`. 
Apply it to your Supabase project through the SQL editor.

### Development

Run the development server on port 4000:

```bash
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Key Technologies

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS with basketball-themed design
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Payments:** Stripe
- **Forms:** React Hook Form with Zod validation
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Authentication

The app uses Supabase Auth with:
- Email/password authentication
- OAuth providers (Google, etc.)
- Role-based access control
- Protected routes with middleware

## Database Schema

Key tables:
- `profiles` - User profiles with roles
- `leagues` - League information
- `teams` - Team data
- `games` - Game schedules and scores
- `tournaments` - Tournament brackets
- `players` - Player rosters

## Features by Role

### Admin
- Full system access
- League creation and management
- User management
- Financial reports

### Coach
- Team roster management
- Game scheduling
- Player statistics

### Referee/Scorekeeper
- Live game scoring
- Game report submission

### Parent/Player
- View schedules
- Track statistics
- Tournament brackets

## Phoenix-Specific Features

- Heat index monitoring
- Indoor venue preferences
- Saturday tournament optimization
- High-traffic support (1000+ concurrent users)

## Support

For issues or questions, please contact the GameTriq development team.

## License

© 2024 GameTriq. All rights reserved.