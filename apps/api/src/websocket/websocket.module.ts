import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebSocketGatewayService } from './websocket.gateway';
import { RedisService } from './redis.service';
import { MetricsService } from './metrics.service';
import { ConnectionPoolService } from './connection-pool.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { WsThrottleGuard } from './guards/ws-throttle.guard';

/**
 * WebSocket Module
 * Provides real-time communication capabilities for the basketball platform
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1h'),
        },
      }),
    }),
  ],
  providers: [
    WebSocketGatewayService,
    RedisService,
    MetricsService,
    ConnectionPoolService,
    WsJwtGuard,
    WsThrottleGuard,
  ],
  exports: [
    WebSocketGatewayService,
    RedisService,
    MetricsService,
  ],
})
export class WebSocketModule {}