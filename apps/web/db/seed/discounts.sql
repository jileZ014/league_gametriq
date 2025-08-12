-- ============================================================================
-- Discount Codes Seed Data
-- Basketball League Management Platform
-- ============================================================================
-- Description: Test discount codes for various scenarios including percentage
-- and fixed amount discounts
-- Date: 2025-08-10
-- ============================================================================

-- Clean up existing discount codes
DELETE FROM discount_codes WHERE description LIKE '%Demo%' OR description LIKE '%Test%';

-- ============================================================================
-- Percentage-Based Discounts
-- ============================================================================

-- Early Bird Discount (10% off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, min_order_amount, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'EARLYBIRD10',
    'Early Bird Special - 10% off (Demo)',
    'PERCENTAGE',
    10.00,
    'ORDER',
    100.00, -- Minimum order $100
    1000,   -- Max 1000 uses
    '2025-01-01'::timestamp,
    '2025-03-01'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Sibling Discount (15% off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'SIBLING15',
    'Sibling Discount - 15% off (Demo)',
    'PERCENTAGE',
    15.00,
    'PLAYER',
    NULL, -- Unlimited uses
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Team Discount (20% off for full teams)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, min_order_amount, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'TEAM20',
    'Team Registration - 20% off (Demo)',
    'PERCENTAGE',
    20.00,
    'TEAM',
    800.00, -- Minimum for team registration
    100,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Returning Player Discount (25% off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'RETURN25',
    'Returning Player - 25% off (Demo)',
    'PERCENTAGE',
    25.00,
    'PLAYER',
    500,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Military/First Responder Discount (30% off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'HEROES30',
    'Military & First Responders - 30% off (Demo)',
    'PERCENTAGE',
    30.00,
    'ORDER',
    NULL,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Limited Time Flash Sale (50% off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, max_uses, current_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'FLASH50',
    'Flash Sale - 50% off (Demo)',
    'PERCENTAGE',
    50.00,
    'ORDER',
    50,
    45, -- Almost used up
    '2025-02-01'::timestamp,
    '2025-02-07'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- ============================================================================
-- Fixed Amount Discounts
-- ============================================================================

-- New Player Welcome ($25 off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, min_order_amount, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'WELCOME25',
    'New Player Welcome - $25 off (Demo)',
    'FIXED_AMOUNT',
    25.00,
    'PLAYER',
    100.00,
    1000,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Referral Bonus ($50 off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, min_order_amount, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'REFER50',
    'Referral Program - $50 off (Demo)',
    'FIXED_AMOUNT',
    50.00,
    'ORDER',
    150.00,
    NULL,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Scholarship Discount ($100 off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'SCHOLAR100',
    'Need-Based Scholarship - $100 off (Demo)',
    'FIXED_AMOUNT',
    100.00,
    'PLAYER',
    50,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Corporate Sponsor Discount ($75 off)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'ACMECORP75',
    'ACME Corp Employee - $75 off (Demo)',
    'FIXED_AMOUNT',
    75.00,
    'ORDER',
    200,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- ============================================================================
-- Division-Specific Discounts
-- ============================================================================

-- U6/U8 Intro League Discount
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, division_ids, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'INTRO30',
    'Intro League (U6/U8) - 30% off (Demo)',
    'PERCENTAGE',
    30.00,
    'PLAYER',
    ARRAY['33333333-3333-3333-3333-333333333337', '33333333-3333-3333-3333-333333333339']::uuid[], -- U6 and U8 divisions
    NULL,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- ============================================================================
-- Season-Specific Discounts
-- ============================================================================

-- Spring Season Launch
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, season_ids, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'SPRING2025',
    'Spring 2025 Season Launch - $40 off (Demo)',
    'FIXED_AMOUNT',
    40.00,
    'ORDER',
    ARRAY['22222222-2222-2222-2222-222222222222']::uuid[], -- Spring 2025 season
    500,
    '2025-01-01'::timestamp,
    '2025-02-28'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- ============================================================================
-- Expired/Inactive Discounts (for testing)
-- ============================================================================

-- Expired Early Bird
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, max_uses, current_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'EXPIRED15',
    'Expired Early Bird - 15% off (Demo)',
    'PERCENTAGE',
    15.00,
    'ORDER',
    100,
    100, -- Fully used
    '2024-01-01'::timestamp,
    '2024-12-31'::timestamp,
    false,
    '00000000-0000-0000-0000-000000000000'
);

-- Inactive Holiday Special
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'HOLIDAY2024',
    'Holiday Special 2024 - $60 off (Demo)',
    'FIXED_AMOUNT',
    60.00,
    'ORDER',
    '2024-11-01'::timestamp,
    '2024-12-31'::timestamp,
    false, -- Manually deactivated
    '00000000-0000-0000-0000-000000000000'
);

-- ============================================================================
-- Test Codes for Development
-- ============================================================================

-- Test 100% Discount (for testing only)
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'TEST100',
    'Test Code - 100% off (TESTING ONLY)',
    'PERCENTAGE',
    100.00,
    'ORDER',
    10,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Test $1 Registration
INSERT INTO discount_codes (
    tenant_id, code, description, discount_type, discount_value,
    applicable_to, min_order_amount, max_uses, valid_from, valid_until,
    is_active, created_by
) VALUES (
    'phoenix-flight',
    'TESTPENNY',
    'Test Code - Pay only $1 (TESTING ONLY)',
    'FIXED_AMOUNT',
    174.00, -- Assuming $175 registration fee
    'ORDER',
    175.00,
    10,
    '2025-01-01'::timestamp,
    '2025-12-31'::timestamp,
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- ============================================================================
-- Summary Report
-- ============================================================================

SELECT 
    'Discount Codes Summary' as report,
    COUNT(*) as total_codes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_codes,
    COUNT(CASE WHEN discount_type = 'PERCENTAGE' THEN 1 END) as percentage_discounts,
    COUNT(CASE WHEN discount_type = 'FIXED_AMOUNT' THEN 1 END) as fixed_discounts,
    COUNT(CASE WHEN max_uses IS NULL THEN 1 END) as unlimited_use_codes,
    COUNT(CASE WHEN current_uses >= max_uses THEN 1 END) as exhausted_codes
FROM discount_codes
WHERE description LIKE '%Demo%' OR description LIKE '%Test%';