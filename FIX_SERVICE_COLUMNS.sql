-- Ajouter les colonnes manquantes à la table Service
DO $$ BEGIN
  ALTER TABLE public."Service" ADD COLUMN IF NOT EXISTS duration_min INTEGER DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public."Service" ADD COLUMN IF NOT EXISTS price_ht NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Service'
ORDER BY ordinal_position;
