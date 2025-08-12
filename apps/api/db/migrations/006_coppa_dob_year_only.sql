-- COPPA Compliance: Update schema to store only birth year for minors
-- Migration: 006_coppa_dob_year_only.sql

BEGIN;

-- Add new columns to users table for COPPA compliance
ALTER TABLE users
ADD COLUMN IF NOT EXISTS birth_year INTEGER,
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS registration_ip_hash VARCHAR(64);

-- Create parental_consents table
CREATE TABLE IF NOT EXISTS parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_email VARCHAR(255) NOT NULL,
    parent_first_name VARCHAR(100),
    parent_last_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'revoked')),
    consent_token VARCHAR(255) UNIQUE NOT NULL,
    consent_ip_hash VARCHAR(64),
    consent_text TEXT NOT NULL,
    consent_details JSONB DEFAULT '{}',
    consented_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revocation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for parental_consents
CREATE INDEX idx_parental_consents_child_user_id ON parental_consents(child_user_id);
CREATE INDEX idx_parental_consents_parent_email ON parental_consents(parent_email);
CREATE INDEX idx_parental_consents_status ON parental_consents(status);
CREATE INDEX idx_parental_consents_expires_at ON parental_consents(expires_at);
CREATE INDEX idx_parental_consents_created_at ON parental_consents(created_at);

-- Function to update existing minor records to store only birth year
CREATE OR REPLACE FUNCTION update_minor_dob_to_year_only() RETURNS void AS $$
DECLARE
    user_record RECORD;
    age INTEGER;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    FOR user_record IN 
        SELECT id, date_of_birth 
        FROM users 
        WHERE date_of_birth IS NOT NULL
    LOOP
        -- Calculate age
        age := EXTRACT(YEAR FROM AGE(user_record.date_of_birth));
        
        -- If user is under 13, update to store only birth year
        IF age < 13 THEN
            UPDATE users 
            SET 
                birth_year = EXTRACT(YEAR FROM user_record.date_of_birth),
                is_minor = TRUE,
                date_of_birth = NULL
            WHERE id = user_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to update existing records
SELECT update_minor_dob_to_year_only();

-- Drop the function after use
DROP FUNCTION update_minor_dob_to_year_only();

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parental_consents_updated_at 
    BEFORE UPDATE ON parental_consents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add check constraint to ensure minors have parent email
ALTER TABLE users
ADD CONSTRAINT check_minor_parent_email 
CHECK (
    (is_minor = FALSE) OR 
    (is_minor = TRUE AND parent_email IS NOT NULL)
);

-- Add function to check consent validity
CREATE OR REPLACE FUNCTION is_consent_valid(consent_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    consent_record RECORD;
BEGIN
    SELECT status, expires_at, revoked_at
    INTO consent_record
    FROM parental_consents
    WHERE id = consent_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    RETURN consent_record.status = 'approved' 
        AND consent_record.expires_at > CURRENT_TIMESTAMP
        AND consent_record.revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Add function to check payment consent
CREATE OR REPLACE FUNCTION has_valid_payment_consent(user_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
    consent_record RECORD;
BEGIN
    -- Get user record
    SELECT is_minor
    INTO user_record
    FROM users
    WHERE id = user_id;
    
    IF NOT FOUND OR user_record.is_minor = FALSE THEN
        RETURN TRUE; -- Adults don't need parental consent
    END IF;
    
    -- Check for valid consent
    SELECT id, consent_details
    INTO consent_record
    FROM parental_consents
    WHERE child_user_id = user_id
        AND status = 'approved'
        AND expires_at > CURRENT_TIMESTAMP
        AND revoked_at IS NULL
        AND consent_details->>'paymentProcessing' = 'true'
    ORDER BY consented_at DESC
    LIMIT 1;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add audit log entries for COPPA-related actions
INSERT INTO audit_logs (organization_id, action, status, description, metadata, created_at)
SELECT 
    organization_id,
    'admin.configuration_changed',
    'info',
    'COPPA compliance migration applied',
    jsonb_build_object(
        'migration', '006_coppa_dob_year_only',
        'changes', jsonb_build_array(
            'Added birth_year column for minors',
            'Created parental_consents table',
            'Updated existing minor records'
        )
    ),
    CURRENT_TIMESTAMP
FROM users
WHERE organization_id IS NOT NULL
LIMIT 1;

COMMIT;