/**
 * shipping.ts — Single source of truth for shipping cost calculation.
 *
 * Used by:
 *   - src/app/cart/page.tsx (client-side estimate)
 *   - src/app/checkout/page.tsx (client-side display)
 *   - src/app/api/checkout/route.ts (server-side final calculation)
 *
 * This ensures the shipping cost shown to the user matches what is recorded
 * in the order. Any change to shipping logic happens in ONE place.
 */

/** All valid Egyptian governorates accepted by the store. */
export const GOVERNORATES = [
  'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Red Sea', 'Beheira',
  'Fayoum', 'Gharbia', 'Ismailia', 'Menoufia', 'Minya', 'Qalyubia',
  'New Valley', 'Suez', 'Aswan', 'Assiut', 'Beni Suef', 'Port Said',
  'Damietta', 'Sharkia', 'South Sinai', 'Kafr El Sheikh', 'Matrouh',
  'Luxor', 'Qena', 'North Sinai', 'Sohag',
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

/**
 * Calculate shipping cost based on the customer's governorate.
 *
 * Rules:
 *   - Alexandria: 60 EGP (local)
 *   - All other governorates: 100 EGP
 *   - No governorate selected: 0 (used for initial display only)
 */
export function calculateShippingCost(governorate: string): number {
  if (!governorate) return 0;
  if (governorate === 'Alexandria') return 60;
  return 100;
}

/** The minimum shipping cost (used for display before governorate is selected). */
export const SHIPPING_RANGE = { min: 60, max: 100 } as const;
