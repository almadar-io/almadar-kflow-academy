/**
 * Apollo Client Configuration for Knowledge Graph Access
 * 
 * Sets up Apollo Client with authentication headers
 */

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import type { ErrorResponse } from '@apollo/client/link/error';
import type { GraphQLRequest } from '@apollo/client/link/core';
import type { DefaultContext } from '@apollo/client/core';
import { auth } from '../../config/firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// HTTP Link
const httpLink = createHttpLink({
  uri: `${API_BASE_URL}/graphql`,
});

// Auth Link - adds Firebase token to requests
const authLink = setContext(async (_operation: GraphQLRequest, { headers }: DefaultContext) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : '',
        },
      };
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return { headers };
});

// Error Link - handles GraphQL errors
const errorLink = onError(({ graphQLErrors, networkError }: ErrorResponse) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
  }
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      NodeBasedKnowledgeGraph: {
        fields: {
          nodes: {
            // Merge nodes array when updating
            merge(existing: any[] = [], incoming: any) {
              return incoming;
            },
          },
          relationships: {
            // Merge relationships array when updating
            merge(existing: any[] = [], incoming: any) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

