'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_PRODUCT, UPDATE_PRODUCT, GET_PRODUCTS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    imageUrl: '',
  });

  const [variants, setVariants] = useState([
    {
      sku: '',
      price: '',
      stock: '',
      color: ''
    }
  ]);

  const { loading: fetching } = useQuery(GET_PRODUCT, {
    variables: { id },
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.product) {
        setFormData({
          name: data.product.name,
          description: data.product.description,
          category: data.product.category,
          imageUrl: data.product.imageUrl,
        });

        if (data.product.variants && data.product.variants.length > 0) {
          // Map existing variants to state
          // For MVP simple form, we might just take the first one or map all
          // But our form UI only really handles one nicely or a list in a simple way
          // Let's map all but focus on editing them.
          const mappedVariants = data.product.variants.map((v: any) => {
             const colorAttr = v.attributes.find((a: any) => a.key === 'color');
             return {
               sku: v.sku,
               price: v.price.toString(),
               stock: v.stock.toString(),
               color: colorAttr ? colorAttr.value : ''
             };
          });
          setVariants(mappedVariants);
        }
      }
    },
    onError: (err) => {
      toast.error('Failed to load product');
      router.push('/seller/products');
    }
  });

  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT, {
    refetchQueries: [GET_PRODUCTS],
  });

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
      await updateProduct({
        variables: {
          id,
          input: {
            ...formData,
            variants: variants.map(v => ({
              sku: v.sku,
              price: parseFloat(v.price),
              stock: parseInt(v.stock),
              attributes: v.color ? [{ key: 'color', value: v.color }] : []
            }))
          }
        }
      });
      toast.success('Product updated successfully!');
      router.push('/seller/products');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (fetching) return <div className="text-center py-20">Loading...</div>;

  // We'll use the first variant for the main form inputs as per the Create page design
  // but if there are multiple, we might want to allow editing them?
  // For now, let's just render the first one's inputs bound to variants[0] to match Create page behavior
  // properly. If we want to support multiple, we'd iterate.
  // The Create page logic I wrote supports state for array but UI only shows single set of inputs bound to currentVariant (variants[0]).
  // Use map to support multiple if present, or just first.
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Product</h1>

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
                    className="input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Inventory Info */}
            <div className="space-y-4 pt-4">
              <h2 className="text-xl font-semibold border-b pb-2">Inventory & Pricing</h2>

              {variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                    {variants.length > 1 && <h3 className="md:col-span-2 font-medium">Variant {index + 1}</h3>}
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                    <input
                        type="text"
                        name="sku"
                        value={variant.sku}
                        onChange={(e) => handleVariantChange(index, e)}
                        className="input"
                        required
                    />
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹)</label>
                    <input
                        type="number"
                        name="price"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(index, e)}
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
                        value={variant.stock}
                        onChange={(e) => handleVariantChange(index, e)}
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
                        value={variant.color}
                        onChange={(e) => handleVariantChange(index, e)}
                        className="input"
                    />
                    </div>
                </div>
              ))}
            </div>

            <div className="pt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
