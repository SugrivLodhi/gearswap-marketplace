'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_PRODUCTS, DELETE_PRODUCT } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

export default function SellerProductsPage() {
  const { user } = useAuth();
  
  const { data, loading, error, refetch } = useQuery(GET_PRODUCTS, {
    variables: {
      filters: {
        sellerId: user?.id
      },
      pagination: {
        limit: 50
      }
    },
    skip: !user?.id
  });

  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_PRODUCT, {
    onCompleted: () => {
      toast.success('Product deleted successfully');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteProduct({ variables: { id: deleteId } });
      setDeleteId(null);
      setShowConfirm(false);
    }
  };

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
                        {variant.sku} - {formatPrice(variant.price)} ({variant.stock} in stock)
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[120px]">
                  <Link href={`/seller/products/edit/${product.id}`}>
                    <Button variant="secondary" className="w-full">Edit</Button>
                  </Link>
                  <Button 
                    variant="danger" 
                    className="w-full"
                    onClick={() => handleDelete(product.id)}
                    disabled={deleting}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold mb-2">Delete Product</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this product? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowConfirm(false); setDeleteId(null); }}>Cancel</Button>
                <Button 
                  variant="danger" 
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
