import axios from 'axios';
import moment from 'moment-timezone';
import { logger } from '../config/database';
import { Venue, Game } from '../models/schedule.model';

// Phoenix heat policy constants
const PHOENIX_TIMEZONE = 'America/Phoenix';
const HEAT_INDEX_THRESHOLD = 105; // Fahrenheit
const EXTREME_HEAT_THRESHOLD = 115; // Fahrenheit
const DANGEROUS_HEAT_HOURS = {
  start: '11:00', // 11 AM
  end: '18:00',   // 6 PM
};

// Heat policy configuration
export interface HeatPolicyConfig {
  temperatureThreshold: number;
  extremeThreshold: number;
  dangerousHours: {
    start: string;
    end: string;
  };
  timezone: string;
  mandatoryBreakMinutes: number;
  maxGameDurationMinutes: number;
  weatherApiUrl?: string;
  weatherApiKey?: string;
}

export const DEFAULT_HEAT_POLICY: HeatPolicyConfig = {
  temperatureThreshold: HEAT_INDEX_THRESHOLD,
  extremeThreshold: EXTREME_HEAT_THRESHOLD,
  dangerousHours: DANGEROUS_HEAT_HOURS,
  timezone: PHOENIX_TIMEZONE,
  mandatoryBreakMinutes: 10,
  maxGameDurationMinutes: 90,
  weatherApiUrl: process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5',
  weatherApiKey: process.env.WEATHER_API_KEY,
};

// Heat warning levels
export enum HeatWarningLevel {
  NONE = 'NONE',
  CAUTION = 'CAUTION',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
  EXTREME = 'EXTREME',
}

// Heat policy result
export interface HeatPolicyResult {
  allowed: boolean;
  warningLevel: HeatWarningLevel;
  temperature: number;
  heatIndex: number;
  recommendations: string[];
  restrictions: string[];
  automaticCancellation: boolean;
  reason?: string;
}

// Weather data interface
interface WeatherData {
  temperature: number;
  humidity: number;
  heatIndex: number;
  conditions: string;
  windSpeed: number;
  timestamp: Date;
}

export class HeatPolicyService {
  private config: HeatPolicyConfig;

  constructor(config: HeatPolicyConfig = DEFAULT_HEAT_POLICY) {
    this.config = config;
  }

  /**
   * Check if a game can be scheduled based on heat policy
   */
  async checkGameScheduling(
    game: Partial<Game>,
    venue: Venue,
    scheduledTime: Date
  ): Promise<HeatPolicyResult> {
    try {
      // Only apply heat policy to outdoor venues
      if (venue.type !== 'OUTDOOR') {
        return {
          allowed: true,
          warningLevel: HeatWarningLevel.NONE,
          temperature: 0,
          heatIndex: 0,
          recommendations: [],
          restrictions: [],
          automaticCancellation: false,
        };
      }

      // Convert scheduled time to Phoenix timezone
      const phoenixTime = moment(scheduledTime).tz(this.config.timezone);
      const gameHour = phoenixTime.format('HH:mm');

      // Get weather forecast for the scheduled time
      const weatherData = await this.getWeatherForecast(
        venue.city,
        venue.state,
        scheduledTime
      );

      // Calculate heat policy result
      const result = this.evaluateHeatConditions(
        weatherData,
        phoenixTime,
        gameHour
      );

      logger.info('Heat policy check completed', {
        gameId: game.id,
        venueId: venue.id,
        venueName: venue.name,
        scheduledTime: phoenixTime.format(),
        temperature: result.temperature,
        heatIndex: result.heatIndex,
        warningLevel: result.warningLevel,
        allowed: result.allowed,
      });

      return result;
    } catch (error) {
      logger.error('Heat policy check failed:', error);
      
      // In case of error, apply conservative approach
      return {
        allowed: false,
        warningLevel: HeatWarningLevel.WARNING,
        temperature: 0,
        heatIndex: 0,
        recommendations: ['Unable to verify weather conditions'],
        restrictions: ['Game scheduling suspended due to weather service error'],
        automaticCancellation: false,
        reason: 'Weather service unavailable',
      };
    }
  }

  /**
   * Check current heat conditions for an ongoing game
   */
  async checkOngoingGame(
    gameId: string,
    venue: Venue
  ): Promise<HeatPolicyResult> {
    try {
      if (venue.type !== 'OUTDOOR') {
        return {
          allowed: true,
          warningLevel: HeatWarningLevel.NONE,
          temperature: 0,
          heatIndex: 0,
          recommendations: [],
          restrictions: [],
          automaticCancellation: false,
        };
      }

      const currentTime = moment().tz(this.config.timezone);
      const weatherData = await this.getCurrentWeather(venue.city, venue.state);
      
      const result = this.evaluateHeatConditions(
        weatherData,
        currentTime,
        currentTime.format('HH:mm')
      );

      // For ongoing games, be more lenient but add safety measures
      if (result.warningLevel === HeatWarningLevel.EXTREME) {
        result.automaticCancellation = true;
        result.reason = 'Extreme heat conditions detected - game must be stopped';
      } else if (result.warningLevel === HeatWarningLevel.DANGER) {
        result.restrictions.push('Mandatory 10-minute break every 20 minutes');
        result.restrictions.push('Unlimited water timeouts allowed');
      }

      logger.info('Ongoing game heat check completed', {
        gameId,
        venueId: venue.id,
        temperature: result.temperature,
        heatIndex: result.heatIndex,
        warningLevel: result.warningLevel,
        automaticCancellation: result.automaticCancellation,
      });

      return result;
    } catch (error) {
      logger.error('Ongoing game heat check failed:', error);
      
      return {
        allowed: true, // Don't stop ongoing games due to technical issues
        warningLevel: HeatWarningLevel.WARNING,
        temperature: 0,
        heatIndex: 0,
        recommendations: ['Monitor players for heat-related symptoms'],
        restrictions: ['Increase water break frequency'],
        automaticCancellation: false,
        reason: 'Weather monitoring unavailable',
      };
    }
  }

  /**
   * Get heat warnings for a specific date range and venues
   */
  async getHeatWarnings(
    venues: Venue[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, HeatPolicyResult[]>> {
    const warnings = new Map<string, HeatPolicyResult[]>();

    for (const venue of venues.filter(v => v.type === 'OUTDOOR')) {
      const venueWarnings: HeatPolicyResult[] = [];
      
      // Check each day in the range
      const currentDate = moment(startDate).tz(this.config.timezone);
      const endMoment = moment(endDate).tz(this.config.timezone);

      while (currentDate.isSameOrBefore(endMoment, 'day')) {
        try {
          // Check multiple times during dangerous hours
          const dangerousStart = currentDate.clone().hour(11).minute(0);
          const dangerousEnd = currentDate.clone().hour(18).minute(0);
          
          while (dangerousStart.isSameOrBefore(dangerousEnd)) {
            const weatherData = await this.getWeatherForecast(
              venue.city,
              venue.state,
              dangerousStart.toDate()
            );

            const result = this.evaluateHeatConditions(
              weatherData,
              dangerousStart,
              dangerousStart.format('HH:mm')
            );

            if (result.warningLevel !== HeatWarningLevel.NONE) {
              venueWarnings.push({
                ...result,
                reason: `Heat warning for ${dangerousStart.format('MMM DD, HH:mm')}`,
              });
            }

            dangerousStart.add(2, 'hours'); // Check every 2 hours
          }
        } catch (error) {
          logger.error('Heat warning check failed:', {
            venue: venue.name,
            date: currentDate.format('YYYY-MM-DD'),
            error,
          });
        }

        currentDate.add(1, 'day');
      }

      if (venueWarnings.length > 0) {
        warnings.set(venue.id, venueWarnings);
      }
    }

    return warnings;
  }

  /**
   * Evaluate heat conditions and return policy result
   */
  private evaluateHeatConditions(
    weatherData: WeatherData,
    gameTime: moment.Moment,
    gameHour: string
  ): HeatPolicyResult {
    const result: HeatPolicyResult = {
      allowed: true,
      warningLevel: HeatWarningLevel.NONE,
      temperature: weatherData.temperature,
      heatIndex: weatherData.heatIndex,
      recommendations: [],
      restrictions: [],
      automaticCancellation: false,
    };

    // Check if game is during dangerous hours
    const isDangerousTime = this.isDuringDangerousHours(gameHour);

    // Evaluate based on heat index
    if (weatherData.heatIndex >= this.config.extremeThreshold) {
      result.warningLevel = HeatWarningLevel.EXTREME;
      result.allowed = false;
      result.automaticCancellation = true;
      result.reason = `Extreme heat index: ${weatherData.heatIndex}°F exceeds ${this.config.extremeThreshold}°F limit`;
      result.restrictions.push('Game cannot be played - automatic cancellation required');
    } else if (weatherData.heatIndex >= this.config.temperatureThreshold) {
      if (isDangerousTime) {
        result.warningLevel = HeatWarningLevel.DANGER;
        result.allowed = false;
        result.reason = `Heat index ${weatherData.heatIndex}°F during dangerous hours (${this.config.dangerousHours.start}-${this.config.dangerousHours.end})`;
        result.restrictions.push('Game must be rescheduled outside dangerous hours');
      } else {
        result.warningLevel = HeatWarningLevel.WARNING;
        result.allowed = true;
        result.restrictions.push('Mandatory 10-minute break every 20 minutes');
        result.restrictions.push('Unlimited water timeouts');
        result.restrictions.push('Monitor all participants for heat exhaustion symptoms');
      }
    } else if (weatherData.heatIndex >= this.config.temperatureThreshold - 10) {
      if (isDangerousTime) {
        result.warningLevel = HeatWarningLevel.WARNING;
        result.recommendations.push('Consider rescheduling to earlier or later time');
        result.restrictions.push('Increase water break frequency');
      } else {
        result.warningLevel = HeatWarningLevel.CAUTION;
        result.recommendations.push('Ensure adequate hydration');
        result.recommendations.push('Monitor participants for heat stress');
      }
    }

    // Add general Phoenix summer recommendations
    if (gameTime.month() >= 4 && gameTime.month() <= 9) { // May through October
      result.recommendations.push('Provide shade for players and spectators');
      result.recommendations.push('Encourage light-colored clothing');
      result.recommendations.push('Have cooling towels available');
      result.recommendations.push('Consider misting systems if available');
    }

    return result;
  }

  /**
   * Check if game time is during dangerous hours
   */
  private isDuringDangerousHours(gameHour: string): boolean {
    const startHour = this.config.dangerousHours.start;
    const endHour = this.config.dangerousHours.end;
    
    return gameHour >= startHour && gameHour <= endHour;
  }

  /**
   * Get current weather data
   */
  private async getCurrentWeather(city: string, state: string): Promise<WeatherData> {
    if (!this.config.weatherApiKey) {
      // Return mock data for development
      return this.getMockWeatherData();
    }

    try {
      const response = await axios.get(
        `${this.config.weatherApiUrl}/weather`,
        {
          params: {
            q: `${city},${state},US`,
            appid: this.config.weatherApiKey,
            units: 'imperial',
          },
          timeout: 5000,
        }
      );

      const data = response.data;
      const temperature = data.main.temp;
      const humidity = data.main.humidity;
      
      return {
        temperature,
        humidity,
        heatIndex: this.calculateHeatIndex(temperature, humidity),
        conditions: data.weather[0].description,
        windSpeed: data.wind.speed,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Current weather API error:', error);
      return this.getMockWeatherData();
    }
  }

  /**
   * Get weather forecast data
   */
  private async getWeatherForecast(
    city: string,
    state: string,
    targetTime: Date
  ): Promise<WeatherData> {
    if (!this.config.weatherApiKey) {
      return this.getMockWeatherData();
    }

    try {
      const response = await axios.get(
        `${this.config.weatherApiUrl}/forecast`,
        {
          params: {
            q: `${city},${state},US`,
            appid: this.config.weatherApiKey,
            units: 'imperial',
          },
          timeout: 5000,
        }
      );

      // Find the closest forecast to target time
      const forecasts = response.data.list;
      const targetTimestamp = targetTime.getTime();
      
      let closestForecast = forecasts[0];
      let closestDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - targetTimestamp);

      for (const forecast of forecasts) {
        const forecastTime = new Date(forecast.dt * 1000).getTime();
        const diff = Math.abs(forecastTime - targetTimestamp);
        
        if (diff < closestDiff) {
          closestDiff = diff;
          closestForecast = forecast;
        }
      }

      const temperature = closestForecast.main.temp;
      const humidity = closestForecast.main.humidity;

      return {
        temperature,
        humidity,
        heatIndex: this.calculateHeatIndex(temperature, humidity),
        conditions: closestForecast.weather[0].description,
        windSpeed: closestForecast.wind.speed,
        timestamp: new Date(closestForecast.dt * 1000),
      };
    } catch (error) {
      logger.error('Weather forecast API error:', error);
      return this.getMockWeatherData();
    }
  }

  /**
   * Calculate heat index using temperature and humidity
   */
  private calculateHeatIndex(temperature: number, humidity: number): number {
    if (temperature < 80) {
      return temperature;
    }

    // Rothfusz regression equation for heat index calculation
    const T = temperature;
    const RH = humidity;

    let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));

    if (HI >= 80) {
      const c1 = -42.379;
      const c2 = 2.04901523;
      const c3 = 10.14333127;
      const c4 = -0.22475541;
      const c5 = -0.00683783;
      const c6 = -0.05481717;
      const c7 = 0.00122874;
      const c8 = 0.00085282;
      const c9 = -0.00000199;

      HI = c1 + (c2 * T) + (c3 * RH) + (c4 * T * RH) + 
           (c5 * T * T) + (c6 * RH * RH) + (c7 * T * T * RH) + 
           (c8 * T * RH * RH) + (c9 * T * T * RH * RH);

      // Adjustments for low humidity or high temperature
      if (RH < 13 && T >= 80 && T <= 112) {
        HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
      } else if (RH > 85 && T >= 80 && T <= 87) {
        HI += ((RH - 85) / 10) * ((87 - T) / 5);
      }
    }

    return Math.round(HI);
  }

  /**
   * Get mock weather data for development/testing
   */
  private getMockWeatherData(): WeatherData {
    const baseTemp = 95 + Math.random() * 20; // 95-115°F
    const humidity = 20 + Math.random() * 40; // 20-60%
    
    return {
      temperature: Math.round(baseTemp),
      humidity: Math.round(humidity),
      heatIndex: this.calculateHeatIndex(baseTemp, humidity),
      conditions: 'clear sky',
      windSpeed: 5 + Math.random() * 10,
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const heatPolicyService = new HeatPolicyService();

// Utility functions for easy access
export const checkHeatPolicy = (game: Partial<Game>, venue: Venue, scheduledTime: Date) =>
  heatPolicyService.checkGameScheduling(game, venue, scheduledTime);

export const checkOngoingGameHeat = (gameId: string, venue: Venue) =>
  heatPolicyService.checkOngoingGame(gameId, venue);

export const getVenueHeatWarnings = (venues: Venue[], startDate: Date, endDate: Date) =>
  heatPolicyService.getHeatWarnings(venues, startDate, endDate);