import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  initializeFirebase,
  getFirestore,
  logger,
  authenticateFirebase,
  errorHandler,
  notFoundHandler,
  observabilityRouter,
} from '@almadar/server';
import routes from './routes';
import { createApolloServer, applyGraphQLMiddleware } from './graphql/server';

const app: express.Application = express();

app.use(helmet());

const getAllowedOrigins = (): string[] => {
  const corsOrigins = process.env.CORS_ORIGINS;
  if (!corsOrigins) {
    logger.warn('CORS_ORIGINS not set, using default origins');
    return ['http://localhost:3000'];
  }
  return corsOrigins.split(',').map((o) => o.trim()).filter(Boolean);
};

app.use(cors({
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '1mb' }));

export async function initApp(): Promise<void> {
  initializeFirebase();
  getFirestore().settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });

  app.use('/api', routes);

  const apolloServer = createApolloServer();
  applyGraphQLMiddleware(app, apolloServer).catch((err) => {
    logger.error('Failed to start GraphQL server', { error: (err as Error).message });
  });

  app.use('/observability', authenticateFirebase, await observabilityRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
}

export default app;
