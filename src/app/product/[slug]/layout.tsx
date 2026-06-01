import { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

type MetadataProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: MetadataProps
): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/products/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.product) {
        return {
          title: `${json.product.name} - OG Store`,
          description: json.product.description || `Buy ${json.product.name} at OG Store`,
          openGraph: {
            title: `${json.product.name} - OG Store`,
            description: json.product.description || `Buy ${json.product.name} at OG Store`,
            images: [json.product.main_image || '/images/logo.jpeg'],
          },
        };
      }
    }
  } catch {
    // Fallback metadata
  }

  return {
    title: 'Product - OG Store',
    description: 'View product details on OG Store',
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  let productJsonLd: Record<string, unknown> | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/products/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.product) {
        const p = json.product;
        productJsonLd = {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.description || `${p.name} from OG Old Gold`,
          image: p.main_image || '/images/logo.jpeg',
          sku: p.slug,
          offers: {
            "@type": "Offer",
            url: `${baseUrl}/product/${p.slug}`,
            priceCurrency: "EGP",
            price: p.price,
            availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            ...(p.old_price ? { priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } : {}),
          },
          ...(p.category ? { category: p.category } : {}),
        };
      }
    }
  } catch {
    // Fallback — no JSON-LD
  }

  return (
    <>
      {productJsonLd && <JsonLd data={productJsonLd} />}
      {children}
    </>
  );
}