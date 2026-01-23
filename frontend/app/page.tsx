'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_PRODUCTS, ADD_TO_CART } from '@/graphql/queries';
import { ProductCard } from '@/components/ProductCard';
import { Navbar } from '@/components/Navbar';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { isBuyer } = useAuth();

  const { data, loading, error, fetchMore } = useQuery(GET_PRODUCTS, {
    variables: {
      filters: {
        search: search || undefined,
        category: category || undefined,
      },
      pagination: {
        limit: 12,
      },
    },
  });

  const [addToCart] = useMutation(ADD_TO_CART, {
    refetchQueries: ['GetMyCart'],
  });

  const handleAddToCart = async (productId: string, variantId: string) => {
    if (!isBuyer) {
      alert('Please login as a buyer to add items to cart');
      return;
    }

    try {
      await addToCart({
        variables: {
          input: {
            productId,
            variantId,
            quantity: 1,
          },
        },
      });
      alert('Added to cart!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const products = data?.products?.edges?.map((edge: any) => edge.node) || [];
  const hasNextPage = data?.products?.pageInfo?.hasNextPage;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-12 mb-12 text-white">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to GearSwap Marketplace
          </h1>
          <p className="text-xl opacity-90">
            Discover amazing products from multiple vendors
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Home">Home & Garden</option>
              <option value="Sports">Sports & Outdoors</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Error loading products: {error.message}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No products found
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={isBuyer ? handleAddToCart : undefined}
            />
          ))}
        </div>

        {/* Load More */}
        {hasNextPage && (
          <div className="text-center mt-8">
            <button
              onClick={() =>
                fetchMore({
                  variables: {
                    pagination: {
                      cursor: data.products.pageInfo.endCursor,
                      limit: 12,
                    },
                  },
                })
              }
              className="btn-primary"
            >
              Load More
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
