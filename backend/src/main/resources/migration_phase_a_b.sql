-- ==============================================================================
-- TechCare - Schema Migration (Phase A Security & Phase B Repair Lifecycle)
-- Safe, additive migration: No data loss, no dropping of existing columns/tables
-- ==============================================================================

-- 1. Security Audit Table for Customer Device PIN Access
CREATE TABLE IF NOT EXISTS device_pin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    username VARCHAR(50) NOT NULL,
    user_role VARCHAR(30) NOT NULL,
    device_id BIGINT NOT NULL,
    ticket_id BIGINT,
    outcome VARCHAR(50) NOT NULL,
    accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pin_audit_device ON device_pin_audit_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_pin_audit_user ON device_pin_audit_logs(user_id);

