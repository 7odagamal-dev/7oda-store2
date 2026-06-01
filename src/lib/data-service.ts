import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { filterByStore } from '@/lib/db';

export type SupabaseClient = ReturnType<typeof import('@supabase/supabase-js').createClient>;

export interface DataResult<T> {
  data: T | null;
  error: string | null;
}

export class DataService {
  private client: SupabaseClient;
  private storeId: string;

  constructor(client: SupabaseClient, storeId: string) {
    this.client = client;
    this.storeId = storeId;
  }

  async getAll<T>(table: string): Promise<DataResult<T[]>> {
    try {
      const { data, error }: { data: T[] | null; error: any } = await filterByStore(
        this.client.from(table).select('*'),
        this.storeId,
      );
      if (error) return { data: null, error: error.message };
      return { data: data as T[], error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  async getById<T>(table: string, id: string): Promise<DataResult<T>> {
    try {
      const { data, error }: { data: T | null; error: any } = await (this.client
        .from(table) as any)
        .select('*')
        .eq('id', id)
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  async create<T>(table: string, record: Partial<T>): Promise<DataResult<T>> {
    try {
      const { data, error }: { data: T | null; error: any } = await (this.client
        .from(table) as any)
        .insert({ ...record, store_id: this.storeId })
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  async update<T>(table: string, id: string, updates: Partial<T>): Promise<DataResult<T>> {
    try {
      const { data, error }: { data: T | null; error: any } = await (this.client
        .from(table) as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  async remove(table: string, id: string): Promise<DataResult<null>> {
    try {
      const { error }: { error: any } = await (this.client
        .from(table) as any)
        .delete()
        .eq('id', id);
      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  async query<T>(table: string, column: string, operator: string, value: unknown): Promise<DataResult<T[]>> {
    try {
      const { data, error }: { data: T[] | null; error: any } = await filterByStore(
        this.client.from(table).select('*').filter(column, operator, value),
        this.storeId,
      );
      if (error) return { data: null, error: error.message };
      return { data: data as T[], error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
}

export function createStoreService(storeId: string): DataService {
  return new DataService(supabase as unknown as SupabaseClient, storeId);
}

export function createAdminService(): DataService {
  return new DataService(supabaseAdmin as unknown as SupabaseClient, '');
}
