import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { useGoals, useTeamMembers, useTeamName, useLogs } from '@/hooks/useData';
import { getCurrentMonth, getMonthLabel } from '@/utils/date';
import { submitGoal, deleteGoal } from '@/services/api';

const GOAL_TYPES = [
  { key: 'delivered', label: 'Orders Delivered' },
  { key: 'conversion', label: 'Conversion Rate' },
  { key: 'calls', label: 'Calls Analyzed' },
  { key: 'upsells', label: 'Upsells' },
  { key: 'earnings', label: 'Earnings' },
] as const;

export default function TeamLeadGoalsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const teamName = useTeamName(user?.teamId);
  const teamMembers = useTeamMembers(user?.teamId ?? '');
  const { data: allGoals, isLoading: goalsLoading, error: goalsError } = useGoals();
  const { data: allLogs } = useLogs();
  const month = getCurrentMonth();

  const [selectedMember, setSelectedMember] = useState('');
  const [goalType, setGoalType] = useState<string>('delivered');
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    console.log('[TL GoalsScreen] allGoals:', JSON.stringify(allGoals));
    console.log('[TL GoalsScreen] current month:', month);
  }, [allGoals, month]);

  const companyGoals = useMemo(() => {
    if (!allGoals) return [];
    const all = allGoals.filter(g => g.userId === 'company');
    const monthFiltered = all.filter(g => g.month === month);
    console.log('[TL GoalsScreen] company goals all:', all.length, 'month filtered:', monthFiltered.length);
    return monthFiltered.length > 0 ? monthFiltered : all;
  }, [allGoals, month]);

  const teamGoals = useMemo(() => {
    if (!allGoals || !user?.teamId) return [];
    const all = allGoals.filter(g => g.userId === `team:${user.teamId}`);
    const monthFiltered = all.filter(g => g.month === month);
    console.log('[TL GoalsScreen] team goals all:', all.length, 'month filtered:', monthFiltered.length);
    return monthFiltered.length > 0 ? monthFiltered : all;
  }, [allGoals, month, user?.teamId]);

  const memberGoals = useMemo(() => {
    if (!allGoals) return [];
    const memberIds = teamMembers.map(m => m.id);
    const all = allGoals.filter(g => memberIds.includes(g.userId));
    const monthFiltered = all.filter(g => g.month === month);
    console.log('[TL GoalsScreen] member goals all:', all.length, 'month filtered:', monthFiltered.length);
    return monthFiltered.length > 0 ? monthFiltered : all;
  }, [allGoals, month, teamMembers]);

  const getProgress = (goal: any): number => {
    if (!allLogs) return 0;
    const approvedLogs = allLogs.filter(l => l.status === 'approved' && l.date.startsWith(month));
    if (goal.userId === 'company') {
      if (goal.type === 'delivered') return approvedLogs.reduce((s: number, l: any) => s + l.delivered, 0);
      return 0;
    }
    if (goal.userId.startsWith('team:')) {
      const tid = goal.userId.replace('team:', '');
      const tLogs = approvedLogs.filter(l => l.teamId === tid);
      if (goal.type === 'delivered') return tLogs.reduce((s: number, l: any) => s + l.delivered, 0);
      return 0;
    }
    const uLogs = approvedLogs.filter(l => l.closerId === goal.userId);
    if (goal.type === 'delivered') return uLogs.reduce((s: number, l: any) => s + l.delivered, 0);
    if (goal.type === 'upsells') return uLogs.reduce((s: number, l: any) => s + l.upsells, 0);
    if (goal.type === 'earnings') return uLogs.reduce((s: number, l: any) => s + (l.commission?.total ?? 0), 0);
    return 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember) throw new Error('Select a team member');
      if (!target || parseInt(target) <= 0) throw new Error('Enter a valid target');
      if (!label.trim()) throw new Error('Enter a goal label');
      return submitGoal({
        month,
        type: goalType as any,
        target: parseInt(target),
        label: label.trim(),
        setBy: user?.id ?? '',
        userId: selectedMember,
        createdAt: Date.now(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Goal set successfully');
      setTarget(''); setLabel(''); setSelectedMember('');
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Goals</Text>
          <Text style={styles.subtitle}>{getMonthLabel(month)}</Text>

          {goalsLoading && (
            <View style={{ padding: 20, alignItems: 'center' as const }}>
              <ActivityIndicator color={Colors.orange} />
              <Text style={{ color: Colors.muted, marginTop: 8, fontSize: 13 }}>Loading goals...</Text>
            </View>
          )}

          {goalsError && (
            <View style={{ padding: 16, backgroundColor: '#FEE2E2', borderRadius: 10, marginBottom: 16 }}>
              <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600' as const }}>Error loading goals: {goalsError instanceof Error ? goalsError.message : 'Unknown error'}</Text>
            </View>
          )}

          {!goalsLoading && !goalsError && allGoals && allGoals.length === 0 && (
            <View style={{ padding: 16, backgroundColor: Colors.card, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ color: Colors.muted, fontSize: 13, textAlign: 'center' as const }}>No goals found in database</Text>
            </View>
          )}

          {!goalsLoading && allGoals && allGoals.length > 0 && companyGoals.length === 0 && teamGoals.length === 0 && memberGoals.length === 0 && (
            <View style={{ padding: 16, backgroundColor: Colors.card, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ color: Colors.muted, fontSize: 13, textAlign: 'center' as const }}>{allGoals.length} goals fetched but none matched filters. Check console logs.</Text>
            </View>
          )}

          {companyGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: Colors.orange }]}>🏢 Company Target</Text>
              {companyGoals.map(g => <GoalCard key={g.id} goal={g} progress={getProgress(g)} />)}
            </View>
          )}

          {teamGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: Colors.blue }]}>👥 Team Goals — {teamName}</Text>
              {teamGoals.map(g => <GoalCard key={g.id} goal={g} progress={getProgress(g)} onRemove={() => removeMutation.mutate(g.id)} />)}
            </View>
          )}

          {memberGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: Colors.purple }]}>👤 Individual Member Goals</Text>
              {memberGoals.map(g => {
                const member = teamMembers.find(m => m.id === g.userId);
                return (
                  <GoalCard key={g.id} goal={g} progress={getProgress(g)} memberName={member?.name} onRemove={() => removeMutation.mutate(g.id)} />
                );
              })}
            </View>
          )}

          <View style={styles.formCard}>
            <Text style={[styles.formTitle, { color: Colors.orange }]}>+ Set New Goal</Text>

            <Text style={styles.label}>SELECT STAFF MEMBER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {teamMembers.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberPill, selectedMember === m.id && styles.memberPillActive]}
                  onPress={() => setSelectedMember(m.id)}
                >
                  <Text style={[styles.memberPillText, selectedMember === m.id && { color: '#fff' }]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>GOAL TYPE</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
              <Text style={styles.dropdownText}>{GOAL_TYPES.find(t => t.key === goalType)?.label}</Text>
              <ChevronDown size={16} color={Colors.muted} />
            </TouchableOpacity>
            {showTypeDropdown && (
              <View style={styles.dropdownList}>
                {GOAL_TYPES.map(t => (
                  <TouchableOpacity key={t.key} style={styles.dropdownItem} onPress={() => { setGoalType(t.key); setShowTypeDropdown(false); }}>
                    <Text style={styles.dropdownItemText}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>TARGET NUMBER</Text>
                <TextInput style={styles.input} value={target} onChangeText={t => setTarget(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 50" placeholderTextColor={Colors.muted} />
              </View>
            </View>

            <Text style={styles.label}>GOAL LABEL</Text>
            <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Deliver 50 orders this month" placeholderTextColor={Colors.muted} />

            <TouchableOpacity style={styles.setBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.8}>
              {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.setBtnText}>🎯 Set Goal</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function GoalCard({ goal, progress, memberName, onRemove }: { goal: any; progress: number; memberName?: string; onRemove?: () => void }) {
  const pct = goal.target > 0 ? Math.min(Math.round((progress / goal.target) * 100), 100) : 0;
  return (
    <View style={gcStyles.card}>
      <View style={gcStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={gcStyles.label}>{goal.label}</Text>
          {memberName && <Text style={gcStyles.member}>{memberName}</Text>}
        </View>
        {onRemove && (
          <TouchableOpacity onPress={onRemove}>
            <Text style={gcStyles.remove}>✕ Remove</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={gcStyles.progressRow}>
        <Text style={gcStyles.progressLabel}>{goal.label}</Text>
        <Text style={gcStyles.progressValue}>
          <Text style={{ color: Colors.orange }}>{progress}</Text> / {goal.target}
        </Text>
      </View>
      <View style={gcStyles.bar}>
        <View style={[gcStyles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={gcStyles.pct}>{pct}% complete · {Math.max(goal.target - progress, 0)} more to go</Text>
    </View>
  );
}

const gcStyles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  member: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  remove: { color: Colors.red, fontSize: 12, fontWeight: '600' as const },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.soft },
  progressValue: { fontSize: 12, color: Colors.soft },
  bar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' as const },
  fill: { height: '100%', backgroundColor: Colors.orange, borderRadius: 3 },
  pct: { fontSize: 11, color: Colors.muted, marginTop: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700' as const, marginBottom: 8 },
  formCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, marginTop: 10 },
  formTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '700' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  memberPill: { backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  memberPillActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  memberPillText: { fontSize: 12, color: Colors.soft },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  dropdownText: { color: Colors.text, fontSize: 14 },
  dropdownList: { backgroundColor: Colors.cardHover, borderRadius: 8, marginBottom: 12 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemText: { color: Colors.text, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  input: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  setBtn: { backgroundColor: Colors.orange, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  setBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
});
