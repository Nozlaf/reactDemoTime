import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
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

// Basic health check endpoint
app.get('/health', (req, res) => {
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

    res.json({
      theme: 'light',
      timezone: 'UTC',
      features: {
        betaFeaturesEnabled,
        diagnosticsEnabled
      }
    });
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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