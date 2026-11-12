-- ============================================================
-- Migration 051: Task status (issue #17)
-- Tasks move from done / not done to three states:
-- not_started → in_progress → done.
-- The old `completed` flag is kept in step by a trigger so
-- anything still reading or writing it keeps working.
-- ============================================================

-- 1. New status column
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'done'));

-- 2. Existing finished tasks become "done"
UPDATE public.tasks
SET    status = 'done'
WHERE  completed IS TRUE
AND    status <> 'done';

-- 3. Keep `completed` and `status` in step.
--    A status change wins; a change to `completed` alone maps
--    to done / not_started.
CREATE OR REPLACE FUNCTION public.sync_task_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'not_started' AND NEW.completed IS TRUE THEN
      NEW.status := 'done';
    END IF;
  ELSIF NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.completed IS DISTINCT FROM OLD.completed THEN
    NEW.status := CASE WHEN NEW.completed THEN 'done' ELSE 'not_started' END;
  END IF;

  NEW.completed := (NEW.status = 'done');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_sync_status ON public.tasks;
CREATE TRIGGER tasks_sync_status
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_status();
