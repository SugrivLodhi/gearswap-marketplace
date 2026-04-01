'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_CART_RECOMMENDATIONS, ADD_TO_CART, GET_MY_CART } from '@/graphql/queries';
import { ProductCard } from '@/components/ProductCard';
import { toast } from 'sonner';

export function RecommendedProducts() {
  const { data, loading, error } = useQuery(GET_CART_RECOMMENDATIONS, {
    variables: { limit: 4 },
    fetchPolicy: 'cache-and-network',
  });
  
  const [addToCart] = useMutation(ADD_TO_CART, {
    refetchQueries: [{ query: GET_MY_CART }, { query: GET_CART_RECOMMENDATIONS }],
  });

  const handleAddToCart = async (productId: string, variantId: string) => {
    try {
      await addToCart({
        variables: {
          input: { productId, variantId, quantity: 1 },
        },
      });
      toast.success('Recommendation added to cart');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading || error || !data?.cartRecommendations?.length) {
    return null;
  }

  return (
    <div className="mt-16 border-t border-gray-200 pt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Inspired by your cart</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.cartRecommendations.map((product: any) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </div>
  );
}
