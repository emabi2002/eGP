import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export function createClient() {
  // In demo mode or with placeholder values, create a mock-like client
  // The actual auth will be bypassed in the auth provider
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
}

// Singleton instance for client-side use
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

// Helper to check if running in demo mode
export function isDemoModeEnabled() {
  return isDemoMode || supabaseUrl.includes('placeholder');
}
