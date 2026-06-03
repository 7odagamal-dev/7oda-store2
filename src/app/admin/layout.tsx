'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/admin',          label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/admin/products', label: 'Products',  icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { href: '/admin/orders',   label: 'Orders',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/admin/messages', label: 'Messages',  icon: 'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { href: '/admin/reviews',  label: 'Reviews',   icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { href: '/admin/coupons',  label: 'Coupons',   icon: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z' },
  { href: '/admin/shipping', label: 'Shipping',  icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12' },
  { href: '/admin/finance',  label: 'Finance',   icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/admin/payments',  label: 'Payments',   icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z' },
  { href: '/admin/bundles',      label: 'Bundles',     icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z' },
  { href: '/admin/blog',         label: 'Blog',        icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10' },
  { href: '/admin/flash-sales',  label: 'Flash Sales',  icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/admin/newsletter',   label: 'Newsletter',  icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
  { href: '/admin/bulk-products', label: 'Bulk Upload', icon: 'M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [verified, setVerified]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/verify', { method: 'GET' })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setVerified(true);
        } else {
          router.push('/admin-login');
        }
      })
      .catch(() => router.push('/admin-login'));
  }, [router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const csrfCookie = document.cookie.split('; ').find(c => c.startsWith('csrf-token='));
      const csrfToken = csrfCookie?.split('=')[1];
      if (csrfToken && init?.method && init.method !== 'GET') {
        const headers = new Headers(init?.headers);
        if (!headers.has('x-csrf-token')) headers.set('x-csrf-token', csrfToken);
        return origFetch(input, { ...init, headers });
      }
      return origFetch(input, init);
    };
    return () => { window.fetch = origFetch; };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin-login');
  };

  if (!verified) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[#8BA4B8] text-sm tracking-widest font-medium"
        >
          VERIFYING...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fsa-admin-layout bg-background text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fsa-sidebar bg-card border-r border-border z-30 transform transition-transform duration-300 shadow-sm
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0`}
      >
        <div className="p-[var(--space-lg)] border-b border-border-light">
          <Link href="/admin" className="flex flex-col items-start">
            <span className="text-[var(--text-2xl)] font-bold tracking-[0.3em] text-foreground font-[family-name:var(--font-playfair)]">OG</span>
            <span className="text-[var(--text-xs)] tracking-[0.25em] text-secondary uppercase mt-0.5">Admin Panel</span>
          </Link>
        </div>

        <nav className="px-[var(--space-sm)] py-[var(--space-md)] space-y-[var(--space-xs)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-[var(--space-sm)] px-[var(--space-md)] py-[var(--space-sm)] rounded-[var(--radius-xl)] transition-all duration-200 ${
                  isActive
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-foreground hover:bg-card-hover'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-[var(--text-sm)] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-[var(--space-lg)] left-[var(--space-md)] right-[var(--space-md)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-[var(--space-sm)] px-[var(--space-md)] py-[var(--space-sm)] border border-border text-secondary hover:text-foreground hover:border-accent rounded-[var(--radius-xl)] transition-all text-[var(--text-sm)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="fsa-admin-main flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-[var(--space-md)] px-[var(--space-md)] py-[var(--space-sm)] bg-card border-b border-border sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-secondary hover:text-foreground"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="font-bold tracking-widest text-foreground text-[var(--text-sm)] font-[family-name:var(--font-playfair)]">OG ADMIN</span>
        </header>

        <main className="flex-1 p-[var(--space-md)] md:p-[var(--space-xl)]">
          {children}
        </main>
      </div>
    </div>
  );
}