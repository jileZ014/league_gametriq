-- ============================================================================
-- Registration Demo Seed Data
-- Basketball League Management Platform
-- ============================================================================
-- Description: Test data for registration scenarios including team, individual,
-- COPPA compliance, and refund cases
-- Date: 2025-08-10
-- ============================================================================

-- Clean up existing demo data
DELETE FROM registration_audit_logs WHERE registration_order_id IN (
    SELECT id FROM registration_orders WHERE metadata->>'demo_data' = 'true'
);
DELETE FROM registration_waivers WHERE registration_order_id IN (
    SELECT id FROM registration_orders WHERE metadata->>'demo_data' = 'true'
);
DELETE FROM registration_players WHERE registration_order_id IN (
    SELECT id FROM registration_orders WHERE metadata->>'demo_data' = 'true'
);
DELETE FROM registration_orders WHERE metadata->>'demo_data' = 'true';

-- ============================================================================
-- Team Registration Scenarios
-- ============================================================================

-- Scenario 1: Successful Team Registration (Phoenix Suns U12)
INSERT INTO registration_orders (
    id, tenant_id, order_number, season_id, division_id, registration_type, 
    team_id, status, primary_contact, emergency_contacts, medical_info,
    payment_method, subtotal, discount_amount, tax_amount, total_amount,
    discount_code, metadata, created_by_user_id, completed_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'phoenix-flight',
    'REG-2025-001',
    '22222222-2222-2222-2222-222222222222', -- Spring 2025 Season
    '33333333-3333-3333-3333-333333333333', -- U12 Division
    'TEAM',
    '44444444-4444-4444-4444-444444444444', -- Phoenix Suns
    'COMPLETED',
    '{"user_id": "55555555-5555-5555-5555-555555555555", "name": "Mike Johnson", "email": "coach.mike@example.com", "phone": "602-555-0123"}'::jsonb,
    '[{"name": "Emergency Contact", "phone": "602-555-9999", "relationship": "Team Manager"}]'::jsonb,
    '{"team_allergies": ["peanuts", "shellfish"], "special_needs": "One player requires insulin"}'::jsonb,
    'CREDIT_CARD',
    1200.00, -- $150 x 8 players
    120.00,  -- 10% early bird discount
    90.72,   -- 8.4% AZ tax
    1170.72,
    'EARLYBIRD10',
    '{"demo_data": "true", "notes": "Team registration with early bird discount"}'::jsonb,
    '55555555-5555-5555-5555-555555555555',
    NOW() - INTERVAL '7 days'
);

-- Add players for Phoenix Suns team
INSERT INTO registration_players (
    registration_order_id, player_id, player_first_name, player_last_name,
    player_birth_date, player_age, requires_coppa_consent, jersey_size, jersey_number_preference
) VALUES
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', 'James', 'Williams', '2013-03-15', 11, false, 'YM', 23),
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666662', 'Robert', 'Brown', '2013-05-22', 11, false, 'YL', 12),
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666663', 'Michael', 'Davis', '2013-07-08', 11, false, 'YM', 5),
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666664', 'David', 'Miller', '2013-01-30', 12, false, 'YL', 8),
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666665', 'William', 'Wilson', '2013-09-12', 11, false, 'YM', 15),
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'Joseph', 'Moore', '2013-04-25', 11, false, 'YL', 21),
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666667', 'Thomas', 'Taylor', '2013-06-18', 11, false, 'YM', 3),
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666668', 'Christopher', 'Anderson', '2013-02-10', 12, false, 'YL', 11);

-- Add waivers for all players
INSERT INTO registration_waivers (
    registration_order_id, player_id, waiver_type, signed_by_user_id, signed_by_name,
    signature_data, ip_address, user_agent, document_version, document_hash
) VALUES
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', 'LIABILITY', '77777777-7777-7777-7777-777777777771', 'Sarah Williams', 'data:image/svg+xml;base64,PHN2ZyB...', '192.168.1.100', 'Mozilla/5.0 Chrome/91.0', 'v1.2', SHA256('waiver_content_1')),
    ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', 'PHOTO_RELEASE', '77777777-7777-7777-7777-777777777771', 'Sarah Williams', 'data:image/svg+xml;base64,PHN2ZyB...', '192.168.1.100', 'Mozilla/5.0 Chrome/91.0', 'v1.0', SHA256('photo_release_1'));

-- Scenario 2: Individual Registration with COPPA (U10 player)
INSERT INTO registration_orders (
    id, tenant_id, order_number, season_id, division_id, registration_type,
    status, primary_contact, emergency_contacts, payment_method,
    subtotal, tax_amount, total_amount, metadata, created_by_user_id
) VALUES (
    '11111111-1111-1111-1111-111111111112',
    'phoenix-flight',
    'REG-2025-002',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333334', -- U10 Division
    'INDIVIDUAL',
    'PENDING_WAIVERS',
    '{"user_id": "88888888-8888-8888-8888-888888888888", "name": "Jennifer Smith", "email": "jennifer.smith@example.com", "phone": "480-555-0456"}'::jsonb,
    '[{"name": "John Smith", "phone": "480-555-0457", "relationship": "Father"}]'::jsonb,
    'CREDIT_CARD',
    175.00,
    14.70,
    189.70,
    '{"demo_data": "true", "notes": "Individual registration requiring COPPA consent"}'::jsonb,
    '88888888-8888-8888-8888-888888888888'
);

-- Add COPPA-required player
INSERT INTO registration_players (
    registration_order_id, player_id, player_first_name, player_last_name,
    player_birth_date, player_age, requires_coppa_consent, coppa_consent_status
) VALUES (
    '11111111-1111-1111-1111-111111111112',
    '66666666-6666-6666-6666-666666666669',
    'Emma', 'Smith', '2015-11-20', 9, true, 'PENDING'
);

-- Add parental consent record
INSERT INTO parental_consents (
    tenant_id, child_id, parent_id, parent_email, parent_first_name, parent_last_name,
    parent_phone, consent_type, data_permissions, verification_method, status
) VALUES (
    'phoenix-flight',
    '66666666-6666-6666-6666-666666666669',
    '88888888-8888-8888-8888-888888888888',
    'jennifer.smith@example.com',
    'Jennifer', 'Smith', '480-555-0456',
    '{"registration": true, "photo_release": true, "medical_info": true}'::jsonb,
    '{"view_stats": true, "receive_emails": true, "share_photos": false}'::jsonb,
    'EMAIL',
    'PENDING'
);

-- Scenario 3: Failed Payment Registration
INSERT INTO registration_orders (
    id, tenant_id, order_number, season_id, division_id, registration_type,
    status, primary_contact, emergency_contacts, payment_method,
    subtotal, tax_amount, total_amount, metadata, created_by_user_id
) VALUES (
    '11111111-1111-1111-1111-111111111113',
    'phoenix-flight',
    'REG-2025-003',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333335', -- U14 Division
    'INDIVIDUAL',
    'PENDING_PAYMENT',
    '{"user_id": "99999999-9999-9999-9999-999999999999", "name": "Robert Johnson", "email": "rjohnson@example.com", "phone": "623-555-0789"}'::jsonb,
    '[{"name": "Mary Johnson", "phone": "623-555-0790", "relationship": "Spouse"}]'::jsonb,
    'CREDIT_CARD',
    175.00,
    14.70,
    189.70,
    '{"demo_data": "true", "notes": "Payment failed - insufficient funds"}'::jsonb,
    '99999999-9999-9999-9999-999999999999'
);

-- Scenario 4: Refunded Registration
INSERT INTO registration_orders (
    id, tenant_id, order_number, season_id, division_id, registration_type,
    status, primary_contact, emergency_contacts, payment_method,
    subtotal, discount_amount, tax_amount, total_amount, discount_code,
    metadata, created_by_user_id, completed_at, cancelled_at, cancellation_reason
) VALUES (
    '11111111-1111-1111-1111-111111111114',
    'phoenix-flight',
    'REG-2025-004',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333336', -- U16 Division
    'INDIVIDUAL',
    'CANCELLED',
    '{"user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "name": "Lisa Martinez", "email": "lmartinez@example.com", "phone": "602-555-0234"}'::jsonb,
    '[{"name": "Carlos Martinez", "phone": "602-555-0235", "relationship": "Father"}]'::jsonb,
    'CREDIT_CARD',
    175.00,
    25.00,
    12.60,
    162.60,
    'SIBLING15',
    '{"demo_data": "true", "notes": "Refunded due to injury before season start"}'::jsonb,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '3 days',
    'Player sustained injury, unable to participate in season'
);

-- Add refund payment record
INSERT INTO payments (
    user_id, order_id, payment_intent_id, amount, currency, status, metadata
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'REG-2025-004',
    'pi_test_refunded_12345',
    162.60,
    'USD',
    'refunded',
    '{"demo": true, "refund_reason": "injury"}'::jsonb
);

-- ============================================================================
-- Multiple Age Group Registrations
-- ============================================================================

-- U6 Registration
INSERT INTO registration_orders (
    id, tenant_id, order_number, season_id, division_id, registration_type,
    status, primary_contact, emergency_contacts, payment_method,
    subtotal, tax_amount, total_amount, metadata, created_by_user_id
) VALUES (
    '11111111-1111-1111-1111-111111111115',
    'phoenix-flight',
    'REG-2025-005',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333337', -- U6 Division
    'INDIVIDUAL',
    'COMPLETED',
    '{"user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "name": "Amanda Chen", "email": "achen@example.com", "phone": "480-555-0567"}'::jsonb,
    '[{"name": "David Chen", "phone": "480-555-0568", "relationship": "Father"}]'::jsonb,
    'CREDIT_CARD',
    125.00, -- Lower fee for younger age groups
    10.50,
    135.50,
    '{"demo_data": "true", "notes": "U6 registration - first time player"}'::jsonb,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- U18 Registration
INSERT INTO registration_orders (
    id, tenant_id, order_number, season_id, division_id, registration_type,
    status, primary_contact, emergency_contacts, payment_method,
    subtotal, tax_amount, total_amount, metadata, created_by_user_id
) VALUES (
    '11111111-1111-1111-1111-111111111116',
    'phoenix-flight',
    'REG-2025-006',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333338', -- U18 Division
    'INDIVIDUAL',
    'COMPLETED',
    '{"user_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "name": "Marcus Thompson", "email": "mthompson@example.com", "phone": "602-555-0890"}'::jsonb,
    '[{"name": "Angela Thompson", "phone": "602-555-0891", "relationship": "Mother"}]'::jsonb,
    'DEBIT_CARD',
    225.00, -- Higher fee for competitive division
    18.90,
    243.90,
    '{"demo_data": "true", "notes": "U18 competitive division"}'::jsonb,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- ============================================================================
-- Payment Plan Registration
-- ============================================================================

INSERT INTO registration_orders (
    id, tenant_id, order_number, season_id, division_id, registration_type,
    status, primary_contact, emergency_contacts, payment_method,
    subtotal, tax_amount, total_amount, metadata, created_by_user_id
) VALUES (
    '11111111-1111-1111-1111-111111111117',
    'phoenix-flight',
    'REG-2025-007',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333', -- U12 Division
    'INDIVIDUAL',
    'COMPLETED',
    '{"user_id": "dddddddd-dddd-dddd-dddd-dddddddddddd", "name": "Patricia Williams", "email": "pwilliams@example.com", "phone": "623-555-0123"}'::jsonb,
    '[{"name": "James Williams", "phone": "623-555-0124", "relationship": "Spouse"}]'::jsonb,
    'PAYMENT_PLAN',
    175.00,
    14.70,
    189.70,
    '{"demo_data": "true", "payment_plan": {"installments": 3, "frequency": "monthly", "down_payment": 63.23}}'::jsonb,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

-- ============================================================================
-- Audit Log Entries
-- ============================================================================

-- Add audit entries for team registration
INSERT INTO registration_audit_logs (
    registration_order_id, action, performed_by_user_id, performed_by_name,
    details, ip_address, user_agent
) VALUES
    ('11111111-1111-1111-1111-111111111111', 'ORDER_CREATED', '55555555-5555-5555-5555-555555555555', 'Mike Johnson',
     '{"step": "initiated", "players_count": 8}'::jsonb, '192.168.1.100', 'Mozilla/5.0'),
    ('11111111-1111-1111-1111-111111111111', 'PAYMENT_PROCESSED', '55555555-5555-5555-5555-555555555555', 'Mike Johnson',
     '{"amount": 1170.72, "payment_method": "card_ending_4242"}'::jsonb, '192.168.1.100', 'Mozilla/5.0'),
    ('11111111-1111-1111-1111-111111111111', 'WAIVERS_SIGNED', '55555555-5555-5555-5555-555555555555', 'Mike Johnson',
     '{"waivers_signed": 16, "players": 8}'::jsonb, '192.168.1.100', 'Mozilla/5.0'),
    ('11111111-1111-1111-1111-111111111111', 'ORDER_COMPLETED', '55555555-5555-5555-5555-555555555555', 'Mike Johnson',
     '{"completion_time": "7 minutes"}'::jsonb, '192.168.1.100', 'Mozilla/5.0');

-- Add audit entries for refunded registration
INSERT INTO registration_audit_logs (
    registration_order_id, action, performed_by_user_id, performed_by_name,
    details, ip_address, user_agent
) VALUES
    ('11111111-1111-1111-1111-111111111114', 'ORDER_CREATED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lisa Martinez',
     '{"step": "initiated"}'::jsonb, '192.168.1.105', 'Mozilla/5.0'),
    ('11111111-1111-1111-1111-111111111114', 'PAYMENT_PROCESSED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lisa Martinez',
     '{"amount": 162.60, "discount": "SIBLING15"}'::jsonb, '192.168.1.105', 'Mozilla/5.0'),
    ('11111111-1111-1111-1111-111111111114', 'ORDER_COMPLETED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lisa Martinez',
     '{"completion_time": "5 minutes"}'::jsonb, '192.168.1.105', 'Mozilla/5.0'),
    ('11111111-1111-1111-1111-111111111114', 'REFUND_REQUESTED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lisa Martinez',
     '{"reason": "injury", "amount": 162.60}'::jsonb, '192.168.1.105', 'Mozilla/5.0'),
    ('11111111-1111-1111-1111-111111111114', 'REFUND_PROCESSED', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Admin User',
     '{"refund_id": "re_test_12345", "amount": 162.60}'::jsonb, '10.0.0.1', 'Admin Portal');

-- ============================================================================
-- Summary Statistics
-- ============================================================================

-- Display registration summary
SELECT 
    'Registration Demo Data Summary' as description,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'PENDING_PAYMENT' THEN 1 END) as pending_payment,
    COUNT(CASE WHEN status = 'PENDING_WAIVERS' THEN 1 END) as pending_waivers,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value
FROM registration_orders
WHERE metadata->>'demo_data' = 'true';