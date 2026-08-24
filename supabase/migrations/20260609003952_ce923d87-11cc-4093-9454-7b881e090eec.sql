CREATE TABLE public.responsaveis_agencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID NOT NULL REFERENCES public.agencias_sci(id) ON DELETE CASCADE,
  incidente_id UUID REFERENCES public.incidentes_sci(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  funcao TEXT,
  telefone TEXT,
  email TEXT,
  radio_canal TEXT,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsaveis_agencia TO authenticated;
GRANT ALL ON public.responsaveis_agencia TO service_role;

ALTER TABLE public.responsaveis_agencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam responsaveis"
ON public.responsaveis_agencia FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_responsaveis_agencia_updated
BEFORE UPDATE ON public.responsaveis_agencia
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();