-- Migration: Add new columns to ServiceBundle table
-- Run this in Supabase SQL Editor

-- Add new columns if they don't exist
DO $$
BEGIN
  -- is_group column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ServiceBundle' AND column_name = 'is_group') THEN
    ALTER TABLE "ServiceBundle" ADD COLUMN "is_group" BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_group column';
  END IF;

  -- min_persons column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ServiceBundle' AND column_name = 'min_persons') THEN
    ALTER TABLE "ServiceBundle" ADD COLUMN "min_persons" INTEGER DEFAULT 1;
    RAISE NOTICE 'Added min_persons column';
  END IF;

  -- max_persons column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ServiceBundle' AND column_name = 'max_persons') THEN
    ALTER TABLE "ServiceBundle" ADD COLUMN "max_persons" INTEGER DEFAULT 1;
    RAISE NOTICE 'Added max_persons column';
  END IF;

  -- bundle_price_per_person column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ServiceBundle' AND column_name = 'bundle_price_per_person') THEN
    ALTER TABLE "ServiceBundle" ADD COLUMN "bundle_price_per_person" NUMERIC(10,2);
    RAISE NOTICE 'Added bundle_price_per_person column';
  END IF;

  -- category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ServiceBundle' AND column_name = 'category') THEN
    ALTER TABLE "ServiceBundle" ADD COLUMN "category" TEXT DEFAULT 'autre';
    RAISE NOTICE 'Added category column';
  END IF;

  -- bonus column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ServiceBundle' AND column_name = 'bonus') THEN
    ALTER TABLE "ServiceBundle" ADD COLUMN "bonus" TEXT;
    RAISE NOTICE 'Added bonus column';
  END IF;
END $$;

-- Update existing bundles to set is_group based on max_persons
UPDATE "ServiceBundle" SET "is_group" = true WHERE "max_persons" > 1;
UPDATE "ServiceBundle" SET "is_group" = false WHERE "max_persons" <= 1;

-- Update existing bundles to set default category if null
UPDATE "ServiceBundle" SET "category" = 'beaute' WHERE "category" IS NULL;

-- Verify columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ServiceBundle'
ORDER BY ordinal_position;