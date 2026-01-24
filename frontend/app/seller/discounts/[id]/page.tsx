'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_DISCOUNT, UPDATE_DISCOUNT, GET_MY_DISCOUNTS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function EditDiscountPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data, loading: fetching } = useQuery(GET_DISCOUNT, {
    variables: { id },
    onCompleted: (data) => {
      if (data?.discount) {
        setFormData({
          code: data.discount.code,
          type: data.discount.type,
          value: data.discount.value.toString(),
          minimumCartValue: data.discount.minimumCartValue ? data.discount.minimumCartValue.toString() : '',
          maxUses: data.discount.maxUses ? data.discount.maxUses.toString() : '',
          // Format date for input type="date": YYYY-MM-DD
          expiryDate: data.discount.expiryDate ? new Date(parseInt(data.discount.expiryDate)).toISOString().split('T')[0] : '',
          isActive: data.discount.isActive
        });
      }
    },
    onError: (err) => {
      toast.error('Failed to load discount');
      router.push('/seller/discounts');
    }
  });

  const [updateDiscount, { loading: updating }] = useMutation(UPDATE_DISCOUNT, {
    refetchQueries: [GET_MY_DISCOUNTS],
  });

  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '',
    minimumCartValue: '',
    maxUses: '',
    expiryDate: '',
    isActive: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDiscount({
        variables: {
          id,
          input: {
            code: formData.code,
            type: formData.type,
            value: parseFloat(formData.value),
            minimumCartValue: formData.minimumCartValue ? parseFloat(formData.minimumCartValue) : undefined,
            expiryDate: formData.expiryDate || undefined,
            maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
            isActive: formData.isActive
          }
        }
      });
      toast.success('Discount updated successfully!');
      router.push('/seller/discounts');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (fetching) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Discount</h1>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount Code</label>
                    <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        className="input uppercase"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Active</label>
                    <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="h-6 w-6 text-primary-600 rounded"
                    />
                </div>
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
                  <option value="FLAT">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
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
              />
            </div>

            <div className="pt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? 'Updating...' : 'Update Discount'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
