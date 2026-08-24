
-- Table for team dispatch with timestamps for chronometer
CREATE TABLE public.ocorrencia_equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ocorrencia_id UUID NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  hora_despacho TIMESTAMP WITH TIME ZONE DEFAULT now(),
  hora_chegada TIMESTAMP WITH TIME ZONE,
  hora_finalizado TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ocorrencia_id, equipe_id)
);

ALTER TABLE public.ocorrencia_equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ocorrencia_equipes"
  ON public.ocorrencia_equipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create ocorrencia_equipes"
  ON public.ocorrencia_equipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ocorrencia_equipes"
  ON public.ocorrencia_equipes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete ocorrencia_equipes"
  ON public.ocorrencia_equipes FOR DELETE TO authenticated USING (true);

-- Table for video markers on map
CREATE TABLE public.ocorrencia_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ocorrencia_id UUID NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  video_url TEXT NOT NULL,
  titulo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ocorrencia_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ocorrencia_videos"
  ON public.ocorrencia_videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create ocorrencia_videos"
  ON public.ocorrencia_videos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ocorrencia_videos"
  ON public.ocorrencia_videos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete ocorrencia_videos"
  ON public.ocorrencia_videos FOR DELETE TO authenticated USING (true);
