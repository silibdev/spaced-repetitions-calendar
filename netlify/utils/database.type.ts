export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  db: {
    Tables: {
      calendarevent: {
        Row: {
          details: Json | null;
          id: string;
          masterid: string | null;
          start: string;
          user: string;
        };
        Insert: {
          details?: Json | null;
          id: string;
          masterid?: string | null;
          start: string;
          user: string;
        };
        Update: {
          details?: Json | null;
          id?: string;
          masterid?: string | null;
          start?: string;
          user?: string;
        };
      };
      eventdescription: {
        Row: {
          description: string | null;
          id: string;
          updated_at: string | null;
          user: string;
        };
        Insert: {
          description?: string | null;
          id: string;
          updated_at?: string | null;
          user: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          updated_at?: string | null;
          user?: string;
        };
      };
      eventdetail: {
        Row: {
          detail: string | null;
          id: string;
          updated_at: string | null;
          user: string;
        };
        Insert: {
          detail?: string | null;
          id: string;
          updated_at?: string | null;
          user: string;
        };
        Update: {
          detail?: string | null;
          id?: string;
          updated_at?: string | null;
          user?: string;
        };
      };
      eventlist: {
        Row: {
          list: string | null;
          updated_at: string | null;
          user: string;
        };
        Insert: {
          list?: string | null;
          updated_at?: string | null;
          user: string;
        };
        Update: {
          list?: string | null;
          updated_at?: string | null;
          user?: string;
        };
      };
      photo: {
        Row: {
          eventid: string;
          id: string;
          name: string | null;
          thumbnail: string | null;
          updated_at: string | null;
          user: string;
        };
        Insert: {
          eventid: string;
          id?: string;
          name?: string | null;
          thumbnail?: string | null;
          updated_at?: string | null;
          user: string;
        };
        Update: {
          eventid?: string;
          id?: string;
          name?: string | null;
          thumbnail?: string | null;
          updated_at?: string | null;
          user?: string;
        };
      };
      qnastatus: {
        Row: {
          eventid: string;
          id: string;
          status: string | null;
          updated_at: string | null;
          user: string;
        };
        Insert: {
          eventid: string;
          id: string;
          status?: string | null;
          updated_at?: string | null;
          user: string;
        };
        Update: {
          eventid?: string;
          id?: string;
          status?: string | null;
          updated_at?: string | null;
          user?: string;
        };
      };
      qnatemplate: {
        Row: {
          answer: string | null;
          created_at: string | null;
          eventid: string;
          id: string;
          question: string | null;
          updated_at: string | null;
          user: string;
        };
        Insert: {
          answer?: string | null;
          created_at?: string | null;
          eventid: string;
          id?: string;
          question?: string | null;
          updated_at?: string | null;
          user: string;
        };
        Update: {
          answer?: string | null;
          created_at?: string | null;
          eventid?: string;
          id?: string;
          question?: string | null;
          updated_at?: string | null;
          user?: string;
        };
      };
      settings: {
        Row: {
          data: string | null;
          updated_at: string | null;
          user: string;
        };
        Insert: {
          data?: string | null;
          updated_at?: string | null;
          user: string;
        };
        Update: {
          data?: string | null;
          updated_at?: string | null;
          user?: string;
        };
      };
    };
  };
};

type SchemaTables = Database['db']['Tables'];

export type Tables<TableName extends keyof SchemaTables> =
  SchemaTables[TableName]['Row'];

export type TablesInsert<TableName extends keyof SchemaTables> =
  SchemaTables[TableName]['Insert'];

export type TablesUpdate<TableName extends keyof SchemaTables> =
  SchemaTables[TableName]['Update'];
