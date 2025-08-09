from crewai import Task

class BasketballLeagueTasks:
    def market_research_task(self, agent):
        return Task(
            description="""Conduct comprehensive market research on basketball league management platforms:
            
            1. Identify and analyze 10-15 existing solutions including:
               - TeamSnap, SportsEngine, LeagueApps, GameChanger
               - Blue Sombrero, TeamSideline, Tourney Machine
               - Any Phoenix/Arizona specific solutions
            
            2. For each platform, analyze:
               - Core features and functionality
               - Pricing models and tiers
               - Target market (youth, adult, professional)
               - User reviews and pain points
               - Market share and adoption
            
            3. Identify market gaps and opportunities:
               - Underserved features
               - Common user complaints
               - Regional specific needs for Phoenix/Arizona
               - Integration opportunities
            
            Provide a detailed competitive analysis matrix and market opportunity report.""",
            agent=agent,
            expected_output="Comprehensive market analysis report with competitive matrix and opportunity identification"
        )
    
    def user_research_task(self, agent):
        return Task(
            description="""Define user personas and journey maps for basketball league management:
            
            1. Create detailed personas for:
               - League Administrators/Commissioners
               - Team Coaches (volunteer and professional)
               - Parents/Guardians
               - Players (different age groups: 6-8, 9-12, 13-15, 16-18)
               - Referees and Officials
               - Scorekeepers and Volunteers
               - Spectators/Fans
            
            2. For each persona, define:
               - Demographics and characteristics
               - Goals and motivations
               - Pain points and frustrations
               - Technology comfort level
               - Device preferences (mobile vs desktop)
               - Feature priorities
            
            3. Create user journey maps for key scenarios:
               - Season registration and team formation
               - Weekly game scheduling and updates
               - Game day operations
               - End of season tournaments
               - Communication flows
            
            Include accessibility considerations and multilingual needs.""",
            agent=agent,
            expected_output="Detailed user personas and journey maps with pain points and opportunities"
        )
    
    def technical_requirements_task(self, agent):
        return Task(
            description="""Design technical architecture for scalable basketball league platform:
            
            1. Platform Architecture:
               - Mobile app requirements (iOS/Android native vs React Native vs Flutter)
               - Web application architecture
               - API design (REST vs GraphQL)
               - Real-time features (live scoring, notifications)
            
            2. Core Technical Components:
               - User authentication and authorization
               - Database design for leagues, teams, players, games
               - Scheduling algorithm requirements
               - Payment processing integration
               - Communication systems (email, SMS, push notifications)
            
            3. Infrastructure Requirements:
               - Cloud platform recommendation (AWS, Google Cloud, Azure)
               - Scalability considerations (concurrent users, data storage)
               - Performance requirements (response times, offline capability)
               - Security and data privacy measures
            
            4. Integration Requirements:
               - Calendar sync (Google, Apple, Outlook)
               - Social media sharing
               - Video streaming/highlight integration
               - Statistics and analytics platforms
               - Payment gateways
            
            Provide technology stack recommendations with justifications.""",
            agent=agent,
            expected_output="Complete technical architecture document with technology recommendations"
        )
    
    def feature_prioritization_task(self, agent, context):
        return Task(
            description="""Create prioritized feature list based on research findings:
            
            1. Core MVP Features (Must Have):
               - Essential features for basic league operation
               - Minimum viable product definition
            
            2. Phase 2 Features (Should Have):
               - Enhanced user experience features
               - Competitive differentiation features
            
            3. Phase 3 Features (Nice to Have):
               - Advanced features for mature product
               - Innovation opportunities
            
            4. For each feature, provide:
               - User story format
               - Acceptance criteria
               - Effort estimation (T-shirt sizes: S, M, L, XL)
               - Value score (1-10)
               - Dependencies
            
            5. Create feature roadmap:
               - 3-month MVP timeline
               - 6-month enhanced version
               - 12-month full platform
            
            Consider Phoenix basketball league specific needs and requirements.""",
            agent=agent,
            expected_output="Prioritized feature list with roadmap and implementation timeline",
            context=context
        )
    
    def compliance_review_task(self, agent):
        return Task(
            description="""Analyze compliance and safety requirements for youth basketball leagues:
            
            1. Legal Requirements:
               - COPPA compliance for users under 13
               - Data privacy laws (CCPA, GDPR if applicable)
               - Terms of service and privacy policy requirements
               - Liability and waiver management
            
            2. Youth Sports Safety:
               - Background check integration for coaches/volunteers
               - SafeSport compliance
               - Medical information and emergency contact management
               - Concussion protocols and injury tracking
               - Insurance requirements
            
            3. League Governance:
               - Age verification systems
               - Roster eligibility rules
               - Playing time regulations
               - Code of conduct enforcement
            
            4. Platform Specific:
               - Photo/video sharing permissions
               - Communication boundaries (coach-player messaging)
               - Parent/guardian consent workflows
               - Data retention policies
            
            5. Arizona/Phoenix Specific:
               - State specific requirements
               - Local league regulations
               - Heat safety protocols
            
            Provide compliance checklist and implementation recommendations.""",
            agent=agent,
            expected_output="Comprehensive compliance requirements document with implementation guidelines"
        )
    
    def business_model_task(self, agent, context):
        return Task(
            description="""Develop comprehensive business model and monetization strategy:
            
            1. Revenue Models Analysis:
               - SaaS subscription tiers (league, team, individual)
               - Transaction fees (registration, payments)
               - Freemium vs paid features
               - Marketplace opportunities (equipment, photography)
               - Sponsorship and advertising options
            
            2. Pricing Strategy:
               - Competitive pricing analysis
               - Value-based pricing model
               - Pricing tiers and packages
               - Seasonal pricing considerations
               - Phoenix market pricing sensitivity
            
            3. Customer Acquisition:
               - Go-to-market strategy
               - Partnership opportunities (schools, rec centers)
               - Referral and viral growth features
               - Customer acquisition cost estimates
            
            4. Financial Projections:
               - Unit economics per league/team/player
               - Revenue projections (Year 1-3)
               - Cost structure analysis
               - Break-even analysis
               - Funding requirements
            
            5. Growth Strategy:
               - Geographic expansion plan
               - Sport expansion opportunities (beyond basketball)
               - Platform ecosystem development
               - Partnership and integration strategy
            
            Provide detailed business plan with financial model.""",
            agent=agent,
            expected_output="Complete business model with monetization strategy and financial projections",
            context=context
        )
    
    def ui_design_task(self, agent, context):
        return Task(
            description="""Create comprehensive UI design system and interface specifications:
            
            1. Visual Design System:
               - Color palette (primary, secondary, accent, semantic colors)
               - Typography scale (fonts, sizes, weights, line heights)
               - Spacing system (padding, margins, grid)
               - Border radius, shadows, and effects
               - Icon style and library recommendations
               - Motion and animation principles
            
            2. Component Library Specifications:
               - Buttons (primary, secondary, ghost, icon, floating action)
               - Form elements (inputs, selects, checkboxes, date pickers)
               - Cards (team cards, player cards, game cards, stat cards)
               - Navigation (top nav, bottom nav, drawer, breadcrumbs)
               - Tables and data displays (standings, schedules, rosters)
               - Modals, alerts, and notifications
               - Loading states and empty states
            
            3. Key Screen Layouts (Mobile-First):
               - Landing page/marketing site
               - Registration and onboarding flow
               - Dashboard layouts for each persona:
                 * Admin dashboard (league overview)
                 * Coach dashboard (team management)
                 * Parent portal (child's schedule/stats)
                 * Player profile (stats and achievements)
               - Game day screens:
                 * Live scoring interface
                 * Roster/lineup management
                 * Shot clock/game clock display
               - Schedule views (calendar, list, grid)
               - Communication interfaces (announcements, messaging)
               - Settings and profile screens
            
            4. Responsive Design Strategy:
               - Mobile breakpoints (320px, 375px, 414px)
               - Tablet breakpoints (768px, 1024px)
               - Desktop breakpoints (1280px, 1440px, 1920px)
               - Touch target sizes for mobile
               - Landscape vs portrait considerations
            
            5. Interaction Patterns:
               - Navigation patterns (tab bar vs hamburger)
               - Data input patterns (forms, quick actions)
               - Gesture controls (swipe, pull-to-refresh)
               - Feedback mechanisms (haptic, visual, audio)
               - Progressive disclosure strategies
            
            6. Accessibility and Inclusivity:
               - WCAG 2.1 AA compliance requirements
               - Color contrast ratios
               - Font size minimums
               - Touch target sizes
               - Screen reader considerations
               - Support for reduced motion
            
            7. Platform-Specific Considerations:
               - iOS vs Android design differences
               - Web vs native app adaptations
               - PWA capabilities and constraints
               - Offline mode UI patterns
            
            8. Brand and Personality:
               - Visual tone (professional vs playful balance)
               - Age-appropriate design for youth
               - Team customization options
               - White-label considerations
            
            9. Performance Guidelines:
               - Image optimization requirements
               - Animation performance budgets
               - Lazy loading strategies
               - Critical rendering path elements
            
            Provide detailed UI specifications document with visual examples and implementation guidelines.""",
            agent=agent,
            expected_output="Comprehensive UI design system documentation with component specifications and screen layouts",
            context=context
        )