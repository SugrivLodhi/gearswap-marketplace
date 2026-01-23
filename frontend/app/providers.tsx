'use client';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import { AuthProvider } from '@/lib/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>{children}</AuthProvider>
    </ApolloProvider>
  );
}
