import { Injectable } from '@nestjs/common';
import { BaseTemplate } from './base.template';
import { ReportTemplate } from '../entities/report-template.entity';

@Injectable()
export class AttendanceTemplate extends BaseTemplate {
  async render(template: ReportTemplate, data: any): Promise<string> {
    const content = this.renderAttendanceContent(data);
    return this.getBaseLayout(content, data);
  }

  private renderAttendanceContent(data: any): string {
    const sections = [];

    if (data.summary) {
      sections.push(this.renderAttendanceSummary(data.summary));
    }

    if (data.teamAttendance && data.teamAttendance.length > 0) {
      sections.push(this.renderTeamAttendance(data.teamAttendance));
    }

    if (data.playerAttendance && data.playerAttendance.length > 0) {
      sections.push(this.renderPlayerAttendance(data.playerAttendance));
    }

    return sections.join('');
  }

  private renderAttendanceSummary(summary: any): string {
    const stats = [
      { label: 'Overall Rate', value: `${summary.overallAttendanceRate || 0}%` },
      { label: 'Best Team', value: summary.bestAttendingTeam?.teamName || 'N/A' },
      { label: 'Avg Players/Game', value: summary.averagePlayersPerGame || 0 },
      { label: 'Total Records', value: summary.totalRecords || 0 },
    ];

    return this.renderSection('Attendance Overview', this.renderStatsGrid(stats));
  }

  private renderTeamAttendance(teamAttendance: any[]): string {
    const headers = ['Team', 'Attendance Rate', 'Games Played', 'Avg Present'];
    const rows = teamAttendance.map(team => [
      team.teamName,
      `${Math.round(team.attendanceRate * 100)}%`,
      team.gamesPlayed || 0,
      Math.round((team.attendanceRate * 20) || 0), // Assuming 20 players per team
    ]);

    return this.renderSection(
      'Team Attendance',
      this.renderTable('Team Attendance Rates', headers, rows)
    );
  }

  private renderPlayerAttendance(playerAttendance: any[]): string {
    const headers = ['Player', 'Attendance Rate', 'Games Attended', 'Total Games'];
    const rows = playerAttendance.slice(0, 20).map(player => [
      player.playerName,
      `${Math.round(player.attendanceRate * 100)}%`,
      player.gamesAttended || 0,
      player.totalGames || 0,
    ]);

    return this.renderSection(
      'Player Attendance',
      this.renderTable('Top 20 Players', headers, rows)
    );
  }
}