import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { initializeLDClient, getLDClient, closeLDClient } from './config/launchdarkly';

// Load environment variables
dotenv.config();

// Create Winston logger
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Development proxy middleware
if (process.env.NODE_ENV === 'development') {
  logger.info('Setting up development proxy to React dev server');
  app.use(
    '/',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      ws: true, // Enable WebSocket proxy
      pathRewrite: {
        '^/api': '', // Remove /api prefix when forwarding to backend
      },
      router: {
        // Forward /api requests to the backend
        '/api': 'http://localhost:3001',
      },
    })
  );
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Example endpoint using LaunchDarkly
app.get('/api/features', async (req, res) => {
  try {
    const client = getLDClient();
    const user = {
      key: req.query.userId?.toString() || 'anonymous',
      custom: {
        groups: ['beta-testers']
      }
    };

    const allFlags = await client.allFlagsState(user);
    res.json(allFlags);
  } catch (error) {
    logger.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

// Example endpoint for user preferences with feature flag
app.get('/api/preferences', async (req, res) => {
  try {
    const client = getLDClient();
    const user = {
      key: req.query.userId?.toString() || 'anonymous'
    };

    const betaFeaturesEnabled = await client.variation('beta-features', user, false);
    const diagnosticsEnabled = await client.variation('enable-diagnostics', user, false);
    const theme = await client.variation('default-theme', user, 'light');

    res.json({
      theme,
      timezone: 'UTC',
      features: {
        betaFeaturesEnabled,
        diagnosticsEnabled
      }
    });
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Production static file serving
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build', 'index.html'));
  });
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

// Initialize LaunchDarkly before starting the server
initializeLDClient()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info('LaunchDarkly client initialized successfully');
      if (process.env.NODE_ENV === 'development') {
        logger.info('Development proxy enabled - forwarding frontend requests to React dev server');
      }
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize LaunchDarkly:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down...');
  await closeLDClient();
  process.exit(0);
});