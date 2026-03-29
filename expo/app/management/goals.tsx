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
import { useColors } from '@/contexts/ThemeContext';
import { useGoals, useUsersArray, useTeamsArray, useLogs } from '@/hooks/useData';
import { getCurrentMonth, getMonthLabel } from '@/utils/date';
import { submitGoal, deleteGoal } from '@/services/api';

const GOAL_TYPES = [
  { key: 'delivered', label: 'Orders Delivered' },
  { key: 'conversion', label: 'Conversion Rate' },
  { key: 'calls', label: 'Calls Analyzed' },
  { key: 'upsells', label: 'Upsells' },
  { key: 'earnings', label: 'Earnings' },
] as const;

const SCOPES = ['Company', 'Team', 'Individual'] as const;

export default function ManagementGoalsScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const allUsers = useUsersArray();
  const allTeams = useTeamsArray();
  const { data: allGoals, isLoading: goalsLoading, error: goalsError } = useGoals();
  const { data: allLogs } = useLogs();
  const month = getCurrentMonth();

  const canSetGoals = ['ceo', 'gm', 'head_sales'].includes(user?.role ?? '');

  const [scope, setScope] = useState<string>('Company');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [goalType, setGoalType] = useState<string>('delivered');
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [showTypeDD, setShowTypeDD] = useState(false);

  useEffect(() => {
    console.log('[GoalsScreen] allGoals:', JSON.stringify(allGoals));
    console.log('[GoalsScreen] allGoals count:', allGoals?.length ?? 'undefined');
    console.log('[GoalsScreen] current month filter:', month);
    if (allGoals) {
      allGoals.forEach((g, i) => {
        console.log(`[GoalsScreen] goal ${i}: id=${g.id} month=${g.month} userId=${g.userId} label=${g.label} target=${g.target}`);
        console.log(`[GoalsScreen] goal ${i} month match: ${g.month} === ${month} => ${g.month === month}`);
      });
    }
  }, [allGoals, month]);

  const companyGoals = useMemo(() => {
    const result = allGoals?.filter(g => g.userId === 'company') ?? [];
    const monthFiltered = result.filter(g => g.month === month);
    console.log('[GoalsScreen] company goals (no month filter):', result.length, 'with month filter:', monthFiltered.length);
    return monthFiltered.length > 0 ? monthFiltered : result;
  }, [allGoals, month]);

  const teamGoals = useMemo(() => {
    const result = allGoals?.filter(g => g.userId.startsWith('team:')) ?? [];
    const monthFiltered = result.filter(g => g.month === month);
    console.log('[GoalsScreen] team goals (no month filter):', result.length, 'with month filter:', monthFiltered.length);
    return monthFiltered.length > 0 ? monthFiltered : result;
  }, [allGoals, month]);

  const individualGoals = useMemo(() => {
    if (!allGoals) return [];
    const userIds = allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead').map(u => u.id);
    const result = allGoals.filter(g => userIds.includes(g.userId));
    const monthFiltered = result.filter(g => g.month === month);
    console.log('[GoalsScreen] individual goals (no month filter):', result.length, 'with month filter:', monthFiltered.length);
    return monthFiltered.length > 0 ? monthFiltered : result;
  }, [allGoals, month, allUsers]);

  const getProgress = (goal: any): number => {
    if (!allLogs) return 0;
    const approved = allLogs.filter(l => l.status === 'approved' && l.date.startsWith(month));
    if (goal.userId === 'company') {
      if (goal.type === 'delivered') return approved.reduce((s: number, l: any) => s + l.delivered, 0);
      return 0;
    }
    if (goal.userId.startsWith('team:')) {
      const tid = goal.userId.replace('team:', '');
      const tLogs = approved.filter((l: any) => l.teamId === tid);
      if (goal.type === 'delivered') return tLogs.reduce((s: number, l: any) => s + l.delivered, 0);
      return 0;
    }
    const uLogs = approved.filter((l: any) => l.closerId === goal.userId);
    if (goal.type === 'delivered') return uLogs.reduce((s: number, l: any) => s + l.delivered, 0);
    return 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let userId = '';
      if (scope === 'Company') userId = 'company';
      else if (scope === 'Team') {
        if (!selectedTeam) throw new Error('Select a team');
        userId = `team:${selectedTeam}`;
      } else {
        if (!selectedUser) throw new Error('Select a member');
        userId = selectedUser;
      }
      if (!target || parseInt(target) <= 0) throw new Error('Enter a valid target');
      if (!label.trim()) throw new Error('Enter a goal label');
      return submitGoal({ month, type: goalType as any, target: parseInt(target), label: label.trim(), setBy: user?.id ?? '', userId, createdAt: Date.now() });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTarget(''); setLabel('');
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>Goals</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{getMonthLabel(month)}</Text>

          {goalsLoading && (
            <View style={{ padding: 20, alignItems: 'center' }}>
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
              <Text style={{ color: Colors.muted, fontSize: 13, textAlign: 'center' }}>No goals found in database</Text>
            </View>
          )}

          {!goalsLoading && allGoals && allGoals.length > 0 && companyGoals.length === 0 && teamGoals.length === 0 && individualGoals.length === 0 && (
            <View style={{ padding: 16, backgroundColor: Colors.card, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ color: Colors.muted, fontSize: 13, textAlign: 'center' }}>{allGoals.length} goals fetched but none matched filters. Check console logs.</Text>
            </View>
          )}

          {companyGoals.length > 0 && (
            <Section title="🏢 Company Target" color={Colors.orange}>
              {companyGoals.map(g => <GoalItem key={g.id} goal={g} progress={getProgress(g)} onRemove={canSetGoals ? () => removeMutation.mutate(g.id) : undefined} />)}
            </Section>
          )}

          {teamGoals.length > 0 && (
            <Section title="👥 Team Goals" color={Colors.blue}>
              {teamGoals.map(g => {
                const tid = g.userId.replace('team:', '');
                const team = allTeams.find(t => t.id === tid);
                return <GoalItem key={g.id} goal={g} progress={getProgress(g)} subtitle={team?.name} onRemove={canSetGoals ? () => removeMutation.mutate(g.id) : undefined} />;
              })}
            </Section>
          )}

          {individualGoals.length > 0 && (
            <Section title="👤 Individual Member Goals" color={Colors.purple}>
              {individualGoals.map(g => {
                const member = allUsers.find(u => u.id === g.userId);
                return <GoalItem key={g.id} goal={g} progress={getProgress(g)} subtitle={member?.name} onRemove={canSetGoals ? () => removeMutation.mutate(g.id) : undefined} />;
              })}
            </Section>
          )}

          {canSetGoals && (
            <View style={styles.formCard}>
              <Text style={[styles.formTitle, { color: Colors.orange }]}>+ Set New Goal</Text>

              <View style={styles.scopeRow}>
                {SCOPES.map(s => (
                  <TouchableOpacity key={s} style={[styles.scopePill, scope === s && styles.scopeActive]} onPress={() => setScope(s)}>
                    <Text style={[styles.scopeText, scope === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {scope === 'Team' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {allTeams.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.pill, selectedTeam === t.id && styles.pillActive]} onPress={() => setSelectedTeam(t.id)}>
                      <Text style={[styles.pillText, selectedTeam === t.id && { color: '#fff' }]}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {scope === 'Individual' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead').map(u => (
                    <TouchableOpacity key={u.id} style={[styles.pill, selectedUser === u.id && styles.pillActive]} onPress={() => setSelectedUser(u.id)}>
                      <Text style={[styles.pillText, selectedUser === u.id && { color: '#fff' }]}>{u.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.label}>GOAL TYPE</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeDD(!showTypeDD)}>
                <Text style={styles.ddText}>{GOAL_TYPES.find(t => t.key === goalType)?.label}</Text>
                <ChevronDown size={16} color={Colors.muted} />
              </TouchableOpacity>
              {showTypeDD && (
                <View style={styles.ddList}>
                  {GOAL_TYPES.map(t => (
                    <TouchableOpacity key={t.key} style={styles.ddItem} onPress={() => { setGoalType(t.key); setShowTypeDD(false); }}>
                      <Text style={styles.ddItemText}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>TARGET NUMBER</Text>
              <TextInput style={styles.input} value={target} onChangeText={t => setTarget(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 500" placeholderTextColor={Colors.muted} />

              <Text style={styles.label}>GOAL LABEL</Text>
              <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Deliver 500 orders" placeholderTextColor={Colors.muted} />

              <TouchableOpacity style={styles.setBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.setBtnText}>🎯 Set Goal</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: '700' as const, color, marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

function GoalItem({ goal, progress, subtitle, onRemove }: { goal: any; progress: number; subtitle?: string; onRemove?: () => void }) {
  const pct = goal.target > 0 ? Math.min(Math.round((progress / goal.target) * 100), 100) : 0;
  return (
    <View style={giStyles.card}>
      <View style={giStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={giStyles.label}>{goal.label}</Text>
          {subtitle && <Text style={giStyles.sub}>{subtitle}</Text>}
        </View>
        {onRemove && <TouchableOpacity onPress={onRemove}><Text style={giStyles.remove}>✕ Remove</Text></TouchableOpacity>}
      </View>
      <View style={giStyles.progRow}>
        <Text style={giStyles.progLabel}>{goal.label}</Text>
        <Text style={giStyles.progVal}><Text style={{ color: Colors.orange }}>{progress}</Text> / {goal.target}</Text>
      </View>
      <View style={giStyles.bar}><View style={[giStyles.fill, { width: `${pct}%` }]} /></View>
      <Text style={giStyles.pct}>{pct}% complete · {Math.max(goal.target - progress, 0)} more to go</Text>
    </View>
  );
}

const giStyles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  sub: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  remove: { color: Colors.red, fontSize: 12, fontWeight: '600' as const },
  progRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.soft },
  progVal: { fontSize: 12, color: Colors.soft },
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
  formCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, marginTop: 10 },
  formTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 16 },
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  scopePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  scopeActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  scopeText: { fontSize: 13, fontWeight: '600' as const, color: Colors.soft },
  pill: { backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  pillText: { fontSize: 12, color: Colors.soft },
  label: { fontSize: 10, fontWeight: '700' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  ddText: { color: Colors.text, fontSize: 14 },
  ddList: { backgroundColor: Colors.cardHover, borderRadius: 8, marginBottom: 12 },
  ddItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ddItemText: { color: Colors.text, fontSize: 14 },
  input: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  setBtn: { backgroundColor: Colors.orange, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  setBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
});
