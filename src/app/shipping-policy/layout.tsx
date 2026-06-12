import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy - 7H Store',
  description: 'Learn about 7H  shipping costs, delivery times, and coverage across all Egyptian governorates.',
};

export default function ShippingPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
