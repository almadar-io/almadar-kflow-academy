import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import { createApolloServer, applyGraphQLMiddleware } from './graphql/server';

const app: Application = express();

// Configure CORS with environment variables
const getAllowedOrigins = (): string[] => {
  const corsOrigins = process.env.CORS_ORIGINS;
  
  if (!corsOrigins) {
    // Fallback to default if not set
    console.warn('CORS_ORIGINS not set, using default origins');
    return ['http://localhost:3000'];
  }
  
  // Parse comma-separated origins and trim whitespace
  return corsOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Global middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// API routes
app.use('/api', routes);

// GraphQL Server (async setup)
const apolloServer = createApolloServer();
applyGraphQLMiddleware(app, apolloServer).catch((error) => {
  console.error('Failed to start GraphQL server:', error);
});

export default app;

