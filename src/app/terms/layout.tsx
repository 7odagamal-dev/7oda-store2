import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions - 7H Store',
  description: 'Read the terms and conditions for using 7H  online store.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
