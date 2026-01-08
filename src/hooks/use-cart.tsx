"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { Tour, CartItem, UpsellItem } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (
    product: Tour | UpsellItem,
    productType: "tour" | "upsell",
    adults?: number,
    children?: number,
    date?: Date,
    quantity?: number,
    packageId?: string,
    packageName?: string,
  ) => void;
  removeFromCart: (
    productId: string,
    productType: "tour" | "upsell",
    packageId?: string,
  ) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem("wanderlust-hub-cart");
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Could not load cart from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("wanderlust-hub-cart", JSON.stringify(cartItems));
    } catch (error) {
      console.error("Could not save cart to localStorage", error);
    }
  }, [cartItems]);

  const addToCart = useCallback(
    (
      product: Tour | UpsellItem,
      productType: "tour" | "upsell",
      adults?: number,
      children?: number,
      date?: Date,
      quantity?: number,
      packageId?: string,
      packageName?: string,
    ) => {
      let toastMessage: { title: string; description: string } | null = null;
      setCartItems((prevItems) => {
        const existingItem = prevItems.find(
          (item) =>
            item.product.id === product.id && 
            item.productType === productType &&
            // If packages are used, treat different packages as different items
            (item.packageId ?? "base") === (packageId ?? "base"),
        );
        if (existingItem) {
          toastMessage = {
            title: "Already in Cart",
            description: `${product.name} ${packageName ? `(${packageName})` : ""} is already in your cart.`,
          };
          return prevItems;
        }
        toastMessage = {
          title: "Added to Cart",
          description: `${product.name} ${packageName ? `(${packageName})` : ""} has been added to your cart.`,
        };
        return [
          ...prevItems,
          { product, productType, adults, children, date, quantity, packageId, packageName },
        ];
      });
      if (toastMessage) {
        toast(toastMessage);
      }
    },
    [toast],
  );

  const removeFromCart = useCallback(
    (productId: string, productType: "tour" | "upsell", packageId?: string) => {
      let productName: string | undefined;
      setCartItems((prevItems) => {
        const itemToRemove = prevItems.find(
          (item) =>
            item.product.id === productId && 
            item.productType === productType &&
            (item.packageId ?? "base") === (packageId ?? "base"),
        );
        if (itemToRemove) {
          productName = itemToRemove.product.name;
        }
        return prevItems.filter(
          (item) =>
            !(
              item.product.id === productId && 
              item.productType === productType &&
              (item.packageId ?? "base") === (packageId ?? "base")
            ),
        );
      });

      if (productName) {
        toast({
          title: "Removed from Cart",
          description: `"${productName}" has been removed from your cart.`,
        });
      }
    },
    [toast],
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      if (item.productType === "tour") {
        const tour = item.product as Tour;
        const totalPeople = (item.adults ?? 0) + (item.children ?? 0);
        
        // Find specific package if selected
        const selectedPackage = item.packageId && tour.packages 
          ? tour.packages.find(p => p.id === item.packageId)
          : null;
          
        // Use package tiers if available, otherwise fallback to tour tiers
        const tiers = selectedPackage ? selectedPackage.priceTiers : tour.priceTiers;

        if (!tiers || tiers.length === 0) return total;

        const priceTier =
          tiers.find(
            (tier) =>
              totalPeople >= tier.minPeople &&
              (tier.maxPeople === null || totalPeople <= tier.maxPeople),
          ) || tiers[tiers.length - 1];

        const itemTotal =
          (item.adults ?? 0) * priceTier.pricePerAdult +
          (item.children ?? 0) * priceTier.pricePerChild;
        return total + itemTotal;
      } else if (item.productType === "upsell") {
        const upsellItem = item.product as UpsellItem;
        const variant =
          item.packageId && upsellItem.variants
            ? upsellItem.variants.find((v) => v.id === item.packageId)
            : undefined;
        const price = variant?.price ?? upsellItem.price;
        return total + price * (item.quantity ?? 1);
      }
      return total;
    }, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, clearCart, getCartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
