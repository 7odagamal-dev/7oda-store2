import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Size Guide - OG Store',
  description: 'Find your perfect fit with our detailed size guide for all OG Old Gold apparel.',
};

export default function SizeGuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
