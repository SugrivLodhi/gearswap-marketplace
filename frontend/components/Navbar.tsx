'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@apollo/client';
import { GET_MY_CART } from '@/graphql/queries';

export function Navbar() {
  const { user, logout, isAuthenticated, isBuyer, isSeller } = useAuth();
  const { data: cartData } = useQuery(GET_MY_CART, {
    skip: !isBuyer,
  });

  const cartItemCount = cartData?.myCart?.items?.length || 0;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg"></div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              GearSwap
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Products
            </Link>

            {isAuthenticated ? (
              <>
                {isBuyer && (
                  <>
                    <Link
                      href="/buyer/cart"
                      className="relative text-gray-700 hover:text-primary-600 transition-colors font-medium"
                    >
                      Cart
                      {cartItemCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {cartItemCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/buyer/orders"
                      className="text-gray-700 hover:text-primary-600 transition-colors font-medium"
                    >
                      Orders
                    </Link>
                  </>
                )}

                {isSeller && (
                  <>
                    <Link
                      href="/seller/dashboard"
                      className="text-gray-700 hover:text-primary-600 transition-colors font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/seller/products"
                      className="text-gray-700 hover:text-primary-600 transition-colors font-medium"
                    >
                      My Products
                    </Link>
                    <Link
                      href="/seller/orders"
                      className="text-gray-700 hover:text-primary-600 transition-colors font-medium"
                    >
                      Orders
                    </Link>
                    <Link
                      href="/seller/discounts"
                      className="text-gray-700 hover:text-primary-600 transition-colors font-medium"
                    >
                      Discounts
                    </Link>
                  </>
                )}

                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{user?.email}</span>
                  <button
                    onClick={logout}
                    className="btn-secondary text-sm"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="btn-secondary text-sm">
                  Login
                </Link>
                <Link href="/register" className="btn-primary text-sm">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
