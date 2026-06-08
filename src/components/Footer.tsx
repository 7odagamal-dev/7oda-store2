'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');
  if (isAdminPage) return null;

  return (
    <footer className="bg-card border-t border-border pt-[var(--space-3xl)] pb-[var(--space-2xl)]">
      <div className="fsa-container">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-[var(--space-lg)] md:gap-[var(--space-xl)] mb-[var(--space-3xl)]">
          {/* Brand — full width on mobile */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="inline-flex flex-col items-start">
              <span className="text-[var(--text-3xl)] font-bold tracking-[0.3em] text-foreground font-[family-name:var(--font-playfair)]">
                OG
              </span>
              <span className="text-[var(--text-xs)] tracking-[0.25em] text-secondary uppercase mt-1">
                Old Gold
              </span>
            </Link>
            <p className="mt-[var(--space-lg)] text-[var(--text-sm)] text-secondary leading-relaxed max-w-xs">
              Premium clothing brand offering elegant and timeless fashion pieces for the modern individual.
            </p>
            {/* Social Links */}
            <div className="flex gap-[var(--space-md)] mt-[var(--space-lg)]">
              <a
                href="https://www.instagram.com/og.oldgold?igsh=bzlvMDhnejFzbWMy&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="touch-target w-11 h-11 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#8BA4B8] hover:border-[#8BA4B8] transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@og.oldgold?_r=1&_t=ZS-96S9Xwegtxo"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="touch-target w-11 h-11 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#8BA4B8] hover:border-[#8BA4B8] transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.26 8.26 0 0 0 4.84 1.55V6.84a4.85 4.85 0 0 1-1.07-.15z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold tracking-[0.2em] text-[#1A1A1A] uppercase mb-5">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-[var(--space-sm)]">
              {[
                { href: '/shop', label: 'Shop All' },
                { href: '/about', label: 'Our Story' },
                { href: '/contact', label: 'Contact Us' },
                { href: '/track', label: 'Track Order' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-block py-[var(--space-xs)] text-[var(--text-sm)] text-secondary hover:text-foreground transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Information */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold tracking-[0.2em] text-[#1A1A1A] uppercase mb-5">
              Information
            </h4>
            <nav className="flex flex-col gap-3">
              {[
                { href: '/faq', label: 'FAQ' },
                { href: '/size-guide', label: 'Size Guide' },
                { href: '/shipping-policy', label: 'Shipping Policy' },
                { href: '/returns', label: 'Returns & Exchange' },
                { href: '/terms', label: 'Terms & Conditions' },
                { href: '/privacy', label: 'Privacy Policy' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-block py-[var(--space-xs)] text-[var(--text-sm)] text-secondary hover:text-foreground transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div className="col-span-2 md:col-span-3 mt-2 md:mt-0">
            <h4 className="text-[var(--text-xs)] font-semibold tracking-[0.2em] text-foreground uppercase mb-[var(--space-lg)]">
              Contact
            </h4>
            <p className="text-[var(--text-sm)] text-secondary">Alexandria, Egypt</p>
            <a
              href="mailto:contact@oldgold.life"
              className="text-[var(--text-sm)] text-accent hover:text-accent-deep transition-colors mt-[var(--space-sm)] inline-block py-[var(--space-xs)]"
            >
              contact@oldgold.life
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-[var(--space-xl)] border-t border-border-light text-center">
          <p className="text-[var(--text-xs)] text-secondary tracking-wider">
            © 2026 OG — Old Gold. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}