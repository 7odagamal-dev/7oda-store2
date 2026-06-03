import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OG Old Gold | Premium Luxury Fashion Store',
    short_name: 'OG Old Gold',
    description: 'Premium luxury fashion in Egypt. Shop exclusive T-shirts, hoodies, and jackets.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F9FB',
    theme_color: '#8BA4B8',
    orientation: 'portrait-primary',
    categories: ['shopping', 'fashion', 'lifestyle'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
  }
}
