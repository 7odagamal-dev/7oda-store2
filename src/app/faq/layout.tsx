import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - OG Store',
  description: 'Frequently asked questions about ordering, shipping, payments, returns, and sizing at OG Old Gold.',
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
