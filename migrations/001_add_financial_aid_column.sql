-- Migration: Add needs_financial_aid column to applications table
ALTER TABLE applications ADD COLUMN needs_financial_aid BOOLEAN DEFAULT 0;