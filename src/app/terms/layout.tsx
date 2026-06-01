import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions - OG Store',
  description: 'Read the terms and conditions for using OG Old Gold online store.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
