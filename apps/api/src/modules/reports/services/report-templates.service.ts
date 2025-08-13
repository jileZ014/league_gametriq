import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReportTemplate, ReportTemplateType } from '../entities/report-template.entity';

@Injectable()
export class ReportTemplatesService {
  private readonly logger = new Logger(ReportTemplatesService.name);

  constructor(
    @InjectRepository(ReportTemplate)
    private readonly templatesRepository: Repository<ReportTemplate>,
  ) {}

  async createSystemTemplates(): Promise<void> {
    this.logger.log('Creating system report templates...');

    const systemTemplates = [
      {
        name: 'League Summary Report',
        description: 'Comprehensive overview of league standings, statistics, and recent activity',
        templateType: ReportTemplateType.LEAGUE_SUMMARY,
        templateContent: {
          includeLogo: true,
          showTimestamp: true,
          pageBreaks: true,
        },
        sections: [
          {
            id: 'standings',
            type: 'table',
            title: 'Current Standings',
            columns: ['rank', 'team', 'wins', 'losses', 'winPercentage'],
          },
          {
            id: 'topScorers',
            type: 'table',
            title: 'Top Scorers',
            columns: ['player', 'team', 'points', 'games'],
            limit: 10,
          },
          {
            id: 'recentGames',
            type: 'table',
            title: 'Recent Games',
            columns: ['date', 'homeTeam', 'awayTeam', 'score'],
          },
          {
            id: 'upcomingGames',
            type: 'table',
            title: 'Upcoming Games',
            columns: ['date', 'time', 'homeTeam', 'awayTeam', 'venue'],
          },
        ],
        variables: {
          includeCharts: {
            type: 'boolean',
            required: false,
            default: true,
            description: 'Include performance charts',
          },
          daysBack: {
            type: 'number',
            required: false,
            default: 7,
            description: 'Number of days to look back for recent games',
          },
        },
        isSystem: true,
      },
      {
        name: 'Financial Summary Report',
        description: 'Financial overview including revenue, outstanding payments, and collection rates',
        templateType: ReportTemplateType.FINANCIAL,
        templateContent: {
          includeLogo: true,
          showTimestamp: true,
          confidential: true,
        },
        sections: [
          {
            id: 'overview',
            type: 'summary',
            title: 'Financial Overview',
          },
          {
            id: 'revenue',
            type: 'chart',
            title: 'Revenue Breakdown',
            chartType: 'pie',
          },
          {
            id: 'outstanding',
            type: 'table',
            title: 'Outstanding Payments',
            columns: ['player', 'amount', 'dueDate', 'daysOverdue'],
          },
          {
            id: 'refunds',
            type: 'table',
            title: 'Recent Refunds',
            columns: ['player', 'amount', 'date', 'reason'],
          },
        ],
        variables: {
          period: {
            type: 'string',
            required: false,
            default: 'current_month',
            description: 'Reporting period (current_month, last_month, quarter)',
          },
          includeProjections: {
            type: 'boolean',
            required: false,
            default: false,
            description: 'Include revenue projections',
          },
        },
        isSystem: true,
      },
      {
        name: 'Game Results Report',
        description: 'Detailed game results and statistics for a specified time period',
        templateType: ReportTemplateType.GAME_RESULTS,
        templateContent: {
          includeLogo: true,
          showTimestamp: true,
        },
        sections: [
          {
            id: 'summary',
            type: 'summary',
            title: 'Games Summary',
          },
          {
            id: 'results',
            type: 'table',
            title: 'Game Results',
            columns: ['date', 'teams', 'score', 'venue', 'status'],
          },
          {
            id: 'statistics',
            type: 'table',
            title: 'Game Statistics',
            columns: ['game', 'totalPoints', 'leadChanges', 'biggestLead'],
          },
        ],
        variables: {
          includeBoxScores: {
            type: 'boolean',
            required: false,
            default: true,
            description: 'Include detailed box scores',
          },
          dateRange: {
            type: 'number',
            required: false,
            default: 30,
            description: 'Number of days to include',
          },
        },
        isSystem: true,
      },
      {
        name: 'Attendance Report',
        description: 'Player and team attendance tracking and analysis',
        templateType: ReportTemplateType.ATTENDANCE,
        templateContent: {
          includeLogo: true,
          showTimestamp: true,
        },
        sections: [
          {
            id: 'overview',
            type: 'summary',
            title: 'Attendance Overview',
          },
          {
            id: 'teamAttendance',
            type: 'table',
            title: 'Team Attendance Rates',
            columns: ['team', 'attendanceRate', 'gamesPlayed'],
          },
          {
            id: 'playerAttendance',
            type: 'table',
            title: 'Player Attendance',
            columns: ['player', 'attendanceRate', 'gamesAttended', 'totalGames'],
            limit: 20,
          },
        ],
        variables: {
          includePlayerStats: {
            type: 'boolean',
            required: false,
            default: true,
            description: 'Include individual player statistics',
          },
          minAttendanceRate: {
            type: 'number',
            required: false,
            default: 0,
            description: 'Minimum attendance rate to include (0-1)',
          },
        },
        isSystem: true,
      },
    ];

    for (const templateData of systemTemplates) {
      const existingTemplate = await this.templatesRepository.findOne({
        where: {
          name: templateData.name,
          isSystem: true,
        },
      });

      if (!existingTemplate) {
        const template = this.templatesRepository.create({
          ...templateData,
          organizationId: '00000000-0000-0000-0000-000000000000', // System organization ID
          createdById: '00000000-0000-0000-0000-000000000000', // System user ID
        });

        await this.templatesRepository.save(template);
        this.logger.log(`Created system template: ${templateData.name}`);
      }
    }

    this.logger.log('System templates initialization completed');
  }

  async getSystemTemplates(): Promise<ReportTemplate[]> {
    return await this.templatesRepository.find({
      where: { isSystem: true },
      order: { templateType: 'ASC', name: 'ASC' },
    });
  }

  async cloneSystemTemplate(
    systemTemplateId: string,
    organizationId: string,
    userId: string,
    customizations?: Partial<ReportTemplate>
  ): Promise<ReportTemplate> {
    const systemTemplate = await this.templatesRepository.findOne({
      where: { id: systemTemplateId, isSystem: true },
    });

    if (!systemTemplate) {
      throw new Error('System template not found');
    }

    const clonedTemplate = this.templatesRepository.create({
      ...systemTemplate,
      id: undefined, // Let the database generate a new ID
      organizationId,
      createdById: userId,
      isSystem: false,
      name: `${systemTemplate.name} (Custom)`,
      createdAt: undefined,
      updatedAt: undefined,
      ...customizations,
    });

    return await this.templatesRepository.save(clonedTemplate);
  }

  async validateTemplate(template: ReportTemplate): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.templateType) {
      errors.push('Template type is required');
    }

    if (!template.sections || template.sections.length === 0) {
      warnings.push('Template has no sections defined');
    }

    // Validate sections
    if (template.sections) {
      template.sections.forEach((section, index) => {
        if (!section.id) {
          errors.push(`Section ${index + 1} is missing an ID`);
        }

        if (!section.title) {
          warnings.push(`Section ${index + 1} (${section.id}) has no title`);
        }

        if (!section.type) {
          errors.push(`Section ${index + 1} (${section.id}) is missing a type`);
        }

        // Validate table sections
        if (section.type === 'table' && (!section.columns || section.columns.length === 0)) {
          errors.push(`Table section ${section.id} has no columns defined`);
        }

        // Validate chart sections
        if (section.type === 'chart' && !section.chartType) {
          warnings.push(`Chart section ${section.id} has no chart type specified`);
        }
      });
    }

    // Validate variables
    if (template.variables) {
      Object.entries(template.variables).forEach(([key, variable]) => {
        if (!variable.type) {
          errors.push(`Variable ${key} is missing a type`);
        }

        if (variable.required && variable.default === undefined) {
          warnings.push(`Required variable ${key} has no default value`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getTemplateUsageStats(templateId: string): Promise<{
    totalUsage: number;
    scheduledReports: number;
    lastUsed?: Date;
    avgGenerationTime?: number;
  }> {
    // This would query the report history and scheduled reports tables
    // For now, return mock data
    return {
      totalUsage: 0,
      scheduledReports: 0,
      lastUsed: undefined,
      avgGenerationTime: undefined,
    };
  }
}