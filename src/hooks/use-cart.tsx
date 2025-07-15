"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Tour, CartItem } from '@/types';
import { useToast } from "@/hooks/use-toast"

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (tour: Tour) => void;
  removeFromCart: (tourId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('wanderlust-hub-cart');
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Could not load cart from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('wanderlust-hub-cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Could not save cart to localStorage", error);
    }
  }, [cartItems]);

  const addToCart = (tour: Tour) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.tour.id === tour.id);
      if (existingItem) {
        toast({ title: "Already in Cart", description: `${tour.name} is already in your cart.` });
        return prevItems;
      }
      toast({ title: "Added to Cart", description: `${tour.name} has been added to your cart.` });
      return [...prevItems, { tour, quantity: 1 }];
    });
  };

  const removeFromCart = (tourId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.tour.id !== tourId));
    toast({ title: "Removed from Cart", description: "The tour has been removed from your cart." });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.tour.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, getCartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
