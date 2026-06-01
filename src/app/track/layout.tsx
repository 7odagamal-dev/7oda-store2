import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Order - OG Store',
  description: 'Track the delivery status of your order.',
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
