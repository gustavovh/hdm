import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { versionChecker } from './services/versionChecker';
import { supabase } from './lib/supabase';

// Process URL hash for auth callbacks immediately
const processAuthHash = async () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const type = hashParams.get('type');

  console.log('🔐 Processing auth hash on app load:', {
    type,
    hasAccessToken: !!accessToken,
    fullHash: window.location.hash
  });

  if (accessToken && type === 'recovery') {
    console.log('✅ Recovery token detected - Supabase will auto-process');
    // Supabase will automatically handle this via onAuthStateChange
    // Just trigger a session refresh to ensure it's processed
    try {
      await supabase.auth.refreshSession();
      console.log('✅ Session refreshed');
    } catch (err) {
      console.error('❌ Error refreshing session:', err);
    }
  }
};

// Process auth hash before rendering
processAuthHash();

// Start version checker after app loads
versionChecker.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
