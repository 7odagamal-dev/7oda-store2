'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isAdminPage = pathname?.startsWith('/admin');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mounted]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-menu-container')) setUserMenuOpen(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener('click', close);
      window.addEventListener('touchstart', close, { passive: true });
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', close);
      window.removeEventListener('touchstart', close);
    };
  }, [userMenuOpen]);

  if (isAdminPage) return null;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/blog', label: 'Blog' },
    { href: '/wishlist', label: 'Wishlist' },
    { href: '/track', label: 'Track' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'glass shadow-sm py-[var(--space-sm)]'
          : 'bg-transparent py-[var(--space-lg)]'
      }`}
    >
      <div className="fsa-container">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex flex-col items-start group">
            <span className="text-xl font-bold tracking-[0.15em] font-[family-name:var(--font-playfair)]">7H</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-[var(--space-xl)]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-xs tracking-[0.15em] uppercase font-medium transition-colors duration-300 ${
                    isActive
                      ? 'text-[#6B8BA0]'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#8BA4B8] rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Wishlist + Cart + Mobile Toggle */}
          <div className="flex items-center gap-[var(--space-xs)] sm:gap-[var(--space-sm)]">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="touch-target text-[#6B7280] hover:text-[#1A1A1A] transition-colors duration-300" aria-label="Toggle theme">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </button>
            {/* Wishlist Icon */}
            <Link href="/wishlist" className="touch-target relative text-[#6B7280] hover:text-[#1A1A1A] transition-colors duration-300" aria-label="Wishlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </Link>
            {/* Cart Icon */}
            <Link href="/cart" className="touch-target relative text-[#6B7280] hover:text-[#1A1A1A] transition-colors duration-300" aria-label="Shopping cart">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <AnimatePresence>
                {mounted && itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#8BA4B8] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* User Icon */}
            <div className="relative user-menu-container">
              {user ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
                    className="touch-target text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
                    aria-label="Account"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 ltr:right-0 rtl:left-0 top-full mt-2 w-48 bg-card rounded-[var(--radius-xl)] shadow-lg border border-border py-[var(--space-sm)] z-50"
                      >
                        <div className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-xs)] text-secondary border-b border-border truncate">{user.email}</div>
                        <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="block px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-sm)] text-foreground hover:bg-[#F8F9FB] transition-colors">My Account</Link>
                        <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="block px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-sm)] text-foreground hover:bg-[#F8F9FB] transition-colors">Order History</Link>
                        <button onClick={signOut} className="block w-full text-left px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-sm)] text-red-600 hover:bg-[#F8F9FB] transition-colors">Sign Out</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link href="/auth/login" className="touch-target text-[#6B7280] hover:text-[#1A1A1A] transition-colors" aria-label="Sign in">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="touch-target md:hidden text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden glass border-t border-[#F0F0F0] overflow-hidden"
          >
            <nav className="flex flex-col py-[var(--space-md)] px-[var(--space-lg)]">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-[var(--space-md)] text-[var(--text-sm)] tracking-[0.15em] uppercase font-medium border-b border-border-light last:border-0 transition-colors ${
                    pathname === link.href ? 'text-accent-deep' : 'text-secondary hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}