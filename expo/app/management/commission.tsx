import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, getRateColor } from '@/constants/colors';
import { getInitials } from '@/types';
import { useUsersArray, useTeamsArray, useLogs } from '@/hooks/useData';
import { getCurrentMonth, getMonthLabel } from '@/utils/date';
import { formatNaira } from '@/utils/commission';
import StatCard from '@/components/StatCard';

export default function CommissionScreen() {
  const allUsers = useUsersArray();
  const allTeams = useTeamsArray();
  const { data: allLogs, refetch, isRefetching } = useLogs();
  const month = getCurrentMonth();

  const monthLogs = useMemo(() => {
    if (!allLogs) return [];
    return allLogs.filter(l => l.status === 'approved' && l.date.startsWith(month));
  }, [allLogs, month]);

  const closersAndLeads = useMemo(() => {
    return allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead');
  }, [allUsers]);

  const breakdown = useMemo(() => {
    return closersAndLeads.map(user => {
      const logs = monthLogs.filter(l => l.closerId === user.id);
      const team = allTeams.find(t => t.id === user.teamId);
      const days = new Set(logs.map(l => l.date)).size;
      const delivered = logs.reduce((s, l) => s + l.delivered, 0);
      const assigned = logs.reduce((s, l) => s + l.assigned, 0);
      const rate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
      const base = logs.reduce((s, l) => s + (l.commission?.base ?? 0), 0);
      const upsell = logs.reduce((s, l) => s + (l.commission?.upsellBonus ?? 0), 0);
      const repeat = logs.reduce((s, l) => s + (l.commission?.repeatBonus ?? 0), 0);
      const referral = logs.reduce((s, l) => s + (l.commission?.referralBonus ?? 0), 0);
      const total = logs.reduce((s, l) => s + (l.commission?.total ?? 0), 0);
      return { user, team, days, delivered, assigned, rate, base, upsell, repeat, referral, total };
    }).sort((a, b) => b.total - a.total);
  }, [closersAndLeads, monthLogs, allTeams]);

  const grandTotal = useMemo(() => breakdown.reduce((s, b) => s + b.total, 0), [breakdown]);
  const totalDelivered = useMemo(() => breakdown.reduce((s, b) => s + b.delivered, 0), [breakdown]);
  const staffWithComm = useMemo(() => breakdown.filter(b => b.total > 0).length, [breakdown]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.green} />}
        >
          <Text style={styles.title}>Commission Report</Text>
          <Text style={styles.subtitle}>Official payroll-ready breakdown · {getMonthLabel(month)}</Text>

          <View style={styles.statsRow}>
            <StatCard label="GRAND TOTAL TO PAY" value={formatNaira(grandTotal)} accentColor={Colors.green} />
          </View>
          <View style={[styles.statsRow, { marginTop: 8, marginBottom: 20 }]}>
            <StatCard label="TOTAL DELIVERED" value={String(totalDelivered)} accentColor={Colors.blue} />
            <View style={{ width: 8 }} />
            <StatCard label="STAFF WITH COMMISSION" value={String(staffWithComm)} accentColor={Colors.orange} />
          </View>

          <Text style={styles.sectionTitle}>{getMonthLabel(month)} — Individual Breakdown</Text>

          {breakdown.map(item => (
            <View key={item.user.id} style={styles.commCard}>
              <View style={styles.commHeader}>
                <View style={[styles.avatar, { backgroundColor: Colors.blue }]}>
                  <Text style={styles.avatarText}>{getInitials(item.user.name)}</Text>
                </View>
                <View style={styles.commInfo}>
                  <Text style={styles.commName}>{item.user.name}</Text>
                  <Text style={styles.commTeam}>{item.team?.name ?? '—'}</Text>
                </View>
                <Text style={[styles.commTotal, { color: item.total > 0 ? Colors.green : Colors.red }]}>
                  {formatNaira(item.total)}
                </Text>
              </View>
              <View style={styles.commDetails}>
                <View style={styles.commDetail}>
                  <Text style={styles.detailLabel}>Days</Text>
                  <Text style={styles.detailValue}>{item.days}</Text>
                </View>
                <View style={styles.commDetail}>
                  <Text style={styles.detailLabel}>Delivered</Text>
                  <Text style={styles.detailValue}>{item.delivered}/{item.assigned}</Text>
                </View>
                <View style={styles.commDetail}>
                  <Text style={styles.detailLabel}>Rate</Text>
                  <Text style={[styles.detailValue, { color: getRateColor(item.rate) }]}>{item.rate}%</Text>
                </View>
                <View style={styles.commDetail}>
                  <Text style={styles.detailLabel}>Base</Text>
                  <Text style={styles.detailValue}>{formatNaira(item.base)}</Text>
                </View>
                <View style={styles.commDetail}>
                  <Text style={styles.detailLabel}>Upsell</Text>
                  <Text style={[styles.detailValue, { color: item.upsell > 0 ? Colors.orange : Colors.muted }]}>{formatNaira(item.upsell)}</Text>
                </View>
              </View>
            </View>
          ))}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 16 },
  statsRow: { flexDirection: 'row' },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  commCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  commHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 12 },
  commInfo: { flex: 1 },
  commName: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  commTeam: { fontSize: 11, color: Colors.muted },
  commTotal: { fontSize: 16, fontWeight: '800' as const },
  commDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  commDetail: { backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 60 },
  detailLabel: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase' as const },
  detailValue: { fontSize: 12, fontWeight: '600' as const, color: Colors.text },
});
