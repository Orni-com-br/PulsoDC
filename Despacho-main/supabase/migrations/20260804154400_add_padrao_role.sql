-- Migration para adicionar o papel 'padrao' na ENUM app_role

COMMIT;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'padrao';

-- Atualiza usuários que estavam com o papel 'user' para o novo papel 'padrao'
UPDATE public.user_roles SET role = 'padrao' WHERE role = 'user';
