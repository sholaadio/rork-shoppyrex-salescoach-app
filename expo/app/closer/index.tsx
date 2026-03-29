import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, TrendingUp, Phone, Star, Banknote, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { Colors, getScoreColor, getRateColor } from '@/constants/colors';
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
            <TouchableOpacity style={styles.alertBanner} onPress={() => router.push('/closer/log')} activeOpacity={0.8}>
              <AlertCircle size={18} color={Colors.orange} />
              <Text style={styles.alertText}>Daily log not submitted</Text>
              <ChevronRight size={16} color={Colors.orange} />
            </TouchableOpacity>
          )}

          <PeriodFilter selected={period} onSelect={setPeriod} />

          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                label="TOTAL CALLS"
                value={String(stats.totalCalls)}
                accentColor={Colors.green}
                subtitle="Analyzed by AI"
                icon={<Phone size={14} color={Colors.muted} />}
              />
              <View style={{ width: 10 }} />
              <StatCard
                label="AVG AI SCORE"
                value={stats.totalCalls > 0 ? `${stats.avgScore}/100` : '—'}
                accentColor={stats.totalCalls > 0 ? getScoreColor(stats.avgScore) : Colors.muted}
                subtitle={stats.avgScore >= 80 ? 'Great work!' : stats.avgScore >= 60 ? 'Keep improving' : stats.totalCalls > 0 ? 'Needs work' : ''}
                icon={<Star size={14} color={Colors.muted} />}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="PERIOD EARNINGS"
                value={formatNaira(stats.earnings)}
                accentColor={Colors.orange}
                subtitle="Paid with salary"
                icon={<Banknote size={14} color={Colors.muted} />}
              />
              <View style={{ width: 10 }} />
              <StatCard
                label="DELIVERY RATE"
                value={stats.totalAssigned > 0 ? `${stats.deliveryRate}%` : '—'}
                accentColor={stats.totalAssigned > 0 ? getRateColor(stats.deliveryRate) : Colors.muted}
                subtitle={stats.totalAssigned > 0 ? `${stats.totalDelivered} of ${stats.totalAssigned} delivered` : ''}
                icon={<TrendingUp size={14} color={Colors.muted} />}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.commissionCard}>
              <Text style={styles.sectionTitle}>Your Commission Rules</Text>
              <View style={styles.commRules}>
                <Text style={styles.ruleText}>🥇 90%+ → ₦200/delivered</Text>
                <Text style={styles.ruleText}>🥈 65–89% → ₦150/delivered</Text>
                <Text style={styles.ruleText}>🥉 50–64% → ₦100/delivered</Text>
                <Text style={styles.ruleText}>Below 50% → ₦0</Text>
                <Text style={[styles.ruleText, { marginTop: 6 }]}>⚡ Upsell ₦600 (if rate ≥50%)</Text>
                <Text style={styles.ruleText}>• Repeat ₦300 • Referral ₦300</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.poolCard}>
              <View style={styles.poolHeader}>
                <Text style={styles.sectionTitle}>🏆 Monthly Excellence Pool</Text>
                <Text style={[styles.poolRate, { color: monthDeliveryRate >= 90 ? Colors.green : Colors.orange }]}>
                  {monthDeliveryRate}%
                </Text>
              </View>
              <Text style={styles.poolSubtext}>
                Hit 90%+ delivery rate all month to qualify
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(monthDeliveryRate / 90 * 100, 100)}%`,
                      backgroundColor: monthDeliveryRate >= 90 ? Colors.green : Colors.orange,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>0%</Text>
                <Text style={[styles.progressLabel, { color: Colors.orange }]}>90% Target</Text>
                <Text style={styles.progressLabel}>100%</Text>
              </View>
            </View>
          </View>

          {allUserGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Monthly Goals</Text>
              {allUserGoals.map(goal => {
                const progress = getGoalProgress(goal, stats, approvedLogs);
                const pct = goal.target > 0 ? Math.min(Math.round((progress / goal.target) * 100), 100) : 0;
                return (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalLabel} numberOfLines={1}>{goal.label}</Text>
                      <Text style={styles.goalProgress}>
                        <Text style={{ color: Colors.orange }}>{progress}</Text> / {goal.target}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${pct}%`, backgroundColor: Colors.orange }]}
                      />
                    </View>
                    <Text style={styles.goalPct}>{pct}% complete</Text>
                  </View>
                );
              })}
            </View>
          )}

          {recentCalls.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Calls</Text>
              {recentCalls.map(call => (
                <TouchableOpacity
                  key={call.id}
                  style={styles.callCard}
                  onPress={() => router.push({ pathname: '/report-detail', params: { id: call.id } })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.scoreCircle, { borderColor: getScoreColor(call.score) }]}>
                    <Text style={[styles.scoreText, { color: getScoreColor(call.score) }]}>{call.score}</Text>
                  </View>
                  <View style={styles.callInfo}>
                    <Text style={styles.callProduct} numberOfLines={1}>{call.product}</Text>
                    <Text style={styles.callMeta}>
                      {call.callType === 'phone' ? '📞' : '💬'} {new Date(call.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <View style={[styles.outcomeBadge, { backgroundColor: getOutcomeColor(call.callOutcome) + '20' }]}>
                    <Text style={[styles.outcomeText, { color: getOutcomeColor(call.callOutcome) }]}>
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

function getOutcomeColor(outcome: string): string {
  switch (outcome?.toLowerCase()) {
    case 'confirmed': return Colors.green;
    case 'pending': return Colors.yellow;
    case 'rejected': return Colors.red;
    case 'not interested': return Colors.red;
    default: return Colors.muted;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  teamLabel: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.green, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', gap: 8,
  },
  alertText: { flex: 1, color: Colors.orange, fontWeight: '600' as const, fontSize: 13 },
  statsGrid: { marginBottom: 16, gap: 10 },
  statsRow: { flexDirection: 'row' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  commissionCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  commRules: { gap: 3 },
  ruleText: { fontSize: 12, color: Colors.soft },
  poolCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  poolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  poolRate: { fontSize: 22, fontWeight: '800' as const },
  poolSubtext: { fontSize: 12, color: Colors.muted, marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' as const },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressLabel: { fontSize: 10, color: Colors.muted },
  goalCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalLabel: { fontSize: 13, fontWeight: '700' as const, color: Colors.text, flex: 1, marginRight: 8 },
  goalProgress: { fontSize: 13, color: Colors.soft },
  goalPct: { fontSize: 11, color: Colors.muted, marginTop: 4 },
  callCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  scoreCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 15, fontWeight: '800' as const },
  callInfo: { flex: 1 },
  callProduct: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  callMeta: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  outcomeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  outcomeText: { fontSize: 11, fontWeight: '600' as const },
});
