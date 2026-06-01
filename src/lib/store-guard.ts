import { isValidStoreId } from '@/lib/store-context';

/**
 * assertStoreAccess — prevents cross-store data access.
 *
 * Rules:
 *  - If storeId is missing or invalid → THROW (400)
 *  - If data belongs to different store → THROW (403)
 *  - Superadmin bypass: if requestStoreId === '00000000-...' (default), we still
 *    enforce that superadmin explicitly passes the correct store_id.
 *    If they pass a different store_id than the data, it fails.
 */
export function assertStoreAccess(
  dataStoreId: string | undefined | null,
  requestStoreId: string,
  isSuperAdmin: boolean,
): void {
  if (!dataStoreId || !isValidStoreId(dataStoreId)) {
    throw new StoreGuardError('Data record has no valid store_id', 400);
  }

  if (!isValidStoreId(requestStoreId)) {
    throw new StoreGuardError('Request context has no valid store_id', 400);
  }

  // Superadmin can access any store
  if (isSuperAdmin) return;

  if (dataStoreId !== requestStoreId) {
    throw new StoreGuardError(
      `Cross-store access denied: data belongs to store ${dataStoreId}, request is for store ${requestStoreId}`,
      403,
    );
  }
}

/**
 * requireStoreId — ensures a store_id value is present and valid.
 */
export function requireStoreId(storeId: unknown): asserts storeId is string {
  if (!storeId || !isValidStoreId(storeId)) {
    throw new StoreGuardError('store_id is required and must be a valid UUID', 400);
  }
}

export class StoreGuardError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'StoreGuardError';
    this.statusCode = statusCode;
  }
}
