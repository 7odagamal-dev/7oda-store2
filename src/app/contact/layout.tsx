import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - 7H Store',
  description: 'Get in touch with us for any inquiries or support.',
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
