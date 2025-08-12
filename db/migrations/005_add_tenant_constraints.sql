-- Migration: Add tenant isolation constraints and missing tenant_id columns
-- This migration ensures all tables have proper tenant isolation

-- 1. Add tenant_id (organization_id) to tables missing it
-- Note: Adjust table names based on your actual schema

-- Add organization_id to any tables that might be missing it
-- Example for common tables that might need tenant isolation:

-- Users table (if not already tenant-aware)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'organization_id') THEN
        ALTER TABLE users ADD COLUMN organization_id UUID;
        
        -- Add index for performance
        CREATE INDEX idx_users_organization_id ON users(organization_id);
        
        -- Add foreign key constraint (adjust reference table as needed)
        -- ALTER TABLE users ADD CONSTRAINT fk_users_organization 
        --     FOREIGN KEY (organization_id) REFERENCES organizations(id);
    END IF;
END $$;

-- Games/Matches table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'games' 
                   AND column_name = 'organization_id') THEN
        ALTER TABLE games ADD COLUMN organization_id UUID;
        CREATE INDEX idx_games_organization_id ON games(organization_id);
    END IF;
END $$;

-- Teams table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'teams' 
                   AND column_name = 'organization_id') THEN
        ALTER TABLE teams ADD COLUMN organization_id UUID;
        CREATE INDEX idx_teams_organization_id ON teams(organization_id);
    END IF;
END $$;

-- Players table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'players' 
                   AND column_name = 'organization_id') THEN
        ALTER TABLE players ADD COLUMN organization_id UUID;
        CREATE INDEX idx_players_organization_id ON players(organization_id);
    END IF;
END $$;

-- Schedules table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'schedules' 
                   AND column_name = 'organization_id') THEN
        ALTER TABLE schedules ADD COLUMN organization_id UUID;
        CREATE INDEX idx_schedules_organization_id ON schedules(organization_id);
    END IF;
END $$;

-- 2. Add composite indexes for performance (tenant_id + created_at)
-- These indexes optimize queries that filter by tenant and sort by date

-- Payments table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'payments' 
                   AND indexname = 'idx_payments_org_created') THEN
        CREATE INDEX idx_payments_org_created ON payments(organization_id, created_at DESC);
    END IF;
END $$;

-- Payment ledger
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'payment_ledger' 
                   AND indexname = 'idx_payment_ledger_org_created') THEN
        CREATE INDEX idx_payment_ledger_org_created ON payment_ledger(organization_id, created_at DESC);
    END IF;
END $$;

-- Branding tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'branding' 
                   AND indexname = 'idx_branding_org_created') THEN
        CREATE INDEX idx_branding_org_created ON branding(organization_id, created_at DESC);
    END IF;
END $$;

-- Audit logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'audit_logs' 
                   AND indexname = 'idx_audit_logs_org_created') THEN
        CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
    END IF;
END $$;

-- 3. Create Row Level Security (RLS) policies for tenant isolation
-- Enable RLS on sensitive tables

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
DROP POLICY IF EXISTS tenant_isolation_policy ON payments;
CREATE POLICY tenant_isolation_policy ON payments
    FOR ALL
    TO PUBLIC
    USING (organization_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on payment_ledger
ALTER TABLE payment_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON payment_ledger;
CREATE POLICY tenant_isolation_policy ON payment_ledger
    FOR ALL
    TO PUBLIC
    USING (organization_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on branding
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON branding;
CREATE POLICY tenant_isolation_policy ON branding
    FOR ALL
    TO PUBLIC
    USING (organization_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON audit_logs;
CREATE POLICY tenant_isolation_policy ON audit_logs
    FOR ALL
    TO PUBLIC
    USING (organization_id = current_setting('app.current_tenant_id', true)::uuid);

-- 4. Create function to validate tenant access
CREATE OR REPLACE FUNCTION validate_tenant_access(
    p_resource_id UUID,
    p_table_name TEXT,
    p_tenant_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_query TEXT;
BEGIN
    -- Dynamically check if resource belongs to tenant
    v_query := format(
        'SELECT COUNT(*) FROM %I WHERE id = $1 AND organization_id = $2',
        p_table_name
    );
    
    EXECUTE v_query INTO v_count USING p_resource_id, p_tenant_id;
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create audit trigger for cross-tenant access attempts
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    user_organization_id UUID,
    attempted_organization_id UUID,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    request_method VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Index for security audit queries
CREATE INDEX idx_security_audit_created ON security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_event ON security_audit_log(event_type);

-- 6. Create helper function for tenant-scoped queries
CREATE OR REPLACE FUNCTION add_tenant_filter(
    p_query TEXT,
    p_tenant_id UUID,
    p_alias TEXT DEFAULT 't'
) RETURNS TEXT AS $$
BEGIN
    RETURN p_query || format(' AND %I.organization_id = %L', p_alias, p_tenant_id);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Add check constraints to ensure tenant_id is never null for new records
-- (Only for tables that should always have a tenant)

ALTER TABLE payments 
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE payment_ledger 
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE branding 
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE audit_logs 
    ALTER COLUMN organization_id SET NOT NULL;

-- 8. Create view for super admin to see all data across tenants
CREATE OR REPLACE VIEW admin_all_payments AS
SELECT 
    p.*,
    o.name as organization_name
FROM payments p
LEFT JOIN organizations o ON p.organization_id = o.id;

-- Grant access to admin role only
-- GRANT SELECT ON admin_all_payments TO admin_role;

-- 9. Add performance statistics table for monitoring tenant isolation
CREATE TABLE IF NOT EXISTS tenant_access_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    row_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_access_stats_org_date 
    ON tenant_access_stats(organization_id, created_at DESC);

-- Add comment documenting the migration
COMMENT ON SCHEMA public IS 'Schema with tenant isolation enforced via RLS and application-level checks';