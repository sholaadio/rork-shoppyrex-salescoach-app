import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, getScoreColor, getRateColor } from '@/constants/colors';
import { Period, getInitials, getRoleLabel, getRoleBadgeColor } from '@/types';
import { useUsersArray, useTeamsArray, useLogs, useReports } from '@/hooks/useData';
import { isDateInPeriod, isTimestampInPeriod } from '@/utils/date';
import { formatNaira } from '@/utils/commission';
import PeriodFilter from '@/components/PeriodFilter';

export default function ManagementTeamsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const allUsers = useUsersArray();
  const allTeams = useTeamsArray();
  const { data: allLogs, refetch: rl, isRefetching: r1 } = useLogs();
  const { data: allReports, refetch: rr, isRefetching: r2 } = useReports();

  const periodLogs = useMemo(() => allLogs?.filter(l => l.status === 'approved' && isDateInPeriod(l.date, period)) ?? [], [allLogs, period]);
  const periodReports = useMemo(() => allReports?.filter(r => isTimestampInPeriod(r.date, period)) ?? [], [allReports, period]);

  const onRefresh = () => { void rl(); void rr(); };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={r1 || r2} onRefresh={onRefresh} tintColor={Colors.green} />}
        >
          <Text style={styles.title}>All Teams</Text>
          <PeriodFilter selected={period} onSelect={setPeriod} />

          {allTeams.map(team => {
            const members = allUsers.filter(u => u.teamId === team.id);
            const teamColor = team.type === 'sales' ? Colors.green : team.type === 'followup' ? Colors.blue : Colors.purple;
            const lead = members.find(m => m.role === 'teamlead');

            return (
              <View key={team.id} style={[styles.teamSection, { borderTopColor: teamColor }]}>
                <View style={styles.teamHeader}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  {lead && <Text style={styles.leadText}>Lead: {lead.name}</Text>}
                </View>

                {members.map(member => {
                  const mReports = periodReports.filter(r => r.closerId === member.id);
                  const mLogs = periodLogs.filter(l => l.closerId === member.id);
                  const avgScore = mReports.length > 0 ? Math.round(mReports.reduce((s, r) => s + (r.score || 0), 0) / mReports.length) : 0;
                  const assigned = mLogs.reduce((s, l) => s + l.assigned, 0);
                  const delivered = mLogs.reduce((s, l) => s + l.delivered, 0);
                  const rate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
                  const earnings = mLogs.reduce((s, l) => s + (l.commission?.total ?? 0), 0);

                  return (
                    <View key={member.id} style={styles.memberRow}>
                      <View style={[styles.avatar, { backgroundColor: getRoleBadgeColor(member.role) }]}>
                        <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(member.role) + '30' }]}>
                          <Text style={[styles.roleText, { color: getRoleBadgeColor(member.role) }]}>{getRoleLabel(member.role)}</Text>
                        </View>
                      </View>
                      <View style={styles.memberStats}>
                        <Text style={[styles.statVal, { color: mReports.length > 0 ? getScoreColor(avgScore) : Colors.muted }]}>
                          {mReports.length > 0 ? avgScore : '—'}
                        </Text>
                        <Text style={[styles.statVal, { color: assigned > 0 ? getRateColor(rate) : Colors.red }]}>
                          {rate}%
                        </Text>
                        <Text style={[styles.statVal, { color: earnings > 0 ? Colors.green : Colors.red }]}>
                          {earnings > 0 ? formatNaira(earnings) : '₦0'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
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
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginBottom: 16 },
  teamSection: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border, borderTopWidth: 3,
  },
  teamHeader: { marginBottom: 12 },
  teamName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  leadText: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 11 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 9, fontWeight: '700' as const },
  memberStats: { flexDirection: 'row', gap: 12 },
  statVal: { fontSize: 12, fontWeight: '700' as const, minWidth: 36, textAlign: 'right' as const },
});
