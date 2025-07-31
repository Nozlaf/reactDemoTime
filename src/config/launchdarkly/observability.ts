import { LDObserve } from '@launchdarkly/observability';

// Initialize observability options
export const getObservabilityOptions = () => ({
  // Enable error monitoring
  errors: {
    enabled: true,
    captureUnhandledErrors: true,
    captureUnhandledRejections: true,
  },
  
  // Enable logging
  logs: {
    enabled: true,
    level: 'info',
  },
  
  // Enable tracing
  traces: {
    enabled: true,
    sampleRate: 1.0,
  },
  
  // Disable session replay
  sessionReplay: {
    enabled: false,
  },

  // Add application attributes
  applicationAttributes: {
    app: 'LaunchTimely',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
  }
});

// Helper to get trace attributes
export const getTraceAttributes = () => ({
  app: 'LaunchTimely',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV,
}); 