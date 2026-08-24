
-- 1) Restrict ocorrencias INSERT/UPDATE to dispatchers/admins, owner-scoped
DROP POLICY IF EXISTS "Authenticated users can create ocorrencias" ON public.ocorrencias;
DROP POLICY IF EXISTS "Authenticated users can update ocorrencias" ON public.ocorrencias;

CREATE POLICY "Despachantes/admins can create ocorrencias"
ON public.ocorrencias FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Despachantes/admins can update ocorrencias"
ON public.ocorrencias FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'));

-- 2) Storage: enforce per-user ownership via folder prefix on 'anexos' bucket
DROP POLICY IF EXISTS "Authenticated can view anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete anexos" ON storage.objects;

-- Make bucket public for read (URLs are unguessable, used in PDFs/details)
UPDATE storage.buckets SET public = true WHERE id = 'anexos';

CREATE POLICY "Public can read anexos files"
ON storage.objects FOR SELECT
USING (bucket_id = 'anexos');

CREATE POLICY "Users can upload to their own folder in anexos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'anexos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own files in anexos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'anexos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files in anexos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- 3) Remove hardcoded email bypass from assign_role_by_email
CREATE OR REPLACE FUNCTION public.assign_role_by_email(target_email text, target_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id UUID;
  parsed_role public.app_role;
BEGIN
  parsed_role := target_role::public.app_role;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
     RAISE EXCEPTION 'Acesso negado para atribuir papeis';
  END IF;

  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  IF target_user_id IS NULL THEN
     RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, parsed_role)
  ON CONFLICT (user_id, role) DO UPDATE SET role = EXCLUDED.role;
END;
$function$;

-- 4) Restrict EXECUTE on SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.assign_role_by_email(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.assign_role_by_email(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
