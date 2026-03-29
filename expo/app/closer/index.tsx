import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, TrendingUp, Phone, Star, Banknote, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { getScoreColor, getRateColor, ThemeColors } from '@/constants/colors';
import { Period, getInitials } from '@/types';
import { useUserLogs, useUserReports, useUserGoals, useTeamName, useLogs, useReports } from '@/hooks/useData';
import { getGreeting, getToday, getCurrentMonth } from '@/utils/date';
import { formatNaira } from '@/utils/commission';
import StatCard from '@/components/StatCard';
import PeriodFilter from '@/components/PeriodFilter';

export default function CloserDashboard() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const teamName = useTeamName(user?.teamId);

  const userLogs = useUserLogs(user?.id ?? '', period);
  const userReports = useUserReports(user?.id ?? '', period);
  const allUserGoals = useUserGoals(user?.id ?? '', user?.teamId);
  const { refetch: refetchLogs, isRefetching: lr } = useLogs();
  const { refetch: refetchReports, isRefetching: rr } = useReports();

  const approvedLogs = useMemo(() => userLogs.filter(l => l.status === 'approved'), [userLogs]);

  const stats = useMemo(() => {
    const totalCalls = userReports.length;
    const avgScore = totalCalls > 0
      ? Math.round(userReports.reduce((s, r) => s + (r.score || 0), 0) / totalCalls)
      : 0;
    const totalAssigned = approvedLogs.reduce((s, l) => s + l.assigned, 0);
    const totalDelivered = approvedLogs.reduce((s, l) => s + l.delivered, 0);
    const deliveryRate = totalAssigned > 0 ? Math.round((totalDelivered / totalAssigned) * 100) : 0;
    const earnings = approvedLogs.reduce((s, l) => s + (l.commission?.total ?? 0), 0);
    return { totalCalls, avgScore, deliveryRate, earnings, totalDelivered, totalAssigned };
  }, [approvedLogs, userReports]);

  const monthLogs = useMemo(() => {
    const month = getCurrentMonth();
    return approvedLogs.filter(l => l.date.startsWith(month));
  }, [approvedLogs]);

  const monthDeliveryRate = useMemo(() => {
    const assigned = monthLogs.reduce((s, l) => s + l.assigned, 0);
    const delivered = monthLogs.reduce((s, l) => s + l.delivered, 0);
    return assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
  }, [monthLogs]);

  const hasLogToday = useMemo(() => {
    const today = getToday();
    return userLogs.some(l => l.date === today);
  }, [userLogs]);

  const recentCalls = useMemo(() => {
    return [...userReports].sort((a, b) => b.date - a.date).slice(0, 5);
  }, [userReports]);

  const firstName = user?.name?.split(' ').pop() ?? '';

  const onRefresh = () => {
    void refetchLogs();
    void refetchReports();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={lr || rr} onRefresh={onRefresh} tintColor={colors.green} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>{getGreeting()}, {firstName} 👋</Text>
              <Text style={[styles.teamLabel, { color: colors.muted }]}>{teamName}</Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: colors.green }]}>
              <Text style={styles.avatarText}>{getInitials(user?.name ?? '')}</Text>
            </View>
          </View>

          {!hasLogToday && (
            <TouchableOpacity style={[styles.alertBanner, { borderColor: colors.orange + '30' }]} onPress={() => router.push('/closer/log')} activeOpacity={0.8}>
              <AlertCircle size={18} color={colors.orange} />
              <Text style={[styles.alertText, { color: colors.orange }]}>Daily log not submitted</Text>
              <ChevronRight size={16} color={colors.orange} />
            </TouchableOpacity>
          )}

          <PeriodFilter selected={period} onSelect={setPeriod} />

          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                label="TOTAL CALLS"
                value={String(stats.totalCalls)}
                accentColor={colors.green}
                subtitle="Analyzed by AI"
                icon={<Phone size={14} color={colors.muted} />}
              />
              <View style={{ width: 10 }} />
              <StatCard
                label="AVG AI SCORE"
                value={stats.totalCalls > 0 ? `${stats.avgScore}/100` : '—'}
                accentColor={stats.totalCalls > 0 ? getScoreColor(stats.avgScore, colors) : colors.muted}
                subtitle={stats.avgScore >= 80 ? 'Great work!' : stats.avgScore >= 60 ? 'Keep improving' : stats.totalCalls > 0 ? 'Needs work' : ''}
                icon={<Star size={14} color={colors.muted} />}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="PERIOD EARNINGS"
                value={formatNaira(stats.earnings)}
                accentColor={colors.orange}
                subtitle="Paid with salary"
                icon={<Banknote size={14} color={colors.muted} />}
              />
              <View style={{ width: 10 }} />
              <StatCard
                label="DELIVERY RATE"
                value={stats.totalAssigned > 0 ? `${stats.deliveryRate}%` : '—'}
                accentColor={stats.totalAssigned > 0 ? getRateColor(stats.deliveryRate, colors) : colors.muted}
                subtitle={stats.totalAssigned > 0 ? `${stats.totalDelivered} of ${stats.totalAssigned} delivered` : ''}
                icon={<TrendingUp size={14} color={colors.muted} />}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.commissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Commission Rules</Text>
              <View style={styles.commRules}>
                <Text style={[styles.ruleText, { color: colors.soft }]}>🥇 90%+ → ₦200/delivered</Text>
                <Text style={[styles.ruleText, { color: colors.soft }]}>🥈 65–89% → ₦150/delivered</Text>
                <Text style={[styles.ruleText, { color: colors.soft }]}>🥉 50–64% → ₦100/delivered</Text>
                <Text style={[styles.ruleText, { color: colors.soft }]}>Below 50% → ₦0</Text>
                <Text style={[styles.ruleText, { color: colors.soft, marginTop: 6 }]}>⚡ Upsell ₦600 (if rate ≥50%)</Text>
                <Text style={[styles.ruleText, { color: colors.soft }]}>• Repeat ₦300 • Referral ₦300</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.poolCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.poolHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>🏆 Monthly Excellence Pool</Text>
                <Text style={[styles.poolRate, { color: monthDeliveryRate >= 90 ? colors.green : colors.orange }]}>
                  {monthDeliveryRate}%
                </Text>
              </View>
              <Text style={[styles.poolSubtext, { color: colors.muted }]}>
                Hit 90%+ delivery rate all month to qualify
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(monthDeliveryRate / 90 * 100, 100)}%`,
                      backgroundColor: monthDeliveryRate >= 90 ? colors.green : colors.orange,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: colors.muted }]}>0%</Text>
                <Text style={[styles.progressLabel, { color: colors.orange }]}>90% Target</Text>
                <Text style={[styles.progressLabel, { color: colors.muted }]}>100%</Text>
              </View>
            </View>
          </View>

          {allUserGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🎯 Monthly Goals</Text>
              {allUserGoals.map(goal => {
                const progress = getGoalProgress(goal, stats, approvedLogs);
                const pct = goal.target > 0 ? Math.min(Math.round((progress / goal.target) * 100), 100) : 0;
                return (
                  <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.goalHeader}>
                      <Text style={[styles.goalLabel, { color: colors.text }]} numberOfLines={1}>{goal.label}</Text>
                      <Text style={[styles.goalProgress, { color: colors.soft }]}>
                        <Text style={{ color: colors.orange }}>{progress}</Text> / {goal.target}
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.orange }]}
                      />
                    </View>
                    <Text style={[styles.goalPct, { color: colors.muted }]}>{pct}% complete</Text>
                  </View>
                );
              })}
            </View>
          )}

          {recentCalls.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Calls</Text>
              {recentCalls.map(call => (
                <TouchableOpacity
                  key={call.id}
                  style={[styles.callCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/report-detail', params: { id: call.id } })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.scoreCircle, { borderColor: getScoreColor(call.score, colors) }]}>
                    <Text style={[styles.scoreText, { color: getScoreColor(call.score, colors) }]}>{call.score}</Text>
                  </View>
                  <View style={styles.callInfo}>
                    <Text style={[styles.callProduct, { color: colors.text }]} numberOfLines={1}>{call.product}</Text>
                    <Text style={[styles.callMeta, { color: colors.muted }]}>
                      {call.callType === 'phone' ? '📞' : '💬'} {new Date(call.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <View style={[styles.outcomeBadge, { backgroundColor: getOutcomeColor(call.callOutcome, colors) + '20' }]}>
                    <Text style={[styles.outcomeText, { color: getOutcomeColor(call.callOutcome, colors) }]}>
                      {call.callOutcome}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function getGoalProgress(goal: any, stats: any, logs: any[]): number {
  switch (goal.type) {
    case 'delivered':
      return logs.reduce((s: number, l: any) => s + l.delivered, 0);
    case 'conversion':
      return stats.deliveryRate;
    case 'calls':
      return stats.totalCalls;
    case 'upsells':
      return logs.reduce((s: number, l: any) => s + l.upsells, 0);
    case 'earnings':
      return stats.earnings;
    default:
      return 0;
  }
}

function getOutcomeColor(outcome: string, c: ThemeColors): string {
  switch (outcome?.toLowerCase()) {
    case 'confirmed': return c.green;
    case 'pending': return c.yellow;
    case 'rejected': return c.red;
    case 'not interested': return c.red;
    default: return c.muted;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800' as const },
  teamLabel: { fontSize: 13, marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, gap: 8,
  },
  alertText: { flex: 1, fontWeight: '600' as const, fontSize: 13 },
  statsGrid: { marginBottom: 16, gap: 10 },
  statsRow: { flexDirection: 'row' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 10 },
  commissionCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  commRules: { gap: 3 },
  ruleText: { fontSize: 12 },
  poolCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  poolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  poolRate: { fontSize: 22, fontWeight: '800' as const },
  poolSubtext: { fontSize: 12, marginBottom: 12 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' as const },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressLabel: { fontSize: 10 },
  goalCard: { borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalLabel: { fontSize: 13, fontWeight: '700' as const, flex: 1, marginRight: 8 },
  goalProgress: { fontSize: 13 },
  goalPct: { fontSize: 11, marginTop: 4 },
  callCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, gap: 12,
  },
  scoreCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 15, fontWeight: '800' as const },
  callInfo: { flex: 1 },
  callProduct: { fontSize: 14, fontWeight: '600' as const },
  callMeta: { fontSize: 11, marginTop: 2 },
  outcomeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  outcomeText: { fontSize: 11, fontWeight: '600' as const },
});
