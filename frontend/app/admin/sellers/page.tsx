'use client';

import { useEffect, useState } from 'react';
import AdminAPI from '@/lib/admin-api';
import { toast } from 'sonner';
import { Store, Package, IndianRupee, ExternalLink } from 'lucide-react';

export default function SellersPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [sellerStats, setSellerStats] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.listSellers();
      setSellers(data);
      
      // Fetch stats for each seller
      data.forEach(async (seller: any) => {
        try {
          const stats = await AdminAPI.getSellerStats(seller._id);
          setSellerStats(prev => ({ ...prev, [seller._id]: stats }));
        } catch (err) {
          console.error(`Failed to fetch stats for seller ${seller._id}:`, err);
        }
      });
    } catch (err) {
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 animate-pulse">Loading sellers...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-8 h-8 text-blue-600" />
          Seller Management
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Review performance and manage your platform's vendors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sellers.map((seller) => {
          const stats = sellerStats[seller._id] || {};
          return (
            <div key={seller._id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
                    {seller.email[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 truncate w-40">{seller.email}</h3>
                    <p className="text-sm text-gray-400">ID: {seller._id.substring(0, 8)}</p>
                  </div>
                </div>
                <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold border border-green-100">
                  ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50/50 p-4 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1 text-xs font-bold font-mono">
                    <Package className="w-3.5 h-3.5" /> PRODUCTS
                  </div>
                  <div className="text-xl font-bold text-gray-900">{stats.total_products ?? '--'}</div>
                </div>
                <div className="bg-gray-50/50 p-4 rounded-xl text-center">
                   <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1 text-xs font-bold font-mono">
                    <IndianRupee className="w-3.5 h-3.5" /> REVENUE
                  </div>
                  <div className="text-xl font-bold text-gray-900">₹{stats.total_revenue?.toLocaleString() ?? '--'}</div>
                </div>
              </div>

              <button className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors group">
                Vendor Profile
                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          );
        })}

        {sellers.length === 0 && (
          <div className="col-span-full p-20 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            No sellers found.
          </div>
        )}
      </div>
    </div>
  );
}
