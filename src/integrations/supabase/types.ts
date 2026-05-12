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
      blocked_slots: {
        Row: {
          blocked_date: string
          blocked_time: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          id: string
          product_id: string
          product_uuid: string | null
          quantity: number
          size: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          product_id: string
          product_uuid?: string | null
          quantity?: number
          size: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          product_id?: string
          product_uuid?: string | null
          quantity?: number
          size?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      experience_capacity: {
        Row: {
          created_at: string
          experience_name: string
          id: string
          max_capacity_per_slot: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          experience_name: string
          id?: string
          max_capacity_per_slot?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          experience_name?: string
          id?: string
          max_capacity_per_slot?: number
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          piece_match: string
          rating: number
          reservation_id: string
          return_intent: string
          updated_at: string
          user_id: string
          wish_list_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          piece_match: string
          rating: number
          reservation_id: string
          return_intent: string
          updated_at?: string
          user_id: string
          wish_list_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          piece_match?: string
          rating?: number
          reservation_id?: string
          return_intent?: string
          updated_at?: string
          user_id?: string
          wish_list_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          discount_code: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          discount_code: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          discount_code?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          shipping_address: Json
          shipping_cost: number
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          shipping_address?: Json
          shipping_cost?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          shipping_address?: Json
          shipping_cost?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          brand: string
          care_instructions: string | null
          category: string
          color: string | null
          composition: string | null
          cost_price: number | null
          created_at: string
          description: string
          discount_percent: number | null
          id: string
          images: string[]
          is_active: boolean
          legacy_id: string | null
          name: string
          original_price: number | null
          price: number
          reference: string
          season: string | null
          sizes: Json
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand: string
          care_instructions?: string | null
          category?: string
          color?: string | null
          composition?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string
          discount_percent?: number | null
          id?: string
          images?: string[]
          is_active?: boolean
          legacy_id?: string | null
          name: string
          original_price?: number | null
          price?: number
          reference: string
          season?: string | null
          sizes?: Json
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string
          care_instructions?: string | null
          category?: string
          color?: string | null
          composition?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string
          discount_percent?: number | null
          id?: string
          images?: string[]
          is_active?: boolean
          legacy_id?: string | null
          name?: string
          original_price?: number | null
          price?: number
          reference?: string
          season?: string | null
          sizes?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          profile_details: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          profile_details?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_details?: Json
          updated_at?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json
          created_at: string
          id: string
          profile_description: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          profile_description?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          profile_description?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          experience_details: Json
          follow_up_sent_at: string | null
          id: string
          item_name: string
          item_type: string
          message: string | null
          occasion: string | null
          preferred_date: string
          product_id: string | null
          product_name: string
          product_size: string | null
          reservation_date: string
          status: string
          updated_at: string
          user_id: string
          visit_started_at: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          experience_details?: Json
          follow_up_sent_at?: string | null
          id?: string
          item_name: string
          item_type: string
          message?: string | null
          occasion?: string | null
          preferred_date: string
          product_id?: string | null
          product_name: string
          product_size?: string | null
          reservation_date: string
          status?: string
          updated_at?: string
          user_id: string
          visit_started_at?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          experience_details?: Json
          follow_up_sent_at?: string | null
          id?: string
          item_name?: string
          item_type?: string
          message?: string | null
          occasion?: string | null
          preferred_date?: string
          product_id?: string | null
          product_name?: string
          product_size?: string | null
          reservation_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          visit_started_at?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      style_profiles: {
        Row: {
          answers: Json
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_product_reservation: {
        Args: { _delta: number; _product_id: string; _size: string }
        Returns: undefined
      }
      count_experience_bookings: {
        Args: { _date: string; _experience_name: string; _time: string }
        Returns: number
      }
      decrement_product_stock: {
        Args: {
          _from_reserved?: boolean
          _product_id: string
          _qty?: number
          _size: string
        }
        Returns: undefined
      }
      get_booked_slots: {
        Args: { _from_date: string; _to_date: string }
        Returns: {
          booking_count: number
          item_name: string
          item_type: string
          preferred_date: string
          product_id: string
          product_size: string
          reservation_time: string
        }[]
      }
      is_product_slot_taken: {
        Args: {
          _date: string
          _product_id: string
          _size: string
          _time: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
