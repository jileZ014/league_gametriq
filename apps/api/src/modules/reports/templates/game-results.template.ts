import { Injectable } from '@nestjs/common';
import { BaseTemplate } from './base.template';
import { ReportTemplate } from '../entities/report-template.entity';

@Injectable()
export class GameResultsTemplate extends BaseTemplate {
  async render(template: ReportTemplate, data: any): Promise<string> {
    const content = this.renderGameResultsContent(data);
    return this.getBaseLayout(content, data);
  }

  private renderGameResultsContent(data: any): string {
    const sections = [];

    if (data.summary) {
      sections.push(this.renderGamesSummary(data.summary));
    }

    if (data.games && data.games.length > 0) {
      sections.push(this.renderGameResults(data.games));
    }

    if (data.gameStats && data.gameStats.length > 0) {
      sections.push(this.renderGameStatistics(data.gameStats));
    }

    return sections.join('');
  }

  private renderGamesSummary(summary: any): string {
    const stats = [
      { label: 'Total Games', value: summary.totalGames || 0 },
      { label: 'Completed', value: summary.completedGames || 0 },
      { label: 'Avg Score', value: summary.averageScore ? `${summary.averageScore.home}-${summary.averageScore.away}` : '0-0' },
      { label: 'Highest Score', value: summary.highestScoringGame ? `${summary.highestScoringGame.homeScore + summary.highestScoringGame.awayScore}` : 0 },
    ];

    return this.renderSection('Games Overview', this.renderStatsGrid(stats));
  }

  private renderGameResults(games: any[]): string {
    const headers = ['Date', 'Teams', 'Score', 'Venue', 'Status'];
    const rows = games.map(game => [
      this.formatDate(game.scheduledTime),
      `${game.homeTeam?.name || 'TBD'} vs ${game.awayTeam?.name || 'TBD'}`,
      game.status === 'COMPLETED' ? `${game.homeScore}-${game.awayScore}` : '-',
      game.venue?.name || 'TBD',
      game.status,
    ]);

    return this.renderSection(
      'Game Results',
      this.renderTable('Recent Games', headers, rows)
    );
  }

  private renderGameStatistics(gameStats: any[]): string {
    const headers = ['Game', 'Total Points', 'Lead Changes', 'Biggest Lead'];
    const rows = gameStats.map(stat => [
      `Game ${stat.gameId}`,
      stat.stats?.totalPoints || 0,
      stat.stats?.leadChanges || 0,
      stat.stats?.biggestLead || 0,
    ]);

    return this.renderSection(
      'Game Statistics',
      this.renderTable('Detailed Stats', headers, rows)
    );
  }
}