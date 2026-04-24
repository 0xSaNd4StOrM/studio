'use client';

import { useCart } from '@/hooks/use-cart';
import { useLanguage } from '@/hooks/use-language';
import type { Tour } from '@/types';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface AddToCartButtonProps {
  tour: Tour;
}

export function AddToCartButton({ tour }: AddToCartButtonProps) {
  const { addToCart, cartItems } = useCart();
  const { t } = useLanguage();
  const isInCart = cartItems.some(
    (item) => item.product.id === tour.id && item.productType === 'tour'
  );

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    addToCart(tour, 'tour');
  };

  return (
    <Button
      onClick={handleAddToCart}
      disabled={!tour.availability || isInCart}
      aria-label={isInCart ? t('cart.inCart') : t('cart.addToCart')}
      className="transition-all duration-200"
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      {isInCart ? t('cart.inCart') : t('cart.addToCart')}
    </Button>
  );
}
