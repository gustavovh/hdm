import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { versionChecker } from './services/versionChecker';
import { supabase } from './lib/supabase';
import { getAuthTokens, normalizeHash } from './lib/authUtils';

// Process URL hash for auth callbacks immediately
// Handles malformed URLs like //#access_token=... or #/access_token=...
const processAuthHash = async () => {
  const tokens = getAuthTokens();

  console.log('🔐 Processing auth hash on app load:', {
    type: tokens.type,
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    fullHash: window.location.hash,
    normalizedHash: normalizeHash(window.location.hash)
  });

  if (tokens.access_token && tokens.type === 'recovery') {
    console.log('✅ Recovery token detected - attempting to set session');
    
    try {
      // For Supabase v2, we can try to set the session manually if auto-processing fails
      if (tokens.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        if (error) {
          console.error('❌ Error setting session:', error);
          // Fall back to refreshSession
          await supabase.auth.refreshSession();
        } else {
          console.log('✅ Session set successfully');
        }
      } else {
        // If no refresh token, try refreshSession
        await supabase.auth.refreshSession();
        console.log('✅ Session refreshed');
      }
    } catch (err) {
      console.error('❌ Error processing recovery token:', err);
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
