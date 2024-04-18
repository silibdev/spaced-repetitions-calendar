export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  db: {
    Tables: {
      eventdescription: {
        Row: {
          description: string | null
          id: string
          updated_at: string | null
          user: string
        }
        Insert: {
          description?: string | null
          id: string
          updated_at?: string | null
          user: string
        }
        Update: {
          description?: string | null
          id?: string
          updated_at?: string | null
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_eventdescription_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "settings"
            referencedColumns: ["user"]
          },
          {
            foreignKeyName: "db_eventdescription_user_id_fkey"
            columns: ["user", "id"]
            isOneToOne: true
            referencedRelation: "eventdetail"
            referencedColumns: ["user", "id"]
          },
        ]
      }
      eventdetail: {
        Row: {
          detail: string | null
          id: string
          updated_at: string | null
          user: string
        }
        Insert: {
          detail?: string | null
          id: string
          updated_at?: string | null
          user: string
        }
        Update: {
          detail?: string | null
          id?: string
          updated_at?: string | null
          user?: string
        }
        Relationships: []
      }
      eventlist: {
        Row: {
          list: string | null
          updated_at: string | null
          user: string
        }
        Insert: {
          list?: string | null
          updated_at?: string | null
          user: string
        }
        Update: {
          list?: string | null
          updated_at?: string | null
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_eventlist_user_fkey"
            columns: ["user"]
            isOneToOne: true
            referencedRelation: "settings"
            referencedColumns: ["user"]
          },
        ]
      }
      photo: {
        Row: {
          eventid: string
          id: string
          name: string | null
          thumbnail: string | null
          updated_at: string | null
          user: string
        }
        Insert: {
          eventid: string
          id?: string
          name?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          user: string
        }
        Update: {
          eventid?: string
          id?: string
          name?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_photo_user_eventid_fkey"
            columns: ["user", "eventid"]
            isOneToOne: false
            referencedRelation: "eventdetail"
            referencedColumns: ["user", "id"]
          },
        ]
      }
      qnastatus: {
        Row: {
          eventid: string
          id: string
          status: string | null
          updated_at: string | null
          user: string
        }
        Insert: {
          eventid: string
          id: string
          status?: string | null
          updated_at?: string | null
          user: string
        }
        Update: {
          eventid?: string
          id?: string
          status?: string | null
          updated_at?: string | null
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_qnastatus_user_id_fkey"
            columns: ["user", "id"]
            isOneToOne: false
            referencedRelation: "qnatemplate"
            referencedColumns: ["user", "id"]
          },
        ]
      }
      qnatemplate: {
        Row: {
          answer: string | null
          created_at: string | null
          eventid: string
          id: string
          question: string | null
          updated_at: string | null
          user: string
        }
        Insert: {
          answer?: string | null
          created_at?: string | null
          eventid: string
          id?: string
          question?: string | null
          updated_at?: string | null
          user: string
        }
        Update: {
          answer?: string | null
          created_at?: string | null
          eventid?: string
          id?: string
          question?: string | null
          updated_at?: string | null
          user?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          data: string | null
          updated_at: string | null
          user: string
        }
        Insert: {
          data?: string | null
          updated_at?: string | null
          user: string
        }
        Update: {
          data?: string | null
          updated_at?: string | null
          user?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "db">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
