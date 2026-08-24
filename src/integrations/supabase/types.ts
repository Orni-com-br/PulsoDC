export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agencias_sci: {
        Row: {
          contato: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          sigla: string
          tipo: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          sigla: string
          tipo?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          sigla?: string
          tipo?: string | null
        }
        Relationships: []
      }
      apr_acoes: {
        Row: {
          avaliacao_id: string
          concluida: boolean
          created_at: string
          descricao: string
          id: string
        }
        Insert: {
          avaliacao_id: string
          concluida?: boolean
          created_at?: string
          descricao: string
          id?: string
        }
        Update: {
          avaliacao_id?: string
          concluida?: boolean
          created_at?: string
          descricao?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apr_acoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "apr_avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apr_avaliacoes: {
        Row: {
          agente_id: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          observacoes: string | null
          ocorrencia_id: string
          risco_calculado: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agente_id?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacoes?: string | null
          ocorrencia_id: string
          risco_calculado?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agente_id?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacoes?: string | null
          ocorrencia_id?: string
          risco_calculado?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      apr_avaliacoes_perigos: {
        Row: {
          avaliacao_id: string
          consequencia: number
          created_at: string
          id: string
          perigo_id: string
          probabilidade: number
          risco_item: string | null
        }
        Insert: {
          avaliacao_id: string
          consequencia: number
          created_at?: string
          id?: string
          perigo_id: string
          probabilidade: number
          risco_item?: string | null
        }
        Update: {
          avaliacao_id?: string
          consequencia?: number
          created_at?: string
          id?: string
          perigo_id?: string
          probabilidade?: number
          risco_item?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apr_avaliacoes_perigos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "apr_avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apr_perigos: {
        Row: {
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      cameras: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          nome: string
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          nome?: string
          tipo?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          nome?: string
          tipo?: string
          url?: string
        }
        Relationships: []
      }
      equipes: {
        Row: {
          created_at: string
          id: string
          membros: string[] | null
          nome: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          membros?: string[] | null
          nome: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          membros?: string[] | null
          nome?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      incidentes_sci: {
        Row: {
          ambiente: string
          codigo: string
          comandante_id: string | null
          created_at: string
          created_by: string
          data_abertura: string
          data_fechamento: string | null
          descricao: string | null
          id: string
          nome: string
          status: string
          tipo_evento: string
        }
        Insert: {
          ambiente?: string
          codigo: string
          comandante_id?: string | null
          created_at?: string
          created_by?: string
          data_abertura?: string
          data_fechamento?: string | null
          descricao?: string | null
          id?: string
          nome: string
          status?: string
          tipo_evento: string
        }
        Update: {
          ambiente?: string
          codigo?: string
          comandante_id?: string | null
          created_at?: string
          created_by?: string
          data_abertura?: string
          data_fechamento?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          status?: string
          tipo_evento?: string
        }
        Relationships: []
      }
      objetivos_sci: {
        Row: {
          created_at: string
          descricao: string
          id: string
          incidente_id: string
          periodo_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          incidente_id: string
          periodo_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          incidente_id?: string
          periodo_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "objetivos_sci_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_sci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objetivos_sci_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_operacionais"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_equipes: {
        Row: {
          created_at: string
          equipe_id: string
          hora_chegada: string | null
          hora_despacho: string | null
          hora_finalizado: string | null
          id: string
          ocorrencia_id: string
        }
        Insert: {
          created_at?: string
          equipe_id: string
          hora_chegada?: string | null
          hora_despacho?: string | null
          hora_finalizado?: string | null
          id?: string
          ocorrencia_id: string
        }
        Update: {
          created_at?: string
          equipe_id?: string
          hora_chegada?: string | null
          hora_despacho?: string | null
          hora_finalizado?: string | null
          id?: string
          ocorrencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_equipes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencia_equipes_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_videos: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          ocorrencia_id: string
          titulo: string | null
          video_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          ocorrencia_id: string
          titulo?: string | null
          video_url: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          ocorrencia_id?: string
          titulo?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_videos_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          atividades: string | null
          bairro: string | null
          cep: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          documentos: Json
          estrangeiro: boolean | null
          fato_ocorrendo: boolean | null
          fotos: string[] | null
          historico: string | null
          id: string
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          meio_aviso: string | null
          municipio: string | null
          natureza: string | null
          nome_solicitante: string | null
          numero: string | null
          partes_no_local: boolean | null
          ponto_referencia: string | null
          prioridade: string | null
          protocolo: string
          status: string
          telefone: string | null
          tipo_local: string | null
          tipo_via: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          atividades?: string | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          documentos?: Json
          estrangeiro?: boolean | null
          fato_ocorrendo?: boolean | null
          fotos?: string[] | null
          historico?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          meio_aviso?: string | null
          municipio?: string | null
          natureza?: string | null
          nome_solicitante?: string | null
          numero?: string | null
          partes_no_local?: boolean | null
          ponto_referencia?: string | null
          prioridade?: string | null
          protocolo: string
          status?: string
          telefone?: string | null
          tipo_local?: string | null
          tipo_via?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          atividades?: string | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          documentos?: Json
          estrangeiro?: boolean | null
          fato_ocorrendo?: boolean | null
          fotos?: string[] | null
          historico?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          meio_aviso?: string | null
          municipio?: string | null
          natureza?: string | null
          nome_solicitante?: string | null
          numero?: string | null
          partes_no_local?: boolean | null
          ponto_referencia?: string | null
          prioridade?: string | null
          protocolo?: string
          status?: string
          telefone?: string | null
          tipo_local?: string | null
          tipo_via?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      papeis_sci: {
        Row: {
          agencia_id: string | null
          created_at: string
          funcao: string
          id: string
          incidente_id: string
          nome_pessoa: string | null
          user_id: string | null
        }
        Insert: {
          agencia_id?: string | null
          created_at?: string
          funcao: string
          id?: string
          incidente_id: string
          nome_pessoa?: string | null
          user_id?: string | null
        }
        Update: {
          agencia_id?: string | null
          created_at?: string
          funcao?: string
          id?: string
          incidente_id?: string
          nome_pessoa?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "papeis_sci_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias_sci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papeis_sci_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_sci"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos_operacionais: {
        Row: {
          created_at: string
          fim: string | null
          id: string
          incidente_id: string
          inicio: string
          numero: number
          status: string
        }
        Insert: {
          created_at?: string
          fim?: string | null
          id?: string
          incidente_id: string
          inicio?: string
          numero: number
          status?: string
        }
        Update: {
          created_at?: string
          fim?: string | null
          id?: string
          incidente_id?: string
          inicio?: string
          numero?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodos_operacionais_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_sci"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos_sci: {
        Row: {
          agencia_id: string | null
          categoria: string
          checkin_em: string | null
          created_at: string
          descricao: string
          desmob_condicao_retorno: string | null
          desmob_licoes_aprendidas: string | null
          desmob_motivo: string | null
          desmobilizado_em: string | null
          desmobilizado_por: string | null
          id: string
          incidente_id: string
          status: string
          tipo_capacidade: number | null
        }
        Insert: {
          agencia_id?: string | null
          categoria?: string
          checkin_em?: string | null
          created_at?: string
          descricao: string
          desmob_condicao_retorno?: string | null
          desmob_licoes_aprendidas?: string | null
          desmob_motivo?: string | null
          desmobilizado_em?: string | null
          desmobilizado_por?: string | null
          id?: string
          incidente_id: string
          status?: string
          tipo_capacidade?: number | null
        }
        Update: {
          agencia_id?: string | null
          categoria?: string
          checkin_em?: string | null
          created_at?: string
          descricao?: string
          desmob_condicao_retorno?: string | null
          desmob_licoes_aprendidas?: string | null
          desmob_motivo?: string | null
          desmobilizado_em?: string | null
          desmobilizado_por?: string | null
          id?: string
          incidente_id?: string
          status?: string
          tipo_capacidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recursos_sci_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias_sci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recursos_sci_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_sci"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis_agencia: {
        Row: {
          agencia_id: string
          cargo: string | null
          created_at: string
          created_by: string | null
          email: string | null
          funcao: string | null
          id: string
          incidente_id: string | null
          nome: string
          observacoes: string | null
          radio_canal: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          agencia_id: string
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          funcao?: string | null
          id?: string
          incidente_id?: string | null
          nome: string
          observacoes?: string | null
          radio_canal?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          agencia_id?: string
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          funcao?: string | null
          id?: string
          incidente_id?: string | null
          nome?: string
          observacoes?: string | null
          radio_canal?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsaveis_agencia_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias_sci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsaveis_agencia_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_sci"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_sci: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          categoria: string | null
          created_at: string
          descricao: string
          id: string
          incidente_id: string
          periodo_id: string | null
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          categoria?: string | null
          created_at?: string
          descricao: string
          id?: string
          incidente_id: string
          periodo_id?: string | null
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          categoria?: string | null
          created_at?: string
          descricao?: string
          id?: string
          incidente_id?: string
          periodo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_sci_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_sci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_sci_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_operacionais"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role_by_email: {
        Args: { target_email: string; target_role: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "despachante" | "padrao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "despachante", "padrao"],
    },
  },
} as const
