'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_DISCOUNT, GET_MY_DISCOUNTS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function CreateDiscountPage() {
  const router = useRouter();
  const [createDiscount, { loading }] = useMutation(CREATE_DISCOUNT, {
    refetchQueries: [GET_MY_DISCOUNTS],
  });

  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '',
    minimumCartValue: '',
    maxUses: '',
    expiryDate: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDiscount({
        variables: {
          input: {
            code: formData.code.toUpperCase(),
            type: formData.type,
            value: parseFloat(formData.value),
            minimumCartValue: formData.minimumCartValue ? parseFloat(formData.minimumCartValue) : null,
            maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
            expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
          }
        }
      });
      router.push('/seller/discounts');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Discount</h1>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Code</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g. SUMMER2026"
                className="input uppercase"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Customers will enter this code at checkout.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Amount ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  placeholder={formData.type === 'PERCENTAGE' ? '20' : '10.00'}
                  className="input"
                  min="0"
                  step={formData.type === 'PERCENTAGE' ? '1' : '0.01'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order Value (Optional)</label>
                <input
                  type="number"
                  name="minimumCartValue"
                  value={formData.minimumCartValue}
                  onChange={handleChange}
                  placeholder="50.00"
                  className="input"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limit (Optional)</label>
                <input
                  type="number"
                  name="maxUses"
                  value={formData.maxUses}
                  onChange={handleChange}
                  placeholder="100"
                  className="input"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (Optional)</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="pt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Discount'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
