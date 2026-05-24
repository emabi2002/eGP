'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Check if demo mode is enabled
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Redirect to dashboard in demo mode - bypass all auth pages
  useEffect(() => {
    if (isDemoMode) {
      router.replace('/');
    }
  }, [router]);

  // In demo mode, show nothing while redirecting
  if (isDemoMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-600">Entering demo mode...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
