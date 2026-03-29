import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertCircle, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { getScoreColor, getRateColor } from '@/constants/colors';
import { Period, getInitials } from '@/types';
import { useTeamMembers, useTeamName, useTeamReports, useTeamLogs, useLogs, useReports } from '@/hooks/useData';
import { getToday } from '@/utils/date';
import StatCard from '@/components/StatCard';
import PeriodFilter from '@/components/PeriodFilter';

export default function MyTeamScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const teamName = useTeamName(user?.teamId);
  const teamMembers = useTeamMembers(user?.teamId ?? '');
  const teamReports = useTeamReports(user?.teamId ?? '', period);
  const teamLogs = useTeamLogs(user?.teamId ?? '', period);
  const { refetch: rl, isRefetching: r1 } = useLogs();
  const { refetch: rr, isRefetching: r2 } = useReports();

  const closers = useMemo(() => teamMembers.filter(m => m.role === 'closer'), [teamMembers]);

  const pendingCount = useMemo(() => {
    return teamLogs.filter(l => l.status === 'pending').length;
  }, [teamLogs]);

  const redFlagCount = useMemo(() => {
    return closers.filter(c => {
      const weekLogs = teamLogs.filter(l => l.closerId === c.id && l.status === 'approved');
      const assigned = weekLogs.reduce((s, l) => s + l.assigned, 0);
      const delivered = weekLogs.reduce((s, l) => s + l.delivered, 0);
      const rate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
      return assigned > 0 && rate < 60;
    }).length;
  }, [closers, teamLogs]);

  const hasLogToday = useMemo(() => {
    const today = getToday();
    return teamLogs.some(l => l.closerId === user?.id && l.date === today);
  }, [teamLogs, user?.id]);

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
          {!hasLogToday && (
            <TouchableOpacity style={[styles.alertBanner, { borderColor: colors.orange + '30' }]} onPress={() => router.push('/teamlead/calls')} activeOpacity={0.8}>
              <AlertCircle size={18} color={colors.orange} />
              <Text style={[styles.alertText, { color: colors.orange }]}>No daily log yet today</Text>
              <ChevronRight size={16} color={colors.orange} />
            </TouchableOpacity>
          )}

          <Text style={[styles.title, { color: colors.text }]}>{teamName}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{closers.length} members</Text>

          <PeriodFilter selected={period} onSelect={setPeriod} />

          <View style={styles.statsRow}>
            <StatCard label="TEAM CALLS" value={String(teamReports.length)} accentColor={colors.green} />
            <View style={{ width: 8 }} />
            <StatCard label="MEMBERS" value={String(closers.length)} accentColor={colors.blue} />
          </View>
          <View style={[styles.statsRow, { marginTop: 8 }]}>
            <StatCard label="PENDING" value={String(pendingCount)} accentColor={colors.yellow} />
            <View style={{ width: 8 }} />
            <StatCard label="RED FLAGS" value={String(redFlagCount)} accentColor={colors.red} />
          </View>

          <View style={{ marginTop: 20 }}>
            {closers.map(member => {
              const memberReports = teamReports.filter(r => r.closerId === member.id);
              const memberLogs = teamLogs.filter(l => l.closerId === member.id && l.status === 'approved');
              const avgScore = memberReports.length > 0
                ? Math.round(memberReports.reduce((s, r) => s + (r.score || 0), 0) / memberReports.length)
                : 0;
              const assigned = memberLogs.reduce((s, l) => s + l.assigned, 0);
              const delivered = memberLogs.reduce((s, l) => s + l.delivered, 0);
              const rate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
              const todayLog = teamLogs.find(l => l.closerId === member.id && l.date === getToday());

              return (
                <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: colors.green }]}>
                  <View style={styles.memberHeader}>
                    <View style={[styles.memberAvatar, { backgroundColor: colors.blue }]}>
                      <Text style={styles.memberAvatarText}>{getInitials(member.name)}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                      <Text style={[styles.memberCalls, { color: colors.muted }]}>{memberReports.length} calls</Text>
                    </View>
                    <View style={styles.memberMeta}>
                      <Text style={[styles.metaLabel, { color: colors.muted }]}>TODAY LOG</Text>
                      <Text style={[styles.metaValue, { color: todayLog ? colors.green : colors.orange }]}>
                        {todayLog ? 'Logged' : 'Not logged'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.memberStats}>
                    <View style={[styles.badge, { backgroundColor: (memberReports.length > 0 ? getScoreColor(avgScore, colors) : colors.muted) + '20' }]}>
                      <Text style={[styles.badgeText, { color: memberReports.length > 0 ? getScoreColor(avgScore, colors) : colors.muted }]}>
                        Score: {memberReports.length > 0 ? avgScore : '—'}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: (assigned > 0 ? getRateColor(rate, colors) : colors.muted) + '20' }]}>
                      <Text style={[styles.badgeText, { color: assigned > 0 ? getRateColor(rate, colors) : colors.muted }]}>
                        {assigned > 0 ? `${rate}%` : '0%'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

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
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, gap: 8,
  },
  alertText: { flex: 1, fontWeight: '600' as const, fontSize: 13 },
  title: { fontSize: 22, fontWeight: '800' as const },
  subtitle: { fontSize: 13, marginBottom: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 0 },
  memberCard: {
    borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderTopWidth: 3,
  },
  memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '700' as const },
  memberCalls: { fontSize: 12 },
  memberMeta: { alignItems: 'flex-end' },
  metaLabel: { fontSize: 9, fontWeight: '700' as const, textTransform: 'uppercase' as const },
  metaValue: { fontSize: 12, fontWeight: '600' as const },
  memberStats: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' as const },
});
