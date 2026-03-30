import React, { useEffect, useRef, useCallback } from 'react';
import { AppState, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { user, forceLogout, isSessionExpired } = useAuth();
  const router = useRouter();
  const alertShownRef = useRef(false);

  const checkSession = useCallback(async () => {
    if (!user || alertShownRef.current) return;
    const expired = await isSessionExpired();
    if (expired) {
      alertShownRef.current = true;
      Alert.alert(
        'Session Expired',
        'Please sign in again',
        [
          {
            text: 'Sign In',
            onPress: async () => {
              alertShownRef.current = false;
              await forceLogout();
              router.replace('/login');
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [user, isSessionExpired, forceLogout, router]);

  useEffect(() => {
    if (!user) return;
    void checkSession();
  }, [user, checkSession]);

  useEffect(() => {
    if (!user) return;

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        console.log('[SessionGuard] App resumed, checking session...');
        void checkSession();
      }
    });

    const interval = setInterval(() => {
      void checkSession();
    }, 60000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [user, checkSession]);

  return <>{children}</>;
}
