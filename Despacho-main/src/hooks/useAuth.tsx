import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  userEmail: string;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDespachante: boolean;
  isPadrao: boolean;
  role: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async (uid: string | undefined) => {
      if (!uid) {
        setRole(null);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      
      setRole(data?.role || "padrao"); // Fallback to 'padrao' if no role is found
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Defer to avoid deadlock with onAuthStateChange
      setTimeout(() => checkRole(session?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      checkRole(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const userEmail = user?.email ?? "Usuário";
  const isMarcusAdmin = userEmail === "marcus.oliveira@portoalegre.rs.gov.br";

  const resolvedRole = isMarcusAdmin ? "admin" : (role || "padrao");

  return (
    <AuthContext.Provider value={{ 
      user, 
      userEmail, 
      logout, 
      isAuthenticated: !!user, 
      isAdmin: resolvedRole === "admin", 
      isDespachante: resolvedRole === "despachante" || resolvedRole === "admin",
      isPadrao: resolvedRole === "padrao",
      role: resolvedRole,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
