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
import { useColors } from '@/contexts/ThemeContext';
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
  const colors = useColors();
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
      const newUser = { id: empId, employeeId: empId, name: name.trim(), pin, role, teamId: teamId || undefined };
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
        return { id: `${empId}_${idx}`, employeeId: `${empId}_${idx}`, name: staffName, pin: staffPin, role: staffRole, teamId: staffTeam };
      });
      return bulkSaveUsers(newUsers);
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Staff members added');
      setBulkText(''); setMode('list');
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
      setMode('list'); setEditingUserId(''); setName('');
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
    setEditingUserId(u.id); setName(u.name); setMode('edit');
  };

  const selectedTeam = allTeams.find(t => t.id === teamId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Manage Staff', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>👥 Manage Staff</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{allUsers.length} total staff members</Text>

        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modePill, { backgroundColor: colors.card, borderColor: colors.border }, mode === 'list' && { backgroundColor: colors.green, borderColor: colors.green }]} onPress={() => setMode('list')}>
            <Text style={[styles.modePillText, { color: colors.soft }, mode === 'list' && { color: '#fff' }]}>Staff List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modePill, { backgroundColor: colors.card, borderColor: colors.border }, mode === 'add' && { backgroundColor: colors.green, borderColor: colors.green }]} onPress={() => setMode('add')}>
            <Text style={[styles.modePillText, { color: colors.soft }, mode === 'add' && { color: '#fff' }]}>+ Add Single</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modePill, { backgroundColor: colors.card, borderColor: colors.border }, mode === 'bulk' && { backgroundColor: colors.green, borderColor: colors.green }]} onPress={() => setMode('bulk')}>
            <Text style={[styles.modePillText, { color: colors.soft }, mode === 'bulk' && { color: '#fff' }]}>Bulk Add</Text>
          </TouchableOpacity>
        </View>

        {mode === 'list' && (
          <View>
            {closersAndLeads.map(u => {
              const team = allTeams.find(t => t.id === u.teamId);
              return (
                <View key={u.id} style={[styles.staffCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.staffAvatar, { backgroundColor: getRoleBadgeColor(u.role) }]}>
                    <Text style={styles.staffAvatarText}>{getInitials(u.name)}</Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={[styles.staffName, { color: colors.text }]}>{u.name}</Text>
                    <Text style={[styles.staffMeta, { color: colors.muted }]}>{getRoleLabel(u.role)} · {team?.name ?? '—'} · {u.employeeId}</Text>
                  </View>
                  <View style={styles.staffActions}>
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => startEdit(u)}>
                      <Pencil size={16} color={colors.blue} />
                    </TouchableOpacity>
                    {canDelete && (
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => handleRemove(u.id, u.name)}>
                        <Trash2 size={16} color={colors.red} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {mode === 'add' && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formHeader}>
              <UserPlus size={20} color={colors.green} />
              <Text style={[styles.formTitle, { color: colors.text }]}>Add New Staff</Text>
            </View>
            <Text style={[styles.label, { color: colors.muted }]}>FULL NAME</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="e.g. Chukwuemeka Obi" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
            <Text style={[styles.label, { color: colors.muted }]}>4-DIGIT PIN</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="e.g. 2001" placeholderTextColor={colors.muted} value={pin} onChangeText={t => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} />
            <Text style={[styles.label, { color: colors.muted }]}>ROLE</Text>
            <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowRoleDD(!showRoleDD)}>
              <Text style={[styles.ddText, { color: colors.text }]}>{ROLES.find(r => r.key === role)?.label}</Text>
              <ChevronDown size={16} color={colors.muted} />
            </TouchableOpacity>
            {showRoleDD && (
              <View style={[styles.ddList, { backgroundColor: colors.cardHover }]}>
                {ROLES.map(r => (
                  <TouchableOpacity key={r.key} style={[styles.ddItem, { borderBottomColor: colors.border }]} onPress={() => { setRole(r.key); setShowRoleDD(false); }}>
                    <Text style={[styles.ddItemText, { color: colors.text }]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {(role === 'closer' || role === 'teamlead') && (
              <>
                <Text style={[styles.label, { color: colors.muted }]}>TEAM</Text>
                <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowTeamDD(!showTeamDD)}>
                  <Text style={[styles.ddText, { color: colors.text }]}>{selectedTeam?.name || 'Select team...'}</Text>
                  <ChevronDown size={16} color={colors.muted} />
                </TouchableOpacity>
                {showTeamDD && (
                  <View style={[styles.ddList, { backgroundColor: colors.cardHover }]}>
                    {allTeams.map(t => (
                      <TouchableOpacity key={t.id} style={[styles.ddItem, { borderBottomColor: colors.border }]} onPress={() => { setTeamId(t.id); setShowTeamDD(false); }}>
                        <Text style={[styles.ddItemText, { color: colors.text }]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.green }]} onPress={() => addMutation.mutate()} disabled={addMutation.isPending} activeOpacity={0.8}>
              {addMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Staff Member</Text>}
            </TouchableOpacity>
          </View>
        )}

        {mode === 'bulk' && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formHeader}>
              <Users size={20} color={colors.orange} />
              <Text style={[styles.formTitle, { color: colors.text }]}>Bulk Add Staff</Text>
            </View>
            <Text style={[styles.helpText, { color: colors.soft, backgroundColor: colors.background }]}>
              Enter one staff per line in format:{'\n'}
              Name, PIN, Role, TeamID{'\n'}
              Example: John Doe, 2001, closer, team1
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, minHeight: 160, textAlignVertical: 'top' as const }]}
              placeholder="Adeola Johnson, 2010, closer, team1&#10;Blessing Nwosu, 2011, closer, team2"
              placeholderTextColor={colors.muted}
              value={bulkText}
              onChangeText={setBulkText}
              multiline
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.orange }]} onPress={() => bulkMutation.mutate()} disabled={bulkMutation.isPending} activeOpacity={0.8}>
              {bulkMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add All Staff</Text>}
            </TouchableOpacity>
          </View>
        )}

        {mode === 'edit' && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formHeader}>
              <Pencil size={20} color={colors.blue} />
              <Text style={[styles.formTitle, { color: colors.text }]}>Edit Staff Name</Text>
            </View>
            <Text style={[styles.label, { color: colors.muted }]}>FULL NAME</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={name} onChangeText={setName} />
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: colors.muted }]} onPress={() => { setMode('list'); setEditingUserId(''); setName(''); }}>
                <Text style={styles.submitText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: colors.green }]} onPress={() => editMutation.mutate()} disabled={editMutation.isPending}>
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
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const },
  subtitle: { fontSize: 13, marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modePill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  modePillText: { fontSize: 13, fontWeight: '600' as const },
  staffCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14,
    marginBottom: 6, borderWidth: 1, gap: 12,
  },
  staffAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  staffAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 12 },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 14, fontWeight: '700' as const },
  staffMeta: { fontSize: 11, marginTop: 2 },
  staffActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  formCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  formTitle: { fontSize: 16, fontWeight: '700' as const },
  label: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  input: { borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, marginBottom: 12 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  ddText: { fontSize: 14 },
  ddList: { borderRadius: 8, marginBottom: 12 },
  ddItem: { padding: 12, borderBottomWidth: 1 },
  ddItemText: { fontSize: 14 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  helpText: { fontSize: 12, lineHeight: 18, marginBottom: 12, borderRadius: 8, padding: 12 },
  editActions: { flexDirection: 'row', gap: 10 },
});
