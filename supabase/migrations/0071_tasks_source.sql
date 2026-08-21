ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
CHECK (source IN ('manual', 'fireflies', 'recurring', 'template'));
