'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient, isDemoModeEnabled } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'];

// Check if demo mode is enabled
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Demo user for when running without Supabase
const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@egp.gov.pg',
  username: 'demo_admin',
  firstName: 'Demo',
  lastName: 'Administrator',
  role: 'SYSTEM_ADMIN' as UserRole,
  organizationId: 'demo-org-001',
  isActive: true,
  mfaEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { login, logout } = useAuthStore();

  const handleSignOut = useCallback(async () => {
    if (!isDemoModeEnabled()) {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    }
    logout();
    setUser(null);
    setSession(null);
    router.push('/login');
  }, [logout, router]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // In demo mode, automatically log in as demo user
        if (isDemoModeEnabled()) {
          login(DEMO_USER, 'demo-token');
          setIsLoading(false);
          return;
        }

        const supabase = getSupabaseClient();

        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession?.user) {
          setUser(initialSession.user);
          setSession(initialSession);

          // Get user metadata and set in auth store
          const metadata = initialSession.user.user_metadata;
          const role = (metadata?.role as UserRole) || 'PUBLIC_VIEWER';

          login(
            {
              id: initialSession.user.id,
              email: initialSession.user.email || '',
              username: initialSession.user.email?.split('@')[0] || '',
              firstName: metadata?.first_name || '',
              lastName: metadata?.last_name || '',
              role: role,
              organizationId: metadata?.organization_id || undefined,
              isActive: true,
              mfaEnabled: false,
              createdAt: initialSession.user.created_at,
              updatedAt: new Date().toISOString(),
            },
            initialSession.access_token
          );
        } else if (!publicRoutes.includes(pathname)) {
          // Redirect to login if not authenticated and not on public route
          router.push('/login');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // In case of error, enable demo mode fallback
        if (isDemoModeEnabled()) {
          login(DEMO_USER, 'demo-token');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Skip auth listener in demo mode
    if (isDemoModeEnabled()) {
      return;
    }

    const supabase = getSupabaseClient();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'SIGNED_IN' && currentSession?.user) {
          setUser(currentSession.user);
          setSession(currentSession);

          const metadata = currentSession.user.user_metadata;
          const role = (metadata?.role as UserRole) || 'PUBLIC_VIEWER';

          login(
            {
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              username: currentSession.user.email?.split('@')[0] || '',
              firstName: metadata?.first_name || '',
              lastName: metadata?.last_name || '',
              role: role,
              organizationId: metadata?.organization_id || undefined,
              isActive: true,
              mfaEnabled: false,
              createdAt: currentSession.user.created_at,
              updatedAt: new Date().toISOString(),
            },
            currentSession.access_token
          );
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          logout();

          if (!publicRoutes.includes(pathname)) {
            router.push('/login');
          }
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [login, logout, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut: handleSignOut, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
