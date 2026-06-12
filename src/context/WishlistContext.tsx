'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { safeParseStorage, safeSetStorage } from '@/lib/storage';

interface WishlistContextType {
  wishlist: string[];
  toggleWishlist: (slug: string) => void;
  isWishlisted: (slug: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlist: [],
  toggleWishlist: () => {},
  isWishlisted: () => false,
  count: 0,
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = safeParseStorage<string[]>('7h_wishlist', []);
    if (saved.length > 0) setWishlist(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) safeSetStorage('7h_wishlist', wishlist);
  }, [wishlist, hydrated]);

  const toggleWishlist = useCallback((slug: string) => {
    setWishlist(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  }, []);

  const isWishlisted = useCallback((slug: string) => wishlist.includes(slug), [wishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted, count: wishlist.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
