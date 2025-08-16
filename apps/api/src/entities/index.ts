// Core entities export for proper TypeORM registration

// User entities
export { User } from '../modules/users/entities/user.entity';
export { ParentalConsent } from '../modules/users/entities/parental-consent.entity';

// Auth entities
export { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
export { MfaSecret } from '../modules/auth/entities/mfa-secret.entity';
export { Session } from '../modules/auth/entities/session.entity';

// Payment entities
export { Payment } from '../modules/payments/entities/payment.entity';
export { PaymentLedger } from '../modules/payments/entities/payment-ledger.entity';
export { PaymentAudit } from '../modules/payments/entities/payment-audit.entity';
export { StripeCustomer } from '../modules/payments/entities/stripe-customer.entity';
export { WebhookEvent } from '../modules/payments/entities/webhook-event.entity';
export { Refund } from '../modules/payments/entities/refund.entity';
export { Dispute } from '../modules/payments/entities/dispute.entity';
export { PaymentMethod } from '../modules/payments/entities/payment-method.entity';
export { ConnectedAccount } from '../modules/payments/entities/connected-account.entity';
export { Transfer } from '../modules/payments/entities/transfer.entity';
export { Subscription } from '../modules/payments/entities/subscription.entity';
export { SubscriptionItem } from '../modules/payments/entities/subscription-item.entity';
export { Invoice } from '../modules/payments/entities/invoice.entity';
export { RegistrationOrder } from '../modules/payments/entities/registration-order.entity';
export { OrderItem } from '../modules/payments/entities/order-item.entity';
export { OrderDiscount } from '../modules/payments/entities/order-discount.entity';
export { DiscountCode } from '../modules/payments/entities/discount-code.entity';
export { RegistrationFee } from '../modules/payments/entities/registration-fee.entity';

// Tournament entities
export { Tournament } from '../modules/tournaments/entities/tournament.entity';
export { TournamentTeam } from '../modules/tournaments/entities/tournament-team.entity';
export { TournamentMatch } from '../modules/tournaments/entities/tournament-match.entity';
export { TournamentCourt } from '../modules/tournaments/entities/tournament-court.entity';

// Game entities
export { Game } from '../modules/games/entities/game.entity';
export { GameScore } from '../modules/games/entities/game-score.entity';
export { GameStatistics } from '../modules/games/entities/game-statistics.entity';

// League entities
export { League } from '../modules/leagues/entities/league.entity';
export { Division } from '../modules/leagues/entities/division.entity';
export { Season } from '../modules/leagues/entities/season.entity';

// Team entities
export { Team } from '../modules/teams/entities/team.entity';
export { TeamMember } from '../modules/teams/entities/team-member.entity';
export { TeamStanding } from '../modules/teams/entities/team-standing.entity';

// Schedule entities
export { Schedule } from '../modules/app-schedule/entities/schedule.entity';
export { ScheduleTemplate } from '../modules/app-schedule/entities/schedule-template.entity';

// Notification entities
export { Notification } from '../modules/notifications/entities/notification.entity';
export { NotificationTemplate } from '../modules/notifications/entities/notification-template.entity';

// Report entities
export { ReportTemplate } from '../modules/reports/entities/report-template.entity';
export { ScheduledReport } from '../modules/reports/entities/scheduled-report.entity';
export { ReportHistory } from '../modules/reports/entities/report-history.entity';
export { ReportSubscription } from '../modules/reports/entities/report-subscription.entity';

// Audit entities
export { AuditLog } from '../modules/audit/audit.entity';

// Branding entities
export { Branding } from '../modules/branding/branding.entity';