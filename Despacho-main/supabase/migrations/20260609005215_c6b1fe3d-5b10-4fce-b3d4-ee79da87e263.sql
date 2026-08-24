
ALTER TABLE public.recursos_sci
  ADD COLUMN IF NOT EXISTS desmobilizado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS desmobilizado_por UUID,
  ADD COLUMN IF NOT EXISTS desmob_motivo TEXT,
  ADD COLUMN IF NOT EXISTS desmob_condicao_retorno TEXT,
  ADD COLUMN IF NOT EXISTS desmob_licoes_aprendidas TEXT;
