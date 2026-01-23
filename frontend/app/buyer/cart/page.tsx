'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_CART, REMOVE_FROM_CART, UPDATE_CART_ITEM, APPLY_DISCOUNT, REMOVE_DISCOUNT, CHECKOUT } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState('');

  const { data, loading, refetch } = useQuery(GET_MY_CART);
  const [removeFromCart] = useMutation(REMOVE_FROM_CART);
  const [updateCartItem] = useMutation(UPDATE_CART_ITEM);
  const [applyDiscount] = useMutation(APPLY_DISCOUNT);
  const [removeDiscount] = useMutation(REMOVE_DISCOUNT);
  const [checkout, { loading: checkoutLoading }] = useMutation(CHECKOUT);

  const cart = data?.myCart;

  const handleQuantityChange = async (productId: string, variantId: string, newQuantity: number) => {
    try {
      await updateCartItem({
        variables: {
          input: { productId, variantId, quantity: newQuantity },
        },
      });
      refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemove = async (productId: string, variantId: string) => {
    try {
      await removeFromCart({
        variables: { productId, variantId },
      });
      refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApplyDiscount = async () => {
    setDiscountError('');
    try {
      await applyDiscount({
        variables: { code: discountCode },
      });
      refetch();
      setDiscountCode('');
    } catch (err: any) {
      setDiscountError(err.message);
    }
  };

  const handleRemoveDiscount = async () => {
    try {
      await removeDiscount();
      refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCheckout = async () => {
    try {
      await checkout();
      alert('Order placed successfully!');
      router.push('/buyer/orders');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading cart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {!cart || cart.items.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some musical instruments to get started!</p>
            <Button onClick={() => router.push('/')}>Browse Products</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item: any) => (
                <Card key={`${item.productId}-${item.variantId}`} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.productName}</h3>
                      <p className="text-sm text-gray-600">SKU: {item.variantSku}</p>
                      <p className="text-lg font-bold text-primary-600 mt-2">${item.price.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.variantId, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.variantId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.productId, item.variantId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">${item.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">${cart.subtotal.toFixed(2)}</span>
                  </div>

                  {cart.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-${cart.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold">Total:</span>
                      <span className="text-lg font-bold text-primary-600">${cart.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Discount Code */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Code
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="MUSIC20"
                      className="input flex-1"
                    />
                    <Button
                      onClick={handleApplyDiscount}
                      variant="secondary"
                      size="sm"
                    >
                      Apply
                    </Button>
                  </div>
                  {discountError && (
                    <p className="text-xs text-red-600 mt-1">{discountError}</p>
                  )}
                  {cart.discount > 0 && (
                    <button
                      onClick={handleRemoveDiscount}
                      className="text-xs text-primary-600 hover:text-primary-700 mt-2"
                    >
                      Remove discount
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full"
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Secure checkout powered by GearSwap
                </p>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
