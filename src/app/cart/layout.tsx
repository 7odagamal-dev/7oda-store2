import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cart - 7H Store',
  description: 'Review your cart and proceed to checkout.',
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
