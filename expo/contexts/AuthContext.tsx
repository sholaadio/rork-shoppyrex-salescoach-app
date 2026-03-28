import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { User, PortalType, getPortalForRole } from '@/types';
import { supabase } from '@/services/supabase';

const AUTH_STORAGE_KEY = 'salescoach_auth_user';

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

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then(stored => {
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            console.log('[Auth] Failed to parse stored user');
          }
        }
      })
      .catch(e => console.log('[Auth] Load error:', e))
      .finally(() => setIsLoading(false));
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ employeeId, pin }: { employeeId: string; pin: string }) => {
      console.log('[Auth] Attempting login for:', employeeId);

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

      if (!data) {
        const { data: allUsers } = await supabase
          .from('sc_users')
          .select('*')
          .or(`id.ilike.%${employeeId.trim()}%`);

        const fallback = allUsers?.find(
          (u: any) => u.id?.toLowerCase() === employeeId.toLowerCase().trim()
        );

        if (!fallback) throw new Error('Employee ID not found');

        if (fallback.pin !== pin) throw new Error('Incorrect PIN');

        const foundUser: User = {
          id: fallback.id,
          employeeId: fallback.id,
          name: fallback.name,
          pin: fallback.pin,
          role: fallback.role,
          teamId: fallback.teamId ?? undefined,
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
        console.log('[Auth] Login successful (fallback):', foundUser.name, foundUser.role);
        return foundUser;
      }

      if (data.pin !== pin) throw new Error('Incorrect PIN');

      const foundUser: User = {
        id: data.id,
        employeeId: data.id,
        name: data.name,
        pin: data.pin,
        role: data.role,
        teamId: data.teamId ?? undefined,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
      console.log('[Auth] Login successful:', foundUser.name, foundUser.role);
      return foundUser;
    },
    onSuccess: (foundUser) => {
      setUser(foundUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      console.log('[Auth] Logged out');
    },
    onSuccess: () => {
      setUser(null);
    },
  });

  const portal = useMemo((): PortalType | null => {
    return user ? getPortalForRole(user.role) : null;
  }, [user]);

  const handleSetUser = useCallback((u: User | null) => setUser(u), []);

  return useMemo(() => ({
    user,
    isLoading,
    portal,
    loginMutation,
    logoutMutation,
    setUser: handleSetUser,
  }), [user, isLoading, portal, loginMutation, logoutMutation, handleSetUser]);
});
