'use client';

import { useQuery } from '@apollo/client';
import { GET_MY_ORDERS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { formatPrice } from '@/lib/utils';

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

              {/* Order Items with GST Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="pb-2">Product</th>
                      <th className="pb-2">HSN</th>
                      <th className="pb-2 text-right">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Tax Breakdown</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.items.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="py-2 text-sm">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.variantSku}</div>
                        </td>
                        <td className="py-2 text-xs text-gray-600 font-mono">{item.hsnCode}</td>
                        <td className="py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                        <td className="py-2 text-sm text-gray-900 text-right">{formatPrice(item.price)}</td>
                        <td className="py-2 text-xs text-right whitespace-pre-line text-gray-600">
                           {item.sgstAmount > 0 ? (
                             <>
                               <div>SGST ({item.sgstRate}%): {formatPrice(item.sgstAmount)}</div>
                               <div>CGST ({item.cgstRate}%): {formatPrice(item.cgstAmount)}</div>
                             </>
                           ) : (
                             <div>IGST ({item.igstRate || item.gstRate}%): {formatPrice(item.igstAmount || item.gstAmount)}</div>
                           )}
                        </td>
                        <td className="py-2 text-sm text-gray-900 text-right font-medium">{formatPrice(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Totals with GST Breakdown */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxable Subtotal:</span>
                  <span>{formatPrice(order.taxableSubtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount {order.discountCode && `(${order.discountCode})`}:</span>
                    <span>- {formatPrice(order.discount)}</span>
                  </div>
                )}
                
                {/* Detailed Tax Totals */}
                {order.totalSgst > 0 && (
                 <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total SGST:</span>
                    <span>{formatPrice(order.totalSgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total CGST:</span>
                    <span>{formatPrice(order.totalCgst)}</span>
                  </div>
                 </>
                )}
                
                {order.totalIgst > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total IGST:</span>
                    <span>{formatPrice(order.totalIgst)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-2 mt-2">
                  <span className="text-gray-600 font-medium">Total Tax (GST):</span>
                  <span className="text-green-600 font-medium">+ {formatPrice(order.totalGst)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-gray-300">
                  <span>Grand Total:</span>
                  <span className="text-primary-600">{formatPrice(order.grandTotal)}</span>
                </div>
              </div>

              {/* GST Info Badge */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-700">
                    Prices include GST. HSN codes and tax breakdown shown for your records.
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
