-- Função para listar todos os usuários (Apenas para administradores)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name TEXT,
  role VARCHAR,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
AS $$
BEGIN
  IF NOT has_role('admin', auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    au.id, 
    au.email::VARCHAR, 
    au.raw_user_meta_data->>'full_name', 
    ur.role::VARCHAR, 
    au.created_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON au.id = ur.user_id;
END;
$$ LANGUAGE plpgsql;


-- Função para atualizar o papel de um usuário
CREATE OR REPLACE FUNCTION update_user_role(target_id UUID, new_role TEXT)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  IF NOT has_role('admin', auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Verifica se já existe um papel atribuído
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_id) THEN
    UPDATE public.user_roles 
    SET role = new_role::app_role 
    WHERE user_id = target_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (target_id, new_role::app_role);
  END IF;
END;
$$ LANGUAGE plpgsql;


-- Função para excluir uma conta de usuário
CREATE OR REPLACE FUNCTION delete_user_account(target_id UUID)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  IF NOT has_role('admin', auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta.';
  END IF;

  -- Primeiro, exclui o papel do usuário na tabela pública
  DELETE FROM public.user_roles WHERE user_id = target_id;
  
  -- Segundo, exclui da auth.users (isso apagará a conta permanentemente)
  DELETE FROM auth.users WHERE id = target_id;
END;
$$ LANGUAGE plpgsql;
