import ical, { ICalCalendar, ICalEvent } from 'ical-generator';
import { Game, Team, Venue } from '../types';
import moment from 'moment-timezone';

export interface ICSExportOptions {
  teamId: string;
  teamName: string;
  games: Game[];
  venues: Map<string, Venue>;
  timezone: string;
  includeResults?: boolean;
}

export class ICSGenerator {
  /**
   * Generate ICS calendar file for team schedule
   */
  static generateTeamSchedule(options: ICSExportOptions): string {
    const {
      teamId,
      teamName,
      games,
      venues,
      timezone = 'America/Phoenix',
      includeResults = true
    } = options;

    // Create calendar
    const calendar = ical({
      name: `${teamName} Basketball Schedule`,
      description: `Game schedule for ${teamName} - Phoenix Flight Youth Basketball`,
      timezone,
      prodId: {
        company: 'Gametriq',
        product: 'Basketball League Manager',
        language: 'EN'
      },
      method: 'PUBLISH'
    });

    // Add games to calendar
    games.forEach(game => {
      const venue = venues.get(game.venueId);
      const isHome = game.homeTeamId === teamId;
      const opponent = isHome ? game.awayTeamName : game.homeTeamName;
      const gameType = game.gameType === 'PLAYOFF' ? '🏆 Playoff' : '';
      
      // Create event
      const event: Partial<ICalEvent> = {
        start: moment.tz(game.scheduledTime, timezone).toDate(),
        end: moment.tz(game.scheduledTime, timezone).add(90, 'minutes').toDate(),
        summary: `${gameType} ${isHome ? 'vs' : '@'} ${opponent}`,
        location: venue ? `${venue.name}, ${venue.address}, ${venue.city}, ${venue.state}` : 'TBD',
        description: this.buildEventDescription(game, isHome, includeResults),
        categories: [
          { name: 'Basketball' },
          { name: game.gameType },
          { name: isHome ? 'Home' : 'Away' }
        ],
        alarms: [
          {
            type: 'display',
            trigger: 3600, // 1 hour before
            description: `Game starting in 1 hour: ${isHome ? 'vs' : '@'} ${opponent}`
          }
        ],
        status: this.mapGameStatus(game.status),
        transparency: 'OPAQUE',
        busystatus: 'BUSY'
      };

      // Add custom properties for Phoenix heat safety
      if (venue && timezone === 'America/Phoenix') {
        event.x = [
          {
            key: 'X-HEAT-SAFETY',
            value: 'Check temperature before outdoor games'
          },
          {
            key: 'X-HEAT-THRESHOLD',
            value: '105F'
          }
        ];
      }

      // Add game result if completed
      if (game.status === 'COMPLETED' && includeResults) {
        const result = isHome 
          ? `W ${game.homeScore}-${game.awayScore}`
          : `L ${game.awayScore}-${game.homeScore}`;
        
        event.summary = `${event.summary} (${result})`;
      }

      calendar.createEvent(event);
    });

    // Add special events for Phoenix Flight
    this.addSpecialEvents(calendar, teamName, timezone);

    return calendar.toString();
  }

  /**
   * Build detailed event description
   */
  private static buildEventDescription(
    game: Game,
    isHome: boolean,
    includeResults: boolean
  ): string {
    const lines: string[] = [
      `Game #${game.gameNumber}`,
      `Division: ${game.divisionName}`,
      `Type: ${game.gameType}`,
      isHome ? 'Home Game' : 'Away Game'
    ];

    if (game.status === 'COMPLETED' && includeResults) {
      lines.push('');
      lines.push('Final Score:');
      lines.push(`${game.homeTeamName}: ${game.homeScore}`);
      lines.push(`${game.awayTeamName}: ${game.awayScore}`);
    }

    if (game.officials && game.officials.length > 0) {
      lines.push('');
      lines.push('Officials:');
      game.officials.forEach(official => {
        lines.push(`- ${official.name} (${official.role})`);
      });
    }

    if (game.notes) {
      lines.push('');
      lines.push(`Notes: ${game.notes}`);
    }

    // Add Phoenix-specific information
    lines.push('');
    lines.push('Phoenix Flight Youth Basketball');
    lines.push('Questions? Call 602-555-0100');
    
    return lines.join('\n');
  }

  /**
   * Map game status to ICS status
   */
  private static mapGameStatus(gameStatus: string): 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' {
    switch (gameStatus) {
      case 'SCHEDULED':
        return 'CONFIRMED';
      case 'POSTPONED':
        return 'TENTATIVE';
      case 'CANCELLED':
        return 'CANCELLED';
      default:
        return 'CONFIRMED';
    }
  }

  /**
   * Add special events for Phoenix Flight
   */
  private static addSpecialEvents(
    calendar: ICalCalendar,
    teamName: string,
    timezone: string
  ): void {
    // Add picture day
    calendar.createEvent({
      start: moment.tz('2024-03-15 09:00', timezone).toDate(),
      end: moment.tz('2024-03-15 12:00', timezone).toDate(),
      summary: `📸 Team Picture Day - ${teamName}`,
      location: 'Desert Sky Sports Complex',
      description: 'Team and individual photos. Uniforms required.',
      categories: [{ name: 'Special Event' }],
      alarms: [
        {
          type: 'display',
          trigger: 86400, // 1 day before
          description: 'Picture Day tomorrow - uniforms required!'
        }
      ]
    });

    // Add end of season party
    calendar.createEvent({
      start: moment.tz('2024-05-25 17:00', timezone).toDate(),
      end: moment.tz('2024-05-25 20:00', timezone).toDate(),
      summary: '🎉 End of Season Celebration',
      location: 'Steele Indian School Park',
      description: 'Awards ceremony and team celebration. All families welcome!',
      categories: [{ name: 'Special Event' }]
    });
  }

  /**
   * Validate ICS output
   */
  static validateICS(icsContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required headers
    if (!icsContent.includes('BEGIN:VCALENDAR')) {
      errors.push('Missing BEGIN:VCALENDAR');
    }
    if (!icsContent.includes('END:VCALENDAR')) {
      errors.push('Missing END:VCALENDAR');
    }
    if (!icsContent.includes('VERSION:2.0')) {
      errors.push('Missing VERSION:2.0');
    }
    if (!icsContent.includes('PRODID:')) {
      errors.push('Missing PRODID');
    }

    // Check for events
    const eventCount = (icsContent.match(/BEGIN:VEVENT/g) || []).length;
    if (eventCount === 0) {
      errors.push('No events found in calendar');
    }

    // Check timezone handling for Phoenix
    if (icsContent.includes('America/Phoenix')) {
      if (!icsContent.includes('TZID:America/Phoenix')) {
        errors.push('Phoenix timezone not properly defined');
      }
    }

    // Validate event structure
    const events = icsContent.split('BEGIN:VEVENT');
    events.slice(1).forEach((event, index) => {
      if (!event.includes('DTSTART')) {
        errors.push(`Event ${index + 1}: Missing DTSTART`);
      }
      if (!event.includes('DTEND')) {
        errors.push(`Event ${index + 1}: Missing DTEND`);
      }
      if (!event.includes('SUMMARY')) {
        errors.push(`Event ${index + 1}: Missing SUMMARY`);
      }
      if (!event.includes('UID')) {
        errors.push(`Event ${index + 1}: Missing UID`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate test ICS for demo
   */
  static generateDemoICS(): string {
    const demoGames: Game[] = [
      {
        id: 'game-demo-1',
        gameNumber: 501,
        homeTeamId: 'team-suns',
        homeTeamName: 'Phoenix Suns',
        awayTeamId: 'team-mercury',
        awayTeamName: 'Phoenix Mercury',
        venueId: 'venue-1',
        scheduledTime: moment.tz('2024-03-09 10:00', 'America/Phoenix').toDate(),
        status: 'SCHEDULED',
        gameType: 'REGULAR',
        divisionName: 'U12',
        homeScore: 0,
        awayScore: 0
      },
      {
        id: 'game-demo-2',
        gameNumber: 502,
        homeTeamId: 'team-rattlers',
        homeTeamName: 'Arizona Rattlers',
        awayTeamId: 'team-suns',
        awayTeamName: 'Phoenix Suns',
        venueId: 'venue-3',
        scheduledTime: moment.tz('2024-03-16 14:00', 'America/Phoenix').toDate(),
        status: 'SCHEDULED',
        gameType: 'REGULAR',
        divisionName: 'U12',
        homeScore: 0,
        awayScore: 0
      },
      {
        id: 'game-demo-3',
        gameNumber: 601,
        homeTeamId: 'team-suns',
        homeTeamName: 'Phoenix Suns',
        awayTeamId: 'team-hawks',
        awayTeamName: 'Valley Hawks',
        venueId: 'venue-1',
        scheduledTime: moment.tz('2024-03-23 10:00', 'America/Phoenix').toDate(),
        status: 'SCHEDULED',
        gameType: 'PLAYOFF',
        divisionName: 'U12',
        homeScore: 0,
        awayScore: 0
      }
    ];

    const demoVenues = new Map<string, Venue>([
      ['venue-1', {
        id: 'venue-1',
        name: 'Desert Sky Sports Complex',
        address: '3220 W Roosevelt St',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85009'
      }],
      ['venue-3', {
        id: 'venue-3',
        name: 'Paradise Valley Community Center',
        address: '17402 N 40th St',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85032'
      }]
    ]);

    return this.generateTeamSchedule({
      teamId: 'team-suns',
      teamName: 'Phoenix Suns',
      games: demoGames,
      venues: demoVenues,
      timezone: 'America/Phoenix',
      includeResults: false
    });
  }
}

// Type definitions
interface Game {
  id: string;
  gameNumber: number;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  venueId: string;
  scheduledTime: Date;
  status: string;
  gameType: string;
  divisionName: string;
  homeScore: number;
  awayScore: number;
  officials?: Array<{ name: string; role: string }>;
  notes?: string;
}

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}