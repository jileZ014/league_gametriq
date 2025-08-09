/**
 * OpenTelemetry Instrumentation Library for Basketball League Management Platform
 * 
 * Provides comprehensive observability with basketball-specific metrics, traces, and logs
 * Optimized for microservices architecture with COPPA compliance monitoring
 * 
 * @version 1.0.0
 * @author Data Analyst Agent
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { trace, metrics, context, propagation, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { counter, histogram, gauge } from '@opentelemetry/api-metrics';
import * as os from 'os';

// Basketball-specific metric interfaces
export interface BasketballMetrics {
  // Game Metrics
  gamesTotal: ReturnType<typeof counter>;
  gamesCompletedRate: ReturnType<typeof counter>;
  activeLiveGames: ReturnType<typeof gauge>;
  liveScoringLatency: ReturnType<typeof histogram>;
  scoringEventsTotal: ReturnType<typeof counter>;
  tournamentParticipation: ReturnType<typeof gauge>;
  
  // User and Registration Metrics
  userRegistrations: ReturnType<typeof counter>;
  registrationFunnel: ReturnType<typeof counter>;
  concurrentUsers: ReturnType<typeof gauge>;
  websocketConnections: ReturnType<typeof gauge>;
  
  // Payment Metrics
  paymentsTotal: ReturnType<typeof counter>;
  paymentRevenue: ReturnType<typeof counter>;
  paymentSuccessRate: ReturnType<typeof counter>;
  
  // Safety and Compliance Metrics
  coppaDataAccess: ReturnType<typeof counter>;
  safetyIncidents: ReturnType<typeof counter>;
  weatherAlerts: ReturnType<typeof counter>;
  heatIndex: ReturnType<typeof gauge>;
  
  // System Performance Metrics
  httpRequestDuration: ReturnType<typeof histogram>;
  httpRequestsTotal: ReturnType<typeof counter>;
  databaseConnections: ReturnType<typeof gauge>;
  cacheHitRate: ReturnType<typeof counter>;
}

export class BasketballTelemetry {
  private sdk: NodeSDK;
  private tracer: any;
  private meter: any;
  private metrics: BasketballMetrics;
  private serviceName: string;
  private environment: string;

  constructor(serviceName: string, options: TelemetryOptions = {}) {
    this.serviceName = serviceName;
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    
    // Initialize OpenTelemetry SDK
    this.initializeSDK(options);
    this.initializeMetrics();
  }

  private initializeSDK(options: TelemetryOptions) {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: options.version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.environment,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'basketball-platform',
      // Basketball-specific attributes
      'basketball.league.type': options.leagueType || 'youth',
      'basketball.tenant.id': options.tenantId || 'default',
      'basketball.region': options.region || 'phoenix-az',
      'host.name': os.hostname(),
    });

    // Configure metric exporters
    const prometheusExporter = new PrometheusExporter({
      port: options.metricsPort || 9090,
      endpoint: '/metrics',
    });

    const otlpMetricExporter = new OTLPMetricExporter({
      url: options.otlpEndpoint || 'http://otel-collector:4318/v1/metrics',
    });

    // Configure trace exporters
    const jaegerExporter = new JaegerExporter({
      endpoint: options.jaegerEndpoint || 'http://jaeger:14268/api/traces',
    });

    this.sdk = new NodeSDK({
      resource,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-express': {
            requestHook: (span, info) => {
              // Add basketball-specific context to HTTP spans
              span.setAttributes({
                'basketball.request.type': info.req.headers['x-request-type'] || 'unknown',
                'basketball.user.type': info.req.headers['x-user-type'] || 'unknown',
                'basketball.league.id': info.req.headers['x-league-id'] || 'unknown',
                'basketball.coppa.required': info.req.headers['x-coppa-required'] === 'true',
              });
            },
          },
          '@opentelemetry/instrumentation-http': {
            requestHook: (span, request) => {
              span.setAttributes({
                'basketball.service.type': this.serviceName,
              });
            },
          },
          '@opentelemetry/instrumentation-pg': {
            enhancedDatabaseReporting: true,
          },
          '@opentelemetry/instrumentation-redis': {
            dbStatementSerializer: (cmdName, cmdArgs) => {
              // Sanitize sensitive data for COPPA compliance
              if (cmdArgs.some(arg => String(arg).includes('user_data'))) {
                return `${cmdName} [COPPA_PROTECTED_DATA]`;
              }
              return `${cmdName} ${cmdArgs.join(' ')}`;
            },
          },
        }),
      ],
      spanProcessor: new BatchSpanProcessor(jaegerExporter),
      metricReader: new PeriodicExportingMetricReader({
        exporter: otlpMetricExporter,
        exportIntervalMillis: 15000, // Export every 15 seconds for real-time monitoring
      }),
    });

    // Add console exporter for development
    if (this.environment === 'development') {
      this.sdk.addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()));
    }

    this.sdk.start();

    // Get tracer and meter instances
    this.tracer = trace.getTracer('basketball-platform', '1.0.0');
    this.meter = metrics.getMeter('basketball-platform', '1.0.0');
  }

  private initializeMetrics() {
    this.metrics = {
      // Game Metrics
      gamesTotal: this.meter.createCounter('basketball_games_total', {
        description: 'Total number of basketball games by status and league',
      }),
      gamesCompletedRate: this.meter.createCounter('basketball_games_completed_total', {
        description: 'Number of completed games',
      }),
      activeLiveGames: this.meter.createGauge('basketball_active_games_total', {
        description: 'Currently active live games',
      }),
      liveScoringLatency: this.meter.createHistogram('basketball_scoring_latency', {
        description: 'Latency of live scoring updates in seconds',
        boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
      }),
      scoringEventsTotal: this.meter.createCounter('basketball_scoring_events_total', {
        description: 'Total scoring events processed',
      }),
      tournamentParticipation: this.meter.createGauge('basketball_tournament_participants_total', {
        description: 'Active tournament participants',
      }),

      // User and Registration Metrics
      userRegistrations: this.meter.createCounter('basketball_user_registrations_total', {
        description: 'User registration events by type and step',
      }),
      registrationFunnel: this.meter.createCounter('basketball_registration_funnel_total', {
        description: 'Registration funnel conversion tracking',
      }),
      concurrentUsers: this.meter.createGauge('basketball_concurrent_users_total', {
        description: 'Concurrent active users by type',
      }),
      websocketConnections: this.meter.createGauge('basketball_websocket_connections_active', {
        description: 'Active WebSocket connections for live features',
      }),

      // Payment Metrics
      paymentsTotal: this.meter.createCounter('basketball_payments_total', {
        description: 'Payment transactions by status and type',
      }),
      paymentRevenue: this.meter.createCounter('basketball_payments_revenue_total', {
        description: 'Total revenue processed',
      }),
      paymentSuccessRate: this.meter.createCounter('basketball_payment_successes_total', {
        description: 'Successful payment transactions',
      }),

      // Safety and Compliance Metrics
      coppaDataAccess: this.meter.createCounter('coppa_data_access_total', {
        description: 'COPPA-regulated data access events',
      }),
      safetyIncidents: this.meter.createCounter('safety_incidents_total', {
        description: 'Youth safety incidents by type',
      }),
      weatherAlerts: this.meter.createCounter('weather_heat_alerts_total', {
        description: 'Heat safety alerts issued',
      }),
      heatIndex: this.meter.createGauge('weather_heat_index_fahrenheit', {
        description: 'Current heat index in Fahrenheit',
      }),

      // System Performance Metrics
      httpRequestDuration: this.meter.createHistogram('http_request_duration_seconds', {
        description: 'HTTP request duration in seconds',
        boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
      }),
      httpRequestsTotal: this.meter.createCounter('http_requests_total', {
        description: 'Total HTTP requests by method and status',
      }),
      databaseConnections: this.meter.createGauge('database_connections_active', {
        description: 'Active database connections',
      }),
      cacheHitRate: this.meter.createCounter('cache_operations_total', {
        description: 'Cache operations by type (hit/miss)',
      }),
    };
  }

  // Game-specific telemetry methods
  public recordGameEvent(eventType: GameEventType, attributes: GameEventAttributes) {
    const span = this.tracer.startSpan(`game.${eventType}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'basketball.game.id': attributes.gameId,
        'basketball.game.event': eventType,
        'basketball.league.id': attributes.leagueId,
        'basketball.tournament.id': attributes.tournamentId,
        'basketball.team.home': attributes.homeTeam,
        'basketball.team.away': attributes.awayTeam,
        'basketball.period': attributes.period,
        'basketball.score.home': attributes.homeScore,
        'basketball.score.away': attributes.awayScore,
      },
    });

    try {
      // Record metrics based on event type
      switch (eventType) {
        case 'game_started':
          this.metrics.gamesTotal.add(1, { status: 'active', league: attributes.leagueId });
          this.metrics.activeLiveGames.record(1, { game_id: attributes.gameId });
          break;
        case 'game_completed':
          this.metrics.gamesCompletedRate.add(1, { league: attributes.leagueId, tournament: attributes.tournamentId });
          this.metrics.activeLiveGames.record(0, { game_id: attributes.gameId });
          break;
        case 'scoring_event':
          const startTime = Date.now();
          this.metrics.scoringEventsTotal.add(1, {
            event_type: attributes.scoringType,
            game_id: attributes.gameId,
          });
          // Record latency if provided
          if (attributes.processingLatency) {
            this.metrics.liveScoringLatency.record(attributes.processingLatency / 1000);
          }
          break;
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.end();
      throw error;
    }
  }

  // User registration telemetry
  public recordUserRegistration(step: RegistrationStep, attributes: UserRegistrationAttributes) {
    const span = this.tracer.startSpan(`user.registration.${step}`, {
      attributes: {
        'basketball.user.type': attributes.userType,
        'basketball.league.id': attributes.leagueId,
        'basketball.user.age_group': attributes.ageGroup,
        'basketball.registration.step': step,
        'basketball.coppa.required': attributes.coppaRequired,
      },
    });

    this.metrics.userRegistrations.add(1, {
      step,
      user_type: attributes.userType,
      league: attributes.leagueId,
    });

    if (attributes.coppaRequired) {
      this.recordCoppaEvent('registration', {
        dataType: 'personal_info',
        userType: attributes.userType,
        accessType: 'create',
      });
    }

    span.end();
  }

  // Payment telemetry
  public recordPaymentTransaction(status: PaymentStatus, attributes: PaymentAttributes) {
    const span = this.tracer.startSpan(`payment.${status}`, {
      attributes: {
        'basketball.payment.type': attributes.paymentType,
        'basketball.payment.amount': attributes.amount,
        'basketball.payment.currency': attributes.currency,
        'basketball.league.id': attributes.leagueId,
        'basketball.user.type': attributes.userType,
      },
    });

    this.metrics.paymentsTotal.add(1, {
      status,
      payment_type: attributes.paymentType,
      league: attributes.leagueId,
    });

    if (status === 'success') {
      this.metrics.paymentRevenue.add(attributes.amount, {
        payment_type: attributes.paymentType,
        league: attributes.leagueId,
      });
      this.metrics.paymentSuccessRate.add(1, {
        payment_type: attributes.paymentType,
        league: attributes.leagueId,
      });
    }

    span.end();
  }

  // COPPA compliance telemetry
  public recordCoppaEvent(eventType: CoppaEventType, attributes: CoppaEventAttributes) {
    const span = this.tracer.startSpan(`coppa.${eventType}`, {
      attributes: {
        'coppa.data.type': attributes.dataType,
        'coppa.user.type': attributes.userType,
        'coppa.access.type': attributes.accessType,
        'coppa.parental_consent': attributes.parentalConsent || false,
      },
    });

    this.metrics.coppaDataAccess.add(1, {
      data_type: attributes.dataType,
      user_type: attributes.userType,
      access_type: attributes.accessType,
    });

    span.end();
  }

  // Safety incident telemetry
  public recordSafetyIncident(incidentType: SafetyIncidentType, attributes: SafetyIncidentAttributes) {
    const span = this.tracer.startSpan(`safety.incident.${incidentType}`, {
      attributes: {
        'safety.incident.type': incidentType,
        'safety.incident.severity': attributes.severity,
        'basketball.league.id': attributes.leagueId,
        'basketball.location': attributes.location,
      },
    });

    this.metrics.safetyIncidents.add(1, {
      incident_type: incidentType,
      severity: attributes.severity,
      league: attributes.leagueId,
    });

    span.end();
  }

  // Weather and heat safety telemetry (Phoenix-specific)
  public recordWeatherAlert(alertType: WeatherAlertType, attributes: WeatherAlertAttributes) {
    const span = this.tracer.startSpan(`weather.${alertType}`, {
      attributes: {
        'weather.alert.type': alertType,
        'weather.severity': attributes.severity,
        'weather.location': attributes.location,
        'weather.temperature': attributes.temperature,
        'weather.heat_index': attributes.heatIndex,
      },
    });

    if (alertType === 'heat_advisory') {
      this.metrics.weatherAlerts.add(1, {
        location: attributes.location,
        severity: attributes.severity,
      });
      this.metrics.heatIndex.record(attributes.heatIndex, {
        location: attributes.location,
        venue: attributes.venue,
      });
    }

    span.end();
  }

  // System performance telemetry
  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.metrics.httpRequestsTotal.add(1, {
      method,
      route,
      status: statusCode.toString(),
      service: this.serviceName,
    });

    this.metrics.httpRequestDuration.record(duration / 1000, {
      method,
      route,
      service: this.serviceName,
    });
  }

  // Database telemetry
  public recordDatabaseMetrics(activeConnections: number, poolUtilization: number) {
    this.metrics.databaseConnections.record(activeConnections, {
      service: this.serviceName,
    });
  }

  // Cache telemetry
  public recordCacheOperation(operation: 'hit' | 'miss', cacheType: string) {
    this.metrics.cacheHitRate.add(1, {
      operation,
      cache_type: cacheType,
      service: this.serviceName,
    });
  }

  // Utility methods
  public createSpan(name: string, attributes?: Record<string, any>) {
    return this.tracer.startSpan(name, { attributes });
  }

  public getActiveSpan() {
    return trace.getActiveSpan();
  }

  public withSpan<T>(span: any, fn: () => T): T {
    return context.with(trace.setSpan(context.active(), span), fn);
  }

  public async shutdown() {
    await this.sdk.shutdown();
  }
}

// Type definitions
export interface TelemetryOptions {
  environment?: string;
  version?: string;
  leagueType?: string;
  tenantId?: string;
  region?: string;
  metricsPort?: number;
  otlpEndpoint?: string;
  jaegerEndpoint?: string;
}

export type GameEventType = 
  | 'game_started' 
  | 'game_completed' 
  | 'game_cancelled' 
  | 'scoring_event' 
  | 'timeout' 
  | 'substitution'
  | 'foul'
  | 'technical_foul';

export interface GameEventAttributes {
  gameId: string;
  leagueId: string;
  tournamentId?: string;
  homeTeam: string;
  awayTeam: string;
  period?: number;
  homeScore?: number;
  awayScore?: number;
  scoringType?: string;
  processingLatency?: number;
}

export type RegistrationStep = 
  | 'started' 
  | 'personal_info' 
  | 'parent_consent' 
  | 'payment' 
  | 'background_check' 
  | 'completed';

export interface UserRegistrationAttributes {
  userType: 'player' | 'parent' | 'coach' | 'referee' | 'admin';
  leagueId: string;
  ageGroup?: string;
  coppaRequired: boolean;
}

export type PaymentStatus = 'success' | 'failed' | 'pending' | 'cancelled';

export interface PaymentAttributes {
  paymentType: 'registration' | 'tournament_fee' | 'equipment' | 'merchandise';
  amount: number;
  currency: string;
  leagueId: string;
  userType: string;
}

export type CoppaEventType = 'data_access' | 'data_modification' | 'data_deletion' | 'registration';

export interface CoppaEventAttributes {
  dataType: 'personal_info' | 'photos' | 'messages' | 'location' | 'performance_stats';
  userType: string;
  accessType: 'read' | 'create' | 'update' | 'delete';
  parentalConsent?: boolean;
}

export type SafetyIncidentType = 
  | 'injury' 
  | 'inappropriate_behavior' 
  | 'equipment_failure' 
  | 'facility_issue' 
  | 'heat_exhaustion'
  | 'background_check_failure';

export interface SafetyIncidentAttributes {
  severity: 'low' | 'medium' | 'high' | 'critical';
  leagueId: string;
  location: string;
  description?: string;
}

export type WeatherAlertType = 'heat_advisory' | 'severe_weather' | 'air_quality';

export interface WeatherAlertAttributes {
  severity: 'warning' | 'watch' | 'advisory';
  location: string;
  venue?: string;
  temperature: number;
  heatIndex: number;
}

// Factory function for easy initialization
export function createBasketballTelemetry(serviceName: string, options?: TelemetryOptions): BasketballTelemetry {
  return new BasketballTelemetry(serviceName, options);
}

// Middleware factory for Express.js
export function createTelemetryMiddleware(telemetry: BasketballTelemetry) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      telemetry.recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
    });
    
    next();
  };
}

export default BasketballTelemetry;