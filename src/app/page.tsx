import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseProjectUrl } from '@/lib/supabase-project-url';
import type { Product } from '@/lib/supabase';
import HomeClient from './HomeClient';

// Use standard revalidate pattern for Next.js App Router (ISR)
export const revalidate = 3600; // Revalidate every hour

export default async function Home() {
  let products: Product[] = [];

  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_featured', true)
        .limit(4);

      if (!error && data) {
        products = data as Product[];
      }
    } catch {
      // Fail silently and pass empty array to client if DB is unreachable
    }
  }

  return <HomeClient products={products} />;
}