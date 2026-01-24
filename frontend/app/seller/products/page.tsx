'use client';

import { useQuery } from '@apollo/client';
import { GET_PRODUCTS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

export default function SellerProductsPage() {
  const { user } = useAuth();

  // Note: ideally we would have a specific "myProducts" query or filter,
  // but for now we'll fetch products and filter by seller ID on client if needed,
  // or rely on the query to allow filtering by current user context effectively.
  // The current schema GET_PRODUCTS takes filters. Let's assume we can filter by sellerId.
  // Actually, let's just use the generic products query and filter client-side for this MVP
  // or pass the sellerId in the filter if the API supports it publically.
  // Based on schema `input ProductFilters { sellerId: ID ... }`, we can do that.
  
  const { data, loading, error } = useQuery(GET_PRODUCTS, {
    variables: {
      filters: {
        sellerId: user?.id
      },
      pagination: {
        limit: 50 // Fetch enough for the dashboard
      }
    },
    skip: !user?.id
  });

  const products = data?.products?.edges?.map((edge: any) => edge.node) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
          <Link href="/seller/products/new">
            <Button>+ Add New Product</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading products...</div>
        ) : error ? (
          <div className="text-red-600">Error loading products: {error.message}</div>
        ) : products.length === 0 ? (
          <Card className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No products yet</h2>
            <p className="text-gray-600 mb-6">Start selling by adding your first instrument!</p>
            <Link href="/seller/products/new">
              <Button>Add Product</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {products.map((product: any) => (
              <Card key={product.id} className="flex flex-col sm:flex-row p-6 items-center sm:items-start gap-6">
                <div className="relative w-full sm:w-32 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                   <Image 
                     src={product.imageUrl} 
                     alt={product.name}
                     fill
                     className="object-cover"
                   />
                </div>
                
                <div className="flex-grow text-center sm:text-left">
                  <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                  <div className="text-sm text-gray-500 mb-2">{product.category}</div>
                  <p className="text-gray-600 line-clamp-2 mb-4">{product.description}</p>
                  
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {product.variants.map((variant: any) => (
                      <span key={variant.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {variant.sku} - ${variant.price} ({variant.stock} in stock)
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[120px]">
                  <Link href={`/seller/products/edit/${product.id}`}>
                    <Button variant="secondary" className="w-full">Edit</Button>
                  </Link>
                  <Button variant="danger" className="w-full">Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
