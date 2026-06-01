import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout - OG Store',
  description: 'Complete your order securely.',
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
