'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function FooterWrapper() {
  const pathname = usePathname();

  // إخفاء الفوتر كلياً من جميع صفحات الأدمن
  if (pathname.startsWith('/admin')) return null;

  return <Footer />;
}