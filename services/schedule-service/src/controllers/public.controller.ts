import { Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import moment from 'moment-timezone';
import icalGenerator from 'ical-generator';
import rateLimit from 'express-rate-limit';

import {
  SeasonModel,
  DivisionModel,
  VenueModel,
  GameModel,
  Season,
  Game,
  Venue,
} from '../models/schedule.model';
import { logger, CacheService } from '../config/database';

// Rate limiting for public endpoints - 100 requests per minute per IP
export const publicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules for public endpoints
const tenantValidation = [
  param('tenantId').isUUID().withMessage('Tenant ID must be a valid UUID'),
];

const teamIdValidation = [
  param('teamId').isUUID().withMessage('Team ID must be a valid UUID'),
];

const gameIdValidation = [
  param('gameId').isUUID().withMessage('Game ID must be a valid UUID'),
];

export class PublicController {
  // GET /public/:tenantId/standings
  static async getStandings(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { tenantId } = req.params;
      const { season, division } = req.query;
      
      // Check cache first (5 minute TTL)
      const cacheKey = `public:standings:${tenantId}:${season || 'all'}:${division || 'all'}`;
      const cachedStandings = await CacheService.get(cacheKey);
      
      if (cachedStandings) {
        res.set({
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'ETag': `"${Buffer.from(JSON.stringify(cachedStandings)).toString('base64')}"`,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        });
        
        res.status(200).json({
          success: true,
          data: cachedStandings,
          cached: true,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get active seasons for tenant
      const seasons = await SeasonModel.findAll(tenantId, {
        status: season ? undefined : 'ACTIVE',
        league_id: season || undefined,
      });

      if (seasons.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No active seasons found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calculate standings for each season
      const standings = await Promise.all(
        seasons.map(async (seasonData) => {
          const games = await GameModel.findBySeasonId(seasonData.id!, tenantId);
          const completedGames = games.filter(g => g.status === 'COMPLETED');
          
          // Get divisions for this season
          const divisions = await DivisionModel.findBySeasonId(seasonData.id!, tenantId);
          
          // Calculate team standings
          const teamStats = new Map<string, {
            teamId: string;
            teamName: string;
            division: string;
            wins: number;
            losses: number;
            ties: number;
            pointsFor: number;
            pointsAgainst: number;
            winPercentage: number;
            streak: string;
          }>();

          completedGames.forEach(game => {
            // Initialize team stats if not exists
            [game.home_team_id, game.away_team_id].forEach(teamId => {
              if (!teamStats.has(teamId)) {
                teamStats.set(teamId, {
                  teamId,
                  teamName: `Team ${teamId.slice(0, 8)}`, // TODO: Get actual team names
                  division: 'Unknown', // TODO: Get division from team
                  wins: 0,
                  losses: 0,
                  ties: 0,
                  pointsFor: 0,
                  pointsAgainst: 0,
                  winPercentage: 0,
                  streak: '',
                });
              }
            });

            const homeStats = teamStats.get(game.home_team_id)!;
            const awayStats = teamStats.get(game.away_team_id)!;

            homeStats.pointsFor += game.home_score || 0;
            homeStats.pointsAgainst += game.away_score || 0;
            awayStats.pointsFor += game.away_score || 0;
            awayStats.pointsAgainst += game.home_score || 0;

            // Determine winner
            if (game.home_score === game.away_score) {
              homeStats.ties++;
              awayStats.ties++;
            } else if ((game.home_score || 0) > (game.away_score || 0)) {
              homeStats.wins++;
              awayStats.losses++;
            } else {
              homeStats.losses++;
              awayStats.wins++;
            }
          });

          // Calculate win percentages and sort
          const standingsArray = Array.from(teamStats.values()).map(stats => ({
            ...stats,
            winPercentage: (stats.wins + (stats.ties * 0.5)) / Math.max(1, stats.wins + stats.losses + stats.ties),
            gamesPlayed: stats.wins + stats.losses + stats.ties,
            pointDifferential: stats.pointsFor - stats.pointsAgainst,
          }));

          // Sort by win percentage, then by point differential
          standingsArray.sort((a, b) => {
            if (a.winPercentage !== b.winPercentage) {
              return b.winPercentage - a.winPercentage;
            }
            return b.pointDifferential - a.pointDifferential;
          });

          return {
            season: {
              id: seasonData.id,
              name: seasonData.name,
              slug: seasonData.slug,
            },
            divisions: divisions.map(div => ({
              id: div.id,
              name: div.name,
              code: div.code,
            })),
            standings: standingsArray,
            lastUpdated: new Date().toISOString(),
          };
        })
      );

      // Cache the results
      await CacheService.setex(cacheKey, 300, standings); // 5 minute cache

      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'ETag': `"${Buffer.from(JSON.stringify(standings)).toString('base64')}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });

      res.status(200).json({
        success: true,
        data: standings,
        cached: false,
        timestamp: new Date().toISOString(),
        meta: {
          seo: {
            title: 'League Standings',
            description: 'Current standings for all teams in the basketball league',
            keywords: 'basketball, standings, league, scores, rankings',
          },
          social: {
            ogTitle: 'League Standings',
            ogDescription: 'View current team standings and statistics',
            ogType: 'website',
          },
        },
      });
    } catch (error) {
      logger.error('Get public standings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve standings',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /public/:tenantId/schedule
  static async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { tenantId } = req.params;
      const { season, team, venue, date_from, date_to, limit = '50' } = req.query;

      // Check cache first
      const cacheKey = `public:schedule:${tenantId}:${season || 'all'}:${team || 'all'}:${venue || 'all'}:${date_from || ''}:${date_to || ''}:${limit}`;
      const cachedSchedule = await CacheService.get(cacheKey);

      if (cachedSchedule) {
        res.set({
          'Cache-Control': 'public, max-age=300',
          'ETag': `"${Buffer.from(JSON.stringify(cachedSchedule)).toString('base64')}"`,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        });
        
        res.status(200).json({
          success: true,
          data: cachedSchedule,
          cached: true,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get seasons
      const seasons = await SeasonModel.findAll(tenantId, {
        status: 'ACTIVE',
        league_id: season || undefined,
      });

      if (seasons.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No active seasons found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get games for all seasons
      const allGames = await Promise.all(
        seasons.map(s => GameModel.findBySeasonId(s.id!, tenantId))
      );
      
      let games = allGames.flat();

      // Apply filters
      if (team) {
        games = games.filter(g => g.home_team_id === team || g.away_team_id === team);
      }
      if (venue) {
        games = games.filter(g => g.venue_id === venue);
      }
      if (date_from) {
        games = games.filter(g => moment(g.scheduled_time).isAfter(moment(date_from as string)));
      }
      if (date_to) {
        games = games.filter(g => moment(g.scheduled_time).isBefore(moment(date_to as string)));
      }

      // Sort by scheduled time
      games.sort((a, b) => moment(a.scheduled_time).diff(moment(b.scheduled_time)));

      // Apply limit
      const limitNum = parseInt(limit as string, 10);
      if (limitNum > 0) {
        games = games.slice(0, limitNum);
      }

      // Format games with timezone conversion
      const formattedGames = games.map(game => ({
        id: game.id,
        gameNumber: game.game_number,
        homeTeam: {
          id: game.home_team_id,
          name: `Team ${game.home_team_id.slice(0, 8)}`, // TODO: Get actual names
        },
        awayTeam: {
          id: game.away_team_id,
          name: `Team ${game.away_team_id.slice(0, 8)}`, // TODO: Get actual names
        },
        venue: {
          id: game.venue_id,
          name: 'Venue Name', // TODO: Get actual venue name
        },
        scheduledTime: moment(game.scheduled_time).tz('America/Phoenix').format(),
        localTime: moment(game.scheduled_time).tz('America/Phoenix').format('YYYY-MM-DD HH:mm'),
        status: game.status,
        gameType: game.game_type,
        score: game.status === 'COMPLETED' ? {
          home: game.home_score,
          away: game.away_score,
          final: true,
        } : null,
      }));

      // Cache results
      await CacheService.setex(cacheKey, 300, formattedGames);

      res.set({
        'Cache-Control': 'public, max-age=300',
        'ETag': `"${Buffer.from(JSON.stringify(formattedGames)).toString('base64')}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });

      res.status(200).json({
        success: true,
        data: formattedGames,
        count: formattedGames.length,
        cached: false,
        timestamp: new Date().toISOString(),
        meta: {
          seo: {
            title: 'Game Schedule',
            description: 'Upcoming and completed basketball games schedule',
            keywords: 'basketball, schedule, games, fixtures, matches',
          },
          social: {
            ogTitle: 'Basketball Schedule',
            ogDescription: 'View upcoming games and recent results',
            ogType: 'website',
          },
        },
      });
    } catch (error) {
      logger.error('Get public schedule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve schedule',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /public/:tenantId/teams/:teamId
  static async getTeamDetails(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { tenantId, teamId } = req.params;

      // Check cache first
      const cacheKey = `public:team:${tenantId}:${teamId}`;
      const cachedTeam = await CacheService.get(cacheKey);

      if (cachedTeam) {
        res.set({
          'Cache-Control': 'public, max-age=300',
          'ETag': `"${Buffer.from(JSON.stringify(cachedTeam)).toString('base64')}"`,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        });
        
        res.status(200).json({
          success: true,
          data: cachedTeam,
          cached: true,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get team games from all active seasons
      const seasons = await SeasonModel.findAll(tenantId, { status: 'ACTIVE' });
      const allGames = await Promise.all(
        seasons.map(s => GameModel.findBySeasonId(s.id!, tenantId))
      );
      
      const teamGames = allGames.flat().filter(g => 
        g.home_team_id === teamId || g.away_team_id === teamId
      );

      if (teamGames.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Team not found or has no games',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calculate team statistics
      let wins = 0, losses = 0, ties = 0;
      let pointsFor = 0, pointsAgainst = 0;
      const recentGames = [];

      for (const game of teamGames) {
        const isHome = game.home_team_id === teamId;
        const teamScore = isHome ? game.home_score || 0 : game.away_score || 0;
        const opponentScore = isHome ? game.away_score || 0 : game.home_score || 0;

        if (game.status === 'COMPLETED') {
          pointsFor += teamScore;
          pointsAgainst += opponentScore;

          if (teamScore === opponentScore) {
            ties++;
          } else if (teamScore > opponentScore) {
            wins++;
          } else {
            losses++;
          }
        }

        recentGames.push({
          id: game.id,
          date: moment(game.scheduled_time).tz('America/Phoenix').format('YYYY-MM-DD'),
          opponent: {
            id: isHome ? game.away_team_id : game.home_team_id,
            name: `Team ${(isHome ? game.away_team_id : game.home_team_id).slice(0, 8)}`,
          },
          isHome,
          status: game.status,
          score: game.status === 'COMPLETED' ? {
            team: teamScore,
            opponent: opponentScore,
            result: teamScore === opponentScore ? 'T' : (teamScore > opponentScore ? 'W' : 'L'),
          } : null,
        });
      }

      // Sort recent games by date (most recent first)
      recentGames.sort((a, b) => moment(b.date).diff(moment(a.date)));

      const teamDetails = {
        id: teamId,
        name: `Team ${teamId.slice(0, 8)}`, // TODO: Get actual team name
        statistics: {
          wins,
          losses,
          ties,
          winPercentage: (wins + (ties * 0.5)) / Math.max(1, wins + losses + ties),
          pointsFor,
          pointsAgainst,
          pointDifferential: pointsFor - pointsAgainst,
          averagePointsFor: teamGames.length > 0 ? pointsFor / Math.max(1, wins + losses + ties) : 0,
          averagePointsAgainst: teamGames.length > 0 ? pointsAgainst / Math.max(1, wins + losses + ties) : 0,
        },
        recentGames: recentGames.slice(0, 10), // Last 10 games
        upcomingGames: recentGames.filter(g => g.status === 'SCHEDULED').slice(0, 5),
      };

      // Cache results
      await CacheService.setex(cacheKey, 300, teamDetails);

      res.set({
        'Cache-Control': 'public, max-age=300',
        'ETag': `"${Buffer.from(JSON.stringify(teamDetails)).toString('base64')}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });

      res.status(200).json({
        success: true,
        data: teamDetails,
        cached: false,
        timestamp: new Date().toISOString(),
        meta: {
          seo: {
            title: `Team ${teamId.slice(0, 8)} Profile`,
            description: `Statistics, recent games, and upcoming fixtures`,
            keywords: 'basketball, team, profile, statistics, games',
          },
          social: {
            ogTitle: `Team ${teamId.slice(0, 8)}`,
            ogDescription: `View team statistics and game history`,
            ogType: 'profile',
          },
        },
      });
    } catch (error) {
      logger.error('Get public team details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve team details',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /public/:tenantId/games/:gameId
  static async getGameDetails(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { tenantId, gameId } = req.params;

      // Check cache first
      const cacheKey = `public:game:${tenantId}:${gameId}`;
      const cachedGame = await CacheService.get(cacheKey);

      if (cachedGame) {
        res.set({
          'Cache-Control': 'public, max-age=300',
          'ETag': `"${Buffer.from(JSON.stringify(cachedGame)).toString('base64')}"`,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        });
        
        res.status(200).json({
          success: true,
          data: cachedGame,
          cached: true,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const game = await GameModel.findById(gameId, tenantId);
      
      if (!game) {
        res.status(404).json({
          success: false,
          error: 'Game not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get venue details
      const venue = await VenueModel.findById(game.venue_id, tenantId);

      const gameDetails = {
        id: game.id,
        gameNumber: game.game_number,
        gameType: game.game_type,
        homeTeam: {
          id: game.home_team_id,
          name: `Team ${game.home_team_id.slice(0, 8)}`, // TODO: Get actual name
          score: game.home_score,
        },
        awayTeam: {
          id: game.away_team_id,
          name: `Team ${game.away_team_id.slice(0, 8)}`, // TODO: Get actual name
          score: game.away_score,
        },
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          city: venue.city,
          state: venue.state,
          type: venue.type,
        } : null,
        scheduledTime: moment(game.scheduled_time).tz('America/Phoenix').format(),
        localTime: moment(game.scheduled_time).tz('America/Phoenix').format('YYYY-MM-DD HH:mm'),
        status: game.status,
        notes: game.notes,
        heatPolicyApplied: game.heat_policy_applied,
        officials: [], // TODO: Get officials when implemented
        createdAt: game.created_at,
        updatedAt: game.updated_at,
      };

      // Cache results (longer for completed games)
      const cacheTime = game.status === 'COMPLETED' ? 3600 : 300; // 1 hour for completed, 5 min for others
      await CacheService.setex(cacheKey, cacheTime, gameDetails);

      res.set({
        'Cache-Control': `public, max-age=${cacheTime}`,
        'ETag': `"${Buffer.from(JSON.stringify(gameDetails)).toString('base64')}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });

      res.status(200).json({
        success: true,
        data: gameDetails,
        cached: false,
        timestamp: new Date().toISOString(),
        meta: {
          seo: {
            title: `Game ${game.game_number}: ${gameDetails.homeTeam.name} vs ${gameDetails.awayTeam.name}`,
            description: `Basketball game details and score information`,
            keywords: 'basketball, game, score, teams, match',
          },
          social: {
            ogTitle: `${gameDetails.homeTeam.name} vs ${gameDetails.awayTeam.name}`,
            ogDescription: `Game ${game.game_number} - ${moment(game.scheduled_time).tz('America/Phoenix').format('MMM DD, YYYY')}`,
            ogType: 'article',
          },
        },
      });
    } catch (error) {
      logger.error('Get public game details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve game details',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /public/:tenantId/calendar.ics
  static async getCalendarICS(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { tenantId } = req.params;
      const { season, team } = req.query;

      // Check cache first
      const cacheKey = `public:calendar:${tenantId}:${season || 'all'}:${team || 'all'}`;
      const cachedICS = await CacheService.get(cacheKey);

      if (cachedICS) {
        res.set({
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="basketball-schedule.ics"',
          'Cache-Control': 'public, max-age=300',
          'ETag': `"${Buffer.from(cachedICS).toString('base64')}"`,
        });
        res.status(200).send(cachedICS);
        return;
      }

      // Get seasons
      const seasons = await SeasonModel.findAll(tenantId, {
        status: 'ACTIVE',
        league_id: season || undefined,
      });

      if (seasons.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No active seasons found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get all games
      const allGames = await Promise.all(
        seasons.map(s => GameModel.findBySeasonId(s.id!, tenantId))
      );
      
      let games = allGames.flat();

      // Filter by team if specified
      if (team) {
        games = games.filter(g => g.home_team_id === team || g.away_team_id === team);
      }

      // Create ICS calendar
      const cal = icalGenerator({
        domain: 'gametriq.com',
        name: 'Basketball League Schedule',
        description: 'Schedule for Basketball League games',
        timezone: 'America/Phoenix',
        prodId: {
          company: 'GameTriq',
          product: 'Basketball League Management Platform',
          language: 'EN',
        },
      });

      // Add games as events
      games.forEach(game => {
        const startTime = moment(game.scheduled_time).tz('America/Phoenix').toDate();
        const endTime = moment(game.scheduled_time).add(2, 'hours').tz('America/Phoenix').toDate();

        cal.createEvent({
          start: startTime,
          end: endTime,
          summary: `${game.home_team_id.slice(0, 8)} vs ${game.away_team_id.slice(0, 8)}`,
          description: [
            `Game ${game.game_number}`,
            `Type: ${game.game_type}`,
            `Status: ${game.status}`,
            game.notes ? `Notes: ${game.notes}` : '',
          ].filter(Boolean).join('\\n'),
          location: game.venue_id, // TODO: Get venue address
          uid: game.id,
          sequence: 0,
          status: 'CONFIRMED',
          busystatus: 'BUSY',
          categories: [
            {
              name: 'Basketball',
            },
            {
              name: game.game_type,
            },
          ],
        });
      });

      const icsContent = cal.toString();

      // Cache the ICS content
      await CacheService.setex(cacheKey, 300, icsContent);

      res.set({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="basketball-schedule.ics"',
        'Cache-Control': 'public, max-age=300',
        'ETag': `"${Buffer.from(icsContent).toString('base64')}"`,
      });

      res.status(200).send(icsContent);
    } catch (error) {
      logger.error('Get public calendar ICS error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate calendar',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Apply validation middleware to routes
PublicController.getStandings = [
  ...tenantValidation,
  PublicController.getStandings,
] as any;

PublicController.getSchedule = [
  ...tenantValidation,
  PublicController.getSchedule,
] as any;

PublicController.getTeamDetails = [
  ...tenantValidation,
  ...teamIdValidation,
  PublicController.getTeamDetails,
] as any;

PublicController.getGameDetails = [
  ...tenantValidation,
  ...gameIdValidation,
  PublicController.getGameDetails,
] as any;

PublicController.getCalendarICS = [
  ...tenantValidation,
  PublicController.getCalendarICS,
] as any;