import React, { useEffect, useState } from 'react';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { evaluateFlagDetail } from '../utils/launchdarkly/evaluation';
import { LDObserve } from '@launchdarkly/observability';
import { LDRecord } from '@launchdarkly/session-replay';
import { usePreferences } from '../hooks/usePreferences';
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

interface SessionInfo {
  sessionId: string;
  environment: string;
  startTime: number;
  lastPushTime: number;
  eventCount: number;
  bytesSinceSnapshot: number;
  userId: string;
  sdkVersion: string;
  appVersion: string;
}

interface PluginStatus {
  observability: {
    enabled: boolean;
    state: string;
    serverEnabled?: boolean;
  };
  recording: {
    enabled: boolean;
    state: string;
    sessionInfo: SessionInfo | null;
    serverEnabled?: boolean;
    serverPrivacySetting?: string;
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
  const { preferences, loading: preferencesLoading } = usePreferences();
  const [flagDetails, setFlagDetails] = useState<FlagDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>({
    observability: {
      enabled: false,
      state: 'Not Started'
    },
    recording: {
      enabled: false,
      state: 'Not Recording',
      sessionInfo: null
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
      const recordSdk = (LDRecord as any)?._sdk;
      
      setPluginStatus({
        observability: {
          enabled: flags['enable-observability'] ?? false,
          state: observeStarted ? 'Started' : 'Not Started',
          serverEnabled: preferences?.observability.enabled
        },
        recording: {
          enabled: flags['enable-session-replay'] ?? false,
          state: recordingState === 'Recording' ? 'Recording' : 'Not Recording',
          sessionInfo: recordSdk ? {
            sessionId: recordSdk.sessionData?.sessionSecureID,
            environment: recordSdk.environment,
            startTime: recordSdk.sessionData?.sessionStartTime,
            lastPushTime: recordSdk.sessionData?.lastPushTime,
            eventCount: recordSdk.events?.length,
            bytesSinceSnapshot: recordSdk._eventBytesSinceSnapshot,
            userId: recordSdk.sessionData?.userIdentifier,
            sdkVersion: recordSdk.sessionData?.userObject?.['telemetry.sdk.version'],
            appVersion: recordSdk.sessionData?.userObject?.['launchdarkly.application.version']
          } : null,
          serverEnabled: preferences?.observability.sessionRecording.enabled,
          serverPrivacySetting: preferences?.observability.sessionRecording.privacySetting
        }
      });
    };

    updatePluginStatus();
    // Update status every second
    const interval = setInterval(updatePluginStatus, 1000);
    return () => clearInterval(interval);
  }, [flags, preferences]);

  const handleRecordingControl = async () => {
    if (!LDRecord) return;

    try {
      if (pluginStatus.recording.state === 'Recording') {
        await LDRecord.stop();
        console.log('Recording stopped');
      } else {
        await LDRecord.start();
        console.log('Recording started');
      }
    } catch (error) {
      console.error('Failed to control recording:', error);
    }
  };

  // Helper function to format timestamp
  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Helper function to format duration
  const formatDuration = (startTime: number) => {
    if (!startTime) return 'N/A';
    const duration = Date.now() - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

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
            <div>{pluginStatus.recording.sessionInfo?.environment || process.env.NODE_ENV}</div>
            <div>SDK Version</div>
            <div>{pluginStatus.recording.sessionInfo?.sdkVersion || 'unknown'}</div>
            <div>App Version</div>
            <div>{pluginStatus.recording.sessionInfo?.appVersion || 'unknown'}</div>
            <div>Client Initialized</div>
            <div>{client ? '✅' : '❌'}</div>
          </div>
        </section>

        <section>
          <h3>Session Information</h3>
          <div className="info-grid">
            <div>Session ID</div>
            <div className="monospace">{pluginStatus.recording.sessionInfo?.sessionId || 'N/A'}</div>
            <div>User ID</div>
            <div className="monospace">{pluginStatus.recording.sessionInfo?.userId || 'N/A'}</div>
            <div>Start Time</div>
            <div>{formatTime(pluginStatus.recording.sessionInfo?.startTime || 0)}</div>
            <div>Duration</div>
            <div>{formatDuration(pluginStatus.recording.sessionInfo?.startTime || 0)}</div>
            <div>Last Push</div>
            <div>{formatTime(pluginStatus.recording.sessionInfo?.lastPushTime || 0)}</div>
          </div>
        </section>

        <section>
          <h3>Recording Metrics</h3>
          <div className="info-grid">
            <div>Event Count</div>
            <div>{pluginStatus.recording.sessionInfo?.eventCount || 0}</div>
            <div>Bytes Since Snapshot</div>
            <div>{(pluginStatus.recording.sessionInfo?.bytesSinceSnapshot || 0).toLocaleString()} bytes</div>
          </div>
          <div className="control-buttons">
            <button
              onClick={handleRecordingControl}
              className={`control-button ${pluginStatus.recording.state === 'Recording' ? 'stop' : 'start'}`}
            >
              {pluginStatus.recording.state === 'Recording' ? '⏹️ Stop Recording' : '⏺️ Start Recording'}
            </button>
          </div>
        </section>

        <section>
          <h3>Plugin Status</h3>
          <div className="info-grid">
            <div>Observability (Client)</div>
            <div>
              {pluginStatus.observability.state === 'Started' ? (
                <span className="plugin-active">✅ {pluginStatus.observability.state}</span>
              ) : (
                <span className="plugin-inactive">❌ {pluginStatus.observability.state}</span>
              )}
            </div>

            <div>Observability (Server)</div>
            <div>
              {preferencesLoading ? (
                <span>Loading...</span>
              ) : pluginStatus.observability.serverEnabled ? (
                <span className="plugin-active">✅ Enabled</span>
              ) : (
                <span className="plugin-inactive">❌ Disabled</span>
              )}
            </div>
    
            <div>Session Recording (Client)</div>
            <div>
              {pluginStatus.recording.state === 'Recording' ? (
                <span className="plugin-active">✅ {pluginStatus.recording.state}</span>
              ) : (
                <span className="plugin-inactive">❌ {pluginStatus.recording.state}</span>
              )}
            </div>

            <div>Session Recording (Server)</div>
            <div>
              {preferencesLoading ? (
                <span>Loading...</span>
              ) : pluginStatus.recording.serverEnabled ? (
                <span className="plugin-active">✅ Enabled</span>
              ) : (
                <span className="plugin-inactive">❌ Disabled</span>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3>Session Recording Configuration</h3>
          <div className="info-grid">
            <div>Client Status</div>
            <div>
              {pluginStatus.recording.state === 'Recording' ? (
                <span className="recording-active">🔴 Recording</span>
              ) : (
                <span className="recording-inactive">⚫ Not Recording</span>
              )}
            </div>
            <div>Client Privacy Setting</div>
            <div>{(LDRecord as any)?._sdk?.privacySetting || (LDRecord as any)?._sdk?.options?.privacySetting || 'unknown'}</div>
            <div>Server Privacy Setting</div>
            <div>{preferencesLoading ? 'Loading...' : pluginStatus.recording.serverPrivacySetting || 'unknown'}</div>
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
            <table className="flag-table">
              <thead>
                <tr>
                  <th>Flag</th>
                  <th>Value</th>
                  <th>Variation</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {flagDetails.map((flag) => (
                  <tr key={flag.key}>
                    <td>{flag.key}</td>
                    <td>{JSON.stringify(flag.value)}</td>
                    <td>{flag.variationIndex}</td>
                    <td>{flag.reason.kind}{flag.reason.errorKind ? ` (${flag.reason.errorKind})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

export default DiagnosticOverlay;