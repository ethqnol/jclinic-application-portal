-- Add reviewers table
CREATE TABLE IF NOT EXISTS reviewers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add new fields to applications table
ALTER TABLE applications ADD COLUMN student_location TEXT;
ALTER TABLE applications ADD COLUMN reviewer_grade INTEGER;
ALTER TABLE applications ADD COLUMN reviewer_notes TEXT;

-- Add index for reviewer assignments
CREATE INDEX IF NOT EXISTS idx_applications_assigned_to ON applications(assigned_to);
CREATE INDEX IF NOT EXISTS idx_applications_review_status ON applications(review_status);