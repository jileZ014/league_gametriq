import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import archiver from 'archiver';
import AWS from 'aws-sdk';
import csvWriter from 'csv-writer';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';

import { logger, getDatabaseConnection } from '../config/database';

export interface ReportParameters {
  startDate?: string;
  endDate?: string;
  seasonId?: string;
  leagueId?: string;
  divisionId?: string;
  teamIds?: string[];
  venueIds?: string[];
  format: 'CSV' | 'JSON' | 'PDF' | 'XLSX';
  filters?: Record<string, any>;
  groupBy?: string[];
  includeArchived?: boolean;
  timezone?: string;
  maxRows?: number;
}

export interface ReportResult {
  id: string;
  type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  filePath?: string;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
  generatedAt?: Date;
  expiresAt: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ExportData {
  headers: string[];
  rows: any[][];
  metadata: {
    totalRecords: number;
    filteredRecords: number;
    generatedAt: Date;
    parameters: ReportParameters;
    organizationId: string;
    reportType: string;
  };
}

export class ReportService {
  private static instance: ReportService;
  private s3Client?: AWS.S3;
  private reportsDirectory: string;
  private templatesDirectory: string;
  private browser?: puppeteer.Browser;

  private constructor() {
    this.reportsDirectory = process.env.REPORTS_DIR || '/tmp/reports';
    this.templatesDirectory = path.join(__dirname, '../templates');
  }

  public static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = ReportService.getInstance();
    await instance.init();
  }

  public static async shutdown(): Promise<void> {
    const instance = ReportService.getInstance();
    await instance.cleanup();
  }

  private async init(): Promise<void> {
    // Ensure reports directory exists
    await fs.mkdir(this.reportsDirectory, { recursive: true });
    await fs.mkdir(this.templatesDirectory, { recursive: true });

    // Initialize S3 client if configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      });
      logger.info('AWS S3 client initialized');
    }

    // Initialize Puppeteer browser for PDF generation
    if (process.env.FEATURE_PDF_EXPORT === 'true') {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      logger.info('Puppeteer browser initialized');
    }

    // Create default templates if they don't exist
    await this.createDefaultTemplates();

    logger.info('Report service initialized');
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      logger.info('Puppeteer browser closed');
    }
  }

  /**
   * Generates a report asynchronously
   */
  async generateReport(
    reportType: string,
    parameters: ReportParameters,
    organizationId: string,
    requestedBy: string
  ): Promise<ReportResult> {
    const reportId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info('Starting report generation', {
        reportId,
        reportType,
        organizationId,
        requestedBy,
        parameters,
      });

      // Validate parameters
      this.validateParameters(parameters);

      // Get data based on report type
      const data = await this.fetchReportData(reportType, parameters, organizationId);

      // Generate the file in the requested format
      const filePath = await this.generateFile(reportId, reportType, data, parameters);

      // Get file size
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Upload to S3 if configured
      let downloadUrl: string | undefined;
      if (this.s3Client && process.env.S3_BUCKET_NAME) {
        downloadUrl = await this.uploadToS3(filePath, reportId, parameters.format);
      } else {
        downloadUrl = this.generateSignedUrl(reportId, parameters.format);
      }

      const result: ReportResult = {
        id: reportId,
        type: reportType,
        status: 'COMPLETED',
        filePath,
        downloadUrl,
        fileSize,
        recordCount: data.metadata.filteredRecords,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)), // 24 hours
        metadata: {
          generationTime: Date.now() - startTime,
          parameters,
          organizationId,
          requestedBy,
        },
      };

      logger.info('Report generation completed', {
        reportId,
        reportType,
        fileSize,
        recordCount: data.metadata.filteredRecords,
        generationTime: result.metadata!.generationTime,
      });

      return result;
    } catch (error) {
      logger.error('Report generation failed', {
        reportId,
        reportType,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        id: reportId,
        type: reportType,
        status: 'FAILED',
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetches data for a specific report type
   */
  private async fetchReportData(
    reportType: string,
    parameters: ReportParameters,
    organizationId: string
  ): Promise<ExportData> {
    const db = getDatabaseConnection();
    const timezone = parameters.timezone || 'America/Phoenix';

    switch (reportType) {
      case 'games':
        return this.fetchGamesData(db, parameters, organizationId);
      
      case 'teams':
        return this.fetchTeamsData(db, parameters, organizationId);
      
      case 'players':
        return this.fetchPlayersData(db, parameters, organizationId);
      
      case 'standings':
        return this.fetchStandingsData(db, parameters, organizationId);
      
      case 'officials':
        return this.fetchOfficialsData(db, parameters, organizationId);
      
      case 'financial':
        return this.fetchFinancialData(db, parameters, organizationId);
      
      case 'venues':
        return this.fetchVenuesData(db, parameters, organizationId);
      
      case 'attendance':
        return this.fetchAttendanceData(db, parameters, organizationId);
      
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  private async fetchGamesData(db: any, parameters: ReportParameters, organizationId: string): Promise<ExportData> {
    let query = db('games as g')
      .leftJoin('seasons as s', 'g.season_id', 's.id')
      .leftJoin('venues as v', 'g.venue_id', 'v.id')
      .where('g.organization_id', organizationId)
      .select([
        'g.id',
        'g.game_number',
        'g.game_type',
        'g.scheduled_time',
        'g.status',
        'g.home_team_id',
        'g.away_team_id',
        'g.home_score',
        'g.away_score',
        'v.name as venue_name',
        'v.address as venue_address',
        's.name as season_name',
        'g.notes',
        'g.created_at',
      ]);

    // Apply date filters
    if (parameters.startDate) {
      query = query.where('g.scheduled_time', '>=', parameters.startDate);
    }
    if (parameters.endDate) {
      query = query.where('g.scheduled_time', '<=', parameters.endDate);
    }

    // Apply other filters
    if (parameters.seasonId) {
      query = query.where('g.season_id', parameters.seasonId);
    }
    if (parameters.venueIds && parameters.venueIds.length > 0) {
      query = query.whereIn('g.venue_id', parameters.venueIds);
    }

    // Apply limit
    if (parameters.maxRows) {
      query = query.limit(parameters.maxRows);
    }

    const games = await query;

    const headers = [
      'Game ID',
      'Game Number',
      'Game Type',
      'Scheduled Time',
      'Status',
      'Home Team',
      'Away Team',
      'Home Score',
      'Away Score',
      'Venue',
      'Venue Address',
      'Season',
      'Notes',
      'Created At',
    ];

    const rows = games.map((game: any) => [
      game.id,
      game.game_number,
      game.game_type,
      moment(game.scheduled_time).tz(parameters.timezone || 'America/Phoenix').format(),
      game.status,
      game.home_team_id, // TODO: Get team names
      game.away_team_id, // TODO: Get team names
      game.home_score || 0,
      game.away_score || 0,
      game.venue_name,
      game.venue_address,
      game.season_name,
      game.notes || '',
      moment(game.created_at).tz(parameters.timezone || 'America/Phoenix').format(),
    ]);

    return {
      headers,
      rows,
      metadata: {
        totalRecords: games.length,
        filteredRecords: games.length,
        generatedAt: new Date(),
        parameters,
        organizationId,
        reportType: 'games',
      },
    };
  }

  private async fetchTeamsData(db: any, parameters: ReportParameters, organizationId: string): Promise<ExportData> {
    // Mock implementation - replace with actual database queries
    const headers = ['Team ID', 'Team Name', 'Division', 'Coach', 'Players Count', 'Created At'];
    const rows = [
      ['team-1', 'Eagles', 'U12 Boys', 'John Smith', '12', new Date().toISOString()],
      ['team-2', 'Hawks', 'U12 Boys', 'Jane Doe', '11', new Date().toISOString()],
    ];

    return {
      headers,
      rows,
      metadata: {
        totalRecords: rows.length,
        filteredRecords: rows.length,
        generatedAt: new Date(),
        parameters,
        organizationId,
        reportType: 'teams',
      },
    };
  }

  private async fetchPlayersData(db: any, parameters: ReportParameters, organizationId: string): Promise<ExportData> {
    // Mock implementation
    const headers = ['Player ID', 'First Name', 'Last Name', 'Team', 'Position', 'Jersey Number', 'Age'];
    const rows = [
      ['player-1', 'Michael', 'Johnson', 'Eagles', 'Guard', '23', '12'],
      ['player-2', 'Sarah', 'Williams', 'Hawks', 'Forward', '15', '11'],
    ];

    return {
      headers,
      rows,
      metadata: {
        totalRecords: rows.length,
        filteredRecords: rows.length,
        generatedAt: new Date(),
        parameters,
        organizationId,
        reportType: 'players',
      },
    };
  }

  private async fetchStandingsData(db: any, parameters: ReportParameters, organizationId: string): Promise<ExportData> {
    // Mock implementation
    const headers = ['Team', 'Wins', 'Losses', 'Win %', 'Points For', 'Points Against', 'Point Diff'];
    const rows = [
      ['Eagles', '8', '2', '0.800', '850', '720', '+130'],
      ['Hawks', '6', '4', '0.600', '780', '750', '+30'],
    ];

    return {
      headers,
      rows,
      metadata: {
        totalRecords: rows.length,
        filteredRecords: rows.length,
        generatedAt: new Date(),
        parameters,
        organizationId,
        reportType: 'standings',
      },
    };
  }

  private async fetchOfficialsData(db: any, parameters: ReportParameters, organizationId: string): Promise<ExportData> {
    // Mock implementation
    const headers = ['Official ID', 'Name', 'Certification', 'Games Worked', 'Total Pay', 'Rating'];
    const rows = [
      ['official-1', 'John Smith', 'Advanced', '15', '$675.00', '4.8'],
      ['official-2', 'Jane Doe', 'Expert', '20', '$1,000.00', '4.9'],
    ];

    return {
      headers,
      rows,
      metadata: {
        totalRecords: rows.length,
        filteredRecords: rows.length,
        generatedAt: new Date(),
        parameters,
        organizationId,
        reportType: 'officials',
      },
    };
  }

  private async fetchFinancialData(db: any, parameters: ReportParameters, organizationId: string): Promise<ExportData> {
    // Mock implementation
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Category', 'Status'];
    const rows = [
      [new Date().toISOString(), 'Revenue', 'Registration Fees', '$2,500.00', 'Registration', 'Completed'],
      [new Date().toISOString(), 'Expense', 'Official Payments', '$675.00', 'Officials', 'Completed'],
    ];

    return {
      headers,
      rows,
      metadata: {
        totalRecords: rows.length,
        filteredRecords: rows.length,
        generatedAt: new Date(),
        parameters,
        organizationId,
        reportType: 'financial',
      },
    };
  }

  private async fetchVenuesData(db: any, parameters: ReportParameters, organizationId: string): Promise<ExportData> {
    let query = db('venues')
      .where('organization_id', organizationId)
      .select([
        'id',
        'name',
        'venue_code',
        'type',
        'address',
        'city',
        'state',
        'zip_code',
        'capacity',
        'rental_cost_per_hour',
        'active',
        'created_at',
      ]);

    if (!parameters.includeArchived) {
      query = query.where('active', true);
    }

    const venues = await query;

    const headers = [
      'Venue ID',
      'Name',
      'Code',
      'Type',
      'Address',
      'City',
      'State',
      'Zip Code',
      'Capacity',
      'Rental Cost/Hour',
      'Active',
      'Created At',
    ];

    const rows = venues.map((venue: any) => [
      venue.id,
      venue.name,
      venue.venue_code,
      venue.type,
      venue.address,
      venue.city,
      venue.state,
      venue.zip_code,
      venue.capacity,
      venue.rental_cost_per_hour,
      venue.active ? 'Yes' : 'No',
      moment(venue.created_at).tz(parameters.timezone || 'America/Phoenix').format(),
    ]);

    return {
      headers,
      rows,
      metadata: {
        totalRecords: venues.length,
        filteredRecords: venues.length,
        generatedAt: new Date(),
        parameters,
        organizationId,
        reportType: 'venues',
      },
    };
  }

  private async fetchAttendanceData(db: any, parameters: ReportParameters, organizationId: string): Promise<ExportData> {
    // Mock implementation
    const headers = ['Game', 'Date', 'Teams', 'Venue', 'Attendance', 'Revenue'];
    const rows = [
      ['Game 1', new Date().toISOString(), 'Eagles vs Hawks', 'Main Gym', '150', '$450.00'],
      ['Game 2', new Date().toISOString(), 'Lions vs Tigers', 'East Gym', '120', '$360.00'],
    ];

    return {
      headers,
      rows,
      metadata: {
        totalRecords: rows.length,
        filteredRecords: rows.length,
        generatedAt: new Date(),
        parameters,
        organizationId,
        reportType: 'attendance',
      },
    };
  }

  /**
   * Generates file in the requested format
   */
  private async generateFile(
    reportId: string,
    reportType: string,
    data: ExportData,
    parameters: ReportParameters
  ): Promise<string> {
    const timestamp = moment().format('YYYYMMDD-HHmmss');
    const filename = `${reportType}-${timestamp}-${reportId}`;

    switch (parameters.format) {
      case 'CSV':
        return this.generateCSV(filename, data);
      
      case 'JSON':
        return this.generateJSON(filename, data);
      
      case 'XLSX':
        return this.generateExcel(filename, data);
      
      case 'PDF':
        return this.generatePDF(filename, data, reportType);
      
      default:
        throw new Error(`Unsupported format: ${parameters.format}`);
    }
  }

  private async generateCSV(filename: string, data: ExportData): Promise<string> {
    const filePath = path.join(this.reportsDirectory, `${filename}.csv`);
    
    const csvWriterInstance = csvWriter.createObjectWriter({
      path: filePath,
      header: data.headers.map((header, index) => ({
        id: `col_${index}`,
        title: header,
      })),
    });

    const records = data.rows.map(row => {
      const record: any = {};
      row.forEach((value, index) => {
        record[`col_${index}`] = value;
      });
      return record;
    });

    await csvWriterInstance.writeRecords(records);
    return filePath;
  }

  private async generateJSON(filename: string, data: ExportData): Promise<string> {
    const filePath = path.join(this.reportsDirectory, `${filename}.json`);
    
    const jsonData = {
      metadata: data.metadata,
      headers: data.headers,
      data: data.rows.map(row => {
        const record: any = {};
        data.headers.forEach((header, index) => {
          record[header] = row[index];
        });
        return record;
      }),
    };

    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
    return filePath;
  }

  private async generateExcel(filename: string, data: ExportData): Promise<string> {
    const filePath = path.join(this.reportsDirectory, `${filename}.xlsx`);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report Data');

    // Add headers
    worksheet.addRow(data.headers);
    worksheet.getRow(1).font = { bold: true };

    // Add data rows
    data.rows.forEach(row => {
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15; // Default width
    });

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  private async generatePDF(filename: string, data: ExportData, reportType: string): Promise<string> {
    if (!this.browser) {
      throw new Error('PDF generation is not enabled');
    }

    const filePath = path.join(this.reportsDirectory, `${filename}.pdf`);
    
    // Load and compile template
    const templatePath = path.join(this.templatesDirectory, `${reportType}.hbs`);
    let templateContent: string;

    try {
      templateContent = await fs.readFile(templatePath, 'utf8');
    } catch {
      // Use default template if specific template doesn't exist
      templateContent = await fs.readFile(path.join(this.templatesDirectory, 'default.hbs'), 'utf8');
    }

    const template = Handlebars.compile(templateContent);
    const html = template({
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      metadata: data.metadata,
      headers: data.headers,
      rows: data.rows,
      generatedAt: moment().format('MMMM DD, YYYY [at] HH:mm:ss'),
    });

    // Generate PDF
    const page = await this.browser.newPage();
    await page.setContent(html);
    await page.pdf({
      path: filePath,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });
    await page.close();

    return filePath;
  }

  private async uploadToS3(filePath: string, reportId: string, format: string): Promise<string> {
    if (!this.s3Client || !process.env.S3_BUCKET_NAME) {
      throw new Error('S3 is not configured');
    }

    const fileContent = await fs.readFile(filePath);
    const key = `reports/${reportId}.${format.toLowerCase()}`;

    await this.s3Client.upload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: this.getContentType(format),
      Expires: new Date(Date.now() + (24 * 60 * 60 * 1000)), // 24 hours
    }).promise();

    // Generate signed URL
    return this.s3Client.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Expires: 24 * 60 * 60, // 24 hours
    });
  }

  private generateSignedUrl(reportId: string, format: string): string {
    // Simple signed URL for local files (in production, use a proper signing mechanism)
    const token = Buffer.from(`${reportId}:${Date.now()}`).toString('base64');
    return `/api/v1/reports/${reportId}/download?token=${token}&format=${format}`;
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'CSV': return 'text/csv';
      case 'JSON': return 'application/json';
      case 'XLSX': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'PDF': return 'application/pdf';
      default: return 'application/octet-stream';
    }
  }

  private validateParameters(parameters: ReportParameters): void {
    if (!parameters.format) {
      throw new Error('Format is required');
    }

    if (!['CSV', 'JSON', 'PDF', 'XLSX'].includes(parameters.format)) {
      throw new Error('Invalid format. Supported formats: CSV, JSON, PDF, XLSX');
    }

    if (parameters.startDate && parameters.endDate) {
      const start = moment(parameters.startDate);
      const end = moment(parameters.endDate);
      
      if (!start.isValid() || !end.isValid()) {
        throw new Error('Invalid date format');
      }

      if (start.isAfter(end)) {
        throw new Error('Start date must be before end date');
      }

      // Limit date range to prevent excessive data
      if (end.diff(start, 'years') > 2) {
        throw new Error('Date range cannot exceed 2 years');
      }
    }

    if (parameters.maxRows && (parameters.maxRows < 1 || parameters.maxRows > 100000)) {
      throw new Error('Max rows must be between 1 and 100,000');
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .metadata { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #007bff; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <h1>{{title}}</h1>
    
    <div class="metadata">
        <strong>Generated:</strong> {{generatedAt}}<br>
        <strong>Organization:</strong> {{metadata.organizationId}}<br>
        <strong>Records:</strong> {{metadata.filteredRecords}}<br>
        <strong>Report Type:</strong> {{metadata.reportType}}
    </div>

    <table>
        <thead>
            <tr>
                {{#each headers}}
                <th>{{this}}</th>
                {{/each}}
            </tr>
        </thead>
        <tbody>
            {{#each rows}}
            <tr>
                {{#each this}}
                <td>{{this}}</td>
                {{/each}}
            </tr>
            {{/each}}
        </tbody>
    </table>

    <div class="footer">
        Generated by GameTriq Basketball League Management Platform
    </div>
</body>
</html>
    `;

    const templatePath = path.join(this.templatesDirectory, 'default.hbs');
    
    try {
      await fs.access(templatePath);
    } catch {
      await fs.writeFile(templatePath, defaultTemplate.trim());
      logger.info('Default report template created');
    }
  }

  /**
   * Gets the status of a report
   */
  async getReportStatus(reportId: string): Promise<ReportResult | null> {
    // TODO: Implement database storage for report status
    // For now, check if file exists
    const formats = ['csv', 'json', 'xlsx', 'pdf'];
    
    for (const format of formats) {
      const filePath = path.join(this.reportsDirectory, `*${reportId}.${format}`);
      try {
        const stats = await fs.stat(filePath);
        return {
          id: reportId,
          type: 'unknown', // TODO: Store this in database
          status: 'COMPLETED',
          filePath,
          fileSize: stats.size,
          generatedAt: stats.mtime,
          expiresAt: new Date(stats.mtime.getTime() + (24 * 60 * 60 * 1000)),
        };
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Deletes a report file
   */
  async deleteReport(reportId: string): Promise<boolean> {
    try {
      const formats = ['csv', 'json', 'xlsx', 'pdf'];
      let deleted = false;

      for (const format of formats) {
        try {
          const filePath = path.join(this.reportsDirectory, `*${reportId}.${format}`);
          await fs.unlink(filePath);
          deleted = true;
        } catch {
          // File doesn't exist for this format
        }
      }

      if (deleted) {
        logger.info('Report deleted', { reportId });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete report', { reportId, error });
      return false;
    }
  }

  /**
   * Cleans up expired reports
   */
  async cleanupExpiredReports(): Promise<void> {
    try {
      const files = await fs.readdir(this.reportsDirectory);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.reportsDirectory, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          logger.info('Expired report cleaned up', { file });
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup expired reports', { error });
    }
  }
}