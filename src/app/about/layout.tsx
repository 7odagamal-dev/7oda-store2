import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Story - OG Store',
  description: 'Discover the story behind OG Old Gold — premium luxury streetwear brand based in Alexandria, Egypt.',
  openGraph: {
    title: 'Our Story - OG Old Gold',
    description: 'Premium luxury streetwear brand based in Alexandria, Egypt.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
