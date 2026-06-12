import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout - 7H Store',
  description: 'Complete your order securely.',
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
