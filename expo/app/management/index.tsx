import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getScoreColor } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { Period } from '@/types';
import { useUsersArray, useTeamsArray, useLogs, useReports } from '@/hooks/useData';
import { isDateInPeriod, isTimestampInPeriod } from '@/utils/date';
import { formatNaira } from '@/utils/commission';
import StatCard from '@/components/StatCard';
import PeriodFilter from '@/components/PeriodFilter';

export default function ManagementOverview() {
  const colors = useColors();
  const [period, setPeriod] = useState<Period>('month');
  const allUsers = useUsersArray();
  const allTeams = useTeamsArray();
  const { data: allLogs, refetch: rl, isRefetching: r1 } = useLogs();
  const { data: allReports, refetch: rr, isRefetching: r2 } = useReports();

  const periodLogs = useMemo(() => {
    if (!allLogs) return [];
    return allLogs.filter(l => l.status === 'approved' && isDateInPeriod(l.date, period));
  }, [allLogs, period]);

  const periodReports = useMemo(() => {
    if (!allReports) return [];
    return allReports.filter(r => isTimestampInPeriod(r.date, period));
  }, [allReports, period]);

  const totalCommission = useMemo(() => {
    return periodLogs.reduce((s, l) => s + (l.commission?.total ?? 0), 0);
  }, [periodLogs]);

  const excellenceCount = useMemo(() => {
    const closers = allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead');
    return closers.filter(c => {
      const logs = periodLogs.filter(l => l.closerId === c.id);
      const assigned = logs.reduce((s, l) => s + l.assigned, 0);
      const delivered = logs.reduce((s, l) => s + l.delivered, 0);
      return assigned > 0 && Math.round((delivered / assigned) * 100) >= 90;
    }).length;
  }, [allUsers, periodLogs]);

  const redFlags = useMemo(() => {
    const closers = allUsers.filter(u => u.role === 'closer');
    return closers.filter(c => {
      const logs = periodLogs.filter(l => l.closerId === c.id);
      const assigned = logs.reduce((s, l) => s + l.assigned, 0);
      const delivered = logs.reduce((s, l) => s + l.delivered, 0);
      return assigned > 0 && Math.round((delivered / assigned) * 100) < 60;
    }).length;
  }, [allUsers, periodLogs]);

  const closersAndLeads = useMemo(() => {
    return allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead').length;
  }, [allUsers]);

  const onRefresh = () => { void rl(); void rr(); };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={r1 || r2} onRefresh={onRefresh} tintColor={colors.green} />}
        >
          <Text style={[styles.title, { color: colors.text }]}>Company Overview</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Shoppyrex · {allTeams.length} teams · {closersAndLeads} closers & leads</Text>

          <PeriodFilter selected={period} onSelect={setPeriod} />

          <View style={styles.statsRow}>
            <StatCard label="CALLS ANALYZED" value={String(periodReports.length)} accentColor={colors.green} />
            <View style={{ width: 8 }} />
            <StatCard label="COMMISSION TO BE PAID" value={formatNaira(totalCommission)} accentColor={colors.orange} subtitle="Paid with salary" />
          </View>
          <View style={[styles.statsRow, { marginTop: 8, marginBottom: 20 }]}>
            <StatCard label="EXCELLENCE POOL (90%+)" value={String(excellenceCount)} accentColor={colors.yellow} />
            <View style={{ width: 8 }} />
            <StatCard label="RED FLAGS THIS WEEK" value={String(redFlags)} accentColor={colors.red} />
          </View>

          {allTeams.map(team => {
            const members = allUsers.filter(u => u.teamId === team.id);
            const teamReports = periodReports.filter(r => r.teamId === team.id);
            const teamLogs = periodLogs.filter(l => l.teamId === team.id);
            const avgScore = teamReports.length > 0
              ? Math.round(teamReports.reduce((s, r) => s + (r.score || 0), 0) / teamReports.length) : 0;
            const totalPay = teamLogs.reduce((s, l) => s + (l.commission?.total ?? 0), 0);

            const teamColor = team.type === 'sales' ? colors.green
              : team.type === 'followup' ? colors.blue : colors.purple;

            return (
              <View key={team.id} style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: teamColor }]}>
                <View style={styles.teamHeader}>
                  <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                  <View style={styles.teamScoreSection}>
                    <Text style={[styles.teamScoreLabel, { color: colors.muted }]}>Avg Score</Text>
                    {teamReports.length > 0 ? (
                      <Text style={[styles.teamScore, { color: getScoreColor(avgScore, colors) }]}>{avgScore}</Text>
                    ) : (
                      <Text style={[styles.teamScoreDash, { color: colors.muted }]}>—</Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.teamMeta, { color: colors.muted }]}>{members.length} members · {teamReports.length} calls</Text>
                <Text style={[styles.teamPay, { color: totalPay > 0 ? colors.green : colors.red }]}>
                  To be paid: {totalPay > 0 ? formatNaira(totalPay) : '₦0'}
                  {team.type === 'socialmedia' ? ' (pool)' : ''}
                </Text>
              </View>
            );
          })}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const },
  subtitle: { fontSize: 13, marginBottom: 16 },
  statsRow: { flexDirection: 'row' },
  teamCard: {
    borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderTopWidth: 3,
  },
  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  teamName: { fontSize: 16, fontWeight: '700' as const },
  teamScoreSection: { alignItems: 'flex-end' },
  teamScoreLabel: { fontSize: 10, textTransform: 'uppercase' as const },
  teamScore: { fontSize: 20, fontWeight: '800' as const },
  teamScoreDash: { fontSize: 20, fontWeight: '800' as const },
  teamMeta: { fontSize: 12, marginBottom: 4 },
  teamPay: { fontSize: 13, fontWeight: '700' as const },
});
