'use client';

import { useCart } from '@/hooks/use-cart.tsx';
import type { Tour } from '@/types';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface AddToCartButtonProps {
  tour: Tour;
}

export function AddToCartButton({ tour }: AddToCartButtonProps) {
  const { addToCart, cartItems } = useCart();
  const isInCart = cartItems.some(item => item.tour.id === tour.id);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    addToCart(tour);
  };

  return (
    <Button 
      onClick={handleAddToCart} 
      disabled={!tour.availability || isInCart}
      aria-label={isInCart ? "Already in cart" : "Add to cart"}
      className="transition-all duration-200"
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      {isInCart ? 'In Cart' : 'Add to Cart'}
    </Button>
  );
}
