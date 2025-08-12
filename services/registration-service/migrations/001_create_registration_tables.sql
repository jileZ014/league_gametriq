-- Registration Orders Table
CREATE TABLE IF NOT EXISTS registration_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    order_number VARCHAR(20) NOT NULL,
    season_id UUID NOT NULL,
    division_id UUID NOT NULL,
    registration_type VARCHAR(20) NOT NULL CHECK (registration_type IN ('TEAM', 'INDIVIDUAL')),
    team_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_PAYMENT', 'PENDING_WAIVERS', 'COMPLETED', 'CANCELLED')),
    
    -- Contact Information
    primary_contact JSONB NOT NULL,
    emergency_contacts JSONB NOT NULL,
    medical_info JSONB,
    
    -- Payment Information
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'CASH', 'PAYMENT_PLAN')),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_code VARCHAR(50),
    discount_percentage DECIMAL(5, 2),
    
    -- Metadata
    metadata JSONB,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    -- Constraints
    CONSTRAINT registration_orders_order_number_unique UNIQUE (tenant_id, order_number),
    CONSTRAINT registration_orders_team_required CHECK (
        (registration_type = 'TEAM' AND team_id IS NOT NULL) OR
        (registration_type = 'INDIVIDUAL')
    )
);

-- Indexes for registration orders
CREATE INDEX idx_registration_orders_tenant_id ON registration_orders(tenant_id);
CREATE INDEX idx_registration_orders_season_id ON registration_orders(season_id);
CREATE INDEX idx_registration_orders_division_id ON registration_orders(division_id);
CREATE INDEX idx_registration_orders_team_id ON registration_orders(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_registration_orders_status ON registration_orders(status);
CREATE INDEX idx_registration_orders_created_by ON registration_orders(created_by_user_id);
CREATE INDEX idx_registration_orders_primary_contact ON registration_orders((primary_contact->>'user_id'));
CREATE INDEX idx_registration_orders_created_at ON registration_orders(created_at DESC);

-- Registration Players Table
CREATE TABLE IF NOT EXISTS registration_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_order_id UUID NOT NULL REFERENCES registration_orders(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    player_first_name VARCHAR(100) NOT NULL,
    player_last_name VARCHAR(100) NOT NULL,
    player_birth_date DATE NOT NULL,
    player_age INTEGER NOT NULL,
    requires_coppa_consent BOOLEAN NOT NULL DEFAULT FALSE,
    coppa_consent_id UUID,
    coppa_consent_status VARCHAR(20) CHECK (coppa_consent_status IN ('PENDING', 'APPROVED', 'DENIED')),
    jersey_size VARCHAR(10),
    jersey_number_preference INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT registration_players_unique UNIQUE (registration_order_id, player_id)
);

-- Indexes for registration players
CREATE INDEX idx_registration_players_order_id ON registration_players(registration_order_id);
CREATE INDEX idx_registration_players_player_id ON registration_players(player_id);
CREATE INDEX idx_registration_players_coppa_required ON registration_players(requires_coppa_consent) WHERE requires_coppa_consent = TRUE;

-- Registration Waivers Table
CREATE TABLE IF NOT EXISTS registration_waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_order_id UUID NOT NULL REFERENCES registration_orders(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    waiver_type VARCHAR(20) NOT NULL CHECK (waiver_type IN ('LIABILITY', 'MEDICAL', 'PHOTO_RELEASE', 'SAFESPORT')),
    signed_by_user_id UUID NOT NULL,
    signed_by_name VARCHAR(200) NOT NULL,
    parent_consent_id UUID,
    signature_data TEXT NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    document_version VARCHAR(10) NOT NULL,
    document_hash VARCHAR(64) NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT registration_waivers_unique UNIQUE (registration_order_id, player_id, waiver_type)
);

-- Indexes for registration waivers
CREATE INDEX idx_registration_waivers_order_id ON registration_waivers(registration_order_id);
CREATE INDEX idx_registration_waivers_player_id ON registration_waivers(player_id);
CREATE INDEX idx_registration_waivers_type ON registration_waivers(waiver_type);
CREATE INDEX idx_registration_waivers_signed_by ON registration_waivers(signed_by_user_id);
CREATE INDEX idx_registration_waivers_valid ON registration_waivers(is_valid) WHERE is_valid = TRUE;
CREATE INDEX idx_registration_waivers_expires ON registration_waivers(expires_at) WHERE expires_at IS NOT NULL;

-- Registration Audit Logs Table
CREATE TABLE IF NOT EXISTS registration_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_order_id UUID NOT NULL REFERENCES registration_orders(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by_user_id UUID NOT NULL,
    performed_by_name VARCHAR(200) NOT NULL,
    action_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    details JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT
);

-- Indexes for audit logs
CREATE INDEX idx_registration_audit_logs_order_id ON registration_audit_logs(registration_order_id);
CREATE INDEX idx_registration_audit_logs_user_id ON registration_audit_logs(performed_by_user_id);
CREATE INDEX idx_registration_audit_logs_action ON registration_audit_logs(action);
CREATE INDEX idx_registration_audit_logs_timestamp ON registration_audit_logs(action_timestamp DESC);

-- Discount Codes Table
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    discount_value DECIMAL(10, 2) NOT NULL,
    applicable_to VARCHAR(20) NOT NULL CHECK (applicable_to IN ('ORDER', 'PLAYER', 'TEAM')),
    min_order_amount DECIMAL(10, 2),
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    season_ids UUID[],
    division_ids UUID[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT discount_codes_unique UNIQUE (tenant_id, code)
);

-- Indexes for discount codes
CREATE INDEX idx_discount_codes_tenant_id ON discount_codes(tenant_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_discount_codes_valid_dates ON discount_codes(valid_from, valid_until);

-- Parental Consent Records Table
CREATE TABLE IF NOT EXISTS parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    child_id UUID NOT NULL,
    parent_id UUID NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    parent_first_name VARCHAR(100) NOT NULL,
    parent_last_name VARCHAR(100) NOT NULL,
    parent_phone VARCHAR(20),
    
    -- Consent Details
    consent_type JSONB NOT NULL,
    data_permissions JSONB NOT NULL,
    verification_method VARCHAR(20) NOT NULL CHECK (verification_method IN ('EMAIL', 'DIGITAL_SIGNATURE', 'CREDIT_CARD', 'GOVERNMENT_ID', 'VIDEO_CALL')),
    verification_data JSONB,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REVOKED', 'EXPIRED')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,
    
    -- Tracking
    verification_token VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT parental_consents_child_unique UNIQUE (tenant_id, child_id, status) WHERE status = 'VERIFIED'
);

-- Indexes for parental consents
CREATE INDEX idx_parental_consents_tenant_id ON parental_consents(tenant_id);
CREATE INDEX idx_parental_consents_child_id ON parental_consents(child_id);
CREATE INDEX idx_parental_consents_parent_id ON parental_consents(parent_id);
CREATE INDEX idx_parental_consents_status ON parental_consents(status);
CREATE INDEX idx_parental_consents_expires ON parental_consents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_parental_consents_token ON parental_consents(verification_token) WHERE verification_token IS NOT NULL;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_registration_orders_updated_at BEFORE UPDATE ON registration_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE registration_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY tenant_isolation_registration_orders ON registration_orders
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_discount_codes ON discount_codes
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_parental_consents ON parental_consents
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true));