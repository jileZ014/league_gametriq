import { Injectable } from '@nestjs/common';
import { ReportTemplate } from '../entities/report-template.entity';

@Injectable()
export class BaseTemplate {
  protected getBaseStyles(): string {
    return `
      <style>
        /* Base styles for all reports */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          background-color: #ffffff;
        }
        
        .report-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
          margin-bottom: 0;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          text-align: center;
        }
        
        .header .subtitle {
          font-size: 16px;
          opacity: 0.9;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .header .meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          opacity: 0.8;
        }
        
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        
        .section {
          margin-bottom: 35px;
        }
        
        .section:last-child {
          margin-bottom: 0;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .section-subtitle {
          font-size: 16px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 12px;
        }
        
        /* Tables */
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        .table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .table tbody tr:hover {
          background-color: #f9fafb;
        }
        
        /* Stats cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .stat-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }
        
        .stat-change {
          font-size: 12px;
          margin-top: 4px;
        }
        
        .stat-change.positive {
          color: #059669;
        }
        
        .stat-change.negative {
          color: #dc2626;
        }
        
        /* Summary boxes */
        .summary-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .summary-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 15px;
        }
        
        .summary-item {
          text-align: center;
        }
        
        .summary-item-value {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }
        
        .summary-item-label {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }
        
        /* Charts placeholder */
        .chart-container {
          background: #f9fafb;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          margin: 20px 0;
          color: #6b7280;
        }
        
        /* Utilities */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-medium { font-weight: 500; }
        
        .text-sm { font-size: 12px; }
        .text-base { font-size: 14px; }
        .text-lg { font-size: 16px; }
        .text-xl { font-size: 18px; }
        .text-2xl { font-size: 24px; }
        
        .text-gray-500 { color: #6b7280; }
        .text-gray-600 { color: #4b5563; }
        .text-gray-700 { color: #374151; }
        .text-gray-900 { color: #111827; }
        
        .text-blue-600 { color: #2563eb; }
        .text-green-600 { color: #059669; }
        .text-red-600 { color: #dc2626; }
        .text-yellow-600 { color: #d97706; }
        
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .mt-4 { margin-top: 16px; }
        .mt-6 { margin-top: 24px; }
        
        /* Print styles */
        @media print {
          .report-container {
            max-width: none;
            padding: 0;
          }
          
          .header {
            border-radius: 0;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .content {
            border: none;
            border-radius: 0;
          }
          
          .section {
            page-break-inside: avoid;
          }
          
          .table {
            page-break-inside: avoid;
          }
        }
        
        /* Page break helpers */
        .page-break {
          page-break-before: always;
        }
        
        .no-break {
          page-break-inside: avoid;
        }
      </style>
    `;
  }

  protected getBaseLayout(content: string, data: any): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.generated.name}</title>
        ${this.getBaseStyles()}
      </head>
      <body>
        <div class="report-container">
          ${this.renderHeader(data)}
          <div class="content">
            ${content}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  protected renderHeader(data: any): string {
    const organizationName = data.organization?.name || 'Basketball League';
    const leagueName = data.league?.name || 'League Report';
    const generatedDate = new Date(data.generated.at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const generatedTime = new Date(data.generated.at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <div class="header">
        <h1>${data.generated.name}</h1>
        <div class="subtitle">${organizationName} • ${leagueName}</div>
        <div class="meta">
          <span>Generated: ${generatedDate} at ${generatedTime}</span>
          <span>Report ID: ${data.template?.id || 'N/A'}</span>
        </div>
      </div>
    `;
  }

  protected renderStatsGrid(stats: Array<{ label: string; value: string | number; change?: string }>): string {
    return `
      <div class="stats-grid">
        ${stats.map(stat => `
          <div class="stat-card">
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
            ${stat.change ? `<div class="stat-change ${parseFloat(stat.change) >= 0 ? 'positive' : 'negative'}">${stat.change}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  protected renderTable(
    title: string,
    headers: string[],
    rows: any[][],
    options: {
      showIndex?: boolean;
      className?: string;
      maxRows?: number;
    } = {}
  ): string {
    const { showIndex = false, className = '', maxRows } = options;
    const displayRows = maxRows ? rows.slice(0, maxRows) : rows;
    const actualHeaders = showIndex ? ['#', ...headers] : headers;

    return `
      <div class="section">
        ${title ? `<h3 class="section-subtitle">${title}</h3>` : ''}
        <table class="table ${className}">
          <thead>
            <tr>
              ${actualHeaders.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${displayRows.map((row, index) => {
              const actualRow = showIndex ? [index + 1, ...row] : row;
              return `
                <tr>
                  ${actualRow.map(cell => `<td>${this.formatCellValue(cell)}</td>`).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${maxRows && rows.length > maxRows ? `<p class="text-sm text-gray-500 text-center">Showing ${maxRows} of ${rows.length} records</p>` : ''}
      </div>
    `;
  }

  protected renderSummaryBox(title: string, items: Array<{ label: string; value: string | number }>): string {
    return `
      <div class="summary-box">
        <div class="summary-title">${title}</div>
        <div class="summary-grid">
          ${items.map(item => `
            <div class="summary-item">
              <div class="summary-item-value">${item.value}</div>
              <div class="summary-item-label">${item.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  protected renderChartPlaceholder(title: string, type: string = 'bar'): string {
    return `
      <div class="chart-container">
        <h4>${title}</h4>
        <p>📊 ${type.charAt(0).toUpperCase() + type.slice(1)} Chart</p>
        <small>Chart generation is supported in the full PDF version</small>
      </div>
    `;
  }

  protected formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'number') {
      // Format numbers with appropriate decimal places
      if (Number.isInteger(value)) {
        return value.toLocaleString();
      } else {
        return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      }
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return String(value);
  }

  protected formatPercentage(value: number, decimals: number = 1): string {
    if (typeof value !== 'number' || isNaN(value)) return '0%';
    return `${(value * 100).toFixed(decimals)}%`;
  }

  protected formatCurrency(value: number, currency: string = 'USD'): string {
    if (typeof value !== 'number' || isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  }

  protected formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  }

  protected renderSection(title: string, content: string): string {
    return `
      <div class="section">
        <h2 class="section-title">${title}</h2>
        ${content}
      </div>
    `;
  }

  async render(template: ReportTemplate, data: any): Promise<string> {
    // Base implementation - to be overridden by specific templates
    return this.getBaseLayout('<p>No content available</p>', data);
  }
}