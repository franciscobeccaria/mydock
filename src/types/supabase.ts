export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      dashboard_state: {
        Row: {
          created_at: string;
          layout: Json;
          shortcuts: Json;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          layout?: Json;
          shortcuts?: Json;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          layout?: Json;
          shortcuts?: Json;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [];
      };
      integration_accounts: {
        Row: {
          access_token_encrypted: string | null;
          created_at: string;
          id: string;
          provider: string;
          provider_account_email: string | null;
          provider_account_id: string | null;
          refresh_token_encrypted: string | null;
          scopes: string[];
          token_expires_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token_encrypted?: string | null;
          created_at?: string;
          id?: string;
          provider: string;
          provider_account_email?: string | null;
          provider_account_id?: string | null;
          refresh_token_encrypted?: string | null;
          scopes?: string[];
          token_expires_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token_encrypted?: string | null;
          created_at?: string;
          id?: string;
          provider?: string;
          provider_account_email?: string | null;
          provider_account_id?: string | null;
          refresh_token_encrypted?: string | null;
          scopes?: string[];
          token_expires_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_tokens: {
        Row: {
          access_token_encrypted: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          integration_id: string;
          refresh_token_encrypted: string | null;
          updated_at: string;
        };
        Insert: {
          access_token_encrypted?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          integration_id: string;
          refresh_token_encrypted?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token_encrypted?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          integration_id?: string;
          refresh_token_encrypted?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_tokens_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          account_id: string | null;
          created_at: string;
          id: string;
          last_sync_at: string | null;
          provider: string;
          provider_account_email: string | null;
          provider_account_id: string | null;
          scopes: string[];
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          created_at?: string;
          id?: string;
          last_sync_at?: string | null;
          provider: string;
          provider_account_email?: string | null;
          provider_account_id?: string | null;
          scopes?: string[];
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_id?: string | null;
          created_at?: string;
          id?: string;
          last_sync_at?: string | null;
          provider?: string;
          provider_account_email?: string | null;
          provider_account_id?: string | null;
          scopes?: string[];
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integrations_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "integration_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integrations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      widget_cache: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          provider: string;
          source_updated_at: string | null;
          summary: string | null;
          updated_at: string;
          user_id: string;
          widget_key: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload?: Json;
          provider: string;
          source_updated_at?: string | null;
          summary?: string | null;
          updated_at?: string;
          user_id: string;
          widget_key: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          provider?: string;
          source_updated_at?: string | null;
          summary?: string | null;
          updated_at?: string;
          user_id?: string;
          widget_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "widget_cache_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
