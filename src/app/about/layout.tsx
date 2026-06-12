import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Story - 7H Store',
  description: 'Discover the story behind 7H  — premium luxury streetwear brand based in Alexandria, Egypt.',
  openGraph: {
    title: 'Our Story - 7H ',
    description: 'Premium luxury streetwear brand based in Alexandria, Egypt.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
