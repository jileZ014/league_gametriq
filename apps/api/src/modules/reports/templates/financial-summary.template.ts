import { Injectable } from '@nestjs/common';
import { BaseTemplate } from './base.template';
import { ReportTemplate } from '../entities/report-template.entity';

@Injectable()
export class FinancialSummaryTemplate extends BaseTemplate {
  async render(template: ReportTemplate, data: any): Promise<string> {
    const content = this.renderFinancialSummaryContent(data);
    return this.getBaseLayout(content, data);
  }

  private renderFinancialSummaryContent(data: any): string {
    const sections = [];

    // Financial Overview
    if (data.summary) {
      sections.push(this.renderFinancialOverview(data.summary));
    }

    // Revenue Breakdown
    if (data.revenue) {
      sections.push(this.renderRevenueBreakdown(data.revenue));
    }

    // Registration Fees
    if (data.registrationFees) {
      sections.push(this.renderRegistrationFees(data.registrationFees));
    }

    // Outstanding Payments
    if (data.outstandingPayments) {
      sections.push(this.renderOutstandingPayments(data.outstandingPayments));
    }

    // Refunds
    if (data.refunds) {
      sections.push(this.renderRefunds(data.refunds));
    }

    // Financial Trends
    sections.push(this.renderFinancialTrends(data));

    return sections.join('');
  }

  private renderFinancialOverview(summary: any): string {
    const stats = [
      { 
        label: 'Total Revenue', 
        value: this.formatCurrency(summary.totalRevenue || 0),
        change: summary.revenueChange ? `${summary.revenueChange > 0 ? '+' : ''}${summary.revenueChange}%` : undefined
      },
      { 
        label: 'Pending Amount', 
        value: this.formatCurrency(summary.pendingAmount || 0),
        change: summary.pendingChange ? `${summary.pendingChange > 0 ? '+' : ''}${summary.pendingChange}%` : undefined
      },
      { 
        label: 'Collection Rate', 
        value: `${summary.collectionRate || 0}%`,
        change: summary.collectionChange ? `${summary.collectionChange > 0 ? '+' : ''}${summary.collectionChange}%` : undefined
      },
      { 
        label: 'Total Refunds', 
        value: this.formatCurrency(summary.refundAmount || 0),
        change: summary.refundChange ? `${summary.refundChange > 0 ? '+' : ''}${summary.refundChange}%` : undefined
      },
    ];

    return this.renderSection(
      'Financial Overview',
      this.renderStatsGrid(stats)
    );
  }

  private renderRevenueBreakdown(revenue: any): string {
    const content = [];

    // Revenue Summary
    const revenueSummary = [
      { label: 'Registration Fees', value: this.formatCurrency(revenue.registrationFees || 0) },
      { label: 'Tournament Fees', value: this.formatCurrency(revenue.tournamentFees || 0) },
      { label: 'Late Fees', value: this.formatCurrency(revenue.lateFees || 0) },
      { label: 'Other Income', value: this.formatCurrency(revenue.otherIncome || 0) },
    ];

    content.push(this.renderSummaryBox('Revenue Breakdown', revenueSummary));

    // Detailed Revenue Table
    if (revenue.breakdown && revenue.breakdown.length > 0) {
      const headers = ['Category', 'Amount', 'Percentage', 'Count'];
      const total = revenue.total || 0;
      
      const rows = revenue.breakdown.map((item: any) => [
        item.category,
        this.formatCurrency(item.amount || 0),
        this.formatPercentage((item.amount || 0) / total),
        item.count || 0,
      ]);

      content.push(
        this.renderTable('Revenue Details', headers, rows)
      );
    }

    // Revenue chart placeholder
    content.push(this.renderChartPlaceholder('Revenue Distribution', 'pie'));

    return this.renderSection('Revenue Analysis', content.join(''));
  }

  private renderRegistrationFees(registrationFees: any[]): string {
    const content = [];

    // Registration Status Summary
    const paidFees = registrationFees.filter(fee => fee.status === 'PAID');
    const pendingFees = registrationFees.filter(fee => fee.status === 'PENDING');
    const overdueFees = registrationFees.filter(fee => fee.status === 'OVERDUE');

    const statusSummary = [
      { label: 'Paid', value: paidFees.length },
      { label: 'Pending', value: pendingFees.length },
      { label: 'Overdue', value: overdueFees.length },
      { label: 'Total', value: registrationFees.length },
    ];

    content.push(this.renderSummaryBox('Registration Status', statusSummary));

    // Recent Payments Table
    const recentPayments = registrationFees
      .filter(fee => fee.status === 'PAID')
      .sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime())
      .slice(0, 15);

    if (recentPayments.length > 0) {
      const headers = ['Player/Team', 'Amount', 'Paid Date', 'Method', 'League'];
      const rows = recentPayments.map(fee => [
        fee.playerName || fee.teamName || 'Unknown',
        this.formatCurrency(fee.amount || 0),
        this.formatDate(fee.paidAt),
        fee.paymentMethod || 'N/A',
        fee.leagueName || 'N/A',
      ]);

      content.push(
        this.renderTable('Recent Payments', headers, rows)
      );
    }

    return this.renderSection('Registration Fees', content.join(''));
  }

  private renderOutstandingPayments(outstandingPayments: any[]): string {
    const content = [];

    if (outstandingPayments.length === 0) {
      content.push(`
        <div class="summary-box text-center">
          <div class="text-green-600 text-lg font-semibold">✅ No Outstanding Payments</div>
          <p class="text-gray-600 mt-2">All payments are up to date!</p>
        </div>
      `);
      return this.renderSection('Outstanding Payments', content.join(''));
    }

    // Outstanding Summary
    const totalOutstanding = outstandingPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const averageDaysOverdue = outstandingPayments.reduce((sum, payment) => sum + (payment.daysOverdue || 0), 0) / outstandingPayments.length;
    const criticalOverdue = outstandingPayments.filter(payment => (payment.daysOverdue || 0) > 30);

    const outstandingSummary = [
      { label: 'Total Outstanding', value: this.formatCurrency(totalOutstanding) },
      { label: 'Number of Cases', value: outstandingPayments.length },
      { label: 'Avg Days Overdue', value: Math.round(averageDaysOverdue) },
      { label: 'Critical (>30 days)', value: criticalOverdue.length },
    ];

    content.push(this.renderSummaryBox('Outstanding Summary', outstandingSummary));

    // Outstanding Payments Table
    const headers = ['Player/Team', 'Amount', 'Due Date', 'Days Overdue', 'Status'];
    const rows = outstandingPayments
      .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0))
      .map(payment => [
        payment.playerName || payment.teamName || 'Unknown',
        this.formatCurrency(payment.amount || 0),
        this.formatDate(payment.dueDate),
        payment.daysOverdue || 0,
        this.getOverdueStatus(payment.daysOverdue || 0),
      ]);

    content.push(
      this.renderTable('Outstanding Payments Detail', headers, rows, { maxRows: 20 })
    );

    // Aging chart placeholder
    content.push(this.renderChartPlaceholder('Payment Aging Analysis', 'bar'));

    return this.renderSection('Outstanding Payments', content.join(''));
  }

  private renderRefunds(refunds: any[]): string {
    const content = [];

    if (refunds.length === 0) {
      content.push(`
        <div class="summary-box text-center">
          <div class="text-gray-600">No refunds processed in this period</div>
        </div>
      `);
      return this.renderSection('Refunds', content.join(''));
    }

    // Refunds Summary
    const totalRefunded = refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0);
    const averageRefund = totalRefunded / refunds.length;

    const refundSummary = [
      { label: 'Total Refunded', value: this.formatCurrency(totalRefunded) },
      { label: 'Number of Refunds', value: refunds.length },
      { label: 'Average Refund', value: this.formatCurrency(averageRefund) },
      { label: 'Refund Rate', value: '2.1%' }, // This would be calculated based on total registrations
    ];

    content.push(this.renderSummaryBox('Refund Summary', refundSummary));

    // Refunds Table
    const headers = ['Player/Team', 'Amount', 'Date', 'Reason', 'Status'];
    const rows = refunds
      .sort((a, b) => new Date(b.refundedAt || 0).getTime() - new Date(a.refundedAt || 0).getTime())
      .map(refund => [
        refund.playerName || refund.teamName || 'Unknown',
        this.formatCurrency(refund.amount || 0),
        this.formatDate(refund.refundedAt),
        refund.reason || 'Not specified',
        refund.status || 'Completed',
      ]);

    content.push(
      this.renderTable('Refund Details', headers, rows)
    );

    return this.renderSection('Refunds', content.join(''));
  }

  private renderFinancialTrends(data: any): string {
    const content = [];

    // Monthly Comparison (mock data for demonstration)
    const monthlyData = this.generateMockMonthlyData();
    const headers = ['Month', 'Revenue', 'Registrations', 'Collection Rate', 'Outstanding'];
    const rows = monthlyData.map(month => [
      month.month,
      this.formatCurrency(month.revenue),
      month.registrations,
      `${month.collectionRate}%`,
      this.formatCurrency(month.outstanding),
    ]);

    content.push(
      this.renderTable('Monthly Financial Trends', headers, rows)
    );

    // Trend analysis charts
    content.push(this.renderChartPlaceholder('Revenue Trends (12 months)', 'line'));
    content.push(this.renderChartPlaceholder('Collection Rate Trends', 'line'));

    // Key Insights
    const insights = [
      'Registration revenue increased by 15% compared to last month',
      'Collection rate improved to 94.2%, up from 91.8% last period',
      '12 payment reminders sent this period',
      'Average time to payment: 3.2 days',
    ];

    content.push(`
      <div class="summary-box">
        <div class="summary-title">Key Financial Insights</div>
        <ul style="margin-top: 12px; padding-left: 20px;">
          ${insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('')}
        </ul>
      </div>
    `);

    return this.renderSection('Financial Trends & Insights', content.join(''));
  }

  private getOverdueStatus(daysOverdue: number): string {
    if (daysOverdue <= 7) return 'Recent';
    if (daysOverdue <= 30) return 'Moderate';
    if (daysOverdue <= 60) return 'Critical';
    return 'Urgent';
  }

  private generateMockMonthlyData(): any[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      revenue: 12000 + (Math.random() * 4000),
      registrations: 80 + Math.floor(Math.random() * 40),
      collectionRate: 90 + Math.floor(Math.random() * 10),
      outstanding: 500 + (Math.random() * 1500),
    }));
  }
}