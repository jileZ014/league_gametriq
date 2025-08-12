# Sprint 5: Public Launch Readiness (Phase 1)

## Sprint Overview
- **Sprint Goal**: Prepare platform for public launch with registration, live payments, branding, and PWA
- **Duration**: Standard 2-week sprint
- **Feature Flags**: registration_v1, payments_live_v1, branding_v1, pwa_v1

## Key Deliverables
1. **Registration & Checkout System**
   - Team/Player registration flow
   - Live Stripe payment processing
   - Waiver management
   - Discount codes

2. **Multi-tenant Branding**
   - Custom logos/colors per league
   - Themed public portal

3. **Progressive Web App**
   - Installable on mobile devices
   - Offline caching for schedules/teams

4. **Portal Enhancements**
   - Advanced filters/search
   - Deep linking support

5. **Operations Hardening**
   - Audit logging for payments/registration
   - Rate limiting
   - Live payment security

## Technical Requirements
- COPPA/SafeSport compliance
- America/Phoenix timezone
- p95 <100ms API performance
- WCAG 2.1 AA accessibility
- Strict tenant isolation

## Success Criteria
- End-to-end registration → payment → receipt flow
- PWA Lighthouse score ≥90
- No critical accessibility issues
- Security team sign-off for live payments
- All feature flags tested in staging