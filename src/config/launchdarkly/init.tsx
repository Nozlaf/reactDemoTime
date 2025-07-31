import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import type { ProviderConfig, LDContext } from 'launchdarkly-react-client-sdk';
import { createLDContext } from '../../utils/launchdarkly/evaluation';

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
    appName: 'launchtimely',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    hourOfDay: getCurrentHour()
  });
};

// LaunchDarkly configuration
const ldConfig: ProviderConfig = {
  clientSideID: process.env.REACT_APP_LD_CLIENT_SIDE_ID || '',
  options: {
    bootstrap: 'localStorage' as const,
    application: {
      id: 'launchtimely',
      version: process.env.REACT_APP_VERSION || '1.0.0'
    }
  }
};

// Initialize LaunchDarkly provider with context
export const initializeLDProvider = async () => {
  try {
    const context = getContext();
    return await asyncWithLDProvider({ ...ldConfig, context });
  } catch (error) {
    console.error('Failed to initialize LaunchDarkly:', error);
    throw error;
  }
}; 