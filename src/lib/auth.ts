import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name: string;
  role: 'ADMIN' | 'CS';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export interface SecureSignInResponse {
  success: boolean;
  user?: User;
  profile?: Profile;
  session?: any;
  status?: string;
  message?: string;
  request_id?: string;
  error?: string;
}
// Get current user and profile
export async function getCurrentUser(): Promise<{ user: User | null; profile: Profile | null }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { user: null, profile: null };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { user, profile: null };
    }

    return { user, profile };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, profile: null };
  }
}

// Secure sign in using Edge Function
export async function secureSignIn(email: string, password: string): Promise<SecureSignInResponse> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/secure-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Authentication failed',
      };
    }

    return data;
  } catch (error) {
    console.error('Secure sign in error:', error);
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
}
// Sign in with email and password
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
}

// Create a new staff member (admin only)
export async function createStaffMember(email: string, password: string, fullName: string, role: 'ADMIN' | 'CS') {
  try {
    // This would typically be done through Supabase Admin API
    // For now, we'll create a placeholder function
    console.log('Creating staff member:', { email, fullName, role });
    
    // In production, this would:
    // 1. Use Supabase Admin API to create user
    // 2. Insert profile record
    // 3. Send invitation email
    
    return { data: null, error: new Error('Staff creation not implemented yet') };
  } catch (error) {
    console.error('Create staff member error:', error);
    return { data: null, error };
  }
}

// Check if user has required role
export function hasRole(profile: Profile | null, requiredRole: 'ADMIN' | 'CS'): boolean {
  if (!profile) return false;
  
  if (requiredRole === 'CS') {
    return profile.role === 'ADMIN' || profile.role === 'CS';
  }
  
  return profile.role === requiredRole;
}

// Check access request status
export async function checkAccessRequestStatus(requestId: string): Promise<{ status: string; resolved_at: string | null }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/secure-login/status/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking access request status:', error);
    throw error;
  }
}