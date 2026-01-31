import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Singleton Supabase client
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials not configured');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseClient;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Database types for TypeScript
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          config: Record<string, unknown>;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      programs: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          name: string;
          setup_section: string;
          main_section: string;
          routines: Record<string, unknown>[];
          profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['programs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['programs']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: 'owner' | 'editor' | 'viewer';
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['team_members']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>;
      };
      edit_locks: {
        Row: {
          id: string;
          program_id: string;
          user_id: string;
          locked_at: string;
          expires_at: string;
        };
        Insert: Omit<Database['public']['Tables']['edit_locks']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['edit_locks']['Insert']>;
      };
    };
  };
}

export type Tables = Database['public']['Tables'];
export type ProfileRow = Tables['profiles']['Row'];
export type ProgramRow = Tables['programs']['Row'];
export type TeamRow = Tables['teams']['Row'];
export type TeamMemberRow = Tables['team_members']['Row'];
export type EditLockRow = Tables['edit_locks']['Row'];
