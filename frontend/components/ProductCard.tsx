'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { formatPrice } from '@/lib/utils';
import { useMutation } from '@apollo/client';
import { TOGGLE_WISHLIST } from '@/graphql/wishlist';
import { useAuth } from '@/lib/auth-context';

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={filled ? "text-red-500" : "text-gray-400"}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  variants: Array<{
    id: string;
    price: number;
    stock: number;
  }>;
  isWishlisted: boolean;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, variantId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const maxPrice = Math.max(...product.variants.map((v) => v.price));
  const inStock = product.variants.some((v) => v.stock > 0);

  const { isBuyer } = useAuth();
  const [toggleWishlist] = useMutation(TOGGLE_WISHLIST);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart && product.variants.length > 0) {
      onAddToCart(product.id, product.variants[0].id);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isBuyer) return;

    try {
      await toggleWishlist({
        variables: { productId: product.id },
        optimisticResponse: {
          toggleWishlist: {
            __typename: 'Product',
            id: product.id,
            isWishlisted: !product.isWishlisted,
          },
        },
      });
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    }
  };

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group cursor-pointer h-full flex flex-col">
        <div className="relative h-48 mb-4 overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {isBuyer && (
            <button
              onClick={handleToggleWishlist}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors z-10"
            >
              <HeartIcon filled={product.isWishlisted} />
            </button>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div>
            {minPrice === maxPrice ? (
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(minPrice)}
              </span>
            ) : (
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(minPrice)} - {formatPrice(maxPrice)}
              </span>
            )}
          </div>

          {inStock && onAddToCart && (
            <Button
              size="sm"
              onClick={handleQuickAdd}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Quick Add
            </Button>
          )}
        </div>
      </Card>
    </Link>
  );
}
