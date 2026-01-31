import type { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string
): Promise<{ user: User | null; error: AuthError | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { user: null, error: { message: 'Supabase not configured', status: 500 } as AuthError };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  return { user: data.user, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      user: null,
      session: null,
      error: { message: 'Supabase not configured', status: 500 } as AuthError,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { user: data.user, session: data.session, error };
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithProvider(
  provider: 'google' | 'github'
): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: { message: 'Supabase not configured', status: 500 } as AuthError };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: { message: 'Supabase not configured', status: 500 } as AuthError };
  }

  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: { message: 'Supabase not configured', status: 500 } as AuthError };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  return { error };
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: { message: 'Supabase not configured', status: 500 } as AuthError };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): (() => void) | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
