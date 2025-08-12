// Registration Types
export interface RegistrationOrder {
  id: string;
  tenantId: string;
  seasonId: string;
  divisionId: string;
  teamId?: string;
  playerFirst: string;
  playerLast: string;
  dobYear: number;
  guardianEmail: string;
  jerseySize?: string;
  waiverSignedAt?: Date;
  ipHash?: string;
  amountCents: number;
  discountCode?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
}

export interface PaymentIntent {
  id: string;
  orderId: string;
  stripePaymentIntentId: string;
  amountCents: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
}

export interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
}