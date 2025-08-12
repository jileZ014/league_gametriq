-- Payment Tables Migration
-- Version: 002
-- Description: Create payment-related tables for Stripe integration
-- Author: Backend Agent
-- Date: 2025-08-10

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payments table - Core payment records
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for common queries
    INDEX idx_payments_user_id (user_id),
    INDEX idx_payments_order_id (order_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_created_at (created_at)
);

-- Payment Ledger - Track all financial transactions
CREATE TABLE IF NOT EXISTS payment_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('charge', 'refund', 'dispute', 'adjustment')),
    amount DECIMAL(10, 2) NOT NULL, -- Negative for debits
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_ledger_payment_id (payment_id),
    INDEX idx_ledger_type (type),
    INDEX idx_ledger_created_at (created_at)
);

-- Payment Audit - Track all payment-related actions
CREATE TABLE IF NOT EXISTS payment_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_audit_payment_id (payment_id),
    INDEX idx_audit_user_id (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created_at (created_at)
);

-- Stripe Customers - Map users to Stripe customer IDs
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_stripe_customers_user_id (user_id),
    INDEX idx_stripe_customers_customer_id (customer_id)
);

-- Webhook Events - Track and process webhook events
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_webhook_events_stripe_event_id (stripe_event_id),
    INDEX idx_webhook_events_type (type),
    INDEX idx_webhook_events_processed (processed),
    INDEX idx_webhook_events_created_at (created_at)
);

-- Refunds - Track refund details
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    refund_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
    description TEXT,
    status VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_refunds_payment_id (payment_id),
    INDEX idx_refunds_refund_id (refund_id),
    INDEX idx_refunds_status (status)
);

-- Disputes - Track payment disputes
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    dispute_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    evidence_due_by TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_disputes_payment_id (payment_id),
    INDEX idx_disputes_dispute_id (dispute_id),
    INDEX idx_disputes_status (status)
);

-- Payment Methods - Cache payment method details (PCI compliant - no sensitive data)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_payment_methods_user_id (user_id),
    INDEX idx_payment_methods_payment_method_id (payment_method_id),
    INDEX idx_payment_methods_is_default (is_default)
);

-- Feature Flags - Control payment features
CREATE TABLE IF NOT EXISTS payment_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default feature flags
INSERT INTO payment_feature_flags (name, enabled, description) VALUES
    ('stripe_test_mode', true, 'Enable Stripe test mode'),
    ('allow_refunds', true, 'Allow processing refunds'),
    ('auto_capture', true, 'Automatically capture payments'),
    ('save_payment_methods', true, 'Allow users to save payment methods'),
    ('webhook_processing', true, 'Enable webhook processing')
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_feature_flags_updated_at BEFORE UPDATE ON payment_feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for payment summaries
CREATE VIEW payment_summaries AS
SELECT 
    p.id,
    p.user_id,
    p.order_id,
    p.amount,
    p.currency,
    p.status,
    p.created_at,
    p.updated_at,
    COALESCE(SUM(CASE WHEN l.type = 'refund' THEN ABS(l.amount) ELSE 0 END), 0) as total_refunded,
    COALESCE(SUM(CASE WHEN l.type = 'dispute' THEN ABS(l.amount) ELSE 0 END), 0) as total_disputed,
    p.amount - COALESCE(SUM(CASE WHEN l.type = 'refund' THEN ABS(l.amount) ELSE 0 END), 0) as net_amount
FROM payments p
LEFT JOIN payment_ledger l ON p.id = l.payment_id
GROUP BY p.id, p.user_id, p.order_id, p.amount, p.currency, p.status, p.created_at, p.updated_at;

-- Create indexes for performance
CREATE INDEX idx_payments_composite ON payments(user_id, status, created_at DESC);
CREATE INDEX idx_ledger_composite ON payment_ledger(payment_id, type, created_at DESC);
CREATE INDEX idx_audit_composite ON payment_audit(user_id, action, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Core payment records linked to Stripe payment intents';
COMMENT ON TABLE payment_ledger IS 'Financial transaction ledger for all payment-related activities';
COMMENT ON TABLE payment_audit IS 'Audit trail for all payment-related actions and events';
COMMENT ON TABLE stripe_customers IS 'Mapping between application users and Stripe customer IDs';
COMMENT ON TABLE webhook_events IS 'Stripe webhook events for asynchronous processing';
COMMENT ON TABLE refunds IS 'Detailed refund records linked to payments';
COMMENT ON TABLE disputes IS 'Payment dispute tracking and management';
COMMENT ON TABLE payment_methods IS 'Cached payment method details (PCI compliant)';
COMMENT ON TABLE payment_feature_flags IS 'Feature flags for payment system configuration';

-- Grant permissions (adjust based on your database users)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO api_user;
-- GRANT SELECT ON payment_summaries TO api_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO api_user;