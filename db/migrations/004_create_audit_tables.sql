-- Migration: Create Audit Tables
-- Description: Creates tables for audit logging and archives
-- Version: 004
-- Created: 2023-08-10

-- Create enum types for audit actions and statuses
CREATE TYPE audit_action AS ENUM (
  -- Registration Events
  'registration.started',
  'registration.completed',
  'registration.failed',
  'registration.updated',
  'registration.cancelled',
  
  -- Payment Events
  'payment.initiated',
  'payment.processing',
  'payment.completed',
  'payment.failed',
  'payment.method_added',
  'payment.method_removed',
  
  -- Refund Events
  'refund.requested',
  'refund.approved',
  'refund.rejected',
  'refund.processing',
  'refund.completed',
  'refund.failed',
  
  -- User Events
  'user.login',
  'user.logout',
  'user.profile_updated',
  'user.password_changed',
  'user.email_verified',
  
  -- Admin Events
  'admin.access',
  'admin.configuration_changed',
  'admin.user_modified',
  'admin.permission_changed'
);

CREATE TYPE audit_event_status AS ENUM (
  'success',
  'failure',
  'warning',
  'info'
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID,
  action audit_action NOT NULL,
  status audit_event_status NOT NULL DEFAULT 'info',
  description TEXT,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_url TEXT,
  metadata JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_expires ON audit_logs(expires_at) WHERE expires_at IS NOT NULL;

-- Create partial index for active logs (not expired)
CREATE INDEX idx_audit_logs_active ON audit_logs(created_at DESC) 
WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

-- Create audit_log_archives table for long-term storage
CREATE TABLE IF NOT EXISTS audit_log_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  archive_date DATE NOT NULL,
  record_count INTEGER NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for archives
CREATE INDEX idx_audit_archives_org_date ON audit_log_archives(organization_id, archive_date DESC);
CREATE INDEX idx_audit_archives_created ON audit_log_archives(created_at DESC);

-- Create function to automatically set expires_at based on retention policy
CREATE OR REPLACE FUNCTION set_audit_log_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '90 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set expiry date
CREATE TRIGGER audit_log_set_expiry
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_log_expiry();

-- Create function to clean up expired logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE expires_at < CURRENT_TIMESTAMP
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for recent audit activity
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT 
  a.id,
  a.organization_id,
  a.user_id,
  a.action,
  a.status,
  a.description,
  a.entity_type,
  a.entity_id,
  a.ip_address,
  a.created_at,
  a.metadata
FROM audit_logs a
WHERE a.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
ORDER BY a.created_at DESC;

-- Create view for audit statistics
CREATE OR REPLACE VIEW audit_statistics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  organization_id,
  action,
  status,
  COUNT(*) as event_count,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms
FROM audit_logs
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), organization_id, action, status;

-- Create function to archive old audit logs
CREATE OR REPLACE FUNCTION archive_audit_logs(
  p_organization_id UUID DEFAULT NULL,
  p_before_date DATE DEFAULT CURRENT_DATE - INTERVAL '60 days'
)
RETURNS TABLE (
  archived_count INTEGER,
  archive_id UUID,
  file_path VARCHAR
) AS $$
DECLARE
  v_archive_id UUID;
  v_file_path VARCHAR;
  v_record_count INTEGER;
  v_checksum VARCHAR;
BEGIN
  -- Generate archive ID and file path
  v_archive_id := gen_random_uuid();
  v_file_path := 'archives/audit/' || 
    COALESCE(p_organization_id::TEXT, 'global') || '/' ||
    TO_CHAR(p_before_date, 'YYYY/MM/') ||
    v_archive_id || '.jsonl.gz';
  
  -- Count records to be archived
  SELECT COUNT(*) INTO v_record_count
  FROM audit_logs
  WHERE created_at < p_before_date
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);
  
  -- In a real implementation, you would export data to file here
  -- For now, we'll just create the archive record
  
  -- Generate checksum (placeholder)
  v_checksum := MD5(v_archive_id::TEXT || v_record_count::TEXT);
  
  -- Create archive record
  INSERT INTO audit_log_archives (
    id,
    organization_id,
    archive_date,
    record_count,
    file_path,
    file_size,
    checksum,
    metadata
  ) VALUES (
    v_archive_id,
    p_organization_id,
    p_before_date,
    v_record_count,
    v_file_path,
    v_record_count * 1024, -- Placeholder file size
    v_checksum,
    jsonb_build_object(
      'before_date', p_before_date,
      'archived_at', CURRENT_TIMESTAMP
    )
  );
  
  -- Delete archived records
  DELETE FROM audit_logs
  WHERE created_at < p_before_date
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);
  
  RETURN QUERY
  SELECT v_record_count, v_archive_id, v_file_path;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Stores all audit events for user actions, payments, and system changes';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.status IS 'Result status of the action';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context data (PII-safe)';
COMMENT ON COLUMN audit_logs.duration_ms IS 'Time taken to complete the action in milliseconds';
COMMENT ON COLUMN audit_logs.expires_at IS 'When this log entry should be deleted';

COMMENT ON TABLE audit_log_archives IS 'Long-term storage references for archived audit logs';
COMMENT ON COLUMN audit_log_archives.checksum IS 'SHA-256 checksum of the archived data';

-- Grant appropriate permissions
GRANT SELECT ON audit_logs TO app_read_role;
GRANT INSERT ON audit_logs TO app_write_role;
GRANT SELECT ON recent_audit_activity TO app_read_role;
GRANT SELECT ON audit_statistics TO app_read_role;