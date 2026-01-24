'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_SELLER_ORDERS, UPDATE_ORDER_STATUS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SellerOrdersPage() {
  const { data, loading, refetch } = useQuery(GET_SELLER_ORDERS);
  const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await updateStatus({
        variables: {
          orderId,
          status: newStatus
        }
      });
      await refetch();
      toast.success(`Order marked as ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING': return 'PAID';
      case 'PAID': return 'SHIPPED';
      case 'SHIPPED': return 'COMPLETED';
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-blue-100 text-blue-800';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Orders</h1>

        {loading ? (
          <div className="text-center py-12">Loading orders...</div>
        ) : !data?.sellerOrders || data.sellerOrders.length === 0 ? (
          <Card className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-gray-600">When buyers purchase your products, they will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {data.sellerOrders.map((order: any) => (
              <Card key={order.id} className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Placed on {new Date(parseInt(order.createdAt)).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {getNextStatus(order.status) && (
                      <Button 
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, getNextStatus(order.status)!)}
                        disabled={updatingId === order.id}
                      >
                        Mark as {getNextStatus(order.status)}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="pb-2">Product</th>
                        <th className="pb-2">SKU</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Price</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {order.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 text-sm text-gray-900">{item.productName}</td>
                          <td className="py-2 text-sm text-gray-500">{item.variantSku}</td>
                          <td className="py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                          <td className="py-2 text-sm text-gray-900 text-right">{formatPrice(item.price)}</td>
                          <td className="py-2 text-sm text-gray-900 text-right font-medium">{formatPrice(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td colSpan={4} className="pt-3 text-right text-sm font-medium text-gray-900">Total Revenue:</td>
                        <td className="pt-3 text-right text-lg font-bold text-primary-600">
                          {/* Calculate total just for this seller's items in the order */}
                          {formatPrice(order.items.reduce((sum: number, item: any) => sum + item.subtotal, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
