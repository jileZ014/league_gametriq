-- Test fixtures for tenant isolation testing
-- This file contains test data for validating cross-tenant access prevention

-- Create test organizations (tenants)
INSERT INTO organizations (id, name, slug, status, created_at, updated_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Test Organization 1', 'test-org-1', 'active', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'Test Organization 2', 'test-org-2', 'active', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Test Organization 3', 'test-org-3', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test users for each organization
INSERT INTO users (id, email, organization_id, roles, is_active, created_at, updated_at)
VALUES 
    -- Tenant 1 users
    ('user-1111-1111-1111-111111111111', 'user1@tenant1.com', '11111111-1111-1111-1111-111111111111', ARRAY['user'], true, NOW(), NOW()),
    ('user-1111-1111-1111-222222222222', 'admin1@tenant1.com', '11111111-1111-1111-1111-111111111111', ARRAY['admin', 'user'], true, NOW(), NOW()),
    
    -- Tenant 2 users  
    ('user-2222-2222-2222-111111111111', 'user2@tenant2.com', '22222222-2222-2222-2222-222222222222', ARRAY['user'], true, NOW(), NOW()),
    ('user-2222-2222-2222-222222222222', 'admin2@tenant2.com', '22222222-2222-2222-2222-222222222222', ARRAY['admin', 'user'], true, NOW(), NOW()),
    
    -- Super admin (can access all tenants)
    ('admin-0000-0000-0000-000000000000', 'superadmin@system.com', '11111111-1111-1111-1111-111111111111', ARRAY['super_admin', 'admin'], true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Update super admin flag
UPDATE users SET is_super_admin = true WHERE id = 'admin-0000-0000-0000-000000000000';

-- Create test payments for each tenant
INSERT INTO payments (id, organization_id, amount, currency, status, description, created_by, created_at, updated_at)
VALUES 
    -- Tenant 1 payments
    ('payment-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 10000, 'USD', 'completed', 'Registration fee - Team A', 'user-1111-1111-1111-111111111111', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('payment-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 15000, 'USD', 'completed', 'Registration fee - Team B', 'user-1111-1111-1111-111111111111', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ('payment-1111-1111-1111-333333333333', '11111111-1111-1111-1111-111111111111', 5000, 'USD', 'pending', 'Late registration fee', 'user-1111-1111-1111-222222222222', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    
    -- Tenant 2 payments
    ('payment-2222-2222-2222-111111111111', '22222222-2222-2222-2222-222222222222', 12000, 'USD', 'completed', 'Registration fee - Team X', 'user-2222-2222-2222-111111111111', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ('payment-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 8000, 'USD', 'refunded', 'Registration fee - Team Y', 'user-2222-2222-2222-111111111111', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
    
    -- Tenant 3 payments (for additional testing)
    ('payment-3333-3333-3333-111111111111', '33333333-3333-3333-3333-333333333333', 20000, 'USD', 'completed', 'Season pass', NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- Create test branding configurations for each tenant
INSERT INTO branding (id, organization_id, config, is_active, is_default, created_by, created_at, updated_at)
VALUES 
    -- Tenant 1 branding
    ('branding-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 
     '{"organizationName": "Test Organization 1", "colors": {"primary": "#FF0000", "secondary": "#000000"}, "fonts": {"primary": {"family": "Arial"}}, "logos": {"light": {"url": "/logo1.png", "width": 200, "height": 50}}}',
     true, true, 'user-1111-1111-1111-222222222222', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
    
    -- Tenant 2 branding
    ('branding-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 
     '{"organizationName": "Test Organization 2", "colors": {"primary": "#0000FF", "secondary": "#FFFFFF"}, "fonts": {"primary": {"family": "Helvetica"}}, "logos": {"light": {"url": "/logo2.png", "width": 180, "height": 45}}}',
     true, true, 'user-2222-2222-2222-222222222222', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
    
    -- Inactive branding for Tenant 1
    ('branding-1111-1111-1111-inactive001', '11111111-1111-1111-1111-111111111111', 
     '{"organizationName": "Test Organization 1 - Old Brand", "colors": {"primary": "#00FF00", "secondary": "#000000"}}',
     false, false, 'user-1111-1111-1111-222222222222', NOW() - INTERVAL '60 days', NOW() - INTERVAL '31 days')
ON CONFLICT (id) DO NOTHING;

-- Create test audit logs for each tenant
INSERT INTO audit_logs (id, organization_id, entity_type, entity_id, action, changes, user_id, created_at)
VALUES 
    -- Tenant 1 audit logs
    ('audit-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'payment', 'payment-1111-1111-1111-111111111111', 'create', '{"amount": 10000, "status": "completed"}', 'user-1111-1111-1111-111111111111', NOW() - INTERVAL '5 days'),
    ('audit-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'branding', 'branding-1111-1111-1111-111111111111', 'update', '{"colors.primary": {"old": "#FF0000", "new": "#FF5500"}}', 'user-1111-1111-1111-222222222222', NOW() - INTERVAL '2 days'),
    
    -- Tenant 2 audit logs
    ('audit-2222-2222-2222-111111111111', '22222222-2222-2222-2222-222222222222', 'payment', 'payment-2222-2222-2222-222222222222', 'refund', '{"status": {"old": "completed", "new": "refunded"}}', 'user-2222-2222-2222-222222222222', NOW() - INTERVAL '1 day'),
    
    -- Cross-tenant access attempt logs (security events)
    ('audit-security-attempt-1111111111', '11111111-1111-1111-1111-111111111111', 'security', NULL, 'cross_tenant_access_denied', '{"attempted_tenant": "22222222-2222-2222-2222-222222222222", "resource": "payment", "user": "user-1111-1111-1111-111111111111"}', 'user-1111-1111-1111-111111111111', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- Create test teams for tenant isolation testing
INSERT INTO teams (id, organization_id, name, division, created_at, updated_at)
VALUES 
    -- Tenant 1 teams
    ('team-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Thunder Hawks', 'U12', NOW() - INTERVAL '20 days', NOW()),
    ('team-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'Lightning Bolts', 'U14', NOW() - INTERVAL '20 days', NOW()),
    
    -- Tenant 2 teams
    ('team-2222-2222-2222-111111111111', '22222222-2222-2222-2222-222222222222', 'Fire Dragons', 'U12', NOW() - INTERVAL '15 days', NOW()),
    ('team-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Ice Wolves', 'U16', NOW() - INTERVAL '15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test players
INSERT INTO players (id, organization_id, team_id, first_name, last_name, jersey_number, created_at, updated_at)
VALUES 
    -- Tenant 1 players
    ('player-1111-1111-1111-1111111111', '11111111-1111-1111-1111-111111111111', 'team-1111-1111-1111-111111111111', 'John', 'Doe', 23, NOW() - INTERVAL '10 days', NOW()),
    ('player-1111-1111-1111-2222222222', '11111111-1111-1111-1111-111111111111', 'team-1111-1111-1111-111111111111', 'Jane', 'Smith', 15, NOW() - INTERVAL '10 days', NOW()),
    
    -- Tenant 2 players
    ('player-2222-2222-2222-1111111111', '22222222-2222-2222-2222-222222222222', 'team-2222-2222-2222-111111111111', 'Mike', 'Johnson', 7, NOW() - INTERVAL '8 days', NOW()),
    ('player-2222-2222-2222-2222222222', '22222222-2222-2222-2222-222222222222', 'team-2222-2222-2222-111111111111', 'Sarah', 'Williams', 10, NOW() - INTERVAL '8 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create security audit log entries for testing
INSERT INTO security_audit_log (id, event_type, user_id, user_organization_id, attempted_organization_id, resource_type, resource_id, ip_address, user_agent, request_path, request_method, created_at, details)
VALUES 
    -- Successful access
    ('sec-audit-1111-1111-success-11111', 'access_granted', 'user-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'payment', 'payment-1111-1111-1111-111111111111', '192.168.1.100'::inet, 'Mozilla/5.0', '/api/payments/payment-1111-1111-1111-111111111111', 'GET', NOW() - INTERVAL '2 hours', '{"status": "success"}'),
    
    -- Cross-tenant access attempts
    ('sec-audit-1111-2222-denied-111111', 'cross_tenant_access_denied', 'user-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'payment', 'payment-2222-2222-2222-111111111111', '192.168.1.100'::inet, 'Mozilla/5.0', '/api/payments/payment-2222-2222-2222-111111111111', 'GET', NOW() - INTERVAL '1 hour', '{"error": "Access denied to resource in different tenant"}'),
    
    -- Super admin access
    ('sec-audit-0000-2222-admin-access1', 'super_admin_access', 'admin-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'branding', 'branding-2222-2222-2222-222222222222', '10.0.0.1'::inet, 'Admin CLI', '/api/branding/branding-2222-2222-2222-222222222222', 'GET', NOW() - INTERVAL '30 minutes', '{"reason": "Support ticket #12345"}')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for test performance
CREATE INDEX IF NOT EXISTS idx_test_payments_org_created ON payments(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_test_players_org_team ON players(organization_id, team_id);

-- Grant permissions for test database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO test_user;

-- Create a view to verify tenant isolation
CREATE OR REPLACE VIEW tenant_isolation_test_view AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    COUNT(DISTINCT p.id) as payment_count,
    COUNT(DISTINCT t.id) as team_count,
    COUNT(DISTINCT pl.id) as player_count,
    COUNT(DISTINCT b.id) as branding_count,
    COUNT(DISTINCT a.id) as audit_count
FROM organizations o
LEFT JOIN payments p ON o.id = p.organization_id
LEFT JOIN teams t ON o.id = t.organization_id
LEFT JOIN players pl ON o.id = pl.organization_id
LEFT JOIN branding b ON o.id = b.organization_id
LEFT JOIN audit_logs a ON o.id = a.organization_id
GROUP BY o.id, o.name
ORDER BY o.name;