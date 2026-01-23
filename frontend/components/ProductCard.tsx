'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

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
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, variantId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const maxPrice = Math.max(...product.variants.map((v) => v.price));
  const inStock = product.variants.some((v) => v.stock > 0);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart && product.variants.length > 0) {
      onAddToCart(product.id, product.variants[0].id);
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
                ${minPrice.toFixed(2)}
              </span>
            ) : (
              <span className="text-xl font-bold text-gray-900">
                ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
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
