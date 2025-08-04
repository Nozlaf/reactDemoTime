import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';

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

// Initialize LaunchDarkly client
const ldClient = LaunchDarkly.init(process.env.LD_SERVER_SDK_KEY || '');

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

app.get('/api/preferences', async (req, res) => {
  try {
    // Wait for LaunchDarkly client to initialize
    await ldClient.waitForInitialization();

    // Create a user context for LaunchDarkly
    const context = {
      kind: 'user',
      key: req.query.userId?.toString() || 'anonymous-user',
      anonymous: !req.query.userId
    };

    // Fetch feature flags
    const diagnosticsEnabled = await ldClient.variation('diagnostics-enabled', context, false);
    const betaFeaturesEnabled = await ldClient.variation('beta-features-enabled', context, false);

    res.json({
      theme: await ldClient.variation('default-theme', context, 'light'),
      timezone: 'UTC',
      features: {
        diagnosticsEnabled,
        betaFeaturesEnabled
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

// Initialize server only after LaunchDarkly client is ready
ldClient.waitForInitialization().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info('LaunchDarkly client initialized successfully');
    if (process.env.NODE_ENV === 'development') {
      logger.info('Development proxy enabled - forwarding frontend requests to React dev server');
    }
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  logger.error('Failed to initialize LaunchDarkly client:', error);
  process.exit(1);
});