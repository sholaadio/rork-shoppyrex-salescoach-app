import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { ThemeColors, DarkColors, LightColors } from '@/constants/colors';

const THEME_STORAGE_KEY = 'salescoach_theme';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(stored => {
        if (stored === 'light') {
          setIsDark(false);
        }
      })
      .catch(e => console.log('[Theme] Load error:', e));
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      void AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      console.log('[Theme] Switched to:', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const colors: ThemeColors = useMemo(() => isDark ? DarkColors : LightColors, [isDark]);

  return useMemo(() => ({ isDark, toggleTheme, colors }), [isDark, toggleTheme, colors]);
});

export function useColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}
