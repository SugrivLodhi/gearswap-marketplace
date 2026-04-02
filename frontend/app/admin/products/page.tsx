'use client';

import { useEffect, useState } from 'react';
import AdminAPI from '@/lib/admin-api';
import { toast } from 'sonner';
import { Package, Trash2, Search, Filter, Store, Tag } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.listProducts();
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this product? It will no longer be visible to buyers.')) return;
    
    try {
      await AdminAPI.deleteProduct(productId);
      toast.success('Product moderated successfully');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to moderate product');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-gray-500 animate-pulse font-medium">Scanning marketplace for products...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Product Moderation</h1>
          <p className="text-gray-500 mt-2 text-lg">Maintain marketplace quality by monitoring and removing inappropriate listings.</p>
        </div>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search products or categories..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-700 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Product Details</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Seller Account</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => (
                <tr key={product._id} className={`hover:bg-gray-50/50 transition-colors group ${product.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate max-w-[200px] mb-1 leading-tight">{product.name}</div>
                        <div className="text-xs text-gray-400 font-mono tracking-tighter">SKU: {product._id.substring(18)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100/50">
                      <Tag className="w-3 h-3" />
                      {product.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/80 px-3 py-1.5 rounded-full border border-gray-100 w-fit">
                      <Store className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Seller: {String(product.sellerId).substring(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${product.isDeleted ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                       <span className={`text-xs font-bold tracking-wide uppercase ${product.isDeleted ? 'text-red-500' : 'text-green-500'}`}>
                        {product.isDeleted ? 'Moderated' : 'Live'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {!product.isDeleted ? (
                      <button
                        onClick={() => handleModerate(product._id)}
                        className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-gray-300 italic">Action restricted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="py-32 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Filter className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No matching products</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your search terms or filters to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
