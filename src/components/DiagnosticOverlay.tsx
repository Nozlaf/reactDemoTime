import React, { useEffect, useState } from 'react';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { evaluateFlagDetail } from '../utils/launchdarkly/evaluation';
import '../styles/DiagnosticOverlay.css';

interface FlagDetail {
  key: string;
  value: any;
  variationIndex: number;
  reason: {
    kind: string;
    errorKind?: string;
  };
}

// Add default values mapping with camelCase keys (for React SDK)
const DEFAULT_FLAG_VALUES: Record<string, any> = {
  configureTheme: 'dark',
  showTitle: true,
  showButton: true
};

// Map of camelCase to kebab-case flag keys (for direct client calls)
const FLAG_KEY_MAPPING: Record<string, string> = {
  configureTheme: 'configure-theme',
  showTitle: 'show-title',
  showButton: 'show-button'
};

const DiagnosticOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const flags = useFlags();
  const client = useLDClient();
  const [flagDetails, setFlagDetails] = useState<FlagDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFlagDetails = async () => {
      if (!client) return;

      // Use camelCase for React SDK and kebab-case for direct client calls
      const details = await Promise.all(
        Object.entries(DEFAULT_FLAG_VALUES).map(async ([camelKey, defaultValue]) => {
          const kebabKey = FLAG_KEY_MAPPING[camelKey];
          const detail = await evaluateFlagDetail(client, kebabKey, defaultValue);
          return {
            key: camelKey,
            value: flags[camelKey],
            variationIndex: detail.variationIndex,
            reason: detail.reason
          };
        })
      );

      setFlagDetails(details);
      setIsLoading(false);
    };

    loadFlagDetails();
  }, [flags, client]);

  if (!client) return null;

  return (
    <div className="diagnostic-overlay">
      <div className="diagnostic-content">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>LaunchDarkly Diagnostics</h2>
        
        <section>
          <h3>SDK Information</h3>
          <div className="info-grid">
            <div>Environment</div>
            <div>{process.env.NODE_ENV}</div>
            <div>Client Initialized</div>
            <div>{client ? '✅' : '❌'}</div>
          </div>
        </section>

        <section>
          <h3>Feature Flags</h3>
          {isLoading ? (
            <div>Loading flag details...</div>
          ) : (
            <div className="flag-list">
              {flagDetails.map((flag) => (
                <div key={flag.key} className="flag-item">
                  <h4>{flag.key}</h4>
                  <div className="info-grid">
                    <div>Value</div>
                    <div>{JSON.stringify(flag.value)}</div>
                    <div>Variation</div>
                    <div>{flag.variationIndex}</div>
                    <div>Reason</div>
                    <div>{flag.reason.kind}{flag.reason.errorKind ? ` (${flag.reason.errorKind})` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DiagnosticOverlay; 