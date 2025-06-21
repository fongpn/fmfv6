import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (will be generated from Supabase CLI in production)
export interface Database {
  public: {
    Tables: {
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: 'ADMIN' | 'CS';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: 'ADMIN' | 'CS';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: 'ADMIN' | 'CS';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          member_id_string: string;
          full_name: string;
          email: string | null;
          phone_number: string | null;
          photo_url: string | null;
          join_date: string;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id_string: string;
          full_name: string;
          email?: string | null;
          phone_number?: string | null;
          photo_url?: string | null;
          join_date?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id_string?: string;
          full_name?: string;
          email?: string | null;
          phone_number?: string | null;
          photo_url?: string | null;
          join_date?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      membership_plans: {
        Row: {
          id: string;
          name: string;
          price: number;
          duration_months: number;
          has_registration_fee: boolean;
          free_months_on_signup: number;
          is_active: boolean;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          duration_months: number;
          has_registration_fee?: boolean;
          free_months_on_signup?: number;
          is_active?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          duration_months?: number;
          has_registration_fee?: boolean;
          free_months_on_signup?: number;
          is_active?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shifts: {
        Row: {
          id: string;
          start_time: string;
          end_time: string | null;
          starting_staff_id: string;
          ending_staff_id: string | null;
          starting_cash_float: number;
          ending_cash_balance: number | null;
          system_calculated_cash: number | null;
          cash_discrepancy: number | null;
          status: 'ACTIVE' | 'CLOSED';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          start_time?: string;
          end_time?: string | null;
          starting_staff_id: string;
          ending_staff_id?: string | null;
          starting_cash_float: number;
          ending_cash_balance?: number | null;
          system_calculated_cash?: number | null;
          cash_discrepancy?: number | null;
          status?: 'ACTIVE' | 'CLOSED';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          start_time?: string;
          end_time?: string | null;
          starting_staff_id?: string;
          ending_staff_id?: string | null;
          starting_cash_float?: number;
          ending_cash_balance?: number | null;
          system_calculated_cash?: number | null;
          cash_discrepancy?: number | null;
          status?: 'ACTIVE' | 'CLOSED';
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
}