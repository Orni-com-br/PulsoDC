-- 1. Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'despachante', 'user');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função security definer para checar papel
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Políticas para user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Substituir políticas permissivas em ocorrencia_equipes
DROP POLICY IF EXISTS "Authenticated users can create ocorrencia_equipes" ON public.ocorrencia_equipes;
DROP POLICY IF EXISTS "Authenticated users can update ocorrencia_equipes" ON public.ocorrencia_equipes;
DROP POLICY IF EXISTS "Authenticated users can delete ocorrencia_equipes" ON public.ocorrencia_equipes;

CREATE POLICY "Dispatchers and admins can create ocorrencia_equipes"
ON public.ocorrencia_equipes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispatchers and admins can update ocorrencia_equipes"
ON public.ocorrencia_equipes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'despachante') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ocorrencia_equipes"
ON public.ocorrencia_equipes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));