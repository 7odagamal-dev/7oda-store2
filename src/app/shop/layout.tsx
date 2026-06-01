import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop - OG Store',
  description: 'Browse our latest collection of premium clothing, t-shirts, hoodies, jackets, and more.',
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
