import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/supabase';
import { DEFAULT_STORE_ID } from '@/lib/store-context';
import ShopClient from './ShopClient';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ShopPage() {
  let products: Product[] = [];

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p>Database connection error</p>
      </div>
    );
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', DEFAULT_STORE_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error.message);
    }

    if (data && data.length > 0) {
      products = data as Product[];
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching products for shop:', errorMessage);
  }

  return <ShopClient initialProducts={products} />;
}