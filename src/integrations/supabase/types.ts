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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          item_id: string
          price: number
          quantity: number
          total: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          item_id: string
          price: number
          quantity: number
          total: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          item_id?: string
          price?: number
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_no: string
          created_at: string
          created_by: string
          date: string
          discount: number
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          payment_mode: Database["public"]["Enums"]["payment_method"]
          total_amount: number
        }
        Insert: {
          bill_no: string
          created_at?: string
          created_by: string
          date?: string
          discount?: number
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          payment_mode: Database["public"]["Enums"]["payment_method"]
          total_amount: number
        }
        Update: {
          bill_no?: string
          created_at?: string
          created_by?: string
          date?: string
          discount?: number
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          payment_mode?: Database["public"]["Enums"]["payment_method"]
          total_amount?: number
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          admin_id: string | null
          amount: number
          category: string
          created_at: string
          created_by: string
          date: string
          expense_name: string | null
          id: string
          note: string | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          category: string
          created_at?: string
          created_by: string
          date?: string
          expense_name?: string | null
          id?: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          date?: string
          expense_name?: string | null
          id?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      item_categories: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          admin_id: string | null
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sale_count: number | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          sale_count?: number | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sale_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          is_disabled: boolean | null
          payment_method: Database["public"]["Enums"]["payment_mode"] | null
          payment_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_disabled?: boolean | null
          payment_method?: Database["public"]["Enums"]["payment_mode"] | null
          payment_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_disabled?: boolean | null
          payment_method?: Database["public"]["Enums"]["payment_mode"] | null
          payment_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          hotel_name: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hotel_name?: string | null
          id?: string
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hotel_name?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          pos_view: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pos_view?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pos_view?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_and_data: {
        Args: { uid: string }
        Returns: undefined
      }
      generate_bill_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      payment_method: "cash" | "upi" | "card" | "other"
      payment_mode: "cash" | "card" | "upi" | "online"
      user_status: "active" | "paused" | "deleted"
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
      app_role: ["admin", "user", "super_admin"],
      payment_method: ["cash", "upi", "card", "other"],
      payment_mode: ["cash", "card", "upi", "online"],
      user_status: ["active", "paused", "deleted"],
    },
  },
} as const
