DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'despachante', 'user');
  END IF;
END $$;

-- 1. Fix ocorrencias (Registros de incidentes acessíveis & Auto-registro expõe dados)
DROP POLICY IF EXISTS "Authenticated users can view all ocorrencias" ON public.ocorrencias;
CREATE POLICY "Users can view their own ocorrencias or all if admin/despachante" 
ON public.ocorrencias FOR SELECT TO authenticated 
USING (
  created_by = auth.uid() 
  OR public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'despachante')
);

-- 2. Restrict Equipes (A tabela de equipes não possui política de EXCLUSÃO... INSERÇÃO/ATUALIZAÇÃO são irrestritas)
DROP POLICY IF EXISTS "Authenticated users can create equipes" ON public.equipes;
DROP POLICY IF EXISTS "Authenticated users can update equipes" ON public.equipes;

CREATE POLICY "Admins and despachantes can create equipes" ON public.equipes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));

CREATE POLICY "Admins and despachantes can update equipes" ON public.equipes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));

CREATE POLICY "Admins can delete equipes" ON public.equipes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Fix ocorrencia_videos and cameras RLS (Política RLS sempre verdadeira)
-- ocorrencia_videos
DROP POLICY IF EXISTS "Authenticated users can create ocorrencia_videos" ON public.ocorrencia_videos;
DROP POLICY IF EXISTS "Authenticated users can update ocorrencia_videos" ON public.ocorrencia_videos;
DROP POLICY IF EXISTS "Authenticated users can delete ocorrencia_videos" ON public.ocorrencia_videos;

CREATE POLICY "Dispatchers and admins can create ocorrencia_videos" ON public.ocorrencia_videos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispatchers and admins can update ocorrencia_videos" ON public.ocorrencia_videos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ocorrencia_videos" ON public.ocorrencia_videos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- cameras
DROP POLICY IF EXISTS "Authenticated users can create cameras" ON public.cameras;
DROP POLICY IF EXISTS "Authenticated users can update cameras" ON public.cameras;
DROP POLICY IF EXISTS "Authenticated users can delete cameras" ON public.cameras;

CREATE POLICY "Dispatchers and admins can create cameras" ON public.cameras FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispatchers and admins can update cameras" ON public.cameras FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cameras" ON public.cameras FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Buckets restritos (O bucket de anexos é legível publicamente sem autenticação / listagem)
UPDATE storage.buckets SET public = false WHERE id IN ('anexos', 'fotos');

DROP POLICY IF EXISTS "Public can view anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view anexos" ON storage.objects;
CREATE POLICY "Authenticated can view anexos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'anexos' OR bucket_id = 'fotos');

DROP POLICY IF EXISTS "Authenticated can upload anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete anexos" ON storage.objects;

CREATE POLICY "Authenticated can upload anexos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'anexos' OR bucket_id = 'fotos');

CREATE POLICY "Authenticated can update anexos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'anexos' OR bucket_id = 'fotos');

CREATE POLICY "Authenticated can delete anexos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'anexos' OR bucket_id = 'fotos');

-- 5. Função RPC para Gerenciamento de Usuários
CREATE OR REPLACE FUNCTION public.assign_role_by_email(target_email TEXT, target_role text)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  caller_email TEXT;
  admin_count INT;
  parsed_role public.app_role;
BEGIN
  parsed_role := target_role::public.app_role;
  caller_email := auth.jwt() ->> 'email';
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';

  IF NOT (
    public.has_role(auth.uid(), 'admin') 
    OR caller_email = 'marcus.oliveira@portoalegre.rs.gov.br'
  ) THEN
     RAISE EXCEPTION 'Acesso negado para atribuir papeis';
  END IF;

  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  IF target_user_id IS NULL THEN
     RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Para simplificar, quando atribuímos, damos replace no role ou simplesmente inserimos
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, parsed_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
