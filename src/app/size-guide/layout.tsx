import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Size Guide - 7H Store',
  description: 'Find your perfect fit with our detailed size guide for all 7H  apparel.',
};

export default function SizeGuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
