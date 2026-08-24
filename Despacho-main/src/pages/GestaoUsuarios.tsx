import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserCheck, Trash2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export default function GestaoUsuarios() {
  const { isAdmin } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("despachante");
  const [isLoading, setIsLoading] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const { data, error } = await supabase.rpc("get_all_users");
    if (!error && data) {
      setUsersList(data);
    }
    setIsLoadingUsers(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este usuário?")) return;
    try {
      const { error } = await supabase.rpc("delete_user_account", { target_id: userId });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Usuário excluído." });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc("update_user_role", { target_id: userId, new_role: newRole });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Papel atualizado." });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Acesso restrito a administradores. Redirecionando...
      </div>
    );
  }

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !role) {
      toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Criar o usuário sem deslogar o admin atual usando um cliente temporário
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const defaultPassword = "DefesaCivil123!";

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: email.trim().toLowerCase(),
        password: defaultPassword,
        options: {
          data: {
            full_name: nome,
            nome: nome,
          },
        },
      });

      if (signUpError && !signUpError.message.includes("User already registered")) {
        throw signUpError;
      }

      // 2. Atribuir o papel ao usuário criado
      const { error: roleError } = await supabase.rpc("assign_role_by_email", {
        target_email: email.trim().toLowerCase(),
        target_role: role,
      });

      if (roleError) {
        throw roleError;
      }

      toast({
        title: "Usuário Criado e Papel Atribuído!",
        description: `O usuário ${nome} (${email}) foi criado com sucesso. Senha temporária: ${defaultPassword}`,
      });
      setNome("");
      setEmail("");
      loadUsers();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro na criação",
        description: err.message || "Ocorreu um erro ao criar ou atribuir o papel.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-card rounded-2xl shadow p-6 border border-border">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Criar e Gerenciar Usuários</h2>
            <p className="text-sm text-muted-foreground">Cadastre novos membros e atribua permissões ao sistema.</p>
          </div>
        </div>

        <form onSubmit={handleAssignRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome Completo</label>
            <Input
              type="text"
              placeholder="Digite o nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">E-mail para Acesso</label>
            <Input
              type="email"
              placeholder="Digite o e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Papel (Role)</label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Selecione um papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador (admin)</SelectItem>
                <SelectItem value="despachante">Despachante (despachante)</SelectItem>
                <SelectItem value="padrao">Padrão (padrao)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full rounded-lg gap-2 mt-2">
            {isLoading ? "Processando..." : "Cadastrar Usuário"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <p>
            <strong>Aviso:</strong> Ao cadastrar, será gerada a senha padrão <strong>DefesaCivil123!</strong> para o usuário. Informe esta senha ao colaborador para o primeiro acesso. Ele poderá alterá-la posteriormente.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow p-6 border border-border">
        <h3 className="text-lg font-bold mb-4">Usuários Cadastrados</h3>
        
        {isLoadingUsers ? (
          <p className="text-sm text-muted-foreground">Carregando usuários...</p>
        ) : usersList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado ou migração do banco pendente.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select 
                        value={user.role || "padrao"} 
                        onValueChange={(newRole) => handleUpdateRole(user.id, newRole)}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="despachante">Despachante</SelectItem>
                          <SelectItem value="padrao">Padrão</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Excluir Usuário"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
