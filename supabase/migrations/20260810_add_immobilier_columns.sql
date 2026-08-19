-- Add missing columns to ImmobilierListing table
-- These columns are used by the AdminImmobilier form but may be missing from the actual DB

ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS price_per_m2 NUMERIC DEFAULT 0;
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '/MOIS';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS floor TEXT DEFAULT '';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT '';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS equip TEXT DEFAULT '';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS extra TEXT DEFAULT '';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'PRO';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS salon_type TEXT DEFAULT '';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS price_fonds_commerce NUMERIC DEFAULT 0;
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS tax_mode TEXT DEFAULT 'TTC';
ALTER TABLE public."ImmobilierListing" ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
