'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminAPI from '@/lib/admin-api';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Store, 
  Package, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function AdminDashboard() {
  const { isSuperAdmin, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !isSuperAdmin) {
      router.push('/');
      return;
    }

    const fetchStats = async () => {
      try {
        const data = await AdminAPI.getStats();
        setStats(data);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isSuperAdmin, isAuthenticated, router]);

  if (loading) return <div className="p-10 text-gray-400 animate-pulse font-medium">Gathering marketplace intelligence...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Marketplace Overview</h1>
        <p className="text-gray-500 mt-2 text-lg">Real-time performance metrics and system-wide monitoring.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          title="Total Users" 
          value={stats?.total_users} 
          icon={Users}
          color="blue" 
          description="+12% from last month"
        />
        <StatCard 
          title="Active Sellers" 
          value={stats?.total_sellers} 
          icon={Store}
          color="green" 
          description="+5% active today"
        />
        <StatCard 
          title="Live Products" 
          value={stats?.total_products} 
          icon={Package}
          color="purple" 
          description="Across 18 categories"
        />
        <StatCard 
          title="Gross Revenue" 
          value={`₹${stats?.total_revenue?.toLocaleString() || '0'}`} 
          icon={TrendingUp}
          color="orange" 
          description="Total platform sales"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Platform Management</h2>
            <Activity className="text-blue-500 w-6 h-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickLink 
              title="User Directory" 
              desc="Manage accounts and roles" 
              href="/admin/users" 
              icon={Users}
              color="blue"
            />
            <QuickLink 
              title="Vendor Hub" 
              desc="Review seller performance" 
              href="/admin/sellers" 
              icon={Store}
              color="green"
            />
            <QuickLink 
              title="Moderation" 
              desc="Control product quality" 
              href="/admin/products" 
              icon={Package}
              color="purple"
            />
          </div>
        </div>

        <div className="bg-gray-900 p-8 rounded-3xl text-white shadow-xl shadow-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-blue-400 w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">System Status</h2>
          </div>
          
          <div className="space-y-4">
            <StatusItem label="Admin API (FastAPI)" val="Operational" />
            <StatusItem label="Core API (Node.js)" val="Operational" />
            <StatusItem label="Search (Typesense)" val="Active" />
            <StatusItem label="Database (MongoDB)" val="Connected" />
          </div>

          <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/10 text-sm text-gray-400 leading-relaxed italic">
            "Every item deleted or user banned is a step towards a cleaner marketplace. Stay vigilant."
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, description }: { title: string; value: any; icon: any; color: string; description: string }) {
  const themes: any = {
    blue: 'bg-blue-600 shadow-blue-100',
    green: 'bg-green-600 shadow-green-100',
    purple: 'bg-purple-600 shadow-purple-100',
    orange: 'bg-orange-600 shadow-orange-100',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start hover:scale-[1.02] transition-transform duration-300">
      <div className={`w-12 h-12 rounded-2xl ${themes[color]} flex items-center justify-center text-white mb-4 shadow-lg`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black text-gray-900 mt-1">{value ?? 0}</p>
      <p className="text-xs text-gray-400 mt-2 font-medium">{description}</p>
    </div>
  );
}

function QuickLink({ title, desc, href, icon: Icon, color }: { title: string; desc: string; href: string; icon: any; color: string }) {
  const router = useRouter();
  const ringColors: any = {
    blue: 'hover:ring-blue-500/20 group-hover:text-blue-600',
    green: 'hover:ring-green-500/20 group-hover:text-green-600',
    purple: 'hover:ring-purple-500/20 group-hover:text-purple-600',
  };

  return (
    <button
      onClick={() => router.push(href)}
      className={`group p-5 bg-gray-50/50 rounded-2xl text-left border border-transparent hover:border-white hover:bg-white hover:shadow-xl transition-all duration-300 ring-0 ${ringColors[color].split(' ')[0]} hover:ring-8`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-6 h-6 text-gray-400 ${ringColors[color].split(' ')[1]} transition-colors`} />
        <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all" />
      </div>
      <h3 className="font-bold text-gray-900 group-hover:text-gray-900">{title}</h3>
      <p className="text-xs text-gray-400 mt-1 leading-tight group-hover:text-gray-500">{desc}</p>
    </button>
  );
}

function StatusItem({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        <span className="text-sm font-bold">{val}</span>
      </div>
    </div>
  );
}
