'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_WISHLIST } from '@/graphql/wishlist';
import { ADD_TO_CART } from '@/graphql/queries';
import { ProductCard } from '@/components/ProductCard';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function WishlistPage() {
  const { isBuyer } = useAuth();
  const { data, loading, error } = useQuery(GET_WISHLIST, {
    skip: !isBuyer,
    fetchPolicy: 'cache-and-network',
  });

  const [addToCart] = useMutation(ADD_TO_CART, {
    refetchQueries: ['GetMyCart'],
  });

  const handleAddToCart = async (productId: string, variantId: string) => {
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
      toast.success('Added to cart!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!isBuyer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4 text-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">Please login as a buyer to view your wishlist.</p>
          </div>
        </main>
      </div>
    );
  }

  const wishlist = data?.wishlist || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-gray-600 mt-2">
            Items you've saved for later.
          </p>
        </header>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Error loading wishlist: {error.message}
          </div>
        )}

        {!loading && wishlist.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">❤️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Start saving items you love!</p>
            <a href="/" className="btn-primary">
              Browse Products
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((product: any) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
