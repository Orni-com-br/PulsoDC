-- Create apr_avaliacoes table
CREATE TABLE public.apr_avaliacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ocorrencia_id UUID REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  agente_id UUID REFERENCES auth.users(id),
  data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  latitude NUMERIC,
  longitude NUMERIC,
  risco_calculado TEXT, -- baixo, medio, alto, muito_alto
  status TEXT DEFAULT 'rascunho', -- rascunho, concluida
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apr_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view apr_avaliacoes"
  ON public.apr_avaliacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create apr_avaliacoes"
  ON public.apr_avaliacoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update apr_avaliacoes"
  ON public.apr_avaliacoes FOR UPDATE TO authenticated USING (true);

-- Create apr_perigos catalog table
CREATE TABLE public.apr_perigos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apr_perigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view apr_perigos"
  ON public.apr_perigos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create apr_perigos"
  ON public.apr_perigos FOR INSERT TO authenticated WITH CHECK (true);

-- Create apr_avaliacoes_perigos mapping table
CREATE TABLE public.apr_avaliacoes_perigos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avaliacao_id UUID REFERENCES public.apr_avaliacoes(id) ON DELETE CASCADE,
  perigo_id UUID REFERENCES public.apr_perigos(id) ON DELETE CASCADE,
  probabilidade INTEGER CHECK (probabilidade >= 1 AND probabilidade <= 5),
  consequencia INTEGER CHECK (consequencia >= 1 AND consequencia <= 5),
  risco_item TEXT, -- calculado por item (prob * cons)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apr_avaliacoes_perigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view apr_avaliacoes_perigos"
  ON public.apr_avaliacoes_perigos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create apr_avaliacoes_perigos"
  ON public.apr_avaliacoes_perigos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update apr_avaliacoes_perigos"
  ON public.apr_avaliacoes_perigos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete apr_avaliacoes_perigos"
  ON public.apr_avaliacoes_perigos FOR DELETE TO authenticated USING (true);

-- Create apr_acoes table
CREATE TABLE public.apr_acoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avaliacao_id UUID REFERENCES public.apr_avaliacoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  responsavel TEXT,
  status TEXT DEFAULT 'pendente', -- pendente, em_andamento, concluida
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apr_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view apr_acoes"
  ON public.apr_acoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create apr_acoes"
  ON public.apr_acoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update apr_acoes"
  ON public.apr_acoes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete apr_acoes"
  ON public.apr_acoes FOR DELETE TO authenticated USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_apr_avaliacoes_updated_at
  BEFORE UPDATE ON public.apr_avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_apr_acoes_updated_at
  BEFORE UPDATE ON public.apr_acoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial hazards (perigos)
INSERT INTO public.apr_perigos (categoria, descricao) VALUES
('Geológico', 'Deslizamento de terra / Movimento de massa'),
('Geológico', 'Queda de blocos / rochas'),
('Geológico', 'Erosão de margem / solapamento'),
('Hidrológico', 'Inundação gradual'),
('Hidrológico', 'Enxurrada / Inundação brusca'),
('Hidrológico', 'Alagamento'),
('Estrutural', 'Risco de colapso de edificação / Desabamento'),
('Estrutural', 'Patologias estruturais severas (fissuras, recalques)'),
('Meteorológico', 'Vendaval / Destelhamento'),
('Meteorológico', 'Queda de árvore de grande porte'),
('Tecnológico', 'Vazamento de produto químico / perigoso'),
('Tecnológico', 'Incêndio em edificação / área urbana');
