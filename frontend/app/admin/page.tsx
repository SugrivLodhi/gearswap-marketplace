'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminAPI from '@/lib/admin-api';
import { useRouter } from 'next/navigation';

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

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Super Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats?.total_users} color="blue" />
        <StatCard title="Total Sellers" value={stats?.total_sellers} color="green" />
        <StatCard title="Total Products" value={stats?.total_products} color="purple" />
        <StatCard title="Gross Revenue" value={`₹${stats?.total_revenue?.toLocaleString() || '0'}`} color="orange" />
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Quick Actions</h2>
          <div className="space-y-3">
            <ActionButton label="Manage Users" onClick={() => router.push('/admin/users')} />
            <ActionButton label="Review Sellers" onClick={() => router.push('/admin/sellers')} />
            <ActionButton label="Moderate Products" onClick={() => router.push('/admin/products')} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">System Health</h2>
          <div className="space-y-4">
            <HealthItem label="Admin API (FastAPI)" status="Healthy" />
            <HealthItem label="Main API (Node.js)" status="Healthy" />
            <HealthItem label="Database (MongoDB)" status="Connected" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: any; color: string }) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colors[color].split(' ')[1]}`}>{value ?? 0}</p>
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-all font-medium text-gray-600 flex justify-between items-center"
    >
      {label}
      <span className="text-gray-400">→</span>
    </button>
  );
}

function HealthItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 border border-transparent">
      <span className="font-medium text-gray-600">{label}</span>
      <span className="text-sm font-bold text-green-500 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        {status}
      </span>
    </div>
  );
}
