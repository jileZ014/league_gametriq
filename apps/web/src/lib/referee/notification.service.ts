/**
 * Referee Notification Service
 * Handles all notification logic for referee assignments
 */

import {
  Referee,
  Assignment,
  AssignmentNotification,
  NotificationType,
  NotificationChannel,
  Game,
  Venue
} from './types';

export class RefereeNotificationService {
  private static instance: RefereeNotificationService;
  private notificationQueue: Map<string, AssignmentNotification[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  private constructor() {}

  public static getInstance(): RefereeNotificationService {
    if (!RefereeNotificationService.instance) {
      RefereeNotificationService.instance = new RefereeNotificationService();
    }
    return RefereeNotificationService.instance;
  }

  /**
   * Send assignment notification to referee
   */
  async sendAssignmentNotification(
    referee: Referee,
    assignment: Assignment,
    game: Game,
    venue: Venue
  ): Promise<void> {
    const notification: Omit<AssignmentNotification, 'id' | 'sentAt'> = {
      refereeId: referee.id,
      type: 'NEW_ASSIGNMENT',
      assignmentId: assignment.id,
      channel: this.getPreferredChannel(referee)
    };

    // Queue notification
    this.queueNotification(referee.id, notification as AssignmentNotification);

    // Send based on channel preference
    const channels = this.getNotificationChannels(referee);
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'EMAIL':
            await this.sendEmailNotification(referee, assignment, game, venue);
            break;
          case 'SMS':
            await this.sendSMSNotification(referee, assignment, game, venue);
            break;
          case 'PUSH':
            await this.sendPushNotification(referee, assignment, game, venue);
            break;
          case 'IN_APP':
            await this.sendInAppNotification(referee, assignment, game, venue);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
        this.handleNotificationFailure(notification as AssignmentNotification);
      }
    }
  }

  /**
   * Send reminder notification
   */
  async sendReminderNotification(
    referee: Referee,
    assignment: Assignment,
    game: Game,
    hoursBeforeGame: number
  ): Promise<void> {
    const notification: Omit<AssignmentNotification, 'id' | 'sentAt'> = {
      refereeId: referee.id,
      type: 'ASSIGNMENT_REMINDER',
      assignmentId: assignment.id,
      channel: this.getPreferredChannel(referee)
    };

    const message = this.formatReminderMessage(referee, assignment, game, hoursBeforeGame);
    
    // Send to all enabled channels
    const channels = this.getNotificationChannels(referee);
    for (const channel of channels) {
      await this.sendMessage(channel, referee, message);
    }
  }

  /**
   * Send cancellation notification
   */
  async sendCancellationNotification(
    referee: Referee,
    assignment: Assignment,
    reason?: string
  ): Promise<void> {
    const notification: Omit<AssignmentNotification, 'id' | 'sentAt'> = {
      refereeId: referee.id,
      type: 'ASSIGNMENT_CANCELLED',
      assignmentId: assignment.id,
      channel: this.getPreferredChannel(referee)
    };

    const message = this.formatCancellationMessage(referee, assignment, reason);
    
    // Send urgently to all channels
    const channels: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];
    for (const channel of channels) {
      await this.sendMessage(channel, referee, message);
    }
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    referee: Referee,
    amount: number,
    period: { start: Date; end: Date },
    method: string
  ): Promise<void> {
    const notification: Omit<AssignmentNotification, 'id' | 'sentAt'> = {
      refereeId: referee.id,
      type: 'PAYMENT_PROCESSED',
      assignmentId: '', // No specific assignment
      channel: 'EMAIL' // Always email for payment notifications
    };

    const message = this.formatPaymentMessage(referee, amount, period, method);
    await this.sendEmailNotification(referee, null, null, null, message);
  }

  /**
   * Format notification messages
   */
  private formatAssignmentMessage(
    referee: Referee,
    assignment: Assignment,
    game: Game,
    venue: Venue
  ): string {
    const gameDate = new Date(game.scheduledTime);
    const formattedDate = gameDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `
Dear ${referee.firstName},

You have been assigned to officiate the following game:

Game Details:
- Date: ${formattedDate}
- Time: ${formattedTime}
- Division: ${game.divisionId}
- Your Role: ${assignment.role.replace(/_/g, ' ')}
- Pay Rate: $${assignment.totalPay}

Venue:
${venue.name}
${venue.address.street}
${venue.address.city}, ${venue.address.state} ${venue.address.zipCode}

Please confirm your availability by logging into the referee portal or replying to this message.

If you are unable to officiate this game, please decline the assignment as soon as possible so we can find a replacement.

Thank you for your service to youth basketball!

Best regards,
Legacy Youth Sports
    `.trim();
  }

  private formatReminderMessage(
    referee: Referee,
    assignment: Assignment,
    game: Game,
    hoursBeforeGame: number
  ): string {
    const gameDate = new Date(game.scheduledTime);
    const formattedTime = gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `
Reminder: You have a game assignment in ${hoursBeforeGame} hours!

Game Time: ${formattedTime}
Your Role: ${assignment.role.replace(/_/g, ' ')}
Game ID: ${game.id}

Please arrive at least 30 minutes before game time for pre-game preparations.

Safe travels!
    `.trim();
  }

  private formatCancellationMessage(
    referee: Referee,
    assignment: Assignment,
    reason?: string
  ): string {
    return `
Dear ${referee.firstName},

Your assignment (ID: ${assignment.id}) has been cancelled.
${reason ? `\nReason: ${reason}` : ''}

We apologize for any inconvenience. You will be notified of any future assignments.

Thank you for your understanding.

Best regards,
Legacy Youth Sports
    `.trim();
  }

  private formatPaymentMessage(
    referee: Referee,
    amount: number,
    period: { start: Date; end: Date },
    method: string
  ): string {
    const startDate = period.start.toLocaleDateString();
    const endDate = period.end.toLocaleDateString();

    return `
Dear ${referee.firstName},

Your payment has been processed successfully!

Payment Details:
- Period: ${startDate} to ${endDate}
- Total Amount: $${amount.toFixed(2)}
- Payment Method: ${method}

The payment should appear in your account within 2-3 business days.

Thank you for your continued service!

Best regards,
Legacy Youth Sports Accounting
    `.trim();
  }

  /**
   * Channel-specific sending methods
   */
  private async sendEmailNotification(
    referee: Referee,
    assignment: Assignment | null,
    game: Game | null,
    venue: Venue | null,
    customMessage?: string
  ): Promise<void> {
    const message = customMessage || 
      (assignment && game && venue ? 
        this.formatAssignmentMessage(referee, assignment, game, venue) : '');

    const emailData = {
      to: referee.email,
      subject: this.getEmailSubject(assignment),
      body: message,
      html: this.convertToHTML(message)
    };

    // Send via email service
    await this.sendEmail(emailData);
  }

  private async sendSMSNotification(
    referee: Referee,
    assignment: Assignment,
    game: Game,
    venue: Venue
  ): Promise<void> {
    const gameDate = new Date(game.scheduledTime);
    const formattedDate = `${gameDate.getMonth() + 1}/${gameDate.getDate()}`;
    const formattedTime = gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const message = `New game assignment: ${formattedDate} at ${formattedTime}. ` +
                   `Role: ${assignment.role}. Venue: ${venue.name}. ` +
                   `Reply YES to confirm or NO to decline.`;

    await this.sendSMS(referee.phone, message);
  }

  private async sendPushNotification(
    referee: Referee,
    assignment: Assignment,
    game: Game,
    venue: Venue
  ): Promise<void> {
    const gameDate = new Date(game.scheduledTime);
    const formattedDate = `${gameDate.getMonth() + 1}/${gameDate.getDate()}`;
    const formattedTime = gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const notification = {
      title: 'New Game Assignment',
      body: `${formattedDate} at ${formattedTime} - ${venue.name}`,
      data: {
        assignmentId: assignment.id,
        gameId: game.id,
        type: 'assignment'
      }
    };

    await this.sendPush(referee.userId, notification);
  }

  private async sendInAppNotification(
    referee: Referee,
    assignment: Assignment,
    game: Game,
    venue: Venue
  ): Promise<void> {
    const notification = {
      userId: referee.userId,
      type: 'ASSIGNMENT',
      title: 'New Game Assignment',
      message: `You've been assigned to a game on ${new Date(game.scheduledTime).toLocaleDateString()}`,
      data: {
        assignmentId: assignment.id,
        gameId: game.id,
        venueId: venue.id
      },
      priority: 'HIGH'
    };

    await this.createInAppNotification(notification);
  }

  /**
   * Bulk notification methods
   */
  async sendBulkReminders(
    assignments: Array<{
      referee: Referee;
      assignment: Assignment;
      game: Game;
    }>,
    hoursBeforeGame: number
  ): Promise<void> {
    const promises = assignments.map(({ referee, assignment, game }) =>
      this.sendReminderNotification(referee, assignment, game, hoursBeforeGame)
    );

    await Promise.allSettled(promises);
  }

  async notifySchedulingComplete(
    referees: Referee[],
    stats: {
      totalGames: number;
      assignedGames: number;
      dateRange: { start: Date; end: Date };
    }
  ): Promise<void> {
    const message = `
Scheduling Complete!

Games scheduled: ${stats.assignedGames}/${stats.totalGames}
Period: ${stats.dateRange.start.toLocaleDateString()} - ${stats.dateRange.end.toLocaleDateString()}

Please log in to view your assignments and confirm your availability.
    `.trim();

    const promises = referees.map(referee =>
      this.sendMessage('EMAIL', referee, message)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Helper methods
   */
  private getPreferredChannel(referee: Referee): NotificationChannel {
    // Get from referee preferences or default to email
    return 'EMAIL';
  }

  private getNotificationChannels(referee: Referee): NotificationChannel[] {
    // Get enabled channels from referee preferences
    return ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];
  }

  private getEmailSubject(assignment: Assignment | null): string {
    if (!assignment) return 'Legacy Youth Sports - Notification';
    
    switch (assignment.status) {
      case 'PENDING':
        return 'New Game Assignment - Action Required';
      case 'CONFIRMED':
        return 'Assignment Confirmed';
      case 'CANCELLED':
        return 'Assignment Cancelled';
      default:
        return 'Game Assignment Update';
    }
  }

  private convertToHTML(text: string): string {
    return text
      .split('\n')
      .map(line => `<p>${line}</p>`)
      .join('\n');
  }

  private queueNotification(
    refereeId: string,
    notification: AssignmentNotification
  ): void {
    if (!this.notificationQueue.has(refereeId)) {
      this.notificationQueue.set(refereeId, []);
    }
    
    this.notificationQueue.get(refereeId)!.push(notification);
    
    // Keep only last 100 notifications per referee
    const queue = this.notificationQueue.get(refereeId)!;
    if (queue.length > 100) {
      queue.splice(0, queue.length - 100);
    }
  }

  private handleNotificationFailure(notification: AssignmentNotification): void {
    const key = `${notification.refereeId}-${notification.id}`;
    const attempts = (this.retryAttempts.get(key) || 0) + 1;
    
    this.retryAttempts.set(key, attempts);
    
    if (attempts < this.maxRetries) {
      // Schedule retry with exponential backoff
      const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
      setTimeout(() => {
        this.retryNotification(notification);
      }, delay);
    } else {
      console.error(`Failed to send notification after ${this.maxRetries} attempts:`, notification);
      // Log to error tracking service
    }
  }

  private async retryNotification(notification: AssignmentNotification): Promise<void> {
    // Implement retry logic
    console.log('Retrying notification:', notification);
  }

  /**
   * External service integrations (to be implemented)
   */
  private async sendEmail(data: any): Promise<void> {
    // Integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Sending email:', data);
  }

  private async sendSMS(phone: string, message: string): Promise<void> {
    // Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('Sending SMS to', phone, ':', message);
  }

  private async sendPush(userId: string, notification: any): Promise<void> {
    // Integrate with push notification service (FCM, APNS, etc.)
    console.log('Sending push notification to', userId, ':', notification);
  }

  private async createInAppNotification(notification: any): Promise<void> {
    // Create in-app notification in database
    console.log('Creating in-app notification:', notification);
  }

  private async sendMessage(
    channel: NotificationChannel,
    referee: Referee,
    message: string
  ): Promise<void> {
    switch (channel) {
      case 'EMAIL':
        await this.sendEmail({
          to: referee.email,
          subject: 'Legacy Youth Sports',
          body: message
        });
        break;
      case 'SMS':
        await this.sendSMS(referee.phone, message);
        break;
      case 'PUSH':
        await this.sendPush(referee.userId, {
          title: 'Legacy Youth Sports',
          body: message
        });
        break;
      case 'IN_APP':
        await this.createInAppNotification({
          userId: referee.userId,
          message
        });
        break;
    }
  }

  /**
   * Notification templates
   */
  getNotificationTemplates(): Map<NotificationType, string> {
    return new Map([
      ['NEW_ASSIGNMENT', this.getNewAssignmentTemplate()],
      ['ASSIGNMENT_REMINDER', this.getReminderTemplate()],
      ['ASSIGNMENT_CANCELLED', this.getCancellationTemplate()],
      ['ASSIGNMENT_CHANGED', this.getChangeTemplate()],
      ['PAYMENT_PROCESSED', this.getPaymentTemplate()],
      ['PERFORMANCE_FEEDBACK', this.getFeedbackTemplate()]
    ]);
  }

  private getNewAssignmentTemplate(): string {
    return `
Dear {{referee.firstName}},

You have been assigned to officiate:
- Game: {{game.id}}
- Date: {{game.date}}
- Time: {{game.time}}
- Venue: {{venue.name}}
- Role: {{assignment.role}}
- Pay: $${assignment.pay}

Please confirm within 24 hours.
    `.trim();
  }

  private getReminderTemplate(): string {
    return `
Reminder: Game in {{hours}} hours
Time: {{game.time}}
Venue: {{venue.name}}
Role: {{assignment.role}}
    `.trim();
  }

  private getCancellationTemplate(): string {
    return `
Your assignment for {{game.date}} has been cancelled.
{{reason}}
    `.trim();
  }

  private getChangeTemplate(): string {
    return `
Your assignment has been updated:
{{changes}}
Please review and confirm.
    `.trim();
  }

  private getPaymentTemplate(): string {
    return `
Payment processed: ${{amount}}
Period: {{period.start}} - {{period.end}}
Method: {{method}}
    `.trim();
  }

  private getFeedbackTemplate(): string {
    return `
Performance feedback received:
Rating: {{rating}}/5
Comments: {{comments}}
    `.trim();
  }
}