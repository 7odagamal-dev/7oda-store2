import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import ScrollToTop from "@/components/ScrollToTop";
import { JsonLd } from "@/components/JsonLd";
import NewsletterPopup from "@/components/NewsletterPopup";
import PwaRegistry from "@/components/PwaRegistry";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://7h-store.life'),
  other: {
    'theme-color': '#8BA4B8',
  },
  title: {
    default: '7H  | Premium Luxury Fashion Store',
    template: '%s | 7H ',
  },
  description: 'Experience the pinnacle of luxury with 7H . Shop our exclusive collection of premium T-shirts, hoodies, and jackets designed for high-end fashion enthusiasts.',
  keywords: ['Luxury Fashion', '7H ', 'Premium Streetwear', 'Designer Clothing Egypt', 'Exclusive Apparel'],
  icons: {
    icon: '/icon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://7h-store.life',
    siteName: '7H ',
    title: '7H  | Premium Luxury Fashion Store',
    description: 'Discover exclusive luxury fashion and high-end designs. Elevate your style with 7H .',
    images: [{ url: '/opengraph-image.jpg', width: 1200, height: 630, alt: '7H  Luxury Brand' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '7H ',
    description: 'Exclusive luxury fashion and high-end streetwear.',
    images: ['/opengraph-image.jpg'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased safe-pad-x" suppressHydrationWarning>
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "ClothingStore",
          name: "7H ",
          url: "https://7h-store.life",
          logo: "https://7h-store.life/images/logo.jpeg",
          description: "Premium luxury fashion store in Egypt. Shop exclusive T-shirts, hoodies, and jackets.",
          address: { "@type": "PostalAddress", addressLocality: "Alexandria", addressCountry: "EG" },
          sameAs: [
            "https://www.instagram.com/7H.7hstore",
            "https://www.tiktok.com/@7H.7hstore",
          ],
        }} />
        <ThemeProvider>
        <AuthProvider>
        <WishlistProvider>
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ScrollToTop />
          <NewsletterPopup />
          <PwaRegistry />
          <PWAInstallPrompt />
        </CartProvider>
        </WishlistProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}