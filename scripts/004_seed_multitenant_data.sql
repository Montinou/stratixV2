-- Insert sample companies
INSERT INTO public.companies (id, name, slug, settings) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Corporation', 'acme-corp', '{"theme": "blue", "features": ["okr", "analytics"]}'),
  ('22222222-2222-2222-2222-222222222222', 'TechStart Inc', 'techstart-inc', '{"theme": "green", "features": ["okr", "analytics", "ai_insights"]}');

-- Update existing profiles to belong to companies
UPDATE public.profiles SET company_id = '11111111-1111-1111-1111-111111111111' WHERE email LIKE '%@acme.com' OR id IN (
  SELECT id FROM public.profiles LIMIT 3
);

UPDATE public.profiles SET company_id = '22222222-2222-2222-2222-222222222222' WHERE company_id IS NULL;

-- Update existing OKR data to belong to companies
UPDATE public.objectives SET company_id = (
  SELECT company_id FROM public.profiles WHERE id = objectives.owner_id
) WHERE company_id IS NULL;

UPDATE public.initiatives SET company_id = (
  SELECT company_id FROM public.profiles WHERE id = initiatives.owner_id
) WHERE company_id IS NULL;

UPDATE public.activities SET company_id = (
  SELECT company_id FROM public.profiles WHERE id = activities.owner_id
) WHERE company_id IS NULL;
