import { LDClient, LDContext, initialize } from 'launchdarkly-react-client-sdk';

// Environment-specific configuration
const getLDConfig = () => ({
  baseUrl: process.env.REACT_APP_LD_BASE_URL,
  streamUrl: process.env.REACT_APP_LD_STREAM_URL,
  eventsUrl: process.env.REACT_APP_LD_EVENTS_URL,
  timeout: 5, // 5 second timeout as per Rule 3
});

// Secure SDK key retrieval
const getSDKKey = (): string => {
  const sdkKey = process.env.REACT_APP_LD_CLIENT_SIDE_ID;
  if (!sdkKey) {
    throw new Error('LaunchDarkly SDK key not found');
  }
  return sdkKey;
};

// Singleton instance
let ldClient: LDClient | null = null;

// Initialize LaunchDarkly with timeout handling
export const initializeLaunchDarkly = async (context: LDContext): Promise<LDClient> => {
  if (ldClient) {
    return ldClient;
  }

  const config = getLDConfig();
  const sdkKey = getSDKKey();

  try {
    // Initialize with timeout as per Rule 3
    const initPromise = initialize(sdkKey, context, config);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('LaunchDarkly initialization timed out')), 5000);
    });

    ldClient = await Promise.race([initPromise, timeoutPromise]) as LDClient;
    return ldClient;
  } catch (error) {
    console.error('Failed to initialize LaunchDarkly:', error);
    throw error;
  }
};

// Clean shutdown handler
export const cleanupLaunchDarkly = async () => {
  if (ldClient) {
    await ldClient.flush();
    await ldClient.close();
    ldClient = null;
  }
};

// Window unload handler for cleanup
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    cleanupLaunchDarkly();
  });
} 