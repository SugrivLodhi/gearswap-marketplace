'use client';

import { useQuery } from '@apollo/client';
import { GET_SELLER_STATS, GET_SELLER_ORDERS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';

export default function SellerDashboardPage() {
  const { user, isSeller, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isSeller) {
      router.push('/');
    }
  }, [isAuthenticated, isSeller, router]);

  const { data: statsData, loading: statsLoading } = useQuery(GET_SELLER_STATS);
  const { data: ordersData, loading: ordersLoading } = useQuery(GET_SELLER_ORDERS);

  if (!isSeller) return null;

  const stats = statsData?.sellerStats || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 };
  const recentOrders = ordersData?.sellerOrders?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <div className="space-x-4">
            <Link href="/seller/products/new">
              <Button>+ Add Product</Button>
            </Link>
            <Link href="/seller/discounts/new">
              <Button variant="secondary">+ Create Discount</Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <h3 className="text-lg font-medium opacity-90">Total Revenue</h3>
            <p className="text-4xl font-bold mt-2">
              {formatPrice(stats.totalRevenue)}
            </p>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <h3 className="text-lg font-medium opacity-90">Total Orders</h3>
            <p className="text-4xl font-bold mt-2">
              {stats.totalOrders}
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <h3 className="text-lg font-medium opacity-90">Pending Orders</h3>
            <p className="text-4xl font-bold mt-2">
              {stats.pendingOrders}
            </p>
          </Card>
        </div>

        {/* Recent Orders */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h2>
        <Card className="overflow-hidden">
          {ordersLoading ? (
            <div className="p-8 text-center text-gray-500">Loading orders...</div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        <Link href={`/seller/orders`}>
                          #{order.id.slice(-8)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(parseInt(order.createdAt)).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                            order.status === 'SHIPPED' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.items.length} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatPrice(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <Link href="/seller/orders" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              View all orders →
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
