-- Schema creation for Defesa Civil app

-- Enums
CREATE TYPE app_role AS ENUM ('admin', 'despachante', 'user');

-- Tables
CREATE TABLE agencias_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contato TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  tipo TEXT
);

CREATE TABLE apr_perigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  descricao TEXT,
  nome TEXT NOT NULL
);

CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE TABLE equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  membros TEXT[],
  nome TEXT NOT NULL,
  status TEXT DEFAULT 'disponivel',
  tipo TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidentes_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente TEXT NOT NULL,
  codigo TEXT NOT NULL,
  comandante_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  data_abertura TIMESTAMPTZ,
  data_fechamento TIMESTAMPTZ,
  descricao TEXT,
  nome TEXT NOT NULL,
  status TEXT NOT NULL,
  tipo_evento TEXT NOT NULL
);

CREATE TABLE ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividades TEXT,
  bairro TEXT,
  cep TEXT,
  complemento TEXT,
  cpf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  documentos JSONB DEFAULT '{}'::jsonb,
  estrangeiro BOOLEAN,
  fato_ocorrendo BOOLEAN,
  fotos TEXT[],
  historico TEXT,
  latitude FLOAT,
  logradouro TEXT,
  longitude FLOAT,
  meio_aviso TEXT,
  municipio TEXT,
  natureza TEXT,
  nome_solicitante TEXT,
  numero TEXT,
  partes_no_local BOOLEAN,
  ponto_referencia TEXT,
  prioridade TEXT,
  protocolo TEXT NOT NULL,
  status TEXT NOT NULL,
  telefone TEXT,
  tipo_local TEXT,
  tipo_via TEXT,
  uf TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE apr_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  latitude FLOAT,
  longitude FLOAT,
  observacoes TEXT,
  ocorrencia_id UUID REFERENCES ocorrencias(id),
  risco_calculado TEXT,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE apr_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID REFERENCES apr_avaliacoes(id),
  concluida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  descricao TEXT NOT NULL
);

CREATE TABLE apr_avaliacoes_perigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID REFERENCES apr_avaliacoes(id),
  consequencia INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  perigo_id UUID REFERENCES apr_perigos(id),
  probabilidade INT NOT NULL,
  risco_item TEXT
);

CREATE TABLE ocorrencia_equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  equipe_id UUID REFERENCES equipes(id),
  hora_chegada TIMESTAMPTZ,
  hora_despacho TIMESTAMPTZ,
  hora_finalizado TIMESTAMPTZ,
  ocorrencia_id UUID REFERENCES ocorrencias(id)
);

CREATE TABLE ocorrencia_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  ocorrencia_id UUID REFERENCES ocorrencias(id),
  titulo TEXT,
  video_url TEXT NOT NULL
);

CREATE TABLE periodos_operacionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fim TIMESTAMPTZ,
  incidente_id UUID REFERENCES incidentes_sci(id),
  inicio TIMESTAMPTZ NOT NULL,
  numero INT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE objetivos_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  descricao TEXT NOT NULL,
  incidente_id UUID REFERENCES incidentes_sci(id),
  periodo_id UUID REFERENCES periodos_operacionais(id),
  status TEXT NOT NULL
);

CREATE TABLE papeis_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES agencias_sci(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  funcao TEXT NOT NULL,
  incidente_id UUID REFERENCES incidentes_sci(id),
  nome_pessoa TEXT,
  user_id TEXT
);

CREATE TABLE recursos_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES agencias_sci(id),
  categoria TEXT NOT NULL,
  checkin_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  descricao TEXT NOT NULL,
  desmob_condicao_retorno TEXT,
  desmob_licoes_aprendidas TEXT,
  desmob_motivo TEXT,
  desmobilizado_em TIMESTAMPTZ,
  desmobilizado_por TEXT,
  incidente_id UUID REFERENCES incidentes_sci(id),
  status TEXT NOT NULL,
  tipo_capacidade INT
);

CREATE TABLE responsaveis_agencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES agencias_sci(id),
  cargo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  email TEXT,
  funcao TEXT,
  incidente_id UUID REFERENCES incidentes_sci(id),
  nome TEXT NOT NULL,
  observacoes TEXT,
  radio_canal TEXT,
  telefone TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE timeline_sci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id TEXT,
  autor_nome TEXT,
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  descricao TEXT NOT NULL,
  incidente_id UUID REFERENCES incidentes_sci(id),
  periodo_id UUID REFERENCES periodos_operacionais(id)
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role app_role NOT NULL,
  user_id UUID NOT NULL
);

-- Functions
CREATE OR REPLACE FUNCTION assign_role_by_email(target_email TEXT, target_role TEXT)
RETURNS void AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Para facilitar o seu teste offline, não estamos validando permissões rigidamente aqui
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role::app_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_role(_role TEXT, _user_id UUID)
RETURNS boolean AS $$
DECLARE
  retval boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role::app_role
  ) INTO retval;
  RETURN retval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
