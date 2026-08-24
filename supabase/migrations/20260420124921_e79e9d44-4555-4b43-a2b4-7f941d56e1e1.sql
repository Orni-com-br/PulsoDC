
-- Add fotos column to ocorrencias
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS fotos text[] DEFAULT '{}'::text[];

-- Create public bucket for anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos', 'anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view anexos"
ON storage.objects FOR SELECT
USING (bucket_id = 'anexos');

CREATE POLICY "Authenticated can upload anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anexos');

CREATE POLICY "Authenticated can update anexos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'anexos');

CREATE POLICY "Authenticated can delete anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'anexos');
