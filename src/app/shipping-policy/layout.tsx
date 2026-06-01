import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy - OG Store',
  description: 'Learn about OG Old Gold shipping costs, delivery times, and coverage across all Egyptian governorates.',
};

export default function ShippingPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
