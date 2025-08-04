import { init, LDClient } from '@launchdarkly/node-server-sdk';
import { Observability } from '@launchdarkly/observability-node';
import { execSync } from 'child_process';
import { createLogger, format, transports } from 'winston';

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

// Get the current git SHA for service version
const getGitSHA = (): string => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    console.error('Failed to get git SHA:', error);
    return 'unknown';
  }
};

let ldClient: LDClient | null = null;

// Helper function to log flag evaluations
const logFlagEvaluation = (flagKey: string, user: any, value: any) => {
  logger.info('LaunchDarkly Flag Evaluation:', {
    flag: flagKey,
    value,
    user: {
      key: user.key,
      custom: user.custom
    },
    timestamp: new Date().toISOString()
  });
};

// Wrapper for flag evaluation with logging
export const evaluateFlag = async <T>(flagKey: string, user: any, defaultValue: T): Promise<T> => {
  if (!ldClient) {
    logger.error('LaunchDarkly client not initialized when evaluating flag:', { flagKey });
    return defaultValue;
  }

  try {
    const value = await ldClient.variation(flagKey, user, defaultValue);
    logFlagEvaluation(flagKey, user, value);
    return value;
  } catch (error) {
    logger.error('Error evaluating LaunchDarkly flag:', { flagKey, error });
    return defaultValue;
  }
};

export const initializeLDClient = async (): Promise<LDClient> => {
  if (ldClient) {
    return ldClient;
  }

  const sdkKey = process.env.LD_SERVER_SDK_KEY;
  if (!sdkKey) {
    throw new Error('LaunchDarkly SDK key is not set');
  }

  logger.info('Initializing LaunchDarkly client...');

  ldClient = init(sdkKey, {
    logger: logger as any,
    logLevel: 'info',
    plugins: [
      new Observability({
        serviceName: 'reacttest-backend',
        serviceVersion: getGitSHA(),
        environment: process.env.NODE_ENV || 'development'
      }),
    ],
  });

  await ldClient.waitForInitialization();
  logger.info('LaunchDarkly client initialized successfully', {
    environment: process.env.NODE_ENV,
    serviceVersion: getGitSHA()
  });
  
  return ldClient;
};

export const getLDClient = (): LDClient => {
  if (!ldClient) {
    throw new Error('LaunchDarkly client not initialized');
  }
  return ldClient;
};

export const closeLDClient = async (): Promise<void> => {
  if (ldClient) {
    logger.info('Closing LaunchDarkly client...');
    await ldClient.flush();
    await ldClient.close();
    ldClient = null;
    logger.info('LaunchDarkly client closed successfully');
  }
};