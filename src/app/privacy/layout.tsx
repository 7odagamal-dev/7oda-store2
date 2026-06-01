import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - OG Store',
  description: 'Learn how OG Old Gold collects, uses, and protects your personal data.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
