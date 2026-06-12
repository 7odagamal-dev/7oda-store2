'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

export interface AdminUser {
  valid: boolean;
  storeId: string | null;
  role: string | null;
  userId: string | null;
}

const AdminSessionContext = createContext<AdminUser | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminUser | null>(null);

  useEffect(() => {
    adminFetch('/api/admin/verify', { method: 'GET' })
      .then((res) => (res.ok ? res.json() : { valid: false }))
      .then((data) => setSession(data))
      .catch(() => setSession({ valid: false, storeId: null, role: null, userId: null }));
  }, []);

  return (
    <AdminSessionContext.Provider value={session}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminUser | null {
  return useContext(AdminSessionContext);
}

interface RequireRoleProps {
  allowed: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({ allowed, children, fallback = null }: RequireRoleProps) {
  const session = useAdminSession();

  // While loading, show nothing
  if (session === null) return null;

  if (session.role && allowed.includes(session.role)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
