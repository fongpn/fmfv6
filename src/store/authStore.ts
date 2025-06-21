import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getCurrentUser, secureSignIn, type AuthState, type Profile } from '../lib/auth';
import type { User } from '@supabase/supabase-js';

interface AuthStore extends AuthState {
  pendingApprovalRequestId: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any; status?: string }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null, profile: Profile | null) => void;
  clearPendingRequest: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  pendingApprovalRequestId: null,

  initialize: async () => {
    try {
      const { user, profile } = await getCurrentUser();
      set({ user, profile, loading: false, pendingApprovalRequestId: null });

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { profile } = await getCurrentUser();
          set({ user: session.user, profile, loading: false, pendingApprovalRequestId: null });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, loading: false, pendingApprovalRequestId: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, profile: null, loading: false, pendingApprovalRequestId: null });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      // Use secure sign in Edge Function
      const response = await secureSignIn(email, password);

      if (response.success && response.user && response.profile) {
        // Successful login
        set({ 
          user: response.user, 
          profile: response.profile, 
          loading: false,
          pendingApprovalRequestId: null 
        });
        return { error: null };
      } else if (response.status === 'PENDING_APPROVAL' && response.request_id) {
        // Access request pending approval
        set({ 
          pendingApprovalRequestId: response.request_id,
          user: null,
          profile: null,
          loading: false 
        });
        return { 
          error: { 
            message: response.message || 'Access request pending admin approval',
            status: 'PENDING_APPROVAL'
          },
          status: 'PENDING_APPROVAL'
        };
      } else {
        // General error
        return { 
          error: { 
            message: response.error || 'Authentication failed' 
          } 
        };
      }

    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        error: { 
          message: 'An unexpected error occurred' 
        } 
      };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, loading: false, pendingApprovalRequestId: null });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },

  setUser: (user: User | null, profile: Profile | null) => {
    set({ user, profile, loading: false, pendingApprovalRequestId: null });
  },

  clearPendingRequest: () => {
    set({ pendingApprovalRequestId: null });
  },
}));