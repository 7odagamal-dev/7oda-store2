import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseProjectUrl } from '@/lib/supabase-project-url';
import type { Product } from '@/lib/supabase';
import { DEFAULT_STORE_ID } from '@/lib/store-context';
import HomeClient from './HomeClient';

export const revalidate = 3600;

export default async function Home() {

  let products: Product[] = [];
  let flashSaleProducts: Product[] = [];
  let flashSaleInfo: Record<string, { discount_percentage: number; ends_at: string }> = {};
  let bundles: Array<Record<string, unknown>> = [];

  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabase: ReturnType<typeof createClient> | null = null;

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', DEFAULT_STORE_ID)
        .eq('is_featured', true)
        .limit(4);

      if (!error && data) {
        products = data as unknown as Product[];
      }
    } catch {}

    try {
      const { data: flashSales, error: fsError } = await supabase
        .from('flash_sales')
        .select('product_id, discount_percentage, ends_at')
        .eq('store_id', DEFAULT_STORE_ID)
        .eq('is_active', true)
        .gt('ends_at', new Date().toISOString())
        .limit(4) as unknown as { data: Array<{ product_id: string; discount_percentage: number; ends_at: string }> | null; error: unknown };

      if (!fsError && flashSales && flashSales.length > 0) {
        flashSaleInfo = Object.fromEntries(
          flashSales.map(fs => [fs.product_id, { discount_percentage: fs.discount_percentage, ends_at: fs.ends_at }])
        );
        const productIds = flashSales.map(fs => fs.product_id);
        const { data: saleProducts, error: pError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds)
          .eq('store_id', DEFAULT_STORE_ID);
        if (!pError && saleProducts) {
          flashSaleProducts = saleProducts as unknown as Product[];
        }
      }
    } catch {}

    try {
      const { data: bundleRows, error: bError } = await supabase
        .from('bundles')
        .select('*')
        .eq('store_id', DEFAULT_STORE_ID)
        .eq('is_active', true)
        .limit(3) as unknown as { data: Array<Record<string, unknown>> | null; error: unknown };

      if (!bError && bundleRows && bundleRows.length > 0) {
        const allProductIds = [...new Set(bundleRows.flatMap(b => b.products || []))] as string[];
        const productImages: Record<string, string> = {};
        if (allProductIds.length > 0) {
          const { data: productsForImages } = await supabase
            .from('products')
            .select('id, main_image')
            .in('id', allProductIds) as unknown as { data: Array<{ id: string; main_image: string | null }> | null };
          if (productsForImages) {
            for (const p of productsForImages) {
              if (p.main_image) productImages[p.id] = p.main_image;
            }
          }
        }
        bundles = bundleRows.map(b => ({
          ...b,
          product_images: ((b.products as string[]) || []).map((id: string) => productImages[id] || null).filter(Boolean),
        }));
      }
    } catch {}
  }

  return <HomeClient products={products} flashSaleProducts={flashSaleProducts} flashSaleInfo={flashSaleInfo} bundles={bundles} />;
}