export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';

const ALL_STATUSES: readonly OrderStatus[] = [
  'pending', 'confirmed', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled',
];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
  preparing:        ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
  shipped:          ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered:        [],
  cancelled:        [],
};

export function isValidOrderStatus(value: string): value is OrderStatus {
  return ALL_STATUSES.includes(value as OrderStatus);
}

export function assertValidOrderTransition(current: string, next: string): void {
  if (!isValidOrderStatus(current)) {
    throw new Error(`Invalid current order status: "${current}"`);
  }
  if (!isValidOrderStatus(next)) {
    throw new Error(`Invalid target order status: "${next}"`);
  }
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid order status transition: "${current}" → "${next}". ` +
      `Allowed transitions from "${current}": [${allowed.join(', ') || '(none — terminal state)'}]`
    );
  }
}
