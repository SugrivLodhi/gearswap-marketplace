'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_PRODUCT, GET_PRODUCTS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function CreateProductPage() {
  const router = useRouter();
  const [createProduct, { loading }] = useMutation(CREATE_PRODUCT, {
    // We would assume we want to refetch the products list this seller views
    // But since the query there filters by sellerId via context/args,
    // just refetching GET_PRODUCTS might not be precise without args.
    // However, Apollo cache updates are best effort here.
    refetchQueries: [GET_PRODUCTS], 
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Electric Guitars',
    imageUrl: '',
    // Just support one variant for MVP creation to keep it simple
    sku: '',
    price: '',
    stock: '',
    color: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProduct({
        variables: {
          input: {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            imageUrl: formData.imageUrl,
            variants: [
              {
                sku: formData.sku,
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock),
                attributes: formData.color ? [{ key: 'color', value: formData.color }] : []
              }
            ]
          }
        }
      });
      router.push('/seller/products');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Product</h1>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Fender Stratocaster"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="Electric Guitars">Electric Guitars</option>
                    <option value="Acoustic Guitars">Acoustic Guitars</option>
                    <option value="Bass Guitars">Bass Guitars</option>
                    <option value="Keyboards">Keyboards & Synths</option>
                    <option value="Drums">Drums & Percussion</option>
                    <option value="Audio Equipment">Audio Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    className="input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Inventory Info - Simplified to 1 variant */}
            <div className="space-y-4 pt-4">
              <h2 className="text-xl font-semibold border-b pb-2">Inventory & Pricing</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="STRAT-001"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    className="input"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color (Attribute)</label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="Sunburst"
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
