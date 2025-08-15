-- Add first_name, last_name, and preferred_email fields to users table
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN preferred_email TEXT;

-- Update existing users to split their name field into first and last names
-- This is a temporary solution - in practice you'd want to handle this more carefully
UPDATE users SET 
  first_name = CASE 
    WHEN instr(name, ' ') > 0 THEN substr(name, 1, instr(name, ' ') - 1)
    ELSE name
  END,
  last_name = CASE 
    WHEN instr(name, ' ') > 0 THEN substr(name, instr(name, ' ') + 1)
    ELSE ''
  END,
  preferred_email = email
WHERE first_name IS NULL;

-- After migration, these fields should be required for new users
-- (The application code will enforce this for new registrations)