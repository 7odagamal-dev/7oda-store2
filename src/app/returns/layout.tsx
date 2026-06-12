import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Exchange - 7H Store',
  description: 'Learn about our 14-day return and exchange policy for 7H  products.',
};

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
