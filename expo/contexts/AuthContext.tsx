import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { User, PortalType, getPortalForRole } from '@/types';
import { supabase } from '@/services/supabase';

const AUTH_STORAGE_KEY = 'salescoach_auth_user';
const LOGIN_TIME_KEY = 'salescoach_login_time';
const SAVED_PROFILE_KEY = 'salescoach_saved_profile';
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;

export interface SavedProfile {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  teamId?: string;
}

export function mapSupabaseIdToEmployeeId(supabaseId: string): string {
  if (supabaseId.startsWith('ceo')) return 'MGT001';
  if (supabaseId.startsWith('gm')) return 'MGT002';
  if (supabaseId === 'hos001') return 'MGT003';
  if (supabaseId === 'hoc001') return 'MGT004';
  if (supabaseId === 'hr001') return 'MGT005';
  if (supabaseId.startsWith('tl')) {
    const num = parseInt(supabaseId.replace('tl', ''), 10);
    if (!isNaN(num)) return `TL${String(num).padStart(3, '0')}`;
  }
  if (supabaseId.startsWith('c')) {
    const num = parseInt(supabaseId.replace('c', ''), 10);
    if (!isNaN(num)) return `SC${String(num).padStart(3, '0')}`;
  }
  return supabaseId.toUpperCase();
}

function mapEmployeeIdToSupabaseId(employeeId: string): string {
  const upper = employeeId.toUpperCase().trim();

  if (upper.startsWith('MGT')) {
    const num = upper.replace('MGT', '');
    const mapping: Record<string, string> = {
      '001': 'ceo001',
      '002': 'gm001',
      '003': 'hos001',
      '004': 'hoc001',
      '005': 'hr001',
    };
    return mapping[num] ?? employeeId.toLowerCase();
  }

  if (upper.startsWith('TL')) {
    const num = upper.replace('TL', '');
    const n = parseInt(num, 10);
    if (!isNaN(n)) return `tl${String(n).padStart(3, '0')}`;
  }

  if (upper.startsWith('SC')) {
    const num = upper.replace('SC', '');
    const n = parseInt(num, 10);
    if (!isNaN(n)) return `c${String(n).padStart(3, '0')}`;
  }

  return employeeId.toLowerCase().trim();
}

async function lookupUserByEmployeeId(employeeId: string): Promise<User> {
  const supabaseId = mapEmployeeIdToSupabaseId(employeeId);
  console.log('[Auth] Mapped to Supabase ID:', supabaseId);

  const { data, error } = await supabase
    .from('sc_users')
    .select('*')
    .eq('id', supabaseId)
    .maybeSingle();

  if (error) {
    console.log('[Auth] Supabase error:', error.message);
    throw new Error('Failed to connect to server');
  }

  if (data) {
    return {
      id: data.id,
      employeeId: data.id,
      name: data.name,
      pin: data.pin,
      role: data.role,
      teamId: data.teamId ?? undefined,
    };
  }

  const { data: allUsers } = await supabase
    .from('sc_users')
    .select('*')
    .or(`id.ilike.%${employeeId.trim()}%`);

  const fallback = allUsers?.find(
    (u: any) => u.id?.toLowerCase() === employeeId.toLowerCase().trim()
  );

  if (!fallback) throw new Error('Employee ID not found');

  return {
    id: fallback.id,
    employeeId: fallback.id,
    name: fallback.name,
    pin: fallback.pin,
    role: fallback.role,
    teamId: fallback.teamId ?? undefined,
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const loginTime = await AsyncStorage.getItem(LOGIN_TIME_KEY);
        const elapsed = loginTime ? Date.now() - parseInt(loginTime, 10) : SESSION_TIMEOUT_MS + 1;

        const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        const storedProfile = await AsyncStorage.getItem(SAVED_PROFILE_KEY);

        if (storedUser && elapsed < SESSION_TIMEOUT_MS) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            console.log('[Auth] Restored active session for:', parsed.name);
          } catch {
            console.log('[Auth] Failed to parse stored user');
          }
        }

        if (storedProfile) {
          try {
            setSavedProfile(JSON.parse(storedProfile));
            console.log('[Auth] Found saved profile');
          } catch {
            console.log('[Auth] Failed to parse saved profile');
          }
        }
      } catch (e) {
        console.log('[Auth] Load error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    void loadSession();
  }, []);

  const lookupMutation = useMutation({
    mutationFn: async ({ employeeId }: { employeeId: string }) => {
      console.log('[Auth] Looking up employee:', employeeId);
      const foundUser = await lookupUserByEmployeeId(employeeId);
      console.log('[Auth] Found user:', foundUser.name);
      return foundUser;
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ employeeId, pin }: { employeeId: string; pin: string }) => {
      console.log('[Auth] Attempting login for:', employeeId);
      const foundUser = await lookupUserByEmployeeId(employeeId);

      if (foundUser.pin !== pin) throw new Error('Incorrect PIN');

      const profile: SavedProfile = {
        id: foundUser.id,
        employeeId: foundUser.employeeId,
        name: foundUser.name,
        role: foundUser.role,
        teamId: foundUser.teamId,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
      await AsyncStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
      await AsyncStorage.setItem(SAVED_PROFILE_KEY, JSON.stringify(profile));
      console.log('[Auth] Login successful:', foundUser.name, foundUser.role);
      return foundUser;
    },
    onSuccess: (foundUser) => {
      setUser(foundUser);
      setSavedProfile({
        id: foundUser.id,
        employeeId: foundUser.employeeId,
        name: foundUser.name,
        role: foundUser.role,
        teamId: foundUser.teamId,
      });
    },
  });

  const pinLoginMutation = useMutation({
    mutationFn: async ({ pin }: { pin: string }) => {
      if (!savedProfile) throw new Error('No saved profile');
      console.log('[Auth] PIN login for saved profile:', savedProfile.name);

      const foundUser = await lookupUserByEmployeeId(savedProfile.id);
      if (foundUser.pin !== pin) throw new Error('Incorrect PIN');

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
      await AsyncStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
      console.log('[Auth] PIN login successful:', foundUser.name);
      return foundUser;
    },
    onSuccess: (foundUser) => {
      setUser(foundUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(LOGIN_TIME_KEY);
      await AsyncStorage.removeItem(SAVED_PROFILE_KEY);
      console.log('[Auth] Logged out - cleared all session data');
    },
    onSuccess: () => {
      setUser(null);
      setSavedProfile(null);
    },
  });

  const forceLogout = useCallback(async () => {
    console.log('[Auth] Force logout - session expired');
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(LOGIN_TIME_KEY);
    setUser(null);
  }, []);

  const isSessionExpired = useCallback(async (): Promise<boolean> => {
    try {
      const loginTime = await AsyncStorage.getItem(LOGIN_TIME_KEY);
      if (!loginTime) return false;
      const elapsed = Date.now() - parseInt(loginTime, 10);
      return elapsed > SESSION_TIMEOUT_MS;
    } catch {
      return false;
    }
  }, []);

  const portal = useMemo((): PortalType | null => {
    return user ? getPortalForRole(user.role) : null;
  }, [user]);

  const handleSetUser = useCallback((u: User | null) => setUser(u), []);

  return useMemo(() => ({
    user,
    savedProfile,
    isLoading,
    portal,
    loginMutation,
    pinLoginMutation,
    lookupMutation,
    logoutMutation,
    setUser: handleSetUser,
    forceLogout,
    isSessionExpired,
  }), [user, savedProfile, isLoading, portal, loginMutation, pinLoginMutation, lookupMutation, logoutMutation, handleSetUser, forceLogout, isSessionExpired]);
});
