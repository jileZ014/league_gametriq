import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private readonly notificationsService: NotificationsService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to notifications: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from notifications: ${client.id}`);
    // Remove client from user mapping
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    const { userId } = data;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);
    client.join(`user-${userId}`);
    return { success: true, message: 'Subscribed to notifications' };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    const { userId } = data;
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    client.leave(`user-${userId}`);
    return { success: true, message: 'Unsubscribed from notifications' };
  }

  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user-${userId}`).emit('notification', notification);
  }

  broadcastNotification(notification: any) {
    this.server.emit('broadcast', notification);
  }
}