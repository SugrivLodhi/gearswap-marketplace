
"use client"
import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { REGISTER } from '@/graphql/queries';
import { useAuth, UserRole } from '@/lib/auth-context';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('BUYER');
  // const [error, setError] = useState(''); // Unused
  const { login } = useAuth();
  const router = useRouter();

  const [register, { loading }] = useMutation(REGISTER); // Renamed registerMutation to register

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // setError(''); // Removed as per instruction

    try {
      await register({ // Changed registerMutation to register
        variables: {
          input: { email, password, role },
        },
      });
      toast.success('Registration successful! Please login.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message); // Replaced setError with toast.error
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join GearSwap
          </h1>
          <p className="text-gray-600">Create your musical marketplace account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="musician@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole(UserRole.BUYER)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  role === UserRole.BUYER
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🎸</div>
                <div className="font-semibold">Buy Instruments</div>
                <div className="text-xs text-gray-600">Browse & purchase</div>
              </button>

              <button
                type="button"
                onClick={() => setRole(UserRole.SELLER)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  role === UserRole.SELLER
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🏪</div>
                <div className="font-semibold">Sell Instruments</div>
                <div className="text-xs text-gray-600">Manage store</div>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Login here
          </Link>
        </div>
      </Card>
    </div>
  );
}
