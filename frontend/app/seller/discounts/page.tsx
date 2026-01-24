'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_DISCOUNTS, CREATE_DISCOUNT, UPDATE_DISCOUNT } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

export default function SellerDiscountsPage() {
  const { data, loading, refetch } = useQuery(GET_MY_DISCOUNTS);

  const [updateDiscount, { loading: updating }] = useMutation(UPDATE_DISCOUNT, {
    onCompleted: () => {
      toast.success('Discount updated successfully');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmMessage, setConfirmMessage] = useState('');

  const handleDeactivate = (id: string, currentStatus: boolean) => {
    if (!currentStatus) return;
    
    setConfirmMessage('Are you sure you want to deactivate this discount?');
    setConfirmAction(() => () => updateDiscount({
      variables: {
        id,
        input: { isActive: false }
      }
    }));
    setShowConfirm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Discounts</h1>
          <Link href="/seller/discounts/new">
            <Button>+ Create Discount</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading discounts...</div>
        ) : !data?.myDiscounts || data.myDiscounts.length === 0 ? (
          <Card className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No active discounts</h2>
            <p className="text-gray-600 mb-6">Create promotional codes to boost your sales!</p>
            <Link href="/seller/discounts/new">
              <Button>Create Discount</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.myDiscounts.map((discount: any) => (
              <Card key={discount.id} className="p-6 relative overflow-hidden">
                <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-lg
                  ${discount.isActive ? 'bg-green-500' : 'bg-gray-400'}`}>
                  {discount.isActive ? 'ACTIVE' : 'INACTIVE'}
                </div>

                <div className="mb-4">
                  <h3 className="text-2xl font-mono font-bold text-primary-600 tracking-wider">
                    {discount.code}
                  </h3>
                  <p className="text-sm text-gray-500">Created {new Date(parseInt(discount.createdAt)).toLocaleDateString()}</p>
                </div>

                  <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Value:</span>
                    <span className="font-semibold">
                      {discount.type === 'PERCENTAGE' ? `${discount.value}% OFF` : `${formatPrice(discount.value)} OFF`}
                    </span>
                  </div>
                  
                  {discount.minimumCartValue && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Min. Order:</span>
                      <span className="font-medium">{formatPrice(discount.minimumCartValue)}</span>
                    </div>
                  )}

                  {discount.maxUses && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Usage:</span>
                      <span className="font-medium">{discount.currentUses} / {discount.maxUses}</span>
                    </div>
                  )}
                  
                  {discount.expiryDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium text-orange-600">
                        {new Date(discount.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link href={`/seller/discounts/${discount.id}`} className="w-full">
                    <Button variant="secondary" size="sm" className="w-full">Edit</Button>
                  </Link>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    className="w-full"
                    disabled={!discount.isActive || updating}
                    onClick={() => handleDeactivate(discount.id, discount.isActive)}
                  >
                    Deactivate
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
              <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
              <p className="text-gray-600 mb-6">{confirmMessage}</p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button 
                  variant="danger" 
                  onClick={() => {
                    confirmAction();
                    setShowConfirm(false);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
