import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import ScrollToTop from "@/components/ScrollToTop";
import { JsonLd } from "@/components/JsonLd";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://oldgold.life'),
  other: {
    'theme-color': '#F8F9FB',
  },
  title: {
    default: 'OG Old Gold | Premium Luxury Fashion Store',
    template: '%s | OG Old Gold',
  },
  description: 'Experience the pinnacle of luxury with OG Old Gold. Shop our exclusive collection of premium T-shirts, hoodies, and jackets designed for high-end fashion enthusiasts.',
  keywords: ['Luxury Fashion', 'OG Old Gold', 'Premium Streetwear', 'Designer Clothing Egypt', 'Exclusive Apparel'],
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://oldgold.life',
    siteName: 'OG Old Gold',
    title: 'OG Old Gold | Premium Luxury Fashion Store',
    description: 'Discover exclusive luxury fashion and high-end designs. Elevate your style with OG Old Gold.',
    images: [{ url: '/opengraph-image.jpg', width: 1200, height: 630, alt: 'OG Old Gold Luxury Brand' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OG Old Gold',
    description: 'Exclusive luxury fashion and high-end streetwear.',
    images: ['/opengraph-image.jpg'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#F8F9FB] text-[#1A1A1A] font-sans antialiased" suppressHydrationWarning>
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "ClothingStore",
          name: "OG Old Gold",
          url: "https://oldgold.life",
          logo: "https://oldgold.life/images/logo.jpeg",
          description: "Premium luxury fashion store in Egypt. Shop exclusive T-shirts, hoodies, and jackets.",
          address: { "@type": "PostalAddress", addressLocality: "Alexandria", addressCountry: "EG" },
          sameAs: [
            "https://www.instagram.com/og.oldgold",
            "https://www.tiktok.com/@og.oldgold",
          ],
        }} />
        <WishlistProvider>
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ScrollToTop />
        </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}