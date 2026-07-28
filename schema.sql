CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  preferred_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  essay_one TEXT,
  essay_two TEXT,
  experience_data TEXT, -- JSON string for form responses
  needs_financial_aid BOOLEAN DEFAULT 0,
  student_location TEXT, -- massachusetts, out_of_state, international
  is_draft BOOLEAN DEFAULT 1,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewer_grade INTEGER, -- 1-5 rating from admin
  reviewer_notes TEXT,
  reviewed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  recommender_name TEXT NOT NULL,
  recommender_email TEXT NOT NULL,
  recommender_title TEXT,
  token TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  letter_text TEXT,
  is_submitted BOOLEAN DEFAULT 0,
  submitted_at DATETIME,
  submitter_ip TEXT,
  is_personal_email BOOLEAN DEFAULT 0,
  applicant_device_fp TEXT,
  recommender_device_fp TEXT,
  user_agent TEXT,
  is_suspicious_submission BOOLEAN DEFAULT 0,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  applications_open BOOLEAN DEFAULT 1,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by_email TEXT
);