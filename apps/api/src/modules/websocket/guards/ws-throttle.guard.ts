import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RedisService } from '../redis.service';

/**
 * WebSocket Rate Limiting Guard
 * Implements rate limiting for WebSocket messages to prevent abuse
 */
@Injectable()
export class WsThrottleGuard implements CanActivate {
  private readonly logger = new Logger(WsThrottleGuard.name);
  
  // Default rate limit configuration
  private readonly defaultConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  };

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const user = client.data.user;
    
    if (!user) {
      throw new WsException('User not authenticated');
    }

    // Generate rate limit key
    const identifier = this.generateIdentifier(client, user);
    
    // Check rate limit
    const allowed = await this.redisService.checkRateLimit(
      identifier,
      this.getMaxRequests(user.role),
      this.defaultConfig.windowMs,
    );

    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for ${identifier}`);
      throw new WsException('Rate limit exceeded. Please slow down.');
    }

    return true;
  }

  private generateIdentifier(client: Socket, user: any): string {
    // Use user ID and socket ID for rate limiting
    return `ws:rate:${user.sub}:${client.id}`;
  }

  private getMaxRequests(role: string): number {
    // Different rate limits based on role
    const roleLimits: Record<string, number> = {
      admin: 500,
      scorekeeper: 300,
      referee: 300,
      coach: 200,
      parent: 100,
      player: 100,
      spectator: 50,
    };

    return roleLimits[role] || this.defaultConfig.maxRequests;
  }
}