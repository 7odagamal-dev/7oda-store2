import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7h-store.life';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin-login',
          '/api/',
          '/auth/',
          '/profile',
          '/cart',
          '/checkout',
          '/order-success',
          '/_not-found',
          '/offline',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
