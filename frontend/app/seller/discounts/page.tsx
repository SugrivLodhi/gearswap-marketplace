'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_DISCOUNTS, CREATE_DISCOUNT } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

export default function SellerDiscountsPage() {
  const { data, loading, refetch } = useQuery(GET_MY_DISCOUNTS);

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
                  <Button variant="secondary" size="sm" className="w-full">Edit</Button>
                  <Button variant="danger" size="sm" className="w-full">Deactivate</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
