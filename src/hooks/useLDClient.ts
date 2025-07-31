import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { useCallback } from 'react';

export const useLDWithObservability = () => {
  const client = useLDClient();
  const flags = useFlags();

  // Add basic logging to flag evaluations
  const evaluateFlag = useCallback(async <T>(flagKey: string, defaultValue: T): Promise<T> => {
    try {
      if (!client) {
        // Only log once if client is not initialized
        if (process.env.NODE_ENV === 'development') {
          console.error('LaunchDarkly client not initialized');
        }
        return defaultValue;
      }

      // In development, log flag evaluation
      if (process.env.NODE_ENV === 'development') {
        console.info(`Evaluating flag: ${flagKey}`);
      }
      
      const result = await client.variation(flagKey, defaultValue);
      
      // In development, log successful evaluation
      if (process.env.NODE_ENV === 'development') {
        console.info(`Flag ${flagKey} evaluated:`, result);
      }

      return result;
    } catch (error) {
      // Always log errors, but with environment context
      console.error(`[${process.env.NODE_ENV}] Flag evaluation failed for ${flagKey}`, {
        error,
        flagKey,
        defaultValue
      });
      return defaultValue;
    }
  }, [client]);

  return {
    client,
    flags,
    evaluateFlag
  };
}; 