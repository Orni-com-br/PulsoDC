-- 1. Fix ocorrencias permissiveness (Auto-registro Aberto + Políticas de Escrita Permissiva Expõem Dados de Incidentes)
DROP POLICY IF EXISTS "Authenticated users can create ocorrencias" ON public.ocorrencias;
DROP POLICY IF EXISTS "Authenticated users can update ocorrencias" ON public.ocorrencias;

CREATE POLICY "Users can create their own ocorrencias" ON public.ocorrencias FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() 
  OR public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'despachante')
);

CREATE POLICY "Users can update their own ocorrencias or all if admin/despachante" ON public.ocorrencias FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() 
  OR public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'despachante')
)
WITH CHECK (
  created_by = auth.uid() 
  OR public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'despachante')
);

-- 2. Restrict view of cameras and ocorrencia_videos (Policy RLS sempre verdadeira)
DROP POLICY IF EXISTS "Authenticated users can view cameras" ON public.cameras;
CREATE POLICY "Admins and despachantes can view cameras" ON public.cameras FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));

DROP POLICY IF EXISTS "Authenticated users can view ocorrencia_videos" ON public.ocorrencia_videos;
CREATE POLICY "Admins and despachantes can view ocorrencia_videos" ON public.ocorrencia_videos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));

-- 3. Fix ocorrencia_equipes permissiveness (Policy RLS sempre verdadeira)
DROP POLICY IF EXISTS "Authenticated users can view ocorrencia_equipes" ON public.ocorrencia_equipes;
DROP POLICY IF EXISTS "Authenticated users can create ocorrencia_equipes" ON public.ocorrencia_equipes;
DROP POLICY IF EXISTS "Authenticated users can update ocorrencia_equipes" ON public.ocorrencia_equipes;
DROP POLICY IF EXISTS "Authenticated users can delete ocorrencia_equipes" ON public.ocorrencia_equipes;

CREATE POLICY "Admins and despachantes can view ocorrencia_equipes" ON public.ocorrencia_equipes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));

CREATE POLICY "Admins and despachantes can create ocorrencia_equipes" ON public.ocorrencia_equipes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));

CREATE POLICY "Admins and despachantes can update ocorrencia_equipes" ON public.ocorrencia_equipes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));

CREATE POLICY "Admins and despachantes can delete ocorrencia_equipes" ON public.ocorrencia_equipes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));

-- 4. Fix Storage Objects permissiveness (Qualquer usuário autenticado pode visualizar, modificar ou excluir os arquivos de outros)
DROP POLICY IF EXISTS "Authenticated can view anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete anexos" ON storage.objects;

CREATE POLICY "Users can view their own anexos or all if admin/despachante" ON storage.objects FOR SELECT TO authenticated
USING (
  (bucket_id = 'anexos' OR bucket_id = 'fotos') 
  AND (
    owner = auth.uid() 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'despachante')
  )
);

CREATE POLICY "Users can update their own anexos or all if admin/despachante" ON storage.objects FOR UPDATE TO authenticated
USING (
  (bucket_id = 'anexos' OR bucket_id = 'fotos') 
  AND (
    owner = auth.uid() 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'despachante')
  )
);

CREATE POLICY "Users can delete their own anexos or all if admin/despachante" ON storage.objects FOR DELETE TO authenticated
USING (
  (bucket_id = 'anexos' OR bucket_id = 'fotos') 
  AND (
    owner = auth.uid() 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'despachante')
  )
);

-- 5. Fix equipes SELECT permissiveness
DROP POLICY IF EXISTS "Authenticated users can view equipes" ON public.equipes;
CREATE POLICY "Admins and despachantes can view equipes" ON public.equipes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'despachante'));
