# Gametriq League App - Next.js 14 with TypeScript

Basketball League Management Platform for Phoenix youth leagues with 80+ leagues and 3,500+ teams.

## 🏀 Features

- **Next.js 14** with App Router and TypeScript
- **Offline-first architecture** for poor gym wifi
- **Real-time updates** via WebSocket connections
- **Supabase** integration for database and auth
- **Stripe** payments for registrations and fees
- **PDF generation** for scoresheets and reports
- **Tailwind CSS** with basketball-themed design system
- **Mobile-first design** optimized for tablets and phones

## 📋 Setup Instructions

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` with your actual values:
   - Supabase URL and keys
   - Stripe API keys
   - Other configuration values

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:4000](http://localhost:4000)

## 🛠 Available Scripts

- `npm run dev` - Start development server on port 4000
- `npm run build` - Build for production
- `npm run start` - Start production server on port 4000
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run Jest tests

## 📦 Dependencies

### Core Framework
- **Next.js 14.2.5** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.9.2** - Type safety

### Styling
- **Tailwind CSS 3.4.6** - Utility-first CSS framework
- **Class Variance Authority** - Component variants
- **Tailwind Merge** - Conditional classes

### Database & Auth
- **Supabase JS 2.39.1** - Database and authentication
- **Supabase Auth Helpers** - Next.js integration

### Payments
- **Stripe 14.15.0** - Payment processing
- **Stripe React Components** - React integration

### Real-time
- **Socket.io Client 4.7.5** - WebSocket connections

### Forms & Validation
- **React Hook Form 7.52.1** - Form handling
- **Zod 3.23.8** - Schema validation
- **Hookform Resolvers** - Form validation integration

### Charts & Analytics
- **Recharts 2.12.7** - Basketball statistics visualization

### PDF Generation
- **jsPDF 2.5.1** - Generate scoresheets and reports

### Utilities
- **Date-fns 3.6.0** - Date manipulation
- **Lucide React 0.408.0** - Icon library
- **clsx & tailwind-merge** - Conditional styling

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
│
├── lib/                   # Utilities and configurations
│   ├── supabase.ts       # Database client
│   ├── stripe.ts         # Payment processing
│   ├── websocket.ts      # Real-time connections
│   ├── pdf-generator.ts  # Document generation
│   └── utils.ts          # Common utilities
│
├── components/           # React components (to be created)
├── hooks/               # Custom hooks (to be created)
└── types/               # TypeScript definitions (to be created)
```

## 🎨 Design System

The application includes a basketball-themed design system with:

- **Basketball orange** (`#ff9800`) as primary color
- **Court colors** for backgrounds and sections
- **Team colors** (home/away) for game displays
- **Heat safety colors** for Phoenix climate
- **Material Design 3** typography scale
- **Touch-friendly** sizing for mobile devices

## 🔧 Configuration Files

- **`next.config.js`** - Next.js configuration with performance optimizations
- **`tailwind.config.js`** - Tailwind CSS with basketball theme
- **`tsconfig.json`** - TypeScript configuration
- **`postcss.config.js`** - PostCSS configuration

## 🚀 Basketball-Specific Features

### Real-time Game Management
- Live score updates via WebSocket
- Foul and timeout tracking
- Game status management (scheduled/live/completed)

### PDF Generation
- Game scoresheets
- Team rosters
- Tournament brackets
- League standings

### Payment Processing
- Player registration fees ($125)
- Team registration fees ($350)
- Tournament entry fees ($150)
- Referee fees ($75/game)

### Phoenix Climate Features
- Heat alert system (green/yellow/orange/red)
- Indoor venue preferences
- Game scheduling for hot weather

## 🔐 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NODE_ENV=development
PORT=4000
HEAT_ALERT_THRESHOLD=100
```

## 📱 Mobile Support

The application is designed mobile-first with:
- Touch targets minimum 48px
- Offline-first architecture
- Progressive Web App capabilities
- Responsive design for tablets and phones

## 🏀 Basketball Domain Features

- **Age divisions**: U8, U10, U12, U14, U16, U18
- **Game formats**: Quarters (youth) or halves (older)
- **Foul tracking**: Personal and team fouls with bonus situations
- **Tournament management**: Bracket generation and seeding
- **COPPA compliance**: Birth year only for privacy

## 🔄 Next Steps

1. Complete dependency installation
2. Set up Supabase database schema
3. Configure Stripe webhook endpoints
4. Create component library
5. Implement authentication flows
6. Build game management features
7. Add real-time WebSocket integration

## 📞 Support

For questions about this basketball league platform, please refer to the project documentation or contact the development team.