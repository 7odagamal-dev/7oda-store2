import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - 7H Store',
  description: 'Learn how 7H  collects, uses, and protects your personal data.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
