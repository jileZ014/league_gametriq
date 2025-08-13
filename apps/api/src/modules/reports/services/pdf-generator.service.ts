import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

export interface PdfOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
  landscape?: boolean;
  pageRanges?: string;
  preferCSSPageSize?: boolean;
}

export interface PdfGenerationResult {
  buffer: Buffer;
  pageCount: number;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private browser: puppeteer.Browser | null = null;

  async onModuleInit() {
    await this.initializeBrowser();
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async initializeBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      });
      this.logger.log('Puppeteer browser initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Puppeteer browser', error);
    }
  }

  async generatePdf(
    htmlContent: string,
    options: PdfOptions = {}
  ): Promise<PdfGenerationResult> {
    const startTime = Date.now();
    this.logger.log('Starting PDF generation');

    if (!this.browser) {
      await this.initializeBrowser();
    }

    if (!this.browser) {
      throw new Error('Failed to initialize browser for PDF generation');
    }

    const page = await this.browser.newPage();

    try {
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 800 });

      // Add custom CSS for print styling
      const styledContent = this.addPrintStyles(htmlContent);

      // Set content
      await page.setContent(styledContent, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for any charts or dynamic content to load
      await this.waitForContent(page);

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        margin: options.margin || {
          top: '1in',
          right: '0.5in',
          bottom: '1in',
          left: '0.5in',
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || this.getDefaultFooter(),
        printBackground: options.printBackground !== false,
        landscape: options.landscape || false,
        pageRanges: options.pageRanges,
        preferCSSPageSize: options.preferCSSPageSize || false,
      });

      // Get page count by checking the PDF metadata
      const pageCount = await this.getPageCount(page);

      const generationTime = Date.now() - startTime;
      this.logger.log(`PDF generation completed in ${generationTime}ms`);

      return {
        buffer: Buffer.from(pdfBuffer),
        pageCount,
      };

    } catch (error) {
      this.logger.error('PDF generation failed', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  private addPrintStyles(htmlContent: string): string {
    const printStyles = `
      <style>
        /* Print-specific styles */
        @media print {
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12px;
            line-height: 1.4;
            color: #333;
          }
          
          .page-break { 
            page-break-before: always; 
          }
          
          .no-page-break { 
            page-break-inside: avoid; 
          }
          
          table { 
            border-collapse: collapse; 
            width: 100%;
            margin-bottom: 20px;
          }
          
          table th, table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left;
          }
          
          table th { 
            background-color: #f5f5f5; 
            font-weight: bold;
          }
          
          .chart-container {
            page-break-inside: avoid;
            margin: 20px 0;
          }
          
          .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          
          .section {
            margin-bottom: 25px;
          }
          
          .section h2 {
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          
          .section h3 {
            color: #374151;
            margin-bottom: 10px;
          }
          
          .summary-card {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            background-color: #f9fafb;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .stat-item {
            text-align: center;
            padding: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
          }
          
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
          }
        }
        
        /* General styles */
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        
        .logo {
          max-height: 50px;
          max-width: 200px;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .text-lg { font-size: 18px; }
        .text-xl { font-size: 20px; }
        .text-2xl { font-size: 24px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .mt-4 { margin-top: 16px; }
        .mt-6 { margin-top: 24px; }
      </style>
    `;

    // Insert styles into the HTML head
    if (htmlContent.includes('<head>')) {
      return htmlContent.replace('<head>', `<head>${printStyles}`);
    } else {
      return `<!DOCTYPE html><html><head>${printStyles}</head><body>${htmlContent}</body></html>`;
    }
  }

  private async waitForContent(page: puppeteer.Page): Promise<void> {
    try {
      // Wait for images to load
      await page.waitForFunction(
        () => {
          const images = Array.from(document.querySelectorAll('img'));
          return images.every(img => img.complete);
        },
        { timeout: 10000 }
      );

      // Wait for any charts or dynamic content
      await page.waitForFunction(
        () => {
          // Check if there are any elements with a loading class
          const loadingElements = document.querySelectorAll('.loading, .chart-loading');
          return loadingElements.length === 0;
        },
        { timeout: 5000 }
      ).catch(() => {
        // Continue if no loading elements found
      });

      // Additional wait for any animations or transitions
      await page.waitForTimeout(1000);

    } catch (error) {
      this.logger.warn('Timeout waiting for content to load, proceeding with PDF generation');
    }
  }

  private async getPageCount(page: puppeteer.Page): Promise<number> {
    try {
      // This is a simple heuristic - in a real implementation,
      // you might want to use a more sophisticated method
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      const pageHeight = 1056; // Approximate height of A4 page in pixels at 96 DPI
      
      return Math.max(1, Math.ceil(bodyHeight / pageHeight));
    } catch (error) {
      this.logger.warn('Could not determine page count, defaulting to 1');
      return 1;
    }
  }

  private getDefaultFooter(): string {
    return `
      <div style="font-size: 10px; margin: 0 20px; width: 100%; text-align: center; color: #666;">
        <span style="float: left;">Generated by Gametriq League Management</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span style="float: right;" class="date"></span>
      </div>
    `;
  }

  async generatePreview(
    htmlContent: string,
    options: PdfOptions = {}
  ): Promise<Buffer> {
    const startTime = Date.now();
    this.logger.log('Starting PDF preview generation');

    if (!this.browser) {
      await this.initializeBrowser();
    }

    if (!this.browser) {
      throw new Error('Failed to initialize browser for PDF preview');
    }

    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width: 800, height: 600 });

      const styledContent = this.addPrintStyles(htmlContent);
      await page.setContent(styledContent, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      // For preview, we generate a smaller, faster PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
        printBackground: true,
        scale: 0.8, // Smaller scale for preview
      });

      const generationTime = Date.now() - startTime;
      this.logger.log(`PDF preview generation completed in ${generationTime}ms`);

      return Buffer.from(pdfBuffer);

    } catch (error) {
      this.logger.error('PDF preview generation failed', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async generateScreenshot(
    htmlContent: string,
    options: {
      width?: number;
      height?: number;
      fullPage?: boolean;
    } = {}
  ): Promise<Buffer> {
    if (!this.browser) {
      await this.initializeBrowser();
    }

    if (!this.browser) {
      throw new Error('Failed to initialize browser for screenshot');
    }

    const page = await this.browser.newPage();

    try {
      await page.setViewport({ 
        width: options.width || 1200, 
        height: options.height || 800 
      });

      await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: options.fullPage !== false,
      });

      return Buffer.from(screenshot);

    } catch (error) {
      this.logger.error('Screenshot generation failed', error);
      throw error;
    } finally {
      await page.close();
    }
  }
}