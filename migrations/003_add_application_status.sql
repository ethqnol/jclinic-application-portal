-- Add application status tracking
CREATE TABLE IF NOT EXISTS application_settings (
  id INTEGER PRIMARY KEY,
  applications_open BOOLEAN DEFAULT 1,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by_email TEXT
);

-- Insert default row with applications open
INSERT INTO application_settings (id, applications_open) VALUES (1, 1);