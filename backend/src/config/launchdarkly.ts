import { init, LDClient } from '@launchdarkly/node-server-sdk';
import { Observability } from '@launchdarkly/observability-node';
import { execSync } from 'child_process';

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

export const initializeLDClient = async (): Promise<LDClient> => {
  if (ldClient) {
    return ldClient;
  }

  const sdkKey = process.env.LD_SERVER_SDK_KEY;
  if (!sdkKey) {
    throw new Error('LaunchDarkly SDK key is not set');
  }

  ldClient = init(sdkKey, {
    plugins: [
      new Observability({
        serviceName: 'reacttest-backend',
        serviceVersion: getGitSHA(),
        environment: process.env.NODE_ENV || 'development'
      }),
    ],
  });

  await ldClient.waitForInitialization();
  console.log('LaunchDarkly client initialized');
  
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
    await ldClient.flush();
    await ldClient.close();
    ldClient = null;
  }
}; 