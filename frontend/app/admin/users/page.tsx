'use client';

import { useEffect, useState } from 'react';
import AdminAPI from '@/lib/admin-api';
import { toast } from 'sonner';
import { Trash2, User, Mail, Calendar, Shield } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.listUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      await AdminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  if (loading) return <div className="p-8 text-gray-500 animate-pulse">Loading users...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">View and manage all registered platform users.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold border border-blue-100 flex items-center gap-2">
          <User className="w-4 h-4" />
          {users.length} Total Users
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-80">User</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined On</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100/50 text-blue-600 flex items-center justify-center font-bold">
                      {user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-0.5">{user.email}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        ID: {user._id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    user.role === 'SUPER_ADMIN' 
                      ? 'bg-purple-50 text-purple-700 border-purple-100' 
                      : user.role === 'SELLER' 
                        ? 'bg-orange-50 text-orange-700 border-orange-100' 
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    <Shield className="w-3 h-3" />
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(user.createdAt).toLocaleDateString()}
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {user.role !== 'SUPER_ADMIN' && (
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <div className="p-20 text-center text-gray-400">
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
