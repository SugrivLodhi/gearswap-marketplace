'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_PRODUCT, ADD_TO_CART } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { formatPrice } from '@/lib/utils'; // Ensure specific import

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isBuyer, isAuthenticated } = useAuth();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_PRODUCT, {
    variables: { id: params.id },
  });

  const [addToCart, { loading: adding }] = useMutation(ADD_TO_CART, {
    refetchQueries: ['GetMyCart'],
  });

  const product = data?.product;

  // Set default variant on load
  useEffect(() => {
    if (product?.variants?.length > 0 && !selectedVariantId) {
      setSelectedVariantId(product.variants[0].id);
    }
  }, [product, selectedVariantId]);

  const selectedVariant = product?.variants.find((v: any) => v.id === selectedVariantId);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!isBuyer) {
      toast.error('Only buyers can add items to cart. Please register as a buyer.');
      return;
    }
    if (!selectedVariantId) return;

    try {
      await addToCart({
        variables: {
          input: {
            productId: product.id,
            variantId: selectedVariantId,
            quantity: 1,
          },
        },
      });
      toast.success('Added to cart!');
      router.push('/buyer/cart');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="text-center py-20">Loading product...</div>;
  if (error) return <div className="text-center py-20 text-red-600">Error loading product: {error.message}</div>;
  if (!product) return <div className="text-center py-20">Product not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 grid grid-cols-1 lg:grid-cols-2">
          
          {/* Image Section */}
          <div className="relative h-96 lg:h-[600px] bg-gray-100">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Details Section */}
          <div className="p-8 lg:p-12 flex flex-col">
            <div className="mb-auto">
              <div className="text-sm font-bold text-primary-600 uppercase tracking-wide mb-2">
                {product.category}
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {product.name}
              </h1>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                {product.description}
              </p>

              {/* Variant Selector */}
              {product.variants.length > 1 && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Options:</h3>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map((variant: any) => {
                      // Extract useful attributes for display (e.g. Color)
                      const colorAttr = variant.attributes.find((a: any) => a.key.toLowerCase() === 'color');
                      const finishAttr = variant.attributes.find((a: any) => a.key.toLowerCase() === 'finish');
                      const label = colorAttr?.value || finishAttr?.value || variant.sku;

                      return (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all
                            ${selectedVariantId === variant.id 
                              ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-100' 
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedVariant && (
                <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">SKU: {selectedVariant.sku}</p>
                      <h2 className="text-4xl font-bold text-gray-900">
                        {formatPrice(selectedVariant.price)}
                      </h2>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      selectedVariant.stock > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedVariant.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </div>
                  </div>

                  {/* Attributes Details */}
                  {selectedVariant.attributes.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-gray-200">
                      {selectedVariant.attributes.map((attr: any) => (
                        <div key={attr.key}>
                          <span className="text-gray-500 capitalize">{attr.key}: </span>
                          <span className="font-medium text-gray-900">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              size="lg"
              className="w-full text-lg py-4"
              onClick={handleAddToCart}
              disabled={adding || !selectedVariant || selectedVariant.stock === 0}
            >
              {adding ? 'Adding...' : selectedVariant?.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            
            {!isAuthenticated && (
              <p className="text-xs text-center text-gray-500 mt-4">
                Please login to purchase items
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
