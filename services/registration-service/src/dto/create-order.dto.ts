export interface CreateOrderDto {
  tenant_id: string;
  season_id: string;
  division_id: string;
  registration_type: 'TEAM' | 'INDIVIDUAL';
  team_id?: string;
  player_ids?: string[];
  primary_contact: {
    user_id: string;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
  };
  emergency_contacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  medical_info?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    doctor_name?: string;
    doctor_phone?: string;
    insurance_provider?: string;
    insurance_policy_number?: string;
  };
  payment_method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'CASH' | 'PAYMENT_PLAN';
  metadata?: Record<string, any>;
  created_by_user_id?: string;
  ip_address?: string;
}

export interface UpdateOrderDto {
  status?: 'DRAFT' | 'PENDING_PAYMENT' | 'PENDING_WAIVERS' | 'COMPLETED' | 'CANCELLED';
  primary_contact?: {
    user_id?: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
  };
  emergency_contacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  medical_info?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    doctor_name?: string;
    doctor_phone?: string;
    insurance_provider?: string;
    insurance_policy_number?: string;
  };
  metadata?: Record<string, any>;
  updated_by_user_id?: string;
}

export interface ApplyDiscountDto {
  discount_code: string;
  applied_by_user_id?: string;
}

export interface SignWaiverDto {
  waiver_type: 'LIABILITY' | 'MEDICAL' | 'PHOTO_RELEASE' | 'SAFESPORT';
  player_id: string;
  signed_by_user_id: string;
  parent_consent_id?: string;
  signature_data: string;
  ip_address: string;
  user_agent: string;
}

export interface RegistrationOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  season_id: string;
  division_id: string;
  registration_type: 'TEAM' | 'INDIVIDUAL';
  team_id?: string;
  status: 'DRAFT' | 'PENDING_PAYMENT' | 'PENDING_WAIVERS' | 'COMPLETED' | 'CANCELLED';
  primary_contact: {
    user_id: string;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
  };
  emergency_contacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  medical_info?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    doctor_name?: string;
    doctor_phone?: string;
    insurance_provider?: string;
    insurance_policy_number?: string;
  };
  payment_method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'CASH' | 'PAYMENT_PLAN';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  discount_code?: string;
  discount_percentage?: number;
  metadata?: Record<string, any>;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
}

export interface RegistrationPlayer {
  id: string;
  registration_order_id: string;
  player_id: string;
  player_first_name: string;
  player_last_name: string;
  player_birth_date: Date;
  player_age: number;
  requires_coppa_consent: boolean;
  coppa_consent_id?: string;
  coppa_consent_status?: 'PENDING' | 'APPROVED' | 'DENIED';
  jersey_size?: string;
  jersey_number_preference?: number;
  created_at: Date;
}

export interface RegistrationWaiver {
  id: string;
  registration_order_id: string;
  player_id: string;
  waiver_type: 'LIABILITY' | 'MEDICAL' | 'PHOTO_RELEASE' | 'SAFESPORT';
  signed_by_user_id: string;
  signed_by_name: string;
  parent_consent_id?: string;
  signature_data: string;
  signed_at: Date;
  ip_address: string;
  user_agent: string;
  document_version: string;
  document_hash: string;
  is_valid: boolean;
  expires_at?: Date;
}

export interface RegistrationAuditLog {
  id: string;
  registration_order_id: string;
  action: string;
  performed_by_user_id: string;
  performed_by_name: string;
  action_timestamp: Date;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface DiscountValidation {
  is_valid: boolean;
  discount_code: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number;
  discount_amount: number;
  applicable_to: 'ORDER' | 'PLAYER' | 'TEAM';
  min_order_amount?: number;
  max_uses?: number;
  current_uses?: number;
  valid_from?: Date;
  valid_until?: Date;
  error_message?: string;
}

export interface COPPAComplianceCheck {
  order_id: string;
  all_players_compliant: boolean;
  players_requiring_consent: Array<{
    player_id: string;
    player_name: string;
    age: number;
    consent_status: 'PENDING' | 'APPROVED' | 'DENIED';
    consent_id?: string;
    parent_email?: string;
  }>;
  total_players: number;
  compliant_players: number;
  pending_consents: number;
}