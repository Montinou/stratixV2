-- Temporarily replace set_company_id function to not use auth.uid()
-- This is needed for direct database inserts outside of Supabase auth context

CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- If company_id is already set, don't override it
  -- This allows direct inserts from scripts
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try to get company_id from profiles using app.current_user_id if set
  IF current_setting('app.current_user_id', true) IS NOT NULL THEN
    NEW.company_id = (
      SELECT company_id
      FROM public.profiles
      WHERE id::text = current_setting('app.current_user_id', true)
    );
  END IF;

  RETURN NEW;
END;
$function$;
