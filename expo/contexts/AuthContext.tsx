import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { User, PortalType, getPortalForRole } from '@/types';
import { fetchUsers } from '@/services/api';

const AUTH_STORAGE_KEY = 'salescoach_auth_user';

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
      const users = await fetchUsers();
      const userList = Object.values(users);
      const found = userList.find(
        u => u.employeeId?.toLowerCase() === employeeId.toLowerCase() || u.id?.toLowerCase() === employeeId.toLowerCase()
      );
      if (!found) throw new Error('Employee ID not found');
      if (found.pin !== pin) throw new Error('Incorrect PIN');
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));
      console.log('[Auth] Login successful:', found.name, found.role);
      return found;
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
