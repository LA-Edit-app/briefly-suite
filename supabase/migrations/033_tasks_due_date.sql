-- Migration 033: Add due_date to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date DATE;
