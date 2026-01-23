'use client';

import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';

const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql',
});

const authLink = new ApolloLink((operation, forward) => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // Add authorization header if token exists
    operation.setContext({
        headers: {
            authorization: token ? `Bearer ${token}` : '',
        },
    });

    return forward(operation);
});

export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network',
        },
    },
});
