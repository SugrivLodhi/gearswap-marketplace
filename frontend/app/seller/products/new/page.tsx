'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_PRODUCT, GET_PRODUCTS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function CreateProductPage() {
  const router = useRouter();
  const [createProduct, { loading }] = useMutation(CREATE_PRODUCT, {
    refetchQueries: [GET_PRODUCTS], 
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Electric Guitars',
    imageUrl: '',
    hsnCode: '',
    gstRate: '18',
  });

  // For simplicity, we'll manage a single variant for now, but structured as an array
  // to easily extend to multiple variants later.
  const [variants, setVariants] = useState([
    {
      sku: '',
      price: '',
      stock: '',
      color: '' // Example attribute
    }
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVariantChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newVariants = [...variants];
    // @ts-ignore
    newVariants[index][name] = value;
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (variants.length === 0 || variants[0].sku === '' || variants[0].price === '' || variants[0].stock === '') {
      toast.error('Please fill in all required variant details.');
      return;
    }

    try {
      await createProduct({
        variables: {
          input: {
            ...formData,
            gstRate: parseFloat(formData.gstRate),
            variants: variants.map(v => ({
              sku: v.sku,
              price: parseFloat(v.price),
              stock: parseInt(v.stock),
              attributes: v.color ? [{ key: 'color', value: v.color }] : []
            }))
          }
        }
      });
      toast.success('Product created successfully!');
      router.push('/seller/products');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Assuming we are only showing one variant for creation based on the original code structure
  const currentVariant = variants[0];

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
                    <option value="Keyboards & Synthesizers">Keyboards & Synths</option>
                    <option value="Drums & Percussion">Drums & Percussion</option>
                    <option value="Wind Instruments">Wind Instruments</option>
                    <option value="Audio Equipment">Audio Equipment</option>
                    <option value="Amplifiers">Amplifiers</option>
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

            {/* GST Information */}
            <div className="space-y-4 pt-4">
              <h2 className="text-xl font-semibold border-b pb-2">GST Information</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Common HSN Codes for Musical Instruments</p>
                    <ul className="text-xs text-blue-700 space-y-0.5">
                      <li>• <strong>92071000</strong> - String instruments (Guitars, Bass, Violins) - 18% GST</li>
                      <li>• <strong>92079000</strong> - Keyboard instruments (Pianos, Keyboards) - 18% GST</li>
                      <li>• <strong>92069000</strong> - Percussion instruments (Drums, Cymbals) - 18% GST</li>
                      <li>• <strong>92051000</strong> - Brass wind instruments (Saxophones, Trumpets) - 18% GST</li>
                      <li>• <strong>92059000</strong> - Other wind instruments (Harmonicas) - 12% GST</li>
                      <li>• <strong>85181000</strong> - Microphones - 18% GST</li>
                      <li>• <strong>85182200</strong> - Audio amplifiers - 18% GST</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HSN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="hsnCode"
                    value={formData.hsnCode}
                    onChange={handleChange}
                    placeholder="e.g. 92071000"
                    className="input font-mono"
                    pattern="[0-9]{4,8}"
                    title="HSN code must be 4, 6, or 8 digits"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 4, 6, or 8 digit HSN code for tax classification</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gstRate"
                    value={formData.gstRate}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="0">0% - Exempt</option>
                    <option value="0.25">0.25%</option>
                    <option value="3">3%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% - Most Musical Instruments</option>
                    <option value="28">28%</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select applicable GST rate based on HSN code</p>
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
                    value={currentVariant.sku}
                    onChange={(e) => handleVariantChange(0, e)}
                    placeholder="STRAT-001"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={currentVariant.price}
                    onChange={(e) => handleVariantChange(0, e)}
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
                    value={currentVariant.stock}
                    onChange={(e) => handleVariantChange(0, e)}
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
                    value={currentVariant.color}
                    onChange={(e) => handleVariantChange(0, e)}
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
