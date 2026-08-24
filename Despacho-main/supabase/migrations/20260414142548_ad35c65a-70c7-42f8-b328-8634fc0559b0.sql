
CREATE TABLE public.cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'imagem',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cameras" ON public.cameras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create cameras" ON public.cameras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cameras" ON public.cameras FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cameras" ON public.cameras FOR DELETE TO authenticated USING (true);
