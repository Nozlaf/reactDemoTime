import React, { useEffect, useState } from 'react';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { evaluateFlagDetail } from '../utils/launchdarkly/evaluation';
import { LDObserve } from '@launchdarkly/observability';
import { LDRecord } from '@launchdarkly/session-replay';
import '../styles/DiagnosticOverlay.css';

// Helper function to safely get session info
export const getSessionInfo = () => {
  const sessionInfo = (window as any).__ld_session_info;
  if (!sessionInfo) {
    console.log('LaunchDarkly session info not yet initialized. Try again in a moment.');
    return null;
  }

  return {
    isRecording: sessionInfo.getRecordingState?.() === 'Recording',
    sessionURL: sessionInfo.getCurrentSessionURL?.() || null,
    sessionInfo
  };
};

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
  const [pluginStatus, setPluginStatus] = useState({
    observability: {
      enabled: false,
      state: 'Not Started'
    },
    recording: {
      enabled: false,
      state: 'Not Recording'
    }
  });

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

  useEffect(() => {
    // Update plugin status
    const updatePluginStatus = () => {
      const recordingState = LDRecord?.getRecordingState() || 'NotRecording';
      const observeStarted = (LDObserve as any)?._sdk?._started ?? false;
      
      setPluginStatus({
        observability: {
          enabled: flags['enable-observability'] ?? false,
          state: observeStarted ? 'Started' : 'Not Started'
        },
        recording: {
          enabled: flags['enable-session-replay'] ?? false,
          state: recordingState === 'Recording' ? 'Recording' : 'Not Recording'
        }
      });
    };

    updatePluginStatus();
    // Update status every second
    const interval = setInterval(updatePluginStatus, 1000);
    return () => clearInterval(interval);
  }, [flags]);

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
          <h3>Plugin Status</h3>
          <div className="info-grid">
            <div>Observability</div>
            <div>
              {pluginStatus.observability.state === 'Started' ? (
                <span className="plugin-active">✅ {pluginStatus.observability.state}</span>
              ) : (
                <span className="plugin-inactive">❌ {pluginStatus.observability.state}</span>
              )}
            </div>
    
            <div>Session Recording</div>
            <div>
              {pluginStatus.recording.state === 'Recording' ? (
                <span className="plugin-active">✅ {pluginStatus.recording.state}</span>
              ) : (
                <span className="plugin-inactive">❌ {pluginStatus.recording.state}</span>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3>Session Recording</h3>
          <div className="info-grid">
            <div>Status</div>
            <div>
              {pluginStatus.recording.state === 'Recording' ? (
                <span className="recording-active">🔴 Recording</span>
              ) : (
                <span className="recording-inactive">⚫ Not Recording</span>
              )}
            </div>
            <div>Privacy Setting</div>
            <div>{(LDObserve as any)?._sdk?.options?.privacySetting || 'unknown'}</div>
            {LDRecord?.getSession() && (
              <>
                <div>Session URL</div>
                <div>
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="session-link"
                  >
                    Current Session ↗
                  </a>
                </div>
              </>
            )}
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