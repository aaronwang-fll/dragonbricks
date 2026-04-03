import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError?: (message: string) => void;
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(typeof google !== 'undefined');

  // Poll for the Google script to finish loading
  useEffect(() => {
    if (scriptLoaded || !GOOGLE_CLIENT_ID) return;

    const interval = setInterval(() => {
      if (typeof google !== 'undefined') {
        setScriptLoaded(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [scriptLoaded]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current || !scriptLoaded) return;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const data = await api.googleAuth(response.credential);
          setUser(data.user);
          onSuccess();
        } catch (err) {
          onError?.(err instanceof Error ? err.message : 'Google sign-in failed');
        }
      },
    });

    google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 400,
    });
  }, [setUser, onSuccess, onError, scriptLoaded]);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={buttonRef} />;
}
