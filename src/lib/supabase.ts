import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseProjectUrl } from '@/lib/supabase-project-url';

const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!_supabase) {
    if (supabaseUrl && supabaseAnonKey && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))) {
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client not initialized — missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export interface Product {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  old_price: number | null;
  discount_percentage: number | null;
  sizes: string[];
  category: string;
  is_featured: boolean;
  stock: number;
  main_image: string;
  // extra images optional, accept null to avoid TS errors
  second_image?: string | null;
  third_image?: string | null;
  fourth_image?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  customer_name: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  notes: string | null;
  payment_method: string;
  status: string;
  delivery_status?: string;
  total: number;
  items: Array<{
    name?: string;
    size?: string;
    quantity?: number;
    price?: number;
    product_id?: string;
    image?: string | null;
  }>;
  created_at: string;
}