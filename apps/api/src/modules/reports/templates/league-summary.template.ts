import { Injectable } from '@nestjs/common';
import { BaseTemplate } from './base.template';
import { ReportTemplate } from '../entities/report-template.entity';

@Injectable()
export class LeagueSummaryTemplate extends BaseTemplate {
  async render(template: ReportTemplate, data: any): Promise<string> {
    const content = this.renderLeagueSummaryContent(data);
    return this.getBaseLayout(content, data);
  }

  private renderLeagueSummaryContent(data: any): string {
    const sections = [];

    // Executive Summary
    if (data.summary) {
      sections.push(this.renderExecutiveSummary(data.summary));
    }

    // League Standings
    if (data.standings && data.standings.length > 0) {
      sections.push(this.renderStandings(data.standings));
    }

    // Top Performers
    if (data.topScorers && data.topScorers.length > 0) {
      sections.push(this.renderTopPerformers(data.topScorers));
    }

    // Recent Games
    if (data.recentGames && data.recentGames.length > 0) {
      sections.push(this.renderRecentGames(data.recentGames));
    }

    // Upcoming Games
    if (data.upcomingGames && data.upcomingGames.length > 0) {
      sections.push(this.renderUpcomingGames(data.upcomingGames));
    }

    // League Statistics
    if (data.leagueStats) {
      sections.push(this.renderLeagueStatistics(data.leagueStats));
    }

    return sections.join('');
  }

  private renderExecutiveSummary(summary: any): string {
    const stats = [
      { label: 'Total Teams', value: summary.totalTeams || 0 },
      { label: 'Games Played', value: summary.totalGames || 0 },
      { label: 'Avg Points/Game', value: summary.avgPointsPerGame || 0 },
      { label: 'Active Leagues', value: summary.activeLeagues || 0 },
    ];

    return this.renderSection(
      'Executive Summary',
      this.renderStatsGrid(stats)
    );
  }

  private renderStandings(standings: any[]): string {
    const headers = ['Rank', 'Team', 'Wins', 'Losses', 'Win %', 'Games Behind'];
    const leader = standings[0];
    
    const rows = standings.map((team, index) => {
      const gamesBehind = index === 0 ? '-' : 
        ((leader.wins - team.wins + team.losses - leader.losses) / 2).toFixed(1);
      
      return [
        team.rank || (index + 1),
        team.team || team.teamName,
        team.wins || 0,
        team.losses || 0,
        this.formatPercentage(team.winPercentage || (team.wins / (team.wins + team.losses)), 1),
        gamesBehind,
      ];
    });

    return this.renderSection(
      'League Standings',
      this.renderTable('Current Standings', headers, rows, { className: 'standings-table' })
    );
  }

  private renderTopPerformers(topScorers: any[]): string {
    const content = [];

    // Top Scorers Table
    const scorersHeaders = ['Player', 'Team', 'PPG', 'RPG', 'APG', 'GP'];
    const scorersRows = topScorers.map(player => [
      player.name || player.playerName,
      player.teamName || 'Unknown Team',
      this.formatCellValue(player.stats?.points),
      this.formatCellValue(player.stats?.rebounds),
      this.formatCellValue(player.stats?.assists),
      this.formatCellValue(player.stats?.gamesPlayed),
    ]);

    content.push(
      this.renderTable('Top Scorers', scorersHeaders, scorersRows, { maxRows: 10 })
    );

    // Add chart placeholder for top performers
    if (topScorers.length > 0) {
      content.push(this.renderChartPlaceholder('Top 10 Scorers Chart', 'bar'));
    }

    return this.renderSection('Top Performers', content.join(''));
  }

  private renderRecentGames(recentGames: any[]): string {
    const headers = ['Date', 'Home Team', 'Away Team', 'Score', 'Status'];
    const rows = recentGames.map(game => [
      this.formatDate(game.scheduledTime || game.gameDate),
      game.homeTeam?.name || game.homeTeamName || 'TBD',
      game.awayTeam?.name || game.awayTeamName || 'TBD',
      game.status === 'COMPLETED' 
        ? `${game.homeScore}-${game.awayScore}`
        : 'Not Started',
      this.formatGameStatus(game.status),
    ]);

    return this.renderSection(
      'Recent Games',
      this.renderTable('Last 7 Days', headers, rows, { maxRows: 10 })
    );
  }

  private renderUpcomingGames(upcomingGames: any[]): string {
    const headers = ['Date', 'Time', 'Home Team', 'Away Team', 'Venue'];
    const rows = upcomingGames.map(game => [
      this.formatDate(game.scheduledTime || game.gameDate),
      this.formatTime(game.scheduledTime || game.gameDate),
      game.homeTeam?.name || game.homeTeamName || 'TBD',
      game.awayTeam?.name || game.awayTeamName || 'TBD',
      game.venue?.name || game.venueName || 'TBD',
    ]);

    return this.renderSection(
      'Upcoming Games',
      this.renderTable('Next 7 Days', headers, rows, { maxRows: 10 })
    );
  }

  private renderLeagueStatistics(leagueStats: any): string {
    const content = [];

    // Overall Statistics Summary
    const overallStats = [
      { label: 'Total Points Scored', value: leagueStats.totalPoints || 0 },
      { label: 'Average Game Score', value: leagueStats.avgScore || 0 },
      { label: 'Highest Scoring Game', value: leagueStats.highestScore || 0 },
      { label: 'Total Fouls', value: leagueStats.totalFouls || 0 },
    ];

    content.push(this.renderSummaryBox('League Statistics', overallStats));

    // Team Performance Breakdown
    if (leagueStats.teamBreakdown) {
      const teamHeaders = ['Team', 'Avg PPG', 'Avg Allowed', 'Point Diff', 'Rating'];
      const teamRows = leagueStats.teamBreakdown.map((team: any) => [
        team.name,
        this.formatCellValue(team.avgPointsScored),
        this.formatCellValue(team.avgPointsAllowed),
        this.formatCellValue(team.pointDifferential),
        this.formatCellValue(team.efficiency),
      ]);

      content.push(
        this.renderTable('Team Performance', teamHeaders, teamRows)
      );
    }

    // Add performance trend chart
    content.push(this.renderChartPlaceholder('League Performance Trends', 'line'));

    return this.renderSection('League Analytics', content.join(''));
  }

  private formatGameStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'SCHEDULED': 'Scheduled',
      'IN_PROGRESS': 'In Progress',
      'HALFTIME': 'Halftime',
      'COMPLETED': 'Final',
      'CANCELLED': 'Cancelled',
      'POSTPONED': 'Postponed',
      'FORFEITED': 'Forfeited',
    };

    return statusMap[status] || status;
  }

  private formatTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return 'TBD';
    
    return dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}