import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Status - 7H Store',
  description: 'View your order confirmation and status.',
};

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
