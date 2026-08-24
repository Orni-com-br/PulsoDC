
-- Catalog of hazards
CREATE TABLE public.apr_perigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apr_perigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view apr_perigos"
  ON public.apr_perigos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/despachantes can insert apr_perigos"
  ON public.apr_perigos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'));
CREATE POLICY "Admins/despachantes can update apr_perigos"
  ON public.apr_perigos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'));
CREATE POLICY "Admins can delete apr_perigos"
  ON public.apr_perigos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Risk assessments
CREATE TABLE public.apr_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL,
  agente_id uuid,
  latitude double precision,
  longitude double precision,
  observacoes text,
  risco_calculado text,
  status text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apr_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View apr_avaliacoes if owner or admin/despachante"
  ON public.apr_avaliacoes FOR SELECT TO authenticated
  USING (agente_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'));
CREATE POLICY "Despachantes/admins can create apr_avaliacoes"
  ON public.apr_avaliacoes FOR INSERT TO authenticated
  WITH CHECK (
    agente_id = auth.uid()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'))
  );
CREATE POLICY "Despachantes/admins can update apr_avaliacoes"
  ON public.apr_avaliacoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'));
CREATE POLICY "Admins can delete apr_avaliacoes"
  ON public.apr_avaliacoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER apr_avaliacoes_updated_at
  BEFORE UPDATE ON public.apr_avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hazards selected per assessment
CREATE TABLE public.apr_avaliacoes_perigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.apr_avaliacoes(id) ON DELETE CASCADE,
  perigo_id uuid NOT NULL,
  probabilidade integer NOT NULL,
  consequencia integer NOT NULL,
  risco_item text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apr_avaliacoes_perigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View apr_avaliacoes_perigos if linked avaliacao visible"
  ON public.apr_avaliacoes_perigos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.apr_avaliacoes a
    WHERE a.id = avaliacao_id
      AND (a.agente_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'))
  ));
CREATE POLICY "Despachantes/admins can insert apr_avaliacoes_perigos"
  ON public.apr_avaliacoes_perigos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'));
CREATE POLICY "Despachantes/admins can update apr_avaliacoes_perigos"
  ON public.apr_avaliacoes_perigos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'));
CREATE POLICY "Admins can delete apr_avaliacoes_perigos"
  ON public.apr_avaliacoes_perigos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Recommended actions
CREATE TABLE public.apr_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.apr_avaliacoes(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apr_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View apr_acoes if linked avaliacao visible"
  ON public.apr_acoes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.apr_avaliacoes a
    WHERE a.id = avaliacao_id
      AND (a.agente_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'))
  ));
CREATE POLICY "Despachantes/admins can insert apr_acoes"
  ON public.apr_acoes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'));
CREATE POLICY "Despachantes/admins can update apr_acoes"
  ON public.apr_acoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'despachante'));
CREATE POLICY "Admins can delete apr_acoes"
  ON public.apr_acoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Seed a small hazard catalog so the wizard renders options out of the box
INSERT INTO public.apr_perigos (categoria, nome, descricao) VALUES
  ('Estrutural', 'Risco de desabamento', 'Estrutura instável ou comprometida'),
  ('Estrutural', 'Trincas em paredes', 'Fissuras visíveis em elementos estruturais'),
  ('Geológico', 'Deslizamento de encosta', 'Movimentação de massa em talude'),
  ('Geológico', 'Solo encharcado', 'Saturação que reduz a estabilidade do solo'),
  ('Hidrológico', 'Alagamento', 'Acúmulo de água em via ou edificação'),
  ('Hidrológico', 'Enxurrada', 'Fluxo rápido de água com detritos'),
  ('Elétrico', 'Fios energizados expostos', 'Cabos rompidos ou em contato com água'),
  ('Químico', 'Vazamento de produto perigoso', 'Liberação de substância tóxica/inflamável'),
  ('Incêndio', 'Foco ativo de incêndio', 'Chamas em propagação no local'),
  ('Trânsito', 'Via interditada / risco aos agentes', 'Fluxo de veículos sem sinalização');
