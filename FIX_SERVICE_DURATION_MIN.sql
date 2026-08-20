-- Ajouter la colonne duration_min à la table Service si elle manque
DO $$ BEGIN
  ALTER TABLE public."Service" ADD COLUMN IF NOT EXISTS duration_min INTEGER DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Service' AND column_name = 'duration_min';
