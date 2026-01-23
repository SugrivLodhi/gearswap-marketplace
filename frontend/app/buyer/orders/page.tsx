'use client';

import { useQuery } from '@apollo/client';
import { GET_MY_ORDERS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';

export default function BuyerOrdersPage() {
  const { data, loading } = useQuery(GET_MY_ORDERS);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

        {loading && (
          <div className="text-center py-12">Loading orders...</div>
        )}

        {!loading && (!data?.myOrders || data.myOrders.length === 0) && (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600">Your order history will appear here</p>
          </Card>
        )}

        <div className="space-y-6">
          {data?.myOrders?.map((order: any) => (
            <Card key={order.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Order #{order.id.slice(-8)}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(parseInt(order.createdAt)).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`badge ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-gray-600"> × {item.quantity}</span>
                      <span className="text-gray-500 ml-2">({item.variantSku})</span>
                    </div>
                    <span className="font-semibold">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount {order.discountCode && `(${order.discountCode})`}:</span>
                    <span>-${order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span className="text-primary-600">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
