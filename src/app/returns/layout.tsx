import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Exchange - OG Store',
  description: 'Learn about our 14-day return and exchange policy for OG Old Gold products.',
};

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
