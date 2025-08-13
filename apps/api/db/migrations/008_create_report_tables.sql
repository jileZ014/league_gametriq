-- ============================================================================
-- Basketball League Management Platform
-- Report System Database Migration
-- ============================================================================
-- Migration: 008_create_report_tables
-- Date: 2025-08-13
-- Description: Creates tables for the scheduled reports system
-- ============================================================================

-- Report template types enum
CREATE TYPE report_template_type AS ENUM (
    'league_summary',
    'financial',
    'game_results',
    'attendance',
    'custom'
);

-- Report schedule types enum
CREATE TYPE report_schedule_type AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'custom'
);

-- Report delivery methods enum
CREATE TYPE report_delivery_method AS ENUM (
    'email',
    'in_app',
    'both'
);

-- Report formats enum
CREATE TYPE report_format AS ENUM (
    'pdf',
    'html',
    'excel',
    'csv'
);

-- Report status enum
CREATE TYPE report_status AS ENUM (
    'pending',
    'generating',
    'generated',
    'delivered',
    'failed'
);

-- ============================================================================
-- Report Templates Table
-- ============================================================================
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type report_template_type NOT NULL,
    template_content JSONB NOT NULL DEFAULT '{}',
    variables JSONB NOT NULL DEFAULT '{}',
    default_filters JSONB NOT NULL DEFAULT '{}',
    sections JSONB NOT NULL DEFAULT '[]',
    styling JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT template_name_unique UNIQUE(organization_id, name),
    -- System templates cannot be modified by organization
    CONSTRAINT template_system_readonly CHECK (
        (is_system = FALSE) OR (is_system = TRUE AND created_by IS NOT NULL)
    )
);

-- ============================================================================
-- Scheduled Reports Table
-- ============================================================================
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schedule_type report_schedule_type NOT NULL,
    schedule_config JSONB NOT NULL DEFAULT '{}', -- Contains cron expression, day of week, time, etc.
    recipients JSONB NOT NULL DEFAULT '[]', -- Array of email addresses and/or user roles
    delivery_method report_delivery_method NOT NULL DEFAULT 'email',
    format report_format NOT NULL DEFAULT 'pdf',
    filters JSONB NOT NULL DEFAULT '{}', -- Additional filters for data
    include_attachments BOOLEAN NOT NULL DEFAULT TRUE,
    include_charts BOOLEAN NOT NULL DEFAULT TRUE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Phoenix',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_run TIMESTAMP WITH TIME ZONE,
    last_success TIMESTAMP WITH TIME ZONE,
    last_failure TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER NOT NULL DEFAULT 0,
    next_run TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT scheduled_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT scheduled_valid_retries CHECK (retry_count >= 0 AND max_retries >= 0),
    CONSTRAINT scheduled_valid_failures CHECK (failure_count >= 0),
    -- Ensure at least one recipient
    CONSTRAINT scheduled_has_recipients CHECK (jsonb_array_length(recipients) > 0)
);

-- ============================================================================
-- Report History Table
-- ============================================================================
CREATE TABLE report_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    format report_format NOT NULL,
    file_url TEXT,
    file_size INTEGER, -- Size in bytes
    file_hash VARCHAR(64), -- SHA256 hash for integrity
    s3_bucket VARCHAR(255),
    s3_key VARCHAR(500),
    generation_time_ms INTEGER, -- Time taken to generate in milliseconds
    delivery_time_ms INTEGER, -- Time taken to deliver in milliseconds
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- When the report file should be deleted
    recipients JSONB NOT NULL DEFAULT '[]',
    delivery_method report_delivery_method,
    status report_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    error_details JSONB,
    metadata JSONB NOT NULL DEFAULT '{}', -- Additional metadata about the report
    filters_applied JSONB NOT NULL DEFAULT '{}', -- Filters that were applied
    data_snapshot JSONB, -- Optional snapshot of key data points
    row_count INTEGER, -- Number of rows/records in the report
    page_count INTEGER, -- Number of pages (for PDF)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT history_valid_times CHECK (
        (delivered_at IS NULL) OR (delivered_at >= generated_at)
    ),
    CONSTRAINT history_valid_expiry CHECK (
        (expires_at IS NULL) OR (expires_at > generated_at)
    ),
    CONSTRAINT history_valid_size CHECK (
        (file_size IS NULL) OR (file_size > 0)
    ),
    CONSTRAINT history_valid_metrics CHECK (
        (generation_time_ms IS NULL OR generation_time_ms >= 0) AND
        (delivery_time_ms IS NULL OR delivery_time_ms >= 0)
    )
);

-- ============================================================================
-- Report Queue Table (for tracking report generation jobs)
-- ============================================================================
CREATE TABLE report_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES report_templates(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    worker_id VARCHAR(255), -- ID of the worker processing this job
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT queue_valid_priority CHECK (priority BETWEEN 1 AND 1000),
    CONSTRAINT queue_valid_status CHECK (
        status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT queue_valid_attempts CHECK (attempts >= 0)
);

-- ============================================================================
-- Report Subscriptions Table (for users subscribing to reports)
-- ============================================================================
CREATE TABLE report_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    email_override email_address, -- Override user's default email
    format_preference report_format,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    unsubscribe_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, scheduled_report_id),
    CONSTRAINT subscription_valid_unsubscribe CHECK (
        (is_active = TRUE AND unsubscribed_at IS NULL) OR
        (is_active = FALSE AND unsubscribed_at IS NOT NULL)
    )
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Report Templates
CREATE INDEX idx_report_templates_org ON report_templates(organization_id);
CREATE INDEX idx_report_templates_type ON report_templates(template_type);
CREATE INDEX idx_report_templates_active ON report_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_report_templates_system ON report_templates(is_system) WHERE is_system = TRUE;

-- Scheduled Reports
CREATE INDEX idx_scheduled_reports_org ON scheduled_reports(organization_id);
CREATE INDEX idx_scheduled_reports_league ON scheduled_reports(league_id) WHERE league_id IS NOT NULL;
CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run) WHERE is_active = TRUE;
CREATE INDEX idx_scheduled_reports_template ON scheduled_reports(template_id);

-- Report History
CREATE INDEX idx_report_history_org ON report_history(organization_id);
CREATE INDEX idx_report_history_scheduled ON report_history(scheduled_report_id) WHERE scheduled_report_id IS NOT NULL;
CREATE INDEX idx_report_history_status ON report_history(status);
CREATE INDEX idx_report_history_generated ON report_history(generated_at);
CREATE INDEX idx_report_history_expires ON report_history(expires_at) WHERE expires_at IS NOT NULL;

-- Report Queue
CREATE INDEX idx_report_queue_status ON report_queue(status);
CREATE INDEX idx_report_queue_scheduled ON report_queue(scheduled_for) WHERE status = 'queued';
CREATE INDEX idx_report_queue_priority ON report_queue(priority, scheduled_for) WHERE status = 'queued';

-- Report Subscriptions
CREATE INDEX idx_report_subscriptions_user ON report_subscriptions(user_id);
CREATE INDEX idx_report_subscriptions_report ON report_subscriptions(scheduled_report_id);
CREATE INDEX idx_report_subscriptions_active ON report_subscriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_report_subscriptions_token ON report_subscriptions(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_queue_updated_at
    BEFORE UPDATE ON report_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_subscriptions_updated_at
    BEFORE UPDATE ON report_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Initial System Templates
-- ============================================================================

-- Note: System templates will be inserted via seed data
-- See: /apps/api/db/seed/report_templates.sql

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE report_templates IS 'Stores report templates that define the structure and content of reports';
COMMENT ON TABLE scheduled_reports IS 'Stores scheduled report configurations for automated generation and delivery';
COMMENT ON TABLE report_history IS 'Maintains history of all generated reports with metadata and delivery status';
COMMENT ON TABLE report_queue IS 'Queue for managing report generation jobs and their processing status';
COMMENT ON TABLE report_subscriptions IS 'Manages user subscriptions to scheduled reports with preferences';

COMMENT ON COLUMN report_templates.template_content IS 'JSON structure defining the report layout, sections, and data sources';
COMMENT ON COLUMN scheduled_reports.schedule_config IS 'JSON containing cron expression, timezone, and other scheduling parameters';
COMMENT ON COLUMN scheduled_reports.recipients IS 'JSON array of recipient emails or role-based distribution lists';
COMMENT ON COLUMN report_history.data_snapshot IS 'Optional JSON snapshot of key metrics at time of report generation';
COMMENT ON COLUMN report_queue.worker_id IS 'Identifier of the worker process handling this job for distributed processing';