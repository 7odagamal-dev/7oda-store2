import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - 7H Store',
  description: 'Frequently asked questions about ordering, shipping, payments, returns, and sizing at 7H .',
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
