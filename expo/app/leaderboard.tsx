import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { getScoreColor, getRateColor } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { Period, getInitials, getRoleBadgeColor, getRoleLabel } from '@/types';
import { useUsersArray, useTeamsArray, useLogs, useReports } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { isDateInPeriod, isTimestampInPeriod } from '@/utils/date';
import { formatNaira } from '@/utils/commission';
import PeriodFilter from '@/components/PeriodFilter';

export default function LeaderboardScreen() {
  const colors = useColors();
  const { user: currentUser } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const allUsers = useUsersArray();
  const allTeams = useTeamsArray();
  const { data: allLogs, refetch: rl, isRefetching: r1 } = useLogs();
  const { data: allReports, refetch: rr, isRefetching: r2 } = useReports();

  const periodLogs = useMemo(() => allLogs?.filter(l => l.status === 'approved' && isDateInPeriod(l.date, period)) ?? [], [allLogs, period]);
  const periodReports = useMemo(() => allReports?.filter(r => isTimestampInPeriod(r.date, period)) ?? [], [allReports, period]);

  const teamRankings = useMemo(() => {
    return allTeams.map(team => {
      const members = allUsers.filter(u => u.teamId === team.id);
      const tReports = periodReports.filter(r => r.teamId === team.id);
      const tLogs = periodLogs.filter(l => l.teamId === team.id);
      const avgScore = tReports.length > 0 ? Math.round(tReports.reduce((s, r) => s + (r.score || 0), 0) / tReports.length) : 0;
      const assigned = tLogs.reduce((s, l) => s + l.assigned, 0);
      const delivered = tLogs.reduce((s, l) => s + l.delivered, 0);
      const rate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
      const earnings = tLogs.reduce((s, l) => s + (l.commission?.total ?? 0), 0);
      return { team, members: members.length, calls: tReports.length, avgScore, rate, earnings };
    }).sort((a, b) => b.rate - a.rate || b.earnings - a.earnings);
  }, [allTeams, allUsers, periodReports, periodLogs]);

  const isManagement = currentUser?.role !== 'closer' && currentUser?.role !== 'teamlead';

  const individualRankings = useMemo(() => {
    let closersAndLeads = allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead');
    if (!isManagement && currentUser?.teamId) {
      closersAndLeads = closersAndLeads.filter(u => u.teamId === currentUser.teamId);
    }
    return closersAndLeads.map(user => {
      const uReports = periodReports.filter(r => r.closerId === user.id);
      const uLogs = periodLogs.filter(l => l.closerId === user.id);
      const avgScore = uReports.length > 0 ? Math.round(uReports.reduce((s, r) => s + (r.score || 0), 0) / uReports.length) : 0;
      const assigned = uLogs.reduce((s, l) => s + l.assigned, 0);
      const delivered = uLogs.reduce((s, l) => s + l.delivered, 0);
      const rate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
      const team = allTeams.find(t => t.id === user.teamId);
      return { user, calls: uReports.length, avgScore, rate, teamName: team?.name ?? '' };
    }).sort((a, b) => b.rate - a.rate || b.avgScore - a.avgScore);
  }, [allUsers, allTeams, periodReports, periodLogs, isManagement, currentUser?.teamId]);

  const getRankIcon = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Leaderboard', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={r1 || r2} onRefresh={() => { void rl(); void rr(); }} tintColor={colors.green} />}
      >
        <Text style={[styles.title, { color: colors.text }]}>🏆 Leaderboard</Text>
        <PeriodFilter selected={period} onSelect={setPeriod} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🏅 Team Rankings</Text>
          {teamRankings.map((item, i) => (
            <View key={item.team.id} style={[styles.rankCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.rank}>{getRankIcon(i)}</Text>
              <View style={styles.rankInfo}>
                <Text style={[styles.rankName, { color: colors.text }]}>{item.team.name}</Text>
                <Text style={[styles.rankMeta, { color: colors.muted }]}>{item.members} members · {item.calls} calls</Text>
              </View>
              <View style={styles.rankStats}>
                <Text style={[styles.rankScore, { color: item.calls > 0 ? getScoreColor(item.avgScore, colors) : colors.muted }]}>
                  {item.calls > 0 ? item.avgScore : '—'}
                </Text>
                <Text style={[styles.rankRate, { color: getRateColor(item.rate, colors) }]}>{item.rate}%</Text>
                <Text style={[styles.rankEarnings, { color: colors.green }]}>{item.earnings > 0 ? formatNaira(item.earnings) : '₦0'}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isManagement ? '🏆 Individual Rankings' : '🏆 Individual Rankings — Your Team'}
          </Text>
          {individualRankings.map((item, i) => (
            <View key={item.user.id} style={[styles.rankCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.rank}>{getRankIcon(i)}</Text>
              <View style={[styles.indAvatar, { backgroundColor: getRoleBadgeColor(item.user.role) }]}>
                <Text style={styles.indAvatarText}>{getInitials(item.user.name)}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={[styles.rankName, { color: colors.text }]}>{item.user.name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.user.role) + '30' }]}>
                  <Text style={[styles.roleText, { color: getRoleBadgeColor(item.user.role) }]}>{getRoleLabel(item.user.role)}</Text>
                </View>
              </View>
              <View style={styles.rankStats}>
                <Text style={[styles.rankScore, { color: item.calls > 0 ? getScoreColor(item.avgScore, colors) : colors.muted }]}>
                  {item.calls > 0 ? item.avgScore : '—'}
                </Text>
                <Text style={[styles.rankRate, { color: getRateColor(item.rate, colors) }]}>{item.rate}%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 10 },
  rankCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, gap: 10,
  },
  rank: { fontSize: 16, minWidth: 28, textAlign: 'center' as const },
  indAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  indAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 10 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 13, fontWeight: '600' as const },
  rankMeta: { fontSize: 11 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 9, fontWeight: '700' as const },
  rankStats: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rankScore: { fontSize: 14, fontWeight: '800' as const, minWidth: 28, textAlign: 'center' as const },
  rankRate: { fontSize: 12, fontWeight: '700' as const, minWidth: 32, textAlign: 'center' as const },
  rankEarnings: { fontSize: 11, fontWeight: '600' as const },
});
