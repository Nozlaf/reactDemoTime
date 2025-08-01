import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import type { LDContext } from 'launchdarkly-react-client-sdk';
import { createLDContext } from '../../utils/launchdarkly/evaluation';
import Observability, { LDObserve } from '@launchdarkly/observability';
import SessionReplay, { LDRecord } from '@launchdarkly/session-replay';
import packageJson from '../../../package.json';

const APP_ID = 'launchtimely';
const APP_VERSION = packageJson.version;

type PrivacySettingType = 'strict' | 'default' | 'none';

// Environment-specific configuration
const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return {
    observability: {
      networkRecording: {
        enabled: true,
        recordHeadersAndBody: isDevelopment
      }
    },
    sessionReplay: {
      privacySetting: (isDevelopment ? 'none' : 'strict') as PrivacySettingType,
      disableSessionRecording: false
    }
  };
};

// Generate a stable user ID or get from storage
const getUserId = (): string => {
  const storageKey = 'ld_user_id';
  let userId = localStorage.getItem(storageKey);
  
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, userId);
  }
  
  return userId;
};

// Get current hour in 24-hour format (0-23)
const getCurrentHour = (): number => {
  return new Date().getHours();
};

// Create context with user info and app metadata
const getContext = (): LDContext => {
  const userId = getUserId();
  return createLDContext(userId, {
    appName: APP_ID,
    version: APP_VERSION,
    environment: process.env.NODE_ENV,
    hourOfDay: getCurrentHour()
  });
};

// Initialize LaunchDarkly provider with context
export const initializeLDProvider = async () => {
  try {
    const context = getContext();
    const envConfig = getEnvironmentConfig();
    
    console.log('LaunchDarkly Environment Config:', {
      environment: process.env.NODE_ENV,
      ...envConfig
    });

    const LDProvider = await asyncWithLDProvider({
      clientSideID: process.env.REACT_APP_LD_CLIENT_SIDE_ID || '',
      context,
      options: {
        bootstrap: 'localStorage' as const,
        application: {
          id: APP_ID,
          version: APP_VERSION
        },
        plugins: [
          new Observability({
            networkRecording: envConfig.observability.networkRecording
          } as any),
          new SessionReplay({
            ...envConfig.sessionReplay
          })
        ]
      }
    });

    // Get the client instance from the provider
    const client = (window as any).__ld_client;
    if (client) {
      // Check feature flags for observability and session recording
      const observabilityEnabled = await client.variation('enable-observability', false);
      const sessionReplayEnabled = await client.variation('enable-session-replay', false);

      console.log('LaunchDarkly Plugin Status:', {
        observabilityEnabled,
        sessionReplayEnabled
      });

      // Initialize plugins based on feature flags
      if (observabilityEnabled) {
        await LDObserve.start();
        console.log('LaunchDarkly Observability initialized');
      }

      if (sessionReplayEnabled) {
        await LDRecord.start();
        console.log('LaunchDarkly Session Recording initialized');
      }
    }

    return LDProvider;
  } catch (error) {
    console.error('Failed to initialize LaunchDarkly:', error);
    throw error;
  }
}; 