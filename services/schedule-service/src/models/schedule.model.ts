import { Knex } from 'knex';
import { getDB, trackQuery, logger } from '../config/database';

// Base model interface
interface BaseModel {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// Season model
export interface Season extends BaseModel {
  league_id: string;
  name: string;
  slug: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  registration_start: Date;
  registration_deadline: Date;
  status: 'UPCOMING' | 'REGISTRATION_OPEN' | 'ACTIVE' | 'COMPLETED';
  registration_fee: number;
  currency: string;
  settings: Record<string, any>;
  max_games_per_team: number;
  playoffs_enabled: boolean;
  playoff_format: Record<string, any>;
  organization_id: string;
}

// Division model
export interface Division extends BaseModel {
  league_id: string;
  name: string;
  code: string;
  description?: string;
  min_age: number;
  max_age: number;
  skill_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'COMPETITIVE';
  gender: 'MALE' | 'FEMALE' | 'COED';
  max_teams: number;
  min_teams_to_start: number;
  max_players_per_team: number;
  min_players_per_team: number;
  rules: Record<string, any>;
  additional_fee: number;
  requires_tryouts: boolean;
  tryout_date?: Date;
  organization_id: string;
}

// Venue model
export interface Venue extends BaseModel {
  organization_id: string;
  name: string;
  venue_code: string;
  type: 'INDOOR' | 'OUTDOOR' | 'HYBRID';
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  location?: any; // PostGIS point
  contact_info: Record<string, any>;
  operating_hours: Record<string, any>;
  active: boolean;
  rental_cost_per_hour: number;
  currency: string;
  capacity: number;
  accessible: boolean;
  directions?: string;
  parking_info?: string;
}

// Court model
export interface Court extends BaseModel {
  venue_id: string;
  name: string;
  type: 'FULL' | 'HALF' | 'PRACTICE';
  surface: 'HARDWOOD' | 'SYNTHETIC' | 'OUTDOOR';
  size: 'REGULATION' | 'YOUTH' | 'CUSTOM';
  length_feet: number;
  width_feet: number;
  active: boolean;
  amenities: Record<string, any>;
  maintenance_notes?: string;
}

// Venue Availability model
export interface VenueAvailability extends BaseModel {
  venue_id: string;
  court_id?: string;
  day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  start_time: string; // Time format HH:MM
  end_time: string; // Time format HH:MM
  availability_type: 'AVAILABLE' | 'BLOCKED' | 'MAINTENANCE';
  cost_per_hour: number;
  priority: number;
  effective_date: Date;
  expiry_date?: Date;
  notes?: string;
}

// Game model
export interface Game extends BaseModel {
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  venue_id: string;
  court_id?: string;
  game_number: string;
  game_type: 'REGULAR' | 'PLAYOFF' | 'CHAMPIONSHIP' | 'SCRIMMAGE';
  scheduled_time: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FORFEITED' | 'POSTPONED';
  home_score: number;
  away_score: number;
  winner_team_id?: string;
  notes?: string;
  cancelled_reason?: string;
  forfeiting_team_id?: string;
  temperature_f?: number;
  weather_conditions?: Record<string, any>;
  heat_policy_applied: boolean;
  created_by: string;
  organization_id: string;
}

// Blackout Date model
export interface BlackoutDate extends BaseModel {
  season_id: string;
  organization_id: string;
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  type: 'HOLIDAY' | 'MAINTENANCE' | 'WEATHER' | 'EVENT' | 'OTHER';
  affects_venues: string[]; // Array of venue IDs
  affects_divisions: string[]; // Array of division IDs
  created_by: string;
}

// Schedule Generation Log model
export interface ScheduleGenerationLog extends BaseModel {
  season_id: string;
  organization_id: string;
  algorithm: string;
  parameters: Record<string, any>;
  games_generated: number;
  conflicts_detected: number;
  generation_time_ms: number;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  error_message?: string;
  created_by: string;
}

// Model classes with database operations
export class SeasonModel {
  private static tableName = 'seasons';

  static async findAll(organizationId: string, filters?: any): Promise<Season[]> {
    const query = trackQuery(this.tableName, 'findAll');
    try {
      const db = getDB();
      let queryBuilder = db(this.tableName)
        .where('organization_id', organizationId)
        .orderBy('start_date', 'desc');

      if (filters?.status) {
        queryBuilder = queryBuilder.where('status', filters.status);
      }

      if (filters?.league_id) {
        queryBuilder = queryBuilder.where('league_id', filters.league_id);
      }

      const result = await queryBuilder;
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('SeasonModel.findAll error:', error);
      throw error;
    }
  }

  static async findById(id: string, organizationId: string): Promise<Season | null> {
    const query = trackQuery(this.tableName, 'findById');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .first();
      query.end();
      return result || null;
    } catch (error) {
      query.end();
      logger.error('SeasonModel.findById error:', error);
      throw error;
    }
  }

  static async create(season: Partial<Season>): Promise<Season> {
    const query = trackQuery(this.tableName, 'create');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .insert({
          ...season,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('SeasonModel.create error:', error);
      throw error;
    }
  }

  static async update(id: string, organizationId: string, updates: Partial<Season>): Promise<Season | null> {
    const query = trackQuery(this.tableName, 'update');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result || null;
    } catch (error) {
      query.end();
      logger.error('SeasonModel.update error:', error);
      throw error;
    }
  }

  static async delete(id: string, organizationId: string): Promise<boolean> {
    const query = trackQuery(this.tableName, 'delete');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .del();
      query.end();
      return result > 0;
    } catch (error) {
      query.end();
      logger.error('SeasonModel.delete error:', error);
      throw error;
    }
  }
}

export class DivisionModel {
  private static tableName = 'divisions';

  static async findBySeasonId(seasonId: string, organizationId: string): Promise<Division[]> {
    const query = trackQuery(this.tableName, 'findBySeasonId');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .join('seasons', 'divisions.league_id', 'seasons.league_id')
        .where('seasons.id', seasonId)
        .where('divisions.organization_id', organizationId)
        .select('divisions.*')
        .orderBy('divisions.name');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('DivisionModel.findBySeasonId error:', error);
      throw error;
    }
  }

  static async findById(id: string, organizationId: string): Promise<Division | null> {
    const query = trackQuery(this.tableName, 'findById');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .first();
      query.end();
      return result || null;
    } catch (error) {
      query.end();
      logger.error('DivisionModel.findById error:', error);
      throw error;
    }
  }

  static async create(division: Partial<Division>): Promise<Division> {
    const query = trackQuery(this.tableName, 'create');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .insert({
          ...division,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('DivisionModel.create error:', error);
      throw error;
    }
  }

  static async update(id: string, organizationId: string, updates: Partial<Division>): Promise<Division | null> {
    const query = trackQuery(this.tableName, 'update');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result || null;
    } catch (error) {
      query.end();
      logger.error('DivisionModel.update error:', error);
      throw error;
    }
  }

  static async delete(id: string, organizationId: string): Promise<boolean> {
    const query = trackQuery(this.tableName, 'delete');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .del();
      query.end();
      return result > 0;
    } catch (error) {
      query.end();
      logger.error('DivisionModel.delete error:', error);
      throw error;
    }
  }
}

export class VenueModel {
  private static tableName = 'venues';

  static async findAll(organizationId: string, filters?: any): Promise<Venue[]> {
    const query = trackQuery(this.tableName, 'findAll');
    try {
      const db = getDB();
      let queryBuilder = db(this.tableName)
        .where('organization_id', organizationId)
        .orderBy('name');

      if (filters?.active !== undefined) {
        queryBuilder = queryBuilder.where('active', filters.active);
      }

      if (filters?.type) {
        queryBuilder = queryBuilder.where('type', filters.type);
      }

      const result = await queryBuilder;
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('VenueModel.findAll error:', error);
      throw error;
    }
  }

  static async findById(id: string, organizationId: string): Promise<Venue | null> {
    const query = trackQuery(this.tableName, 'findById');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .first();
      query.end();
      return result || null;
    } catch (error) {
      query.end();
      logger.error('VenueModel.findById error:', error);
      throw error;
    }
  }

  static async create(venue: Partial<Venue>): Promise<Venue> {
    const query = trackQuery(this.tableName, 'create');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .insert({
          ...venue,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('VenueModel.create error:', error);
      throw error;
    }
  }

  static async update(id: string, organizationId: string, updates: Partial<Venue>): Promise<Venue | null> {
    const query = trackQuery(this.tableName, 'update');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result || null;
    } catch (error) {
      query.end();
      logger.error('VenueModel.update error:', error);
      throw error;
    }
  }

  static async delete(id: string, organizationId: string): Promise<boolean> {
    const query = trackQuery(this.tableName, 'delete');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .del();
      query.end();
      return result > 0;
    } catch (error) {
      query.end();
      logger.error('VenueModel.delete error:', error);
      throw error;
    }
  }
}

export class GameModel {
  private static tableName = 'games';

  static async findBySeasonId(seasonId: string, organizationId: string): Promise<Game[]> {
    const query = trackQuery(this.tableName, 'findBySeasonId');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ season_id: seasonId, organization_id: organizationId })
        .orderBy('scheduled_time');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('GameModel.findBySeasonId error:', error);
      throw error;
    }
  }

  static async findById(id: string, organizationId: string): Promise<Game | null> {
    const query = trackQuery(this.tableName, 'findById');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .first();
      query.end();
      return result || null;
    } catch (error) {
      query.end();
      logger.error('GameModel.findById error:', error);
      throw error;
    }
  }

  static async create(game: Partial<Game>): Promise<Game> {
    const query = trackQuery(this.tableName, 'create');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .insert({
          ...game,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('GameModel.create error:', error);
      throw error;
    }
  }

  static async bulkCreate(games: Partial<Game>[]): Promise<Game[]> {
    const query = trackQuery(this.tableName, 'bulkCreate');
    try {
      const db = getDB();
      const now = new Date();
      const gamesWithTimestamps = games.map(game => ({
        ...game,
        created_at: now,
        updated_at: now,
      }));
      
      const result = await db(this.tableName)
        .insert(gamesWithTimestamps)
        .returning('*');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('GameModel.bulkCreate error:', error);
      throw error;
    }
  }

  static async update(id: string, organizationId: string, updates: Partial<Game>): Promise<Game | null> {
    const query = trackQuery(this.tableName, 'update');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .where({ id, organization_id: organizationId })
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result || null;
    } catch (error) {
      query.end();
      logger.error('GameModel.update error:', error);
      throw error;
    }
  }

  static async findConflicts(
    venueId: string,
    scheduledTime: Date,
    duration: number, // duration in minutes
    excludeGameId?: string
  ): Promise<Game[]> {
    const query = trackQuery(this.tableName, 'findConflicts');
    try {
      const db = getDB();
      const endTime = new Date(scheduledTime.getTime() + duration * 60 * 1000);
      
      let queryBuilder = db(this.tableName)
        .where('venue_id', venueId)
        .where('status', '!=', 'CANCELLED')
        .where((builder) => {
          builder
            .whereBetween('scheduled_time', [scheduledTime, endTime])
            .orWhere((subBuilder) => {
              subBuilder
                .where('scheduled_time', '<=', scheduledTime)
                .whereRaw(
                  "scheduled_time + INTERVAL '120 minutes' > ?",
                  [scheduledTime]
                );
            });
        });

      if (excludeGameId) {
        queryBuilder = queryBuilder.whereNot('id', excludeGameId);
      }

      const result = await queryBuilder;
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('GameModel.findConflicts error:', error);
      throw error;
    }
  }
}

export class VenueAvailabilityModel {
  private static tableName = 'venue_availability';

  static async findByVenueId(venueId: string): Promise<VenueAvailability[]> {
    const query = trackQuery(this.tableName, 'findByVenueId');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where('venue_id', venueId)
        .where((builder) => {
          builder
            .whereNull('expiry_date')
            .orWhere('expiry_date', '>', new Date());
        })
        .orderBy('day_of_week')
        .orderBy('start_time');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('VenueAvailabilityModel.findByVenueId error:', error);
      throw error;
    }
  }

  static async create(availability: Partial<VenueAvailability>): Promise<VenueAvailability> {
    const query = trackQuery(this.tableName, 'create');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .insert({
          ...availability,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('VenueAvailabilityModel.create error:', error);
      throw error;
    }
  }
}

export class BlackoutDateModel {
  private static tableName = 'blackout_dates';

  static async findBySeasonId(seasonId: string, organizationId: string): Promise<BlackoutDate[]> {
    const query = trackQuery(this.tableName, 'findBySeasonId');
    try {
      const db = getDB();
      const result = await db(this.tableName)
        .where({ season_id: seasonId, organization_id: organizationId })
        .orderBy('start_date');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('BlackoutDateModel.findBySeasonId error:', error);
      throw error;
    }
  }

  static async create(blackoutDate: Partial<BlackoutDate>): Promise<BlackoutDate> {
    const query = trackQuery(this.tableName, 'create');
    try {
      const db = getDB();
      const [result] = await db(this.tableName)
        .insert({
          ...blackoutDate,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      query.end();
      return result;
    } catch (error) {
      query.end();
      logger.error('BlackoutDateModel.create error:', error);
      throw error;
    }
  }
}