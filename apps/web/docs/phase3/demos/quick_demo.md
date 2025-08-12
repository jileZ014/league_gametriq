# GameTriq Platform - Quick Demo Guide

**Last Updated:** August 10, 2025  
**Demo Environment:** https://staging.gametriq.com  
**Duration:** 15-20 minutes  

## Overview

This guide provides a structured walkthrough of the GameTriq League Management Platform, highlighting the key features implemented in Sprint 5 including user registration, payment processing, and PWA capabilities.

## Demo Preparation

### Prerequisites
1. **Browser:** Chrome, Firefox, or Edge (latest versions)
2. **Network:** Stable internet connection
3. **Test Payment Card:** 4242 4242 4242 4242 (any future date, any CVC)

### Demo Accounts
```
Admin Account:
Email: admin@gametriq.com
Password: GameTriq2025Admin!

Coach Account:
Email: coach@demo.com
Password: GameTriq2025Coach!

Player Account:
Email: player@demo.com
Password: GameTriq2025Player!
```

## Demo Flow

### 1. Landing Page & PWA Installation (2 minutes)

**Navigate to:** https://staging.gametriq.com

**Key Points to Highlight:**
- Modern, responsive design
- League branding customization
- Performance (instant load times)
- PWA install prompt (desktop/mobile)

**Actions:**
1. Show responsive design by resizing browser
2. Click "Install App" button in header
3. Demonstrate installed PWA launching
4. Show offline capability by disconnecting network

**Talk Track:**
> "GameTriq is a Progressive Web App that provides native app-like experience. Users can install it on any device and access core features offline. Notice the fast load times - we achieve sub-100ms API response times."

### 2. User Registration Flow (5 minutes)

**Navigate to:** Sign Up page

**Demonstrate Three Registration Paths:**

#### A. Adult Registration (Coach)
1. Click "Register as Coach"
2. Fill form with test data:
   - Email: newcoach@test.com
   - Password: TestCoach2025!
   - DOB: 01/15/1985
3. Show password strength indicator
4. Complete profile information
5. Accept terms and submit

**Key Points:**
- Multi-step wizard with progress indicator
- Real-time validation
- Password strength requirements
- Mobile-optimized forms

#### B. Minor Registration (Player)
1. Click "Register as Player"
2. Enter age < 13 (e.g., DOB: 01/15/2013)
3. Show COPPA compliance notice
4. Demonstrate parental consent requirement
5. Fill parent/guardian information

**Key Points:**
- COPPA compliance for users under 13
- Parental consent workflow
- Age-appropriate data collection

#### C. Admin Registration
1. Show admin invite flow
2. Explain organization setup process

**Talk Track:**
> "Registration is role-based with appropriate validation. We ensure COPPA compliance for minors and implement strong password requirements. The multi-step process improves completion rates while collecting necessary information."

### 3. Payment Processing (5 minutes)

**Navigate to:** Registration payment or team registration

**Demonstrate Payment Flow:**

1. **Show Pricing Tiers:**
   - Individual Player: $75
   - Team Registration: $500
   - Early Bird Discount: 25% off

2. **Process Test Payment:**
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: 12/26
   CVC: 123
   ZIP: 12345
   ```

3. **Show Success Page:**
   - Payment confirmation
   - Receipt download (PDF)
   - Email confirmation

4. **Demonstrate Refund (Admin)**:
   - Login as admin
   - Navigate to Payments dashboard
   - Select recent payment
   - Process partial refund ($25)
   - Show updated payment status

**Key Points:**
- PCI-compliant Stripe integration
- Real-time payment processing
- Automated receipt generation
- Full audit trail
- Refund capabilities

**Talk Track:**
> "Payment processing is fully integrated with Stripe, ensuring PCI compliance. Administrators can process refunds directly from the dashboard. All transactions are logged with complete audit trails."

### 4. Dashboard Features (4 minutes)

#### Player Dashboard
**Login as:** player@demo.com

**Highlight:**
- Upcoming games schedule
- Team roster and contacts
- Personal statistics
- Document uploads
- Payment history

#### Coach Dashboard
**Login as:** coach@demo.com

**Highlight:**
- Team management
- Player roster with contact info
- Game scheduling
- Practice planning
- Communication tools
- Team statistics

#### Admin Dashboard
**Login as:** admin@gametriq.com

**Highlight:**
- League overview metrics
- Registration analytics
- Payment reports
- User management
- League settings
- Custom branding controls

**Actions:**
1. Navigate between dashboards
2. Show real-time data updates
3. Demonstrate responsive tables
4. Export data to CSV
5. Show print-friendly views

**Talk Track:**
> "Each role has a customized dashboard with relevant information. Data updates in real-time, and all views are mobile-optimized. Administrators have full visibility into league operations."

### 5. Mobile Experience & Accessibility (2 minutes)

**Demonstrate on Mobile (Chrome DevTools):**

1. **Toggle device viewport** to iPhone/Android
2. **Show touch-optimized interfaces**
3. **Demonstrate offline functionality**
4. **Show app shortcuts** from home screen

**Accessibility Features:**
1. **Use keyboard navigation** (Tab through forms)
2. **Show screen reader compatibility** (if available)
3. **Demonstrate high contrast mode**
4. **Show focus indicators**

**Key Points:**
- WCAG 2.1 AA compliant
- Keyboard navigable
- Screen reader optimized
- High contrast support
- Mobile-first design

**Talk Track:**
> "GameTriq is fully accessible and mobile-optimized. We meet WCAG 2.1 AA standards and support all assistive technologies. The interface adapts seamlessly across devices."

### 6. Security & Performance (2 minutes)

**Demonstrate Security Features:**

1. **Show HTTPS lock icon**
2. **Attempt SQL injection** in search (show it's blocked)
3. **Show rate limiting** (rapid form submissions)
4. **Display security headers** (Chrome DevTools)

**Performance Metrics:**
1. **Open Chrome DevTools > Lighthouse**
2. **Run performance audit**
3. **Show scores:**
   - Performance: 94/100
   - Accessibility: 96/100
   - Best Practices: 93/100
   - SEO: 98/100
   - PWA: 92/100

**Talk Track:**
> "Security is built-in with HTTPS enforcement, rate limiting, and input validation. Our Lighthouse scores demonstrate our commitment to performance and best practices."

## Common Questions & Answers

### Technical Questions

**Q: What technology stack is used?**
> A: Next.js 14 with TypeScript, PostgreSQL, Redis caching, and Stripe for payments. Deployed on AWS with auto-scaling.

**Q: How do you handle concurrent users?**
> A: Horizontal scaling with load balancing. Tested with 1000+ concurrent users maintaining <100ms response times.

**Q: Is the data encrypted?**
> A: Yes, data is encrypted in transit (TLS 1.2+) and sensitive data is encrypted at rest.

### Business Questions

**Q: Can leagues customize branding?**
> A: Yes, full white-label support with custom colors, logos, and domains.

**Q: What's the pricing model?**
> A: SaaS model with per-player fees or flat league rates. Volume discounts available.

**Q: Do you support multiple sports?**
> A: Currently optimized for basketball, with templates for other sports in development.

### Feature Questions

**Q: Can parents register multiple children?**
> A: Yes, family accounts support multiple player profiles with shared payment methods.

**Q: Do you support tournaments?**
> A: Tournament brackets and elimination rounds are planned for Sprint 6.

**Q: Is there a mobile app?**
> A: The PWA works on all devices. Native apps are in development for advanced features.

## Troubleshooting

### Common Demo Issues

1. **Payment Declined**
   - Ensure using test card: 4242 4242 4242 4242
   - Check expiry date is in future
   - Try different browser

2. **Can't Install PWA**
   - Not supported in Safari desktop
   - Ensure HTTPS connection
   - Clear browser cache

3. **Slow Performance**
   - Check network connection
   - Clear browser cache
   - Try incognito mode

4. **Login Issues**
   - Verify correct environment (staging)
   - Check password (case-sensitive)
   - Clear cookies

## Post-Demo Follow-up

### Provide These Resources:
1. **Demo Recording:** [link-to-recording]
2. **Technical Documentation:** https://docs.gametriq.com
3. **API Documentation:** https://api-docs.gametriq.com
4. **Security Whitepaper:** [link-to-security-doc]

### Next Steps:
1. Schedule technical deep-dive
2. Discuss customization requirements
3. Review pricing options
4. Plan pilot program

### Contact Information:
- **Sales:** sales@gametriq.com
- **Support:** support@gametriq.com
- **Technical:** tech@gametriq.com

---

**Demo Version:** 5.0  
**Platform Version:** 1.0.0  
**Last Updated:** August 10, 2025