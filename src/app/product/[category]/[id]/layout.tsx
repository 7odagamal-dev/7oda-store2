import { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

type MetadataProps = {
  params: Promise<{ category: string; id: string }>;
};

function absoluteUrl(base: string, path: string): string {
  if (path.startsWith('http')) return path;
  return `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function generateMetadata(
  { params }: MetadataProps
): Promise<Metadata> {
  const { category, id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const canonicalUrl = `${baseUrl.replace(/\/+$/, '')}/product/${encodeURIComponent(category)}/${encodeURIComponent(id)}`;

  try {
    const res = await fetch(`${baseUrl}/api/products/by-id/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.product) {
        const p = json.product;
        const title = `${p.name} - 7H `;
        const description = p.description || `Shop ${p.name} at 7H . Premium quality.`;
        const image = absoluteUrl(baseUrl, p.main_image || '/images/logo.jpeg');

        return {
          title,
          description,
          openGraph: {
            title,
            description,
            url: canonicalUrl,
            siteName: '7H ',
            images: [{ url: image, width: 1200, height: 630, alt: p.name }],
            locale: 'en_US',
            type: 'website',
          },
          twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
          },
          alternates: { canonical: canonicalUrl },
        };
      }
    }
  } catch {}

  return {
    title: 'Product - 7H ',
    description: 'View product details on 7H ',
    openGraph: {
      title: '7H ',
      description: 'Premium fashion store',
      images: [{ url: absoluteUrl(baseUrl, '/images/logo.jpeg'), width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ category: string; id: string }>;
}) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  let productJsonLd: Record<string, unknown> | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/products/by-id/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.product) {
        const p = json.product;
        productJsonLd = {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.description || `${p.name} from 7H `,
          image: p.main_image || '/images/logo.jpeg',
          sku: p.slug,
          offers: {
            "@type": "Offer",
            url: `${baseUrl}/product/${encodeURIComponent(p.category || 'uncategorized')}/${p.id}`,
            priceCurrency: "EGP",
            price: p.price,
            availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            ...(p.old_price ? { priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } : {}),
          },
          ...(p.category ? { category: p.category } : {}),
        };
      }
    }
  } catch {}

  return (
    <>
      {productJsonLd && <JsonLd data={productJsonLd} />}
      {children}
    </>
  );
}
