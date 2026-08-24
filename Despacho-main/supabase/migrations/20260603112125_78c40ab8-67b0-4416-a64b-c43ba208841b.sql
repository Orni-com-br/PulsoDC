
-- AGENCIAS
CREATE TABLE public.agencias_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  tipo TEXT,
  contato TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias_sci TO authenticated;
GRANT ALL ON public.agencias_sci TO service_role;
ALTER TABLE public.agencias_sci ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read agencias" ON public.agencias_sci FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert agencias" ON public.agencias_sci FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update agencias" ON public.agencias_sci FOR UPDATE TO authenticated USING (true);
CREATE POLICY "owner delete agencias" ON public.agencias_sci FOR DELETE TO authenticated USING (created_by = auth.uid());

-- INCIDENTES
CREATE TABLE public.incidentes_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  descricao TEXT,
  ambiente TEXT NOT NULL DEFAULT 'real' CHECK (ambiente IN ('real','simulado')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado')),
  comandante_id UUID REFERENCES auth.users(id),
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidentes_sci TO authenticated;
GRANT ALL ON public.incidentes_sci TO service_role;
ALTER TABLE public.incidentes_sci ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read incidentes" ON public.incidentes_sci FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert incidentes" ON public.incidentes_sci FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update incidentes" ON public.incidentes_sci FOR UPDATE TO authenticated USING (true);
CREATE POLICY "owner delete incidentes" ON public.incidentes_sci FOR DELETE TO authenticated USING (created_by = auth.uid());

-- PAPEIS
CREATE TABLE public.papeis_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.incidentes_sci(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  nome_pessoa TEXT,
  funcao TEXT NOT NULL,
  agencia_id UUID REFERENCES public.agencias_sci(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papeis_sci TO authenticated;
GRANT ALL ON public.papeis_sci TO service_role;
ALTER TABLE public.papeis_sci ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all papeis" ON public.papeis_sci FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- PERIODOS OPERACIONAIS
CREATE TABLE public.periodos_operacionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.incidentes_sci(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','encerrado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodos_operacionais TO authenticated;
GRANT ALL ON public.periodos_operacionais TO service_role;
ALTER TABLE public.periodos_operacionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all periodos" ON public.periodos_operacionais FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- OBJETIVOS
CREATE TABLE public.objetivos_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.incidentes_sci(id) ON DELETE CASCADE,
  periodo_id UUID REFERENCES public.periodos_operacionais(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','cumprido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objetivos_sci TO authenticated;
GRANT ALL ON public.objetivos_sci TO service_role;
ALTER TABLE public.objetivos_sci ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all objetivos" ON public.objetivos_sci FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- RECURSOS
CREATE TABLE public.recursos_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.incidentes_sci(id) ON DELETE CASCADE,
  agencia_id UUID REFERENCES public.agencias_sci(id),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'simples' CHECK (categoria IN ('simples','forca_tarefa','equipe_ataque')),
  tipo_capacidade INT CHECK (tipo_capacidade BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel','em_uso','fora_servico')),
  checkin_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recursos_sci TO authenticated;
GRANT ALL ON public.recursos_sci TO service_role;
ALTER TABLE public.recursos_sci ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all recursos" ON public.recursos_sci FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- TIMELINE (ICS 214)
CREATE TABLE public.timeline_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.incidentes_sci(id) ON DELETE CASCADE,
  periodo_id UUID REFERENCES public.periodos_operacionais(id) ON DELETE SET NULL,
  autor_id UUID REFERENCES auth.users(id),
  autor_nome TEXT,
  categoria TEXT,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_sci TO authenticated;
GRANT ALL ON public.timeline_sci TO service_role;
ALTER TABLE public.timeline_sci ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all timeline" ON public.timeline_sci FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_papeis_inc ON public.papeis_sci(incidente_id);
CREATE INDEX idx_periodos_inc ON public.periodos_operacionais(incidente_id);
CREATE INDEX idx_objetivos_inc ON public.objetivos_sci(incidente_id);
CREATE INDEX idx_recursos_inc ON public.recursos_sci(incidente_id);
CREATE INDEX idx_timeline_inc ON public.timeline_sci(incidente_id);
