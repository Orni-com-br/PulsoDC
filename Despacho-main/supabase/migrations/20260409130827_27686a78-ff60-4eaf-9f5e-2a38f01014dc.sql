
-- Create ocorrencias table
CREATE TABLE public.ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocolo TEXT NOT NULL,
  nome_solicitante TEXT,
  meio_aviso TEXT DEFAULT 'outro',
  telefone TEXT DEFAULT '51',
  estrangeiro BOOLEAN DEFAULT false,
  tipo_via TEXT DEFAULT 'urbana',
  uf TEXT DEFAULT 'Rio Grande do Sul',
  municipio TEXT DEFAULT 'Porto Alegre',
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  complemento TEXT,
  cep TEXT,
  ponto_referencia TEXT,
  tipo_local TEXT DEFAULT 'residencia',
  historico TEXT,
  natureza TEXT,
  fato_ocorrendo BOOLEAN DEFAULT true,
  partes_no_local BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'aberta',
  prioridade TEXT DEFAULT 'nao_informada',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all ocorrencias"
  ON public.ocorrencias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create ocorrencias"
  ON public.ocorrencias FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ocorrencias"
  ON public.ocorrencias FOR UPDATE TO authenticated USING (true);

-- Create equipes table
CREATE TABLE public.equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'campo',
  status TEXT NOT NULL DEFAULT 'disponivel',
  membros TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipes"
  ON public.equipes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create equipes"
  ON public.equipes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipes"
  ON public.equipes FOR UPDATE TO authenticated USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ocorrencias_updated_at
  BEFORE UPDATE ON public.ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipes_updated_at
  BEFORE UPDATE ON public.equipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
