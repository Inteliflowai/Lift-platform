-- Add math dimension score to insight profiles
ALTER TABLE insight_profiles
ADD COLUMN IF NOT EXISTS math_score numeric(5,2);

-- Add math task type if not already present
DO $$ BEGIN
  ALTER TABLE task_templates DROP CONSTRAINT IF EXISTS task_templates_task_type_check;
  ALTER TABLE task_templates ADD CONSTRAINT task_templates_task_type_check
    CHECK (task_type IN ('reading_passage','short_response','extended_writing','reflection','scenario','planning','quantitative_reasoning','pattern_logic','math_problem'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
