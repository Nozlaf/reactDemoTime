import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import type { LDContext } from 'launchdarkly-react-client-sdk';
import { createLDContext } from '../../utils/launchdarkly/evaluation';
import Observability from '@launchdarkly/observability'
import packageJson from '../../../package.json';

const APP_ID = 'launchtimely';
const APP_VERSION = packageJson.version;

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
    return await asyncWithLDProvider({
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
            networkRecording: {
              enabled: true,
              recordHeadersAndBody: true
            }
          } as any)
        ]
      }
    });
  } catch (error) {
    console.error('Failed to initialize LaunchDarkly:', error);
    throw error;
  }
}; 