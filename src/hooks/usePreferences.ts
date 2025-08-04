import { useState, useEffect, useCallback } from 'react';
import { getUserId } from '../config/launchdarkly/init';

interface Preferences {
  theme: string;
  timezone: string;
  features: {
    betaFeaturesEnabled: boolean;
    diagnosticsEnabled: boolean;
  };
  observability: {
    enabled: boolean;
    sessionRecording: {
      enabled: boolean;
      privacySetting: 'strict' | 'default' | 'none';
    };
  };
}

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    try {
      const userId = getUserId(); // Get the same user ID used by LaunchDarkly
      const response = await fetch(`/api/preferences?userId=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return { 
    preferences, 
    error, 
    loading,
    refetch: fetchPreferences // Expose refetch function
  };
};