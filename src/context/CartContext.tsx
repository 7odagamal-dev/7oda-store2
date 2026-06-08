'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Product } from '@/lib/supabase';
import { safeParseStorage, safeSetStorage } from '@/lib/storage';

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  image?: string;
  unitPrice?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, size: string, quantity?: number, unitPrice?: number) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; size: string; quantity: number; unitPrice?: number }
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
        { product: action.product, quantity: action.quantity, size: action.size, image: action.product.main_image, unitPrice: action.unitPrice }
      ];
    }
    case 'REMOVE_ITEM':
      return state.filter(
        item => !(item.product.id === action.productId && item.size === action.size)
      );
    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return state.filter(
          item => !(item.product.id === action.productId && item.size === action.size)
        );
      }
      return state.map(item =>
        item.product.id === action.productId && item.size === action.size
          ? { ...item, quantity: action.quantity }
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

function loadCartFromStorage(): CartItem[] {
  const items = safeParseStorage<CartItem[]>('og-cart', []);
  return items.map((item: CartItem) => ({
    ...item,
    image: item.image || item.product?.main_image
  }));
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
  useEffect(() => {
    if (hydrated) {
      safeSetStorage('og-cart', items);
    }
  }, [items, hydrated]);

  const addItem = useCallback((product: Product, size: string, quantity: number = 1, unitPrice?: number) => {
    dispatch({ type: 'ADD_ITEM', product, size, quantity, unitPrice });
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
    const price = item.unitPrice ?? item.product.price ?? 0;
    return sum + (price * item.quantity);
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