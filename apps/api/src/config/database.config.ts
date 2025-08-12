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
        max: 100, // Maximum number of clients in the pool
        min: 5,   // Minimum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        statement_timeout: 5000, // 5 seconds
      },
    };
  }
}