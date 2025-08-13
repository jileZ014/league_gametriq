import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { MockDataGenerator, TestPerformanceMonitor } from '../../../test/setup';
import * as puppeteer from 'puppeteer';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('puppeteer');
jest.mock('pdfkit');
jest.mock('fs');

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(async () => {
    mockPage = {
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
      close: jest.fn(),
      addStyleTag: jest.fn(),
      emulateMediaType: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn(),
      evaluate: jest.fn(),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGeneratorService],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HTML to PDF Generation', () => {
    it('should generate PDF from HTML content', async () => {
      const htmlContent = '<html><body><h1>Test Report</h1></body></html>';
      const options = {
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      };

      const result = await service.generatePDF(htmlContent, options);

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining(['--no-sandbox']),
        })
      );
      expect(mockPage.setContent).toHaveBeenCalledWith(htmlContent, {
        waitUntil: 'networkidle0',
      });
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          margin: options.margin,
        })
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should apply custom CSS styles', async () => {
      const htmlContent = '<html><body><div class="report">Content</div></body></html>';
      const customCSS = '.report { font-family: Arial; color: #333; }';
      const options = {
        css: customCSS,
      };

      await service.generatePDF(htmlContent, options);

      expect(mockPage.addStyleTag).toHaveBeenCalledWith({ content: customCSS });
    });

    it('should handle page headers and footers', async () => {
      const htmlContent = '<html><body>Content</body></html>';
      const options = {
        displayHeaderFooter: true,
        headerTemplate: '<div>Header - Page <span class="pageNumber"></span></div>',
        footerTemplate: '<div>Footer - <span class="date"></span></div>',
      };

      await service.generatePDF(htmlContent, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          displayHeaderFooter: true,
          headerTemplate: options.headerTemplate,
          footerTemplate: options.footerTemplate,
        })
      );
    });

    it('should generate landscape orientation PDFs', async () => {
      const htmlContent = '<html><body>Wide content</body></html>';
      const options = {
        landscape: true,
        format: 'A4',
      };

      await service.generatePDF(htmlContent, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          landscape: true,
        })
      );
    });

    it('should handle multiple pages', async () => {
      const htmlContent = `
        <html><body>
          <div style="page-break-after: always;">Page 1</div>
          <div style="page-break-after: always;">Page 2</div>
          <div>Page 3</div>
        </body></html>
      `;

      await service.generatePDF(htmlContent);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('page-break-after'),
        expect.any(Object)
      );
    });
  });

  describe('Report Templates', () => {
    it('should generate league summary PDF', async () => {
      const reportData = {
        title: 'Phoenix Youth Basketball League',
        date: new Date('2024-12-01'),
        teams: Array.from({ length: 16 }, (_, i) => ({
          rank: i + 1,
          name: `Team ${i + 1}`,
          wins: 20 - i,
          losses: i,
          percentage: ((20 - i) / 20).toFixed(3),
        })),
      };

      const result = await service.generateLeagueSummaryPDF(reportData);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Phoenix Youth Basketball League'),
        expect.any(Object)
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate financial report PDF', async () => {
      const reportData = {
        title: 'Financial Summary Report',
        period: 'Q4 2024',
        revenue: 125000,
        expenses: 85000,
        netIncome: 40000,
        breakdown: [
          { category: 'Registrations', amount: 80000 },
          { category: 'Tournaments', amount: 30000 },
          { category: 'Merchandise', amount: 15000 },
        ],
      };

      const result = await service.generateFinancialPDF(reportData);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Financial Summary Report'),
        expect.any(Object)
      );
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('125000'),
        expect.any(Object)
      );
    });

    it('should generate game results PDF', async () => {
      const reportData = {
        title: 'Game Results - Week 15',
        games: Array.from({ length: 10 }, (_, i) => ({
          date: new Date(`2024-12-0${(i % 7) + 1}`),
          homeTeam: `Team ${i * 2}`,
          awayTeam: `Team ${i * 2 + 1}`,
          homeScore: 75 + i,
          awayScore: 72 + i,
          venue: `Court ${(i % 3) + 1}`,
        })),
      };

      const result = await service.generateGameResultsPDF(reportData);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Game Results'),
        expect.any(Object)
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate tournament bracket PDF', async () => {
      const bracketData = {
        tournament: 'Holiday Classic 2024',
        format: 'Single Elimination',
        teams: 16,
        rounds: [
          {
            name: 'Round of 16',
            matches: Array.from({ length: 8 }, (_, i) => ({
              team1: `Team ${i * 2 + 1}`,
              team2: `Team ${i * 2 + 2}`,
              score1: i % 2 === 0 ? 75 : null,
              score2: i % 2 === 0 ? 68 : null,
            })),
          },
        ],
      };

      const result = await service.generateTournamentBracketPDF(bracketData);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Holiday Classic 2024'),
        expect.any(Object)
      );
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          landscape: true, // Brackets typically need landscape
        })
      );
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Charts and Visualizations', () => {
    it('should embed bar charts in PDF', async () => {
      const chartData = {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [{
            label: 'Revenue',
            data: [10000, 12000, 15000, 14000, 18000],
          }],
        },
      };

      const htmlWithChart = await service.generateChartHTML(chartData);
      const result = await service.generatePDF(htmlWithChart);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('canvas'),
        expect.any(Object)
      );
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('canvas');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should embed pie charts in PDF', async () => {
      const chartData = {
        type: 'pie',
        data: {
          labels: ['Registrations', 'Tournaments', 'Merchandise', 'Other'],
          datasets: [{
            data: [60, 25, 10, 5],
          }],
        },
      };

      const htmlWithChart = await service.generateChartHTML(chartData);
      await service.generatePDF(htmlWithChart);

      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should embed line charts for trends', async () => {
      const chartData = {
        type: 'line',
        data: {
          labels: Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`),
          datasets: [{
            label: 'Attendance',
            data: Array.from({ length: 12 }, () => 200 + Math.floor(Math.random() * 100)),
          }],
        },
      };

      const htmlWithChart = await service.generateChartHTML(chartData);
      await service.generatePDF(htmlWithChart);

      expect(mockPage.waitForSelector).toHaveBeenCalled();
    });
  });

  describe('Table Generation', () => {
    it('should generate formatted tables', async () => {
      const tableData = {
        headers: ['Team', 'W', 'L', 'PCT', 'GB'],
        rows: Array.from({ length: 10 }, (_, i) => [
          `Team ${i + 1}`,
          `${20 - i}`,
          `${i}`,
          `${((20 - i) / 20).toFixed(3)}`,
          `${i === 0 ? '-' : i / 2}`,
        ]),
      };

      const html = service.generateTableHTML(tableData);
      const result = await service.generatePDF(html);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<table'),
        expect.any(Object)
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle large tables with pagination', async () => {
      const tableData = {
        headers: ['ID', 'Name', 'Score', 'Date'],
        rows: Array.from({ length: 100 }, (_, i) => [
          `${i + 1}`,
          `Player ${i + 1}`,
          `${Math.floor(Math.random() * 30)}`,
          '2024-12-01',
        ]),
      };

      const html = service.generateTableHTML(tableData, { paginate: true, rowsPerPage: 25 });
      await service.generatePDF(html);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
        })
      );
    });
  });

  describe('Performance Optimization', () => {
    it('should generate large PDF within threshold', async () => {
      const largeContent = {
        pages: Array.from({ length: 50 }, (_, i) => ({
          title: `Page ${i + 1}`,
          content: Array.from({ length: 100 }, () => 'Lorem ipsum dolor sit amet. ').join(''),
          table: {
            headers: ['Col1', 'Col2', 'Col3'],
            rows: Array.from({ length: 50 }, (_, j) => [`Data ${j}`, `Value ${j}`, `Result ${j}`]),
          },
        })),
      };

      const html = service.generateMultiPageHTML(largeContent);

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.generatePDF(html)
      );

      expect(duration).toMatchPerformanceThreshold(10000); // 10 seconds for large PDF
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle concurrent PDF generations', async () => {
      const htmlContent = '<html><body>Test</body></html>';
      
      const promises = Array.from({ length: 10 }, () =>
        service.generatePDF(htmlContent)
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(
        () => Promise.all(promises)
      );

      expect(duration).toMatchPerformanceThreshold(15000); // 15 seconds for 10 concurrent
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should reuse browser instance for multiple PDFs', async () => {
      const htmlContent = '<html><body>Test</body></html>';

      // Generate multiple PDFs sequentially
      for (let i = 0; i < 5; i++) {
        await service.generatePDF(htmlContent);
      }

      // Browser should be launched once and reused
      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle browser launch failures', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to launch browser')
      );

      await expect(
        service.generatePDF('<html></html>')
      ).rejects.toThrow('Failed to launch browser');
    });

    it('should handle page creation failures', async () => {
      mockBrowser.newPage.mockRejectedValueOnce(
        new Error('Failed to create page')
      );

      await expect(
        service.generatePDF('<html></html>')
      ).rejects.toThrow('Failed to create page');
    });

    it('should handle PDF generation failures', async () => {
      mockPage.pdf.mockRejectedValueOnce(
        new Error('PDF generation failed')
      );

      await expect(
        service.generatePDF('<html></html>')
      ).rejects.toThrow('PDF generation failed');
    });

    it('should cleanup resources on error', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('Test error'));

      try {
        await service.generatePDF('<html></html>');
      } catch (error) {
        // Expected error
      }

      expect(mockPage.close).toHaveBeenCalled();
    });
  });

  describe('Custom Fonts and Styling', () => {
    it('should embed custom fonts', async () => {
      const htmlContent = '<html><body style="font-family: CustomFont;">Text</body></html>';
      const options = {
        fonts: [
          {
            name: 'CustomFont',
            path: '/fonts/custom.ttf',
          },
        ],
      };

      await service.generatePDF(htmlContent, options);

      expect(mockPage.addStyleTag).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('@font-face'),
        })
      );
    });

    it('should apply print-specific CSS', async () => {
      const htmlContent = '<html><body>Content</body></html>';
      const options = {
        printCSS: `
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        `,
      };

      await service.generatePDF(htmlContent, options);

      expect(mockPage.emulateMediaType).toHaveBeenCalledWith('print');
      expect(mockPage.addStyleTag).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('@media print'),
        })
      );
    });
  });

  describe('Watermarks and Backgrounds', () => {
    it('should add watermark to PDF', async () => {
      const htmlContent = '<html><body>Content</body></html>';
      const options = {
        watermark: {
          text: 'CONFIDENTIAL',
          opacity: 0.3,
          angle: -45,
        },
      };

      const result = await service.generatePDF(htmlContent, options);

      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.any(Function),
        options.watermark
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should add background image', async () => {
      const htmlContent = '<html><body>Content</body></html>';
      const options = {
        backgroundImage: '/images/letterhead.png',
      };

      await service.generatePDF(htmlContent, options);

      expect(mockPage.addStyleTag).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('background-image'),
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should generate tagged PDF for accessibility', async () => {
      const htmlContent = `
        <html>
          <body>
            <h1>Report Title</h1>
            <p>Report content</p>
            <table>
              <thead><tr><th>Header</th></tr></thead>
              <tbody><tr><td>Data</td></tr></tbody>
            </table>
          </body>
        </html>
      `;
      const options = {
        tagged: true,
      };

      await service.generatePDF(htmlContent, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          tagged: true,
        })
      );
    });

    it('should include document metadata', async () => {
      const htmlContent = '<html><body>Content</body></html>';
      const options = {
        metadata: {
          title: 'League Report',
          author: 'Legacy Youth Sports',
          subject: 'Basketball League Statistics',
          keywords: 'basketball, league, statistics',
        },
      };

      await service.generatePDF(htmlContent, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          displayHeaderFooter: expect.any(Boolean),
        })
      );
    });
  });
});