'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Product } from '@/lib/supabase';
import { safeParseStorage, safeSetStorage } from '@/lib/storage';

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  image?: string;
}

interface StoredCartItem {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  size: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, size: string, quantity?: number) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; size: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string; size: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; size: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; items: CartItem[] };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.findIndex(
        item => item.product.id === action.product.id && item.size === action.size
      );
      if (existingIndex > -1) {
        return state.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + action.quantity }
            : item
        );
      }
      return [
        ...state,
        { product: action.product, quantity: action.quantity, size: action.size, image: action.product.main_image }
      ];
    }
    case 'REMOVE_ITEM':
      return state.filter(
        item => !(item.product.id === action.productId && item.size === action.size)
      );
    case 'UPDATE_QUANTITY': {
      const qty = Math.min(Math.max(1, action.quantity), 10);
      return state.map(item =>
        item.product.id === action.productId && item.size === action.size
          ? { ...item, quantity: qty }
          : item
      );
    }
    case 'CLEAR':
      return [];
    case 'LOAD':
      return action.items;
    default:
      return state;
  }
}

function toStoredItem(item: CartItem): StoredCartItem {
  return {
    productId: item.product.id,
    productName: item.product.name,
    productSlug: item.product.slug,
    productImage: item.product.main_image || '',
    size: item.size,
    quantity: item.quantity,
  };
}

function fromStoredItem(stored: StoredCartItem): CartItem {
  return {
    product: {
      id: stored.productId,
      name: stored.productName,
      slug: stored.productSlug,
      main_image: stored.productImage,
      price: 0,
    } as Product,
    size: stored.size,
    quantity: stored.quantity,
    image: stored.productImage,
  };
}

function loadCartFromStorage(): CartItem[] {
  const stored = safeParseStorage<StoredCartItem[]>('7h-cart', []);
  return Array.isArray(stored) ? stored.map(fromStoredItem) : [];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [hydrated, setHydrated] = useState(false);

  // Load cart from localStorage on client only (prevents SSR/CSR mismatch)
  useEffect(() => {
    const saved = loadCartFromStorage();
    if (saved.length > 0) {
      dispatch({ type: 'LOAD', items: saved });
    }
    setHydrated(true);
  }, []);

  // Only sync to localStorage after initial hydration completes
  // Store only minimal data — NEVER price/unitPrice
  useEffect(() => {
    if (hydrated) {
      const stored = items.map(toStoredItem);
      safeSetStorage('7h-cart', stored);
    }
  }, [items, hydrated]);

  const addItem = useCallback((product: Product, size: string, quantity: number = 1) => {
    dispatch({ type: 'ADD_ITEM', product, size, quantity });
  }, []);

  const removeItem = useCallback((productId: string, size: string) => {
    dispatch({ type: 'REMOVE_ITEM', productId, size });
  }, []);

  const updateQuantity = useCallback((productId: string, size: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', productId, size, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const subtotal = items.reduce((sum, item) => {
    return sum + ((item.product.price ?? 0) * item.quantity);
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const total = subtotal;

  return (
    <CartContext.Provider value={{ 
      items, 
      addItem, 
      removeItem, 
      updateQuantity, 
      clearCart, 
      subtotal,
      total,
      itemCount 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}