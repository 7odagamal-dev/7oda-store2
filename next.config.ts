import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // CSP is set dynamically per-request in proxy.ts (nonce-based)
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
    // Allow query strings on local images (for cache-busting versioning)
    localPatterns: [
      { pathname: '/images/**' },
    ],
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: process.env.NODE_ENV !== 'production',
  widenClientFileUpload: true,
  telemetry: false,
});
