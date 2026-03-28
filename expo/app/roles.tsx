import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { ShieldCheck, KeyRound, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { getInitials, getRoleLabel, getRoleBadgeColor } from '@/types';
import { useUsersArray } from '@/hooks/useData';
import { updateUser } from '@/services/api';

export default function RolesScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const allUsers = useUsersArray();

  const isCeoOrGm = ['ceo', 'gm'].includes(user?.role ?? '');

  const [search, setSearch] = useState('');
  const [resetUserId, setResetUserId] = useState('');
  const [newPin, setNewPin] = useState('');

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers
      .filter(u => u.name.toLowerCase().includes(q) || u.employeeId.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, search]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!resetUserId) throw new Error('Select a user');
      if (!newPin || newPin.length !== 4) throw new Error('Enter a valid 4-digit PIN');
      return updateUser(resetUserId, { pin: newPin });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'PIN has been reset');
      setResetUserId('');
      setNewPin('');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  if (!isCeoOrGm) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Roles & Permissions', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
        <View style={styles.restricted}>
          <ShieldCheck size={48} color={Colors.muted} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>Only CEO and GM can manage roles and reset PINs</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Roles & Permissions', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🔐 Roles & Permissions</Text>
        <Text style={styles.subtitle}>Reset PINs and manage staff access</Text>

        {resetUserId !== '' && (
          <View style={styles.resetCard}>
            <View style={styles.resetHeader}>
              <KeyRound size={20} color={Colors.orange} />
              <Text style={styles.resetTitle}>Reset PIN</Text>
            </View>
            <Text style={styles.resetFor}>
              For: {allUsers.find(u => u.id === resetUserId)?.name ?? ''}
            </Text>
            <Text style={styles.label}>NEW 4-DIGIT PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new PIN"
              placeholderTextColor={Colors.muted}
              value={newPin}
              onChangeText={t => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
            />
            <View style={styles.resetActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.muted }]} onPress={() => { setResetUserId(''); setNewPin(''); }}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.orange }]} onPress={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
                {resetMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Reset PIN</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.searchRow}>
          <Search size={16} color={Colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff..."
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.permCard}>
          <Text style={styles.permTitle}>Permission Matrix</Text>
          <View style={styles.permRow}>
            <Text style={styles.permRole}>CEO / GM</Text>
            <Text style={styles.permDesc}>Full access · Set all goals · Manage staff · Reset PINs</Text>
          </View>
          <View style={styles.permRow}>
            <Text style={styles.permRole}>Head of Sales</Text>
            <Text style={styles.permDesc}>Set team & individual goals · View all data</Text>
          </View>
          <View style={styles.permRow}>
            <Text style={styles.permRole}>Head Creative / HR</Text>
            <Text style={styles.permDesc}>View only · No goal setting</Text>
          </View>
          <View style={styles.permRow}>
            <Text style={styles.permRole}>Team Lead</Text>
            <Text style={styles.permDesc}>Set individual goals for own team · Approve logs</Text>
          </View>
          <View style={styles.permRow}>
            <Text style={styles.permRole}>Closer</Text>
            <Text style={styles.permDesc}>Submit logs · Upload calls · View own data</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>All Staff ({filteredUsers.length})</Text>
        {filteredUsers.map(u => (
          <View key={u.id} style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: getRoleBadgeColor(u.role) }]}>
              <Text style={styles.avatarText}>{getInitials(u.name)}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.name}</Text>
              <View style={styles.userMeta}>
                <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(u.role) + '30' }]}>
                  <Text style={[styles.roleText, { color: getRoleBadgeColor(u.role) }]}>{getRoleLabel(u.role)}</Text>
                </View>
                <Text style={styles.empId}>{u.employeeId}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setResetUserId(u.id);
                setNewPin('');
              }}
            >
              <KeyRound size={14} color={Colors.orange} />
              <Text style={styles.resetBtnText}>Reset PIN</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  restricted: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  restrictedTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  restrictedText: { fontSize: 13, color: Colors.muted, textAlign: 'center' as const },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 16 },
  resetCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.orange, marginBottom: 16 },
  resetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  resetTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.orange },
  resetFor: { fontSize: 13, color: Colors.soft, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: '700' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 12, letterSpacing: 8, textAlign: 'center' as const, fontWeight: '700' as const },
  resetActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: Colors.text, fontSize: 14 },
  permCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  permTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  permRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  permRole: { fontSize: 13, fontWeight: '700' as const, color: Colors.green },
  permDesc: { fontSize: 12, color: Colors.soft, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  roleText: { fontSize: 9, fontWeight: '700' as const },
  empId: { fontSize: 10, color: Colors.muted },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  resetBtnText: { fontSize: 11, fontWeight: '600' as const, color: Colors.orange },
});
