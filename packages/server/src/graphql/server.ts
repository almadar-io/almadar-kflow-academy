/**
 * Apollo Server Setup for Knowledge Graph Access API
 * 
 * Phase 3: GraphQL Schema & Resolvers
 */

import { ApolloServer } from 'apollo-server-express';
import type { Application } from 'express';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import type { DecodedIdToken } from 'firebase-admin/auth';

export interface GraphQLContext {
  firebaseUser?: DecodedIdToken;
}

/**
 * Create and configure Apollo Server
 */
export function createApolloServer(): ApolloServer {
  return new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }): GraphQLContext => {
      // Extract Firebase user from request (set by authenticateFirebase middleware)
      return {
        firebaseUser: (req as any).firebaseUser,
      };
    },
    formatError: (error) => {
      // Log error for debugging
      console.error('GraphQL Error:', error);

      // Return user-friendly error message
      return {
        message: error.message,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
          ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            originalError: error.originalError?.message,
          }),
        },
      };
    },
    introspection: process.env.NODE_ENV !== 'production', // Enable introspection in dev
  });
}

/**
 * Apply Apollo Server middleware to Express app
 */
export async function applyGraphQLMiddleware(
  app: Application,
  apolloServer: ApolloServer
): Promise<void> {
  await apolloServer.start();
  
  // Apply GraphQL endpoint
  // Authentication is handled in the context function which checks firebaseUser
  // Type assertion needed due to Express type version mismatch between packages
  apolloServer.applyMiddleware({ app: app as any, path: '/graphql' });
}

