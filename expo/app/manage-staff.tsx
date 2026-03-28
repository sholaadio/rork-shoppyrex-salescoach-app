import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { ChevronDown, UserPlus, Pencil, Trash2, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { UserRole, getInitials, getRoleLabel, getRoleBadgeColor } from '@/types';
import { useUsersArray, useTeamsArray } from '@/hooks/useData';
import { bulkSaveUsers, updateUser, deleteUser } from '@/services/api';

const ROLES: { key: UserRole; label: string }[] = [
  { key: 'closer', label: 'Sales Closer' },
  { key: 'teamlead', label: 'Team Lead' },
  { key: 'ceo', label: 'CEO' },
  { key: 'gm', label: 'General Manager' },
  { key: 'head_sales', label: 'Head of Sales' },
  { key: 'head_creative', label: 'Head of Creative' },
  { key: 'hr', label: 'HR Manager' },
];

export default function ManageStaffScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const allUsers = useUsersArray();
  const allTeams = useTeamsArray();

  const canDelete = ['ceo', 'gm'].includes(user?.role ?? '');

  const [mode, setMode] = useState<'list' | 'add' | 'bulk' | 'edit'>('list');
  const [editingUserId, setEditingUserId] = useState('');

  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('closer');
  const [teamId, setTeamId] = useState('');
  const [showRoleDD, setShowRoleDD] = useState(false);
  const [showTeamDD, setShowTeamDD] = useState(false);

  const [bulkText, setBulkText] = useState('');

  const closersAndLeads = useMemo(() => {
    return allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers]);

  const getNextEmployeeId = (roleType: UserRole): string => {
    const prefix = roleType === 'closer' ? 'c' : roleType === 'teamlead' ? 'tl' : roleType === 'ceo' ? 'ceo' : roleType === 'gm' ? 'gm' : roleType === 'head_sales' ? 'hs' : roleType === 'head_creative' ? 'hc' : 'hr';
    const existing = allUsers.filter(u => u.employeeId?.startsWith(prefix));
    const nums = existing.map(u => {
      const numStr = u.employeeId.replace(prefix, '');
      return parseInt(numStr) || 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Enter staff name');
      if (!pin || pin.length !== 4) throw new Error('Enter a 4-digit PIN');
      if (!teamId && (role === 'closer' || role === 'teamlead')) throw new Error('Select a team');

      const empId = getNextEmployeeId(role);
      const newUser = {
        id: empId,
        employeeId: empId,
        name: name.trim(),
        pin,
        role,
        teamId: teamId || undefined,
      };
      return bulkSaveUsers([newUser]);
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Staff member added');
      setName(''); setPin(''); setRole('closer'); setTeamId('');
      setMode('list');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const lines = bulkText.trim().split('\n').filter(l => l.trim());
      if (lines.length === 0) throw new Error('Enter at least one staff member');
      if (lines.length > 40) throw new Error('Maximum 40 staff at once');

      const newUsers = lines.map((line, idx) => {
        const parts = line.split(',').map(s => s.trim());
        const staffName = parts[0];
        const staffPin = parts[1] || String(2000 + idx + 1);
        const staffRole = (parts[2] as UserRole) || 'closer';
        const staffTeam = parts[3] || 'team1';
        const empId = getNextEmployeeId(staffRole);

        return {
          id: `${empId}_${idx}`,
          employeeId: `${empId}_${idx}`,
          name: staffName,
          pin: staffPin,
          role: staffRole,
          teamId: staffTeam,
        };
      });

      return bulkSaveUsers(newUsers);
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Staff members added');
      setBulkText('');
      setMode('list');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Enter staff name');
      return updateUser(editingUserId, { name: name.trim() });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Staff updated');
      setMode('list');
      setEditingUserId('');
      setName('');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => Alert.alert('Error', 'Failed to remove staff'),
  });

  const handleRemove = (id: string, staffName: string) => {
    Alert.alert('Remove Staff', `Are you sure you want to remove ${staffName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(id) },
    ]);
  };

  const startEdit = (u: typeof allUsers[0]) => {
    setEditingUserId(u.id);
    setName(u.name);
    setMode('edit');
  };

  const selectedTeam = allTeams.find(t => t.id === teamId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manage Staff', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>👥 Manage Staff</Text>
        <Text style={styles.subtitle}>{allUsers.length} total staff members</Text>

        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modePill, mode === 'list' && styles.modePillActive]} onPress={() => setMode('list')}>
            <Text style={[styles.modePillText, mode === 'list' && { color: '#fff' }]}>Staff List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modePill, mode === 'add' && styles.modePillActive]} onPress={() => setMode('add')}>
            <Text style={[styles.modePillText, mode === 'add' && { color: '#fff' }]}>+ Add Single</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modePill, mode === 'bulk' && styles.modePillActive]} onPress={() => setMode('bulk')}>
            <Text style={[styles.modePillText, mode === 'bulk' && { color: '#fff' }]}>Bulk Add</Text>
          </TouchableOpacity>
        </View>

        {mode === 'list' && (
          <View>
            {closersAndLeads.map(u => {
              const team = allTeams.find(t => t.id === u.teamId);
              return (
                <View key={u.id} style={styles.staffCard}>
                  <View style={[styles.staffAvatar, { backgroundColor: getRoleBadgeColor(u.role) }]}>
                    <Text style={styles.staffAvatarText}>{getInitials(u.name)}</Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{u.name}</Text>
                    <Text style={styles.staffMeta}>{getRoleLabel(u.role)} · {team?.name ?? '—'} · {u.employeeId}</Text>
                  </View>
                  <View style={styles.staffActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => startEdit(u)}>
                      <Pencil size={16} color={Colors.blue} />
                    </TouchableOpacity>
                    {canDelete && (
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleRemove(u.id, u.name)}>
                        <Trash2 size={16} color={Colors.red} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {mode === 'add' && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <UserPlus size={20} color={Colors.green} />
              <Text style={styles.formTitle}>Add New Staff</Text>
            </View>

            <Text style={styles.label}>FULL NAME</Text>
            <TextInput style={styles.input} placeholder="e.g. Chukwuemeka Obi" placeholderTextColor={Colors.muted} value={name} onChangeText={setName} />

            <Text style={styles.label}>4-DIGIT PIN</Text>
            <TextInput style={styles.input} placeholder="e.g. 2001" placeholderTextColor={Colors.muted} value={pin} onChangeText={t => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} />

            <Text style={styles.label}>ROLE</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowRoleDD(!showRoleDD)}>
              <Text style={styles.ddText}>{ROLES.find(r => r.key === role)?.label}</Text>
              <ChevronDown size={16} color={Colors.muted} />
            </TouchableOpacity>
            {showRoleDD && (
              <View style={styles.ddList}>
                {ROLES.map(r => (
                  <TouchableOpacity key={r.key} style={styles.ddItem} onPress={() => { setRole(r.key); setShowRoleDD(false); }}>
                    <Text style={styles.ddItemText}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(role === 'closer' || role === 'teamlead') && (
              <>
                <Text style={styles.label}>TEAM</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setShowTeamDD(!showTeamDD)}>
                  <Text style={styles.ddText}>{selectedTeam?.name || 'Select team...'}</Text>
                  <ChevronDown size={16} color={Colors.muted} />
                </TouchableOpacity>
                {showTeamDD && (
                  <View style={styles.ddList}>
                    {allTeams.map(t => (
                      <TouchableOpacity key={t.id} style={styles.ddItem} onPress={() => { setTeamId(t.id); setShowTeamDD(false); }}>
                        <Text style={styles.ddItemText}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={() => addMutation.mutate()} disabled={addMutation.isPending} activeOpacity={0.8}>
              {addMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Staff Member</Text>}
            </TouchableOpacity>
          </View>
        )}

        {mode === 'bulk' && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Users size={20} color={Colors.orange} />
              <Text style={styles.formTitle}>Bulk Add Staff</Text>
            </View>
            <Text style={styles.helpText}>
              Enter one staff per line in format:{'\n'}
              Name, PIN, Role, TeamID{'\n'}
              Example: John Doe, 2001, closer, team1
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 160, textAlignVertical: 'top' as const }]}
              placeholder="Adeola Johnson, 2010, closer, team1&#10;Blessing Nwosu, 2011, closer, team2"
              placeholderTextColor={Colors.muted}
              value={bulkText}
              onChangeText={setBulkText}
              multiline
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: Colors.orange }]} onPress={() => bulkMutation.mutate()} disabled={bulkMutation.isPending} activeOpacity={0.8}>
              {bulkMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add All Staff</Text>}
            </TouchableOpacity>
          </View>
        )}

        {mode === 'edit' && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Pencil size={20} color={Colors.blue} />
              <Text style={styles.formTitle}>Edit Staff Name</Text>
            </View>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: Colors.muted }]} onPress={() => { setMode('list'); setEditingUserId(''); setName(''); }}>
                <Text style={styles.submitText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1 }]} onPress={() => editMutation.mutate()} disabled={editMutation.isPending}>
                {editMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modePill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  modePillActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  modePillText: { fontSize: 13, fontWeight: '600' as const, color: Colors.soft },
  staffCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  staffAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  staffAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 12 },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  staffMeta: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  staffActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  formCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  formTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  label: { fontSize: 10, fontWeight: '700' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  ddText: { color: Colors.text, fontSize: 14 },
  ddList: { backgroundColor: Colors.cardHover, borderRadius: 8, marginBottom: 12 },
  ddItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ddItemText: { color: Colors.text, fontSize: 14 },
  submitBtn: { backgroundColor: Colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  helpText: { fontSize: 12, color: Colors.soft, lineHeight: 18, marginBottom: 12, backgroundColor: Colors.background, borderRadius: 8, padding: 12 },
  editActions: { flexDirection: 'row', gap: 10 },
});
