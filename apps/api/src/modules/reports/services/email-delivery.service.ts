import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

import { ReportHistory } from '../entities/report-history.entity';
import { ScheduledReport } from '../entities/scheduled-report.entity';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailDeliveryOptions {
  recipients: string[];
  subject: string;
  attachments?: EmailAttachment[];
  includeUnsubscribeLink?: boolean;
  scheduledReportId?: string;
  customTemplate?: string;
  templateData?: Record<string, any>;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  deliveredTo: string[];
  failedDeliveries: Array<{ email: string; error: string }>;
}

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);
  private transporter: nodemailer.Transporter;
  private readonly emailTemplates = new Map<string, Handlebars.TemplateDelegate>();

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
    this.loadEmailTemplates();
  }

  private initializeTransporter() {
    // Configure email transporter based on environment
    const emailConfig = this.configService.get('email', {});
    
    if (emailConfig.service === 'gmail') {
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
      });
    } else if (emailConfig.service === 'sendgrid') {
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: emailConfig.apiKey,
        },
      });
    } else if (emailConfig.service === 'aws-ses') {
      this.transporter = nodemailer.createTransporter({
        SES: emailConfig.sesClient, // AWS SES client instance
      });
    } else {
      // Default SMTP configuration
      this.transporter = nodemailer.createTransporter({
        host: emailConfig.host || 'localhost',
        port: emailConfig.port || 587,
        secure: emailConfig.secure || false,
        auth: emailConfig.auth ? {
          user: emailConfig.auth.user,
          pass: emailConfig.auth.pass,
        } : undefined,
      });
    }

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Email transporter configuration error:', error);
      } else {
        this.logger.log('Email transporter ready');
      }
    });
  }

  private loadEmailTemplates() {
    const templatesPath = path.join(__dirname, '../templates/email');
    
    try {
      // Load report delivery template
      const reportTemplateContent = this.loadTemplate(templatesPath, 'report-delivery.hbs');
      if (reportTemplateContent) {
        this.emailTemplates.set('report-delivery', Handlebars.compile(reportTemplateContent));
      }

      // Load subscription template
      const subscriptionTemplateContent = this.loadTemplate(templatesPath, 'subscription-confirmation.hbs');
      if (subscriptionTemplateContent) {
        this.emailTemplates.set('subscription-confirmation', Handlebars.compile(subscriptionTemplateContent));
      }

      // Load error notification template
      const errorTemplateContent = this.loadTemplate(templatesPath, 'error-notification.hbs');
      if (errorTemplateContent) {
        this.emailTemplates.set('error-notification', Handlebars.compile(errorTemplateContent));
      }

      this.logger.log(`Loaded ${this.emailTemplates.size} email templates`);

    } catch (error) {
      this.logger.warn('Could not load email templates, using fallback templates');
      this.createFallbackTemplates();
    }
  }

  private loadTemplate(templatesPath: string, filename: string): string | null {
    try {
      const templatePath = path.join(templatesPath, filename);
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      this.logger.warn(`Could not load template ${filename}:`, error.message);
      return null;
    }
  }

  private createFallbackTemplates() {
    // Fallback template for report delivery
    const reportDeliveryTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>{{reportName}}</title>
          <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .footer { background: #f5f5f5; padding: 15px; font-size: 12px; color: #666; }
              .button { background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>{{organizationName}}</h1>
              <h2>{{reportName}}</h2>
          </div>
          <div class="content">
              <p>Dear {{recipientName}},</p>
              <p>Your scheduled report "{{reportName}}" has been generated and is ready for review.</p>
              
              {{#if summary}}
              <h3>Report Summary</h3>
              <ul>
                  {{#each summary}}
                  <li><strong>{{@key}}:</strong> {{this}}</li>
                  {{/each}}
              </ul>
              {{/if}}

              <p>The full report is attached to this email{{#if downloadUrl}} or you can <a href="{{downloadUrl}}" class="button">Download Report</a>{{/if}}.</p>
              
              {{#if hasScheduledReport}}
              <p>This is an automated report generated on {{generatedDate}}. If you would like to modify your subscription preferences or unsubscribe, <a href="{{unsubscribeUrl}}">click here</a>.</p>
              {{/if}}
              
              <p>Best regards,<br>Gametriq League Management Team</p>
          </div>
          <div class="footer">
              <p>Generated on {{generatedDate}} | Powered by Gametriq League Management</p>
              {{#if unsubscribeUrl}}<p><a href="{{unsubscribeUrl}}">Unsubscribe</a> from this report</p>{{/if}}
          </div>
      </body>
      </html>
    `;

    this.emailTemplates.set('report-delivery', Handlebars.compile(reportDeliveryTemplate));

    // Simple error notification template
    const errorTemplate = `
      <h2>Report Generation Failed</h2>
      <p>The report "{{reportName}}" failed to generate.</p>
      <p><strong>Error:</strong> {{errorMessage}}</p>
      <p>Please contact support if this issue persists.</p>
    `;

    this.emailTemplates.set('error-notification', Handlebars.compile(errorTemplate));
  }

  async sendReportEmail(
    reportHistory: ReportHistory,
    options: EmailDeliveryOptions
  ): Promise<EmailDeliveryResult> {
    const startTime = Date.now();
    this.logger.log(`Sending report email: ${reportHistory.reportName} to ${options.recipients.length} recipients`);

    const deliveredTo: string[] = [];
    const failedDeliveries: Array<{ email: string; error: string }> = [];

    try {
      const template = this.emailTemplates.get(options.customTemplate || 'report-delivery');
      if (!template) {
        throw new Error('Email template not found');
      }

      // Prepare template data
      const templateData = {
        reportName: reportHistory.reportName,
        organizationName: options.templateData?.organizationName || 'Your Organization',
        generatedDate: new Date().toLocaleDateString(),
        summary: options.templateData?.summary,
        downloadUrl: options.templateData?.downloadUrl,
        hasScheduledReport: !!options.scheduledReportId,
        unsubscribeUrl: options.includeUnsubscribeLink && options.scheduledReportId
          ? this.generateUnsubscribeUrl(options.scheduledReportId)
          : null,
        recipientName: 'League Member',
        ...options.templateData,
      };

      const htmlContent = template(templateData);

      // Prepare email attachments
      const attachments = options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })) || [];

      // Send email to each recipient
      for (const recipient of options.recipients) {
        try {
          const mailOptions = {
            from: this.getFromAddress(),
            to: recipient,
            subject: options.subject,
            html: htmlContent,
            attachments,
            headers: {
              'X-Report-ID': reportHistory.id,
              'X-Organization-ID': reportHistory.organizationId,
            },
          };

          const result = await this.transporter.sendMail(mailOptions);
          deliveredTo.push(recipient);
          
          this.logger.log(`Email sent to ${recipient}, messageId: ${result.messageId}`);

        } catch (error) {
          const errorMessage = error.message || 'Unknown error';
          failedDeliveries.push({ email: recipient, error: errorMessage });
          this.logger.error(`Failed to send email to ${recipient}: ${errorMessage}`);
        }
      }

      const deliveryTime = Date.now() - startTime;
      this.logger.log(`Email delivery completed in ${deliveryTime}ms. Delivered: ${deliveredTo.length}, Failed: ${failedDeliveries.length}`);

      return {
        success: deliveredTo.length > 0,
        deliveredTo,
        failedDeliveries,
      };

    } catch (error) {
      this.logger.error('Email delivery failed:', error);
      return {
        success: false,
        deliveredTo,
        failedDeliveries: options.recipients.map(email => ({
          email,
          error: error.message || 'Unknown error',
        })),
      };
    }
  }

  async sendErrorNotification(
    reportName: string,
    errorMessage: string,
    adminEmails: string[]
  ): Promise<void> {
    if (adminEmails.length === 0) return;

    try {
      const template = this.emailTemplates.get('error-notification');
      if (!template) return;

      const htmlContent = template({
        reportName,
        errorMessage,
        timestamp: new Date().toLocaleString(),
      });

      const mailOptions = {
        from: this.getFromAddress(),
        to: adminEmails,
        subject: `Report Generation Failed: ${reportName}`,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Error notification sent to ${adminEmails.length} admins`);

    } catch (error) {
      this.logger.error('Failed to send error notification:', error);
    }
  }

  async sendSubscriptionConfirmation(
    userEmail: string,
    reportName: string,
    scheduledReportId: string
  ): Promise<boolean> {
    try {
      const unsubscribeUrl = this.generateUnsubscribeUrl(scheduledReportId);
      
      const mailOptions = {
        from: this.getFromAddress(),
        to: userEmail,
        subject: `Subscription Confirmed: ${reportName}`,
        html: `
          <h2>Subscription Confirmed</h2>
          <p>You have successfully subscribed to the report: <strong>${reportName}</strong></p>
          <p>You will receive this report according to its schedule.</p>
          <p>If you wish to unsubscribe, <a href="${unsubscribeUrl}">click here</a>.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;

    } catch (error) {
      this.logger.error('Failed to send subscription confirmation:', error);
      return false;
    }
  }

  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email configuration test failed:', error);
      return false;
    }
  }

  private getFromAddress(): string {
    const fromAddress = this.configService.get('email.from', 'noreply@gametriq.com');
    const fromName = this.configService.get('email.fromName', 'Gametriq League Management');
    
    return `${fromName} <${fromAddress}>`;
  }

  private generateUnsubscribeUrl(scheduledReportId: string): string {
    const baseUrl = this.configService.get('app.baseUrl', 'https://app.gametriq.com');
    // In a real implementation, you'd generate a signed token
    return `${baseUrl}/reports/unsubscribe/${scheduledReportId}`;
  }

  async getEmailStats(organizationId: string): Promise<{
    totalEmailsSent: number;
    successRate: number;
    bounceRate: number;
    recentFailures: number;
  }> {
    // This would integrate with your email service provider's webhook data
    // For now, return mock data
    return {
      totalEmailsSent: 0,
      successRate: 95.5,
      bounceRate: 2.1,
      recentFailures: 0,
    };
  }

  async validateEmailTemplate(templateContent: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Try to compile the template
      Handlebars.compile(templateContent);
      
      // Check for required placeholders
      const requiredPlaceholders = ['reportName', 'generatedDate'];
      for (const placeholder of requiredPlaceholders) {
        if (!templateContent.includes(`{{${placeholder}}}`)) {
          errors.push(`Missing required placeholder: {{${placeholder}}}`);
        }
      }

      // Basic HTML validation
      if (!templateContent.includes('<html') && !templateContent.includes('<body')) {
        errors.push('Template should contain basic HTML structure');
      }

    } catch (error) {
      errors.push(`Template compilation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}