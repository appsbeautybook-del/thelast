ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

WITH duplicates AS (
  SELECT id, username,
         ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY created_at, id) AS position
  FROM public.profiles
  WHERE username IS NOT NULL AND username <> ''
)
UPDATE public.profiles AS p
SET username = LEFT(duplicates.username, 18) || '_' || duplicates.position
FROM duplicates
WHERE p.id = duplicates.id AND duplicates.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL AND username <> '';
