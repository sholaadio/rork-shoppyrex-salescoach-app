import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useGoals, useTeamMembers, useTeamName, useLogs } from '@/hooks/useData';
import { getCurrentMonth, getMonthLabel } from '@/utils/date';
import { submitGoal, requestGoalDeletion, getPendingDeletionRequests } from '@/services/api';

const GOAL_TYPES = [
  { key: 'delivered', label: 'Orders Delivered' },
  { key: 'conversion', label: 'Conversion Rate' },
  { key: 'calls', label: 'Calls Analyzed' },
  { key: 'upsells', label: 'Upsells' },
  { key: 'earnings', label: 'Earnings' },
] as const;

export default function TeamLeadGoalsScreen() {
  const { user } = useAuth();
  const colors = useColors();
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

  const allGoalIds = useMemo(() => {
    const ids: string[] = [];
    if (teamGoals) ids.push(...teamGoals.map(g => g.id));
    if (memberGoals) ids.push(...memberGoals.map(g => g.id));
    return ids;
  }, [teamGoals, memberGoals]);

  const { data: pendingDeletionIds = [] } = useQuery({
    queryKey: ['pendingDeletions', 'teamlead', allGoalIds],
    queryFn: () => getPendingDeletionRequests(allGoalIds),
    enabled: allGoalIds.length > 0,
  });

  const requestRemoveMutation = useMutation({
    mutationFn: (params: { goalId: string; goalLabel: string }) =>
      requestGoalDeletion({
        goalId: params.goalId,
        goalLabel: params.goalLabel,
        requestedBy: user?.id ?? '',
        requestedByName: user?.name ?? '',
        requestedByRole: 'teamlead',
        approverRole: 'head_sales',
      }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sent', 'Deletion request sent to Head of Sales for approval');
      void queryClient.invalidateQueries({ queryKey: ['pendingDeletions'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed to request deletion'),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>Goals</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{getMonthLabel(month)}</Text>

          {goalsLoading && (
            <View style={{ padding: 20, alignItems: 'center' as const }}>
              <ActivityIndicator color={colors.orange} />
              <Text style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>Loading goals...</Text>
            </View>
          )}

          {goalsError && (
            <View style={{ padding: 16, backgroundColor: '#FEE2E2', borderRadius: 10, marginBottom: 16 }}>
              <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600' as const }}>Error loading goals: {goalsError instanceof Error ? goalsError.message : 'Unknown error'}</Text>
            </View>
          )}

          {!goalsLoading && !goalsError && allGoals && allGoals.length === 0 && (
            <View style={{ padding: 16, backgroundColor: colors.card, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' as const }}>No goals found in database</Text>
            </View>
          )}

          {!goalsLoading && allGoals && allGoals.length > 0 && companyGoals.length === 0 && teamGoals.length === 0 && memberGoals.length === 0 && (
            <View style={{ padding: 16, backgroundColor: colors.card, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' as const }}>{allGoals.length} goals fetched but none matched filters. Check console logs.</Text>
            </View>
          )}

          {companyGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.orange }]}>🏢 Company Target</Text>
              {companyGoals.map(g => <GoalCard key={g.id} goal={g} progress={getProgress(g)} colors={colors} />)}
            </View>
          )}

          {teamGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.blue }]}>👥 Team Goals — {teamName}</Text>
              {teamGoals.map(g => <GoalCard key={g.id} goal={g} progress={getProgress(g)} pendingDeletion={pendingDeletionIds.includes(g.id)} onRequestRemove={() => requestRemoveMutation.mutate({ goalId: g.id, goalLabel: g.label })} colors={colors} />)}
            </View>
          )}

          {memberGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.purple }]}>👤 Individual Member Goals</Text>
              {memberGoals.map(g => {
                const member = teamMembers.find(m => m.id === g.userId);
                return (
                  <GoalCard key={g.id} goal={g} progress={getProgress(g)} memberName={member?.name} pendingDeletion={pendingDeletionIds.includes(g.id)} onRequestRemove={() => requestRemoveMutation.mutate({ goalId: g.id, goalLabel: g.label })} colors={colors} />
                );
              })}
            </View>
          )}

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.orange }]}>+ Set New Goal</Text>

            <Text style={[styles.label, { color: colors.muted }]}>SELECT STAFF MEMBER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {teamMembers.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberPill, { backgroundColor: colors.background, borderColor: colors.border }, selectedMember === m.id && { backgroundColor: colors.green, borderColor: colors.green }]}
                  onPress={() => setSelectedMember(m.id)}
                >
                  <Text style={[styles.memberPillText, { color: colors.soft }, selectedMember === m.id && { color: '#fff' }]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.muted }]}>GOAL TYPE</Text>
            <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
              <Text style={[styles.dropdownText, { color: colors.text }]}>{GOAL_TYPES.find(t => t.key === goalType)?.label}</Text>
              <ChevronDown size={16} color={colors.muted} />
            </TouchableOpacity>
            {showTypeDropdown && (
              <View style={[styles.dropdownList, { backgroundColor: colors.cardHover }]}>
                {GOAL_TYPES.map(t => (
                  <TouchableOpacity key={t.key} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => { setGoalType(t.key); setShowTypeDropdown(false); }}>
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.muted }]}>TARGET NUMBER</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={target} onChangeText={t => setTarget(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 50" placeholderTextColor={colors.muted} />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>GOAL LABEL</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={label} onChangeText={setLabel} placeholder="e.g. Deliver 50 orders this month" placeholderTextColor={colors.muted} />

            <TouchableOpacity style={[styles.setBtn, { backgroundColor: colors.orange }]} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.8}>
              {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.setBtnText}>🎯 Set Goal</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function GoalCard({ goal, progress, memberName, pendingDeletion, onRequestRemove, colors }: { goal: any; progress: number; memberName?: string; pendingDeletion?: boolean; onRequestRemove?: () => void; colors: ThemeColors }) {
  const pct = goal.target > 0 ? Math.min(Math.round((progress / goal.target) * 100), 100) : 0;
  return (
    <View style={[gcStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={gcStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[gcStyles.label, { color: colors.text }]}>{goal.label}</Text>
          {memberName && <Text style={[gcStyles.member, { color: colors.muted }]}>{memberName}</Text>}
        </View>
        {onRequestRemove && (
          pendingDeletion ? (
            <View style={{ opacity: 0.6 }}>
              <Text style={[gcStyles.remove, { color: colors.muted }]}>⏳ Pending</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={onRequestRemove}>
              <Text style={[gcStyles.remove, { color: colors.orange }]}>⏳ Request Remove</Text>
            </TouchableOpacity>
          )
        )}
      </View>
      <View style={gcStyles.progressRow}>
        <Text style={[gcStyles.progressLabel, { color: colors.soft }]}>{goal.label}</Text>
        <Text style={[gcStyles.progressValue, { color: colors.soft }]}>
          <Text style={{ color: colors.orange }}>{progress}</Text> / {goal.target}
        </Text>
      </View>
      <View style={[gcStyles.bar, { backgroundColor: colors.border }]}>
        <View style={[gcStyles.fill, { width: `${pct}%`, backgroundColor: colors.orange }]} />
      </View>
      <Text style={[gcStyles.pct, { color: colors.muted }]}>{pct}% complete · {Math.max(goal.target - progress, 0)} more to go</Text>
    </View>
  );
}

const gcStyles = StyleSheet.create({
  card: { borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700' as const },
  member: { fontSize: 11, marginTop: 2 },
  remove: { fontSize: 12, fontWeight: '600' as const },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 12, fontWeight: '600' as const },
  progressValue: { fontSize: 12 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' as const },
  fill: { height: '100%', borderRadius: 3 },
  pct: { fontSize: 11, marginTop: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const },
  subtitle: { fontSize: 13, marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700' as const, marginBottom: 8 },
  formCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginTop: 10 },
  formTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  memberPill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1 },
  memberPillText: { fontSize: 12 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  dropdownText: { fontSize: 14 },
  dropdownList: { borderRadius: 8, marginBottom: 12 },
  dropdownItem: { padding: 12, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  input: { borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, marginBottom: 12 },
  setBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  setBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
});
