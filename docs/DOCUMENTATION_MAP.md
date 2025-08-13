# Documentation Map - Gametriq League App

## Project Structure Overview
This document provides a complete map of all documentation in the Gametriq League App project.

## Directory Structure

```
/docs/
├── phase3/                     # Phase 3 Sprint Documentation
│   ├── sprint1-6/              # Individual sprint folders
│   ├── demos/                  # Demo materials and instructions
│   └── *.md                    # Sprint planning and execution docs
├── technical/                  # Technical Architecture Documentation
│   ├── persistent-headless.md  # Testing infrastructure
│   ├── pwa-implementation.md   # PWA features and setup
│   └── theming-system.md       # Theming and branding architecture
├── adr/                        # Architecture Decision Records
├── api/                        # API Documentation
├── deployment/                 # Deployment Guides
├── release/                    # Release Notes
├── security/                   # Security Documentation
└── ui/                         # UI/UX Documentation
```

## Phase 3 Documentation

### Sprint Documentation Format
Each sprint follows this structure:
- `sprintX_kickoff.md` - Planning document with user stories
- `sprintX-execution.md` - Execution report with metrics
- `SPRINTX-COMPLETE.md` - Completion summary
- `sprintX/` - Folder with detailed sprint artifacts

### Completed Sprints

#### Sprint 1: Foundation & Setup
- **Location**: `/docs/phase3/SPRINT1-COMPLETE.md`
- **Focus**: Project setup, authentication, basic infrastructure

#### Sprint 2: Core Features
- **Location**: `/docs/phase3/SPRINT2-COMPLETE.md`
- **Focus**: Team management, game scheduling

#### Sprint 3: Basketball Domain
- **Location**: `/docs/phase3/SPRINT3-COMPLETE.md`
- **Focus**: Scoring system, statistics tracking

#### Sprint 4: MVP Access Pack
- **Location**: `/docs/phase3/SPRINT4-COMPLETE.md`
- **Focus**: MVP release preparation, Phoenix demo

#### Sprint 5: Modern UI & PWA
- **Location**: `/docs/phase3/sprint5/`
- **Focus**: Modern UI implementation, PWA features, payment integration

#### Sprint 6: Public Portal Modern Theme ✅
**Location**: `/docs/phase3/sprint6/`
**Files**:
- `sprint6_kickoff.md` - Sprint planning with 5 user stories (34 points)
- `sprint6-execution.md` - Detailed execution report
- `SPRINT6-COMPLETE.md` - Completion summary
- `sprint6/README.md` - Sprint 6 documentation index
- `sprint6/public-portal-modern-ui.md` - Technical implementation details
- `sprint6/accessibility-audit.md` - WCAG AA compliance report

**Key Deliverables**:
- PUBLIC_PORTAL_MODERN feature flag system
- Modern UI components (GameCard, StandingsTable, ScheduleView)
- Legacy Youth Sports white-label branding
- 95% test coverage with E2E tests
- WCAG AA accessibility compliance (95/100)

## Technical Documentation

### Core Systems
**Location**: `/docs/technical/`

#### Theming System
- **File**: `theming-system.md`
- **Content**: Multi-tenant theming, CSS variables, brand customization
- **Related**: Sprint 6 Modern UI implementation

#### PWA Implementation
- **File**: `pwa-implementation.md`
- **Content**: Service workers, offline support, install prompts
- **Related**: Sprint 5 PWA features

#### Persistent Headless Testing
- **File**: `persistent-headless.md`
- **Content**: Playwright configuration, browser context management
- **Related**: E2E testing infrastructure

## Application-Specific Documentation

### Web Application
**Location**: `/apps/web/docs/`
- Security audits and compliance
- QA test reports
- Phase-specific documentation

### API Documentation
**Location**: `/apps/api/docs/`
- Endpoint specifications
- Authentication flows
- Data models

### Mobile Application
**Location**: `/apps/mobile/docs/`
- React Native setup
- Offline capabilities
- Push notifications

## Quick Reference

### Sprint 6 Specific Paths
```
Planning:     /docs/phase3/sprint6_kickoff.md
Execution:    /docs/phase3/sprint6-execution.md
Completion:   /docs/phase3/SPRINT6-COMPLETE.md
Details:      /docs/phase3/sprint6/
  ├── README.md
  ├── public-portal-modern-ui.md
  └── accessibility-audit.md
```

### Test Commands (Sprint 6)
```bash
npm run test:public          # Public portal tests
npm run test:public:perf     # Performance tests
npm run test:public:a11y     # Accessibility tests
npm run test:public:headed   # With browser visible
```

### Launch Scripts
```bash
./launch-modern-portal.sh    # Launch with Modern UI
npm run dev                  # Start dev server
```

## Documentation Standards

### File Naming Convention
- Sprint docs: `sprintX-[type].md`
- Technical docs: `[system]-[topic].md`
- Architecture: `ADR-XXX-[title].md`

### Markdown Standards
- Use headers for sections (##, ###)
- Include code blocks with language tags
- Add tables for metrics and comparisons
- Use checkboxes for task lists
- Include links to related documents

### Required Sections
1. **Overview/Summary**
2. **Goals/Objectives**
3. **Implementation/Details**
4. **Metrics/Results**
5. **Next Steps/Actions**

## Maintenance

### Adding New Documentation
1. Place in appropriate directory
2. Follow naming conventions
3. Update this map
4. Link from related documents
5. Add to sprint documentation if applicable

### Archiving Old Documentation
1. Move to `/docs/archive/` with date
2. Update references
3. Maintain in read-only state

## Contact

### Documentation Owners
- **Phase 3 Sprints**: Product Team
- **Technical Docs**: Engineering Team
- **Security Docs**: Security Team
- **API Docs**: Backend Team
- **UI/UX Docs**: Design Team

---

*Last Updated: August 26, 2025*  
*Sprint 6 Documentation Complete*  
*Legacy Youth Sports - Phoenix Youth Basketball League*