import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.configService.get('environment') === 'production';
    
    return {
      type: 'postgres',
      host: this.configService.get('database.host'),
      port: this.configService.get('database.port'),
      username: this.configService.get('database.username'),
      password: this.configService.get('database.password'),
      database: this.configService.get('database.database'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: !isProduction && this.configService.get('database.synchronize'),
      logging: this.configService.get('database.logging'),
      ssl: this.configService.get('database.ssl'),
      autoLoadEntities: true,
      migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
      migrationsTableName: 'migrations',
      migrationsRun: isProduction,
      cache: {
        type: 'redis',
        options: {
          host: this.configService.get('redis.host'),
          port: this.configService.get('redis.port'),
          password: this.configService.get('redis.password'),
        },
        duration: 30000, // 30 seconds
      },
      extra: {
        // Optimized connection pool for tournament day traffic
        max: this.configService.get('performance.database.connectionPool.max', 20),
        min: this.configService.get('performance.database.connectionPool.min', 2),
        
        // Connection timeouts optimized for basketball league operations
        idleTimeoutMillis: this.configService.get('performance.database.connectionPool.idle', 10000),
        connectionTimeoutMillis: this.configService.get('performance.database.connectionPool.acquire', 30000),
        
        // Query optimization for sub-50ms average response time
        statement_timeout: this.configService.get('performance.database.queryOptimization.statementTimeoutMillis', 30000),
        query_timeout: this.configService.get('performance.database.queryOptimization.statementTimeoutMillis', 30000),
        
        // Connection validation for reliability
        testOnBorrow: this.configService.get('performance.database.queryOptimization.testOnBorrow', true),
        evictionRunIntervalMillis: this.configService.get('performance.database.connectionPool.evict', 60000),
        
        // SSL and security settings
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        
        // Performance optimization settings
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        
        // Application-specific settings for basketball league
        application_name: 'basketball-league-api',
        
        // Connection pool behavior
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        
        // Prepared statement cache for repeated queries
        prepareThreshold: 5,
        
        // Connection limits for high concurrency
        maxUses: 7500, // Connections will be destroyed after 7500 uses
        
        // Error handling
        parseInputDatesAsUTC: true,
      },
    };
  }
}