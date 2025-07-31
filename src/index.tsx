import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initializeLDProvider } from './config/launchdarkly/init';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Initialize LaunchDarkly and render app
const renderApp = async () => {
  try {
    const LDProvider = await initializeLDProvider();
    
    root.render(
      <React.StrictMode>
        <Suspense fallback={<div>Loading...</div>}>
          <LDProvider>
            <App />
          </LDProvider>
        </Suspense>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Render app without LaunchDarkly in case of initialization failure
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
};

// Start the app
renderApp();

reportWebVitals();
