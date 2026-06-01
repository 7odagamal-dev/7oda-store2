import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
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
