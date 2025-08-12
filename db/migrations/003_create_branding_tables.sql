-- Migration: Create Branding Tables
-- Description: Creates tables for organization branding/theming management
-- Author: Backend Agent
-- Date: 2025-08-10

-- Create branding table for storing theme configurations
CREATE TABLE IF NOT EXISTS branding (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    version VARCHAR(50),
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    
    -- Indexes for performance
    CONSTRAINT idx_unique_active_branding UNIQUE (organization_id, is_active) WHERE is_active = true,
    CONSTRAINT idx_unique_default_branding UNIQUE (is_default) WHERE is_default = true
);

-- Create index for organization lookup
CREATE INDEX idx_branding_organization_id ON branding(organization_id);
CREATE INDEX idx_branding_organization_active ON branding(organization_id, is_active);

-- Create branding_assets table for storing uploaded assets
CREATE TABLE IF NOT EXISTS branding_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branding_id UUID NOT NULL REFERENCES branding(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('logo_light', 'logo_dark', 'favicon', 'font', 'other')),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    public_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    
    -- Indexes
    CONSTRAINT idx_unique_asset_type UNIQUE (branding_id, asset_type)
);

-- Create indexes for asset lookups
CREATE INDEX idx_branding_assets_branding_id ON branding_assets(branding_id);
CREATE INDEX idx_branding_assets_type ON branding_assets(branding_id, asset_type);

-- Create branding_audit table for tracking changes
CREATE TABLE IF NOT EXISTS branding_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branding_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated')),
    previous_config JSONB,
    new_config JSONB,
    changes JSONB,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Indexes for audit queries
    CONSTRAINT fk_branding_audit_branding FOREIGN KEY (branding_id) REFERENCES branding(id) ON DELETE CASCADE
);

-- Create indexes for audit lookups
CREATE INDEX idx_branding_audit_branding_id ON branding_audit(branding_id);
CREATE INDEX idx_branding_audit_organization_id ON branding_audit(organization_id);
CREATE INDEX idx_branding_audit_performed_at ON branding_audit(performed_at DESC);
CREATE INDEX idx_branding_audit_performed_by ON branding_audit(performed_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branding_updated_at_trigger
    BEFORE UPDATE ON branding
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

-- Create view for active branding per organization
CREATE OR REPLACE VIEW v_active_branding AS
SELECT 
    b.id,
    b.organization_id,
    b.config,
    b.version,
    b.applied_at,
    b.created_at,
    b.updated_at,
    COUNT(ba.id) as asset_count
FROM branding b
LEFT JOIN branding_assets ba ON ba.branding_id = b.id
WHERE b.is_active = true
GROUP BY b.id;

-- Create function to ensure only one active branding per organization
CREATE OR REPLACE FUNCTION ensure_single_active_branding()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        -- Deactivate other brandings for the same organization
        UPDATE branding 
        SET is_active = false 
        WHERE organization_id = NEW.organization_id 
        AND id != NEW.id 
        AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_active_branding_trigger
    BEFORE INSERT OR UPDATE ON branding
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_single_active_branding();

-- Create function to validate branding config structure
CREATE OR REPLACE FUNCTION validate_branding_config(config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check required fields exist
    IF NOT (
        config ? 'organizationName' AND
        config ? 'colors' AND
        config ? 'fonts' AND
        config ? 'logos' AND
        config->'colors' ? 'primary' AND
        config->'colors' ? 'secondary' AND
        config->'colors' ? 'background' AND
        config->'colors' ? 'text' AND
        config->'fonts' ? 'primary' AND
        config->'logos' ? 'light'
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate config
ALTER TABLE branding ADD CONSTRAINT check_valid_config CHECK (validate_branding_config(config));

-- Create default branding configuration
INSERT INTO branding (
    organization_id,
    config,
    is_active,
    is_default,
    version,
    created_by
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID, -- System organization
    '{
        "organizationName": "GameTriq League",
        "tagline": "Youth Sports Management Platform",
        "colors": {
            "primary": "#1976D2",
            "secondary": "#FF4081",
            "accent": "#00BCD4",
            "background": "#FFFFFF",
            "surface": "#F5F5F5",
            "text": {
                "primary": "#212121",
                "secondary": "#757575",
                "disabled": "#BDBDBD"
            },
            "error": "#F44336",
            "warning": "#FF9800",
            "info": "#2196F3",
            "success": "#4CAF50"
        },
        "fonts": {
            "primary": {
                "family": "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
            },
            "sizes": {
                "xs": "0.75rem",
                "sm": "0.875rem",
                "base": "1rem",
                "lg": "1.125rem",
                "xl": "1.25rem",
                "2xl": "1.5rem"
            }
        },
        "logos": {
            "light": {
                "url": "/images/logo-light.svg",
                "width": 200,
                "height": 60
            },
            "dark": {
                "url": "/images/logo-dark.svg",
                "width": 200,
                "height": 60
            },
            "favicon": "/images/favicon.ico"
        },
        "borderRadius": "0.5rem",
        "spacing": {
            "unit": 8,
            "scale": [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16]
        }
    }'::JSONB,
    true,
    true,
    '1.0.0',
    '00000000-0000-0000-0000-000000000000'::UUID -- System user
);

-- Create indexes for better performance
CREATE INDEX idx_branding_config_organization_name ON branding ((config->>'organizationName'));
CREATE INDEX idx_branding_version ON branding(version) WHERE version IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE branding IS 'Stores organization branding and theme configurations';
COMMENT ON TABLE branding_assets IS 'Stores uploaded branding assets like logos and fonts';
COMMENT ON TABLE branding_audit IS 'Audit trail for all branding configuration changes';
COMMENT ON COLUMN branding.config IS 'JSON structure containing colors, fonts, logos, and other theme settings';
COMMENT ON COLUMN branding.is_active IS 'Indicates if this is the currently active branding for the organization';
COMMENT ON COLUMN branding.is_default IS 'Indicates if this is the system default branding (only one allowed)';
COMMENT ON COLUMN branding_assets.asset_type IS 'Type of asset: logo_light, logo_dark, favicon, font, or other';
COMMENT ON COLUMN branding_audit.action IS 'Type of action performed: created, updated, deleted, activated, or deactivated';

-- Grant permissions (adjust based on your role structure)
-- GRANT SELECT ON branding TO authenticated_user;
-- GRANT SELECT ON v_active_branding TO authenticated_user;
-- GRANT ALL ON branding TO organization_admin;
-- GRANT ALL ON branding_assets TO organization_admin;
-- GRANT SELECT ON branding_audit TO organization_admin;