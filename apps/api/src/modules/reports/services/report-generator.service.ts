import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Handlebars from 'handlebars';

// Entities
import { ReportTemplate, ReportTemplateType } from '../entities/report-template.entity';
import { ReportHistory, ReportStatus } from '../entities/report-history.entity';

// Services
import { DataExtractionService } from './data-extraction.service';
import { PdfGeneratorService } from './pdf-generator.service';

// Templates
import { BaseTemplate } from '../templates/base.template';
import { LeagueSummaryTemplate } from '../templates/league-summary.template';
import { FinancialSummaryTemplate } from '../templates/financial-summary.template';
import { GameResultsTemplate } from '../templates/game-results.template';
import { AttendanceTemplate } from '../templates/attendance.template';

export interface ReportGenerationOptions {
  templateId: string;
  organizationId: string;
  name: string;
  format?: 'pdf' | 'html' | 'excel' | 'csv';
  filters?: Record<string, any>;
  variables?: Record<string, any>;
  includeCharts?: boolean;
  isPreview?: boolean;
  leagueId?: string;
  seasonId?: string;
  divisionId?: string;
}

export interface GeneratedReport {
  content: Buffer | string;
  contentType: string;
  filename: string;
  metadata: {
    rowCount?: number;
    pageCount?: number;
    generationTimeMs: number;
    dataPoints?: Record<string, number>;
  };
}

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);
  private readonly templateEngines = new Map();

  constructor(
    @InjectRepository(ReportTemplate)
    private readonly templatesRepository: Repository<ReportTemplate>,
    @InjectRepository(ReportHistory)
    private readonly historyRepository: Repository<ReportHistory>,
    private readonly dataExtractionService: DataExtractionService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly baseTemplate: BaseTemplate,
    private readonly leagueSummaryTemplate: LeagueSummaryTemplate,
    private readonly financialSummaryTemplate: FinancialSummaryTemplate,
    private readonly gameResultsTemplate: GameResultsTemplate,
    private readonly attendanceTemplate: AttendanceTemplate,
  ) {
    this.initializeTemplateEngines();
    this.registerHandlebarsHelpers();
  }

  private initializeTemplateEngines(): void {
    this.templateEngines.set(ReportTemplateType.LEAGUE_SUMMARY, this.leagueSummaryTemplate);
    this.templateEngines.set(ReportTemplateType.FINANCIAL, this.financialSummaryTemplate);
    this.templateEngines.set(ReportTemplateType.GAME_RESULTS, this.gameResultsTemplate);
    this.templateEngines.set(ReportTemplateType.ATTENDANCE, this.attendanceTemplate);
  }

  private registerHandlebarsHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format = 'MM/DD/YYYY') => {
      if (!date) return '';
      
      const options: Intl.DateTimeFormatOptions = {};
      switch (format) {
        case 'MM/DD/YYYY':
          options.month = '2-digit';
          options.day = '2-digit';
          options.year = 'numeric';
          break;
        case 'MMM DD, YYYY':
          options.month = 'short';
          options.day = 'numeric';
          options.year = 'numeric';
          break;
        case 'time':
          options.hour = 'numeric';
          options.minute = '2-digit';
          options.hour12 = true;
          break;
      }
      
      return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
    });

    // Number formatting helper
    Handlebars.registerHelper('formatNumber', (value: number, decimals = 0) => {
      if (typeof value !== 'number') return value;
      return value.toFixed(decimals);
    });

    // Percentage helper
    Handlebars.registerHelper('percentage', (value: number, total: number, decimals = 1) => {
      if (!total || total === 0) return '0.0%';
      const percentage = (value / total) * 100;
      return `${percentage.toFixed(decimals)}%`;
    });

    // Ordinal helper (1st, 2nd, 3rd, etc.)
    Handlebars.registerHelper('ordinal', (value: number) => {
      const suffixes = ['th', 'st', 'nd', 'rd'];
      const v = value % 100;
      return value + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    });

    // Conditional helpers
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('gt', (a, b) => a > b);
    Handlebars.registerHelper('lt', (a, b) => a < b);
    Handlebars.registerHelper('gte', (a, b) => a >= b);
    Handlebars.registerHelper('lte', (a, b) => a <= b);

    // Array helpers
    Handlebars.registerHelper('length', (array: any[]) => array?.length || 0);
    Handlebars.registerHelper('slice', (array: any[], start: number, end?: number) => {
      if (!Array.isArray(array)) return [];
      return end ? array.slice(start, end) : array.slice(start);
    });
  }

  async generateReport(options: ReportGenerationOptions): Promise<GeneratedReport> {
    const startTime = Date.now();
    this.logger.log(`Starting report generation: ${options.name}`);

    try {
      // 1. Load template
      const template = await this.loadTemplate(options.templateId, options.organizationId);
      
      // 2. Validate and merge variables
      const variables = this.validateAndMergeVariables(template, options.variables);
      
      // 3. Extract data
      const data = await this.extractReportData(template, options, variables);
      
      // 4. Generate report content
      const reportContent = await this.generateReportContent(template, data, options);
      
      // 5. Convert to requested format
      const result = await this.convertToFormat(reportContent, options);
      
      const generationTimeMs = Date.now() - startTime;
      this.logger.log(`Report generation completed in ${generationTimeMs}ms`);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          generationTimeMs,
          dataPoints: this.extractDataPoints(data),
        },
      };

    } catch (error) {
      this.logger.error(`Report generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async loadTemplate(templateId: string, organizationId: string): Promise<ReportTemplate> {
    const template = await this.templatesRepository.findOne({
      where: [
        { id: templateId, organizationId },
        { id: templateId, isSystem: true },
      ],
    });

    if (!template) {
      throw new BadRequestException(`Template ${templateId} not found`);
    }

    if (!template.isActive) {
      throw new BadRequestException(`Template ${templateId} is inactive`);
    }

    return template;
  }

  private validateAndMergeVariables(
    template: ReportTemplate,
    providedVariables?: Record<string, any>
  ): Record<string, any> {
    const variables = providedVariables || {};
    
    // Validate required variables
    const errors = template.validateVariables(variables);
    if (errors.length > 0) {
      throw new BadRequestException(`Variable validation failed: ${errors.join(', ')}`);
    }

    // Apply defaults
    return template.applyDefaults(variables);
  }

  private async extractReportData(
    template: ReportTemplate,
    options: ReportGenerationOptions,
    variables: Record<string, any>
  ): Promise<Record<string, any>> {
    const filters = {
      ...template.defaultFilters,
      ...options.filters,
      organizationId: options.organizationId,
      leagueId: options.leagueId,
      seasonId: options.seasonId,
      divisionId: options.divisionId,
    };

    return await this.dataExtractionService.extractData(
      template.templateType,
      filters,
      variables
    );
  }

  private async generateReportContent(
    template: ReportTemplate,
    data: Record<string, any>,
    options: ReportGenerationOptions
  ): Promise<string> {
    const templateEngine = this.templateEngines.get(template.templateType);
    
    if (!templateEngine) {
      throw new BadRequestException(`No template engine found for type: ${template.templateType}`);
    }

    // Build template context
    const context = {
      ...data,
      template,
      options: {
        includeCharts: options.includeCharts ?? true,
        isPreview: options.isPreview ?? false,
      },
      generated: {
        at: new Date(),
        by: 'Gametriq Reports System',
        name: options.name,
      },
    };

    return await templateEngine.render(template, context);
  }

  private async convertToFormat(
    htmlContent: string,
    options: ReportGenerationOptions
  ): Promise<Omit<GeneratedReport, 'metadata'>> {
    const format = options.format || 'pdf';
    const safeFilename = this.sanitizeFilename(options.name);

    switch (format) {
      case 'html':
        return {
          content: htmlContent,
          contentType: 'text/html',
          filename: `${safeFilename}.html`,
          metadata: {
            pageCount: 1,
          },
        };

      case 'pdf':
        const pdfResult = await this.pdfGeneratorService.generatePdf(htmlContent, {
          format: 'A4',
          margin: { top: '1in', right: '0.5in', bottom: '1in', left: '0.5in' },
          displayHeaderFooter: true,
          headerTemplate: this.getPdfHeader(options.name),
          footerTemplate: this.getPdfFooter(),
          printBackground: true,
        });

        return {
          content: pdfResult.buffer,
          contentType: 'application/pdf',
          filename: `${safeFilename}.pdf`,
          metadata: {
            pageCount: pdfResult.pageCount,
          },
        };

      case 'excel':
        // For now, convert HTML table to CSV-like format
        // In a full implementation, you'd use a library like ExcelJS
        const csvContent = this.htmlToCSV(htmlContent);
        return {
          content: csvContent,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${safeFilename}.xlsx`,
          metadata: {},
        };

      case 'csv':
        const csvData = this.htmlToCSV(htmlContent);
        return {
          content: csvData,
          contentType: 'text/csv',
          filename: `${safeFilename}.csv`,
          metadata: {},
        };

      default:
        throw new BadRequestException(`Unsupported format: ${format}`);
    }
  }

  private getPdfHeader(reportName: string): string {
    return `
      <div style="font-size: 10px; margin: 0 20px; width: 100%; display: flex; justify-content: space-between;">
        <span>${reportName}</span>
        <span>Gametriq League Management</span>
      </div>
    `;
  }

  private getPdfFooter(): string {
    return `
      <div style="font-size: 8px; margin: 0 20px; width: 100%; text-align: center;">
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span style="float: right;">Generated on <span class="date"></span></span>
      </div>
    `;
  }

  private htmlToCSV(html: string): string {
    // Simplified HTML to CSV conversion
    // In a production system, you'd use a proper HTML parser
    const rows: string[] = [];
    
    // Extract table rows (very basic implementation)
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gis;

    const tableMatches = html.match(tableRegex);
    if (tableMatches) {
      tableMatches.forEach(table => {
        const rowMatches = table.match(rowRegex);
        if (rowMatches) {
          rowMatches.forEach(row => {
            const cells: string[] = [];
            const cellMatches = row.match(cellRegex);
            if (cellMatches) {
              cellMatches.forEach(cell => {
                const cleanCell = cell.replace(/<[^>]*>/g, '').trim();
                cells.push(`"${cleanCell.replace(/"/g, '""')}"`);
              });
            }
            if (cells.length > 0) {
              rows.push(cells.join(','));
            }
          });
        }
      });
    }

    return rows.join('\n');
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 100);
  }

  private extractDataPoints(data: Record<string, any>): Record<string, number> {
    const dataPoints: Record<string, number> = {};

    // Extract common data points for metadata
    if (data.leagues) dataPoints.leagues = Array.isArray(data.leagues) ? data.leagues.length : 0;
    if (data.teams) dataPoints.teams = Array.isArray(data.teams) ? data.teams.length : 0;
    if (data.games) dataPoints.games = Array.isArray(data.games) ? data.games.length : 0;
    if (data.players) dataPoints.players = Array.isArray(data.players) ? data.players.length : 0;
    if (data.standings) dataPoints.standings = Array.isArray(data.standings) ? data.standings.length : 0;

    return dataPoints;
  }

  async updateReportStatus(
    historyId: string,
    status: ReportStatus,
    updates?: Partial<ReportHistory>
  ): Promise<void> {
    await this.historyRepository.update(historyId, {
      status,
      ...updates,
    });
  }
}