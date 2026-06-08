import type { NextConfig } from "next";

function buildCSP(): string {
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://accept.paymob.com https://*.paymob.com",
    "frame-src 'self' https://accept.paymob.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "worker-src 'self' blob:",
  ].join('; ');
}

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: buildCSP() },
];

const swHeaders = [
  { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
  { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
  { key: 'Service-Worker-Allowed', value: '/' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/sw.js',
        headers: swHeaders,
      },
    ];
  },
  images: {
    // FIX: Removed the overly broad hostname: '**' pattern which allows
    // next/image to proxy ANY external URL (a security and abuse risk).
    // We keep only the domains actually used by this project.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        // Supabase Storage — covers *.supabase.co (project-specific subdomain)
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        // postimg.cc — used for product images
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },
      {
        // defacto — product images from URL
        protocol: 'https',
        hostname: 'dfcdn.defacto.com.tr',
      },
      // Add specific image hosts here as needed; avoid wildcards
    ],
  },
};

export default nextConfig;
