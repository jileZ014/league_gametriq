# Reports Module

The Reports Module provides comprehensive automated report generation and scheduling capabilities for the basketball league management platform. This system reduces manual work for league administrators by 80% through intelligent automation and customizable templates.

## Features

### Report Templates
- **System Templates**: Pre-built templates for common reporting needs
  - League Summary Report
  - Financial Summary Report
  - Game Results Report
  - Attendance Report
- **Custom Templates**: Organization-specific templates with full customization
- **Template Variables**: Dynamic configuration options for flexible reporting
- **Section-based Architecture**: Modular report sections (tables, charts, summaries)

### Scheduled Reports
- **Flexible Scheduling**: Daily, weekly, monthly, and custom cron-based schedules
- **Multi-recipient Delivery**: Email and in-app delivery to multiple recipients
- **Multiple Formats**: PDF, HTML, Excel, and CSV export options
- **Automatic Retry**: Built-in retry logic for failed report generation
- **Timezone Support**: Configurable timezone handling for global deployments

### Report Generation
- **Queue-based Processing**: Scalable background processing using Bull queues
- **Multiple Output Formats**: PDF (via Puppeteer), HTML, Excel, CSV
- **Chart Integration**: Automatic chart generation for visual data representation
- **Preview Mode**: Fast preview generation for template testing
- **Data Filtering**: Advanced filtering capabilities for targeted reporting

### Email Delivery
- **Template-based Emails**: Customizable email templates with Handlebars
- **Attachment Support**: Automatic report attachment with configurable options
- **Delivery Tracking**: Comprehensive delivery status tracking
- **Unsubscribe Management**: One-click unsubscribe with token-based authentication
- **Multi-provider Support**: Gmail, SendGrid, AWS SES compatibility

## Architecture

### Core Components

```
Reports Module
├── Entities
│   ├── ReportTemplate - Template definitions and configurations
│   ├── ScheduledReport - Scheduled report configurations
│   ├── ReportHistory - Generated report tracking and metadata
│   └── ReportSubscription - User subscription management
├── Services
│   ├── ReportsService - Main orchestration service
│   ├── ReportGeneratorService - Report generation logic
│   ├── ReportSchedulerService - Scheduling and cron management
│   ├── DataExtractionService - Data fetching and aggregation
│   ├── PdfGeneratorService - PDF generation using Puppeteer
│   ├── EmailDeliveryService - Email delivery and tracking
│   └── ReportTemplatesService - Template management
├── Templates
│   ├── BaseTemplate - Common styling and layout
│   ├── LeagueSummaryTemplate - League statistics and standings
│   ├── FinancialSummaryTemplate - Revenue and payment tracking
│   ├── GameResultsTemplate - Game results and statistics
│   └── AttendanceTemplate - Attendance tracking and analysis
├── Processors
│   └── ReportProcessor - Bull queue job processing
└── Controllers
    └── ReportsController - REST API endpoints
```

### Database Schema

The module uses 5 main database tables:

- `report_templates` - Template definitions with JSON configuration
- `scheduled_reports` - Scheduled report configurations and timing
- `report_history` - Generated report tracking and file storage
- `report_subscriptions` - User subscription preferences
- `report_queue` - Job queue management and status tracking

## API Endpoints

### Report Templates
- `GET /reports/templates` - List all templates
- `POST /reports/templates` - Create new template
- `GET /reports/templates/:id` - Get template details
- `PUT /reports/templates/:id` - Update template
- `DELETE /reports/templates/:id` - Delete template

### Scheduled Reports
- `GET /reports/scheduled` - List scheduled reports
- `POST /reports/scheduled` - Create scheduled report
- `GET /reports/scheduled/:id` - Get scheduled report details
- `PUT /reports/scheduled/:id` - Update scheduled report
- `DELETE /reports/scheduled/:id` - Delete scheduled report

### Report Generation
- `POST /reports/generate` - Generate ad-hoc report
- `POST /reports/preview` - Generate report preview
- `GET /reports/history` - Get generation history
- `GET /reports/history/:id/download` - Download generated report

### Subscriptions
- `POST /reports/scheduled/:id/subscribe` - Subscribe to report
- `POST /reports/unsubscribe/:token` - Unsubscribe via token
- `GET /reports/subscriptions` - Get user subscriptions

### Analytics
- `GET /reports/stats` - Get reporting statistics
- `GET /reports/upcoming` - Get upcoming scheduled reports

## Configuration

### Environment Variables

```bash
# Email Configuration
EMAIL_SERVICE=sendgrid|gmail|aws-ses
EMAIL_API_KEY=your_api_key
EMAIL_FROM=noreply@gametriq.com
EMAIL_FROM_NAME=Gametriq League Management

# Queue Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password

# File Storage
AWS_S3_BUCKET=gametriq-reports
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-west-2

# Application
APP_BASE_URL=https://app.gametriq.com
```

### Bull Queue Configuration

```typescript
BullModule.registerQueue({
  name: 'reports',
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})
```

## Usage Examples

### Creating a Custom Template

```typescript
const template = await reportsService.createTemplate('org-123', 'user-123', {
  name: 'Custom League Report',
  description: 'Custom report for league standings with photos',
  templateType: ReportTemplateType.LEAGUE_SUMMARY,
  sections: [
    {
      id: 'standings',
      type: 'table',
      title: 'League Standings',
      columns: ['rank', 'team', 'wins', 'losses', 'winPercentage'],
    },
    {
      id: 'photos',
      type: 'gallery',
      title: 'Team Photos',
      includeTeamLogos: true,
    },
  ],
  variables: {
    includePhotos: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Include team photos in the report',
    },
  },
});
```

### Scheduling a Weekly Report

```typescript
const scheduledReport = await reportsService.createScheduledReport('org-123', 'user-123', {
  templateId: 'template-123',
  name: 'Weekly League Summary',
  scheduleType: ReportScheduleType.WEEKLY,
  scheduleConfig: {
    dayOfWeek: 1, // Monday
    hour: 8,
    minute: 0,
  },
  recipients: [
    { type: 'email', value: 'admin@league.com', name: 'League Admin' },
    { type: 'role', value: 'COACH', name: 'All Coaches' },
  ],
  deliveryMethod: ReportDeliveryMethod.EMAIL,
  format: ReportFormat.PDF,
  includeCharts: true,
});
```

### Generating an Ad-hoc Report

```typescript
const report = await reportsService.generateReport('org-123', 'user-123', {
  templateId: 'template-123',
  name: 'March 2025 League Summary',
  format: ReportFormat.PDF,
  filters: {
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    status: 'active',
  },
  variables: {
    includePhotos: false,
    topPlayersCount: 15,
  },
  deliveryMethod: ReportDeliveryMethod.EMAIL,
  recipients: ['coach@team.com'],
});
```

## Performance Considerations

### Queue Management
- Reports are processed asynchronously to avoid blocking API requests
- Bull queues provide automatic retry with exponential backoff
- Job priorities ensure preview reports are processed faster
- Concurrent processing limits prevent resource exhaustion

### Caching Strategy
- Template configurations are cached for faster generation
- Generated reports are cached with configurable TTL
- Data extraction results are cached to reduce database load
- Chart images are cached to improve PDF generation speed

### Monitoring
- Queue metrics for job processing rates
- Email delivery success rates and bounce tracking
- Report generation performance metrics
- Error tracking and alerting for failed reports

## Testing

### Unit Tests
```bash
npm run test -- --testPathPattern=reports
```

### Integration Tests
```bash
npm run test:e2e -- --testNamePattern="Reports"
```

### Load Testing
The system is designed to handle:
- 50 concurrent report generations
- 1000+ scheduled reports per organization
- 10,000+ report deliveries per day
- Peak loads during tournament seasons

## Deployment Notes

### Required Dependencies
- Puppeteer for PDF generation (requires Chrome/Chromium)
- Redis for Bull queue backend
- SMTP server or email service provider
- S3-compatible storage for report files

### Docker Configuration
```dockerfile
# Install Chrome for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium-browser \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libnss3
```

### Production Checklist
- [ ] Configure email service provider
- [ ] Set up Redis cluster for high availability
- [ ] Configure S3 bucket with appropriate permissions
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy for templates
- [ ] Test email deliverability
- [ ] Validate PDF generation in production environment

## Roadmap

### Upcoming Features
- **Interactive Dashboards**: Real-time dashboard reports
- **Report Sharing**: Public URL generation for sharing reports
- **Advanced Charts**: Integration with Chart.js for complex visualizations
- **Mobile Optimization**: Mobile-friendly PDF layouts
- **Multi-language Support**: Internationalization for global leagues
- **API Webhooks**: Webhook notifications for report events
- **Bulk Operations**: Batch report generation and delivery

### Version History
- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added custom templates and variables
- **v1.2.0** - Enhanced email delivery and tracking
- **v1.3.0** - PDF optimization and chart improvements
- **v2.0.0** - Complete rewrite with TypeScript and NestJS