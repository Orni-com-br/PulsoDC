-- Relax INSERT/UPDATE on ocorrencias so any authenticated user can create their own
DROP POLICY IF EXISTS "Despachantes/admins can create ocorrencias" ON public.ocorrencias;
DROP POLICY IF EXISTS "Despachantes/admins can update ocorrencias" ON public.ocorrencias;

CREATE POLICY "Authenticated users can create their own ocorrencias"
ON public.ocorrencias
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners or admins/despachantes can update ocorrencias"
ON public.ocorrencias
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'despachante'::public.app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'despachante'::public.app_role)
);