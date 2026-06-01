import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Status - OG Store',
  description: 'View your order confirmation and status.',
};

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
