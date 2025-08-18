-- Migration: Add assignment tracking columns to applications table

ALTER TABLE applications ADD COLUMN assigned_to TEXT;
ALTER TABLE applications ADD COLUMN review_status TEXT DEFAULT 'unassigned';
ALTER TABLE applications ADD COLUMN assigned_at DATETIME;
ALTER TABLE applications ADD COLUMN reviewed_at DATETIME;

-- Create index for efficient querying by assigned_to
CREATE INDEX IF NOT EXISTS idx_applications_assigned_to ON applications(assigned_to);
CREATE INDEX IF NOT EXISTS idx_applications_review_status ON applications(review_status);