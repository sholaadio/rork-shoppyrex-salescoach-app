import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react-native';
import { Colors, getRateColor, getTierColor } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { getInitials, getRoleBadgeColor } from '@/types';
import { useUsersArray, useTeamsArray, useLogs } from '@/hooks/useData';
import { getMonthLabel } from '@/utils/date';
import { formatNaira } from '@/utils/commission';
import StatCard from '@/components/StatCard';

export default function PayReportScreen() {
  const colors = useColors();
  const allUsers = useUsersArray();
  const allTeams = useTeamsArray();
  const { data: allLogs, refetch, isRefetching } = useLogs();

  const [monthOffset, setMonthOffset] = useState(0);

  const currentMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthOffset]);

  const monthLogs = useMemo(() => {
    if (!allLogs) return [];
    return allLogs.filter(l => l.status === 'approved' && l.date.startsWith(currentMonth));
  }, [allLogs, currentMonth]);

  const closersAndLeads = useMemo(() => {
    return allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead');
  }, [allUsers]);

  const breakdown = useMemo(() => {
    return closersAndLeads.map(u => {
      const logs = monthLogs.filter(l => l.closerId === u.id);
      const team = allTeams.find(t => t.id === u.teamId);
      const days = new Set(logs.map(l => l.date)).size;
      const delivered = logs.reduce((s, l) => s + l.delivered, 0);
      const assigned = logs.reduce((s, l) => s + l.assigned, 0);
      const rate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
      const tier = rate >= 90 ? 'gold' : rate >= 65 ? 'silver' : rate >= 50 ? 'bronze' : 'none';
      const base = logs.reduce((s, l) => s + (l.commission?.base ?? 0), 0);
      const upsell = logs.reduce((s, l) => s + (l.commission?.upsellBonus ?? 0), 0);
      const repeat = logs.reduce((s, l) => s + (l.commission?.repeatBonus ?? 0), 0);
      const referral = logs.reduce((s, l) => s + (l.commission?.referralBonus ?? 0), 0);
      const total = logs.reduce((s, l) => s + (l.commission?.total ?? 0), 0);
      return { user: u, team, days, delivered, assigned, rate, tier, base, upsell, repeat, referral, total };
    }).sort((a, b) => b.total - a.total);
  }, [closersAndLeads, monthLogs, allTeams]);

  const grandTotal = useMemo(() => breakdown.reduce((s, b) => s + b.total, 0), [breakdown]);
  const totalDelivered = useMemo(() => breakdown.reduce((s, b) => s + b.delivered, 0), [breakdown]);
  const avgRate = useMemo(() => {
    const totalAssigned = breakdown.reduce((s, b) => s + b.assigned, 0);
    return totalAssigned > 0 ? Math.round((totalDelivered / totalAssigned) * 100) : 0;
  }, [breakdown, totalDelivered]);

  const teamBreakdown = useMemo(() => {
    return allTeams.map(team => {
      const items = breakdown.filter(b => b.team?.id === team.id);
      const total = items.reduce((s, b) => s + b.total, 0);
      return { team, items, total };
    }).sort((a, b) => b.total - a.total);
  }, [allTeams, breakdown]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Pay Report', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.green} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>💰 Pay Report</Text>
            <Text style={styles.subtitle}>Payroll-ready commission breakdown</Text>
          </View>
          <FileText size={24} color={Colors.green} />
        </View>

        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} style={styles.navBtn}>
            <ChevronLeft size={18} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{getMonthLabel(currentMonth)}</Text>
          <TouchableOpacity onPress={() => setMonthOffset(o => o + 1)} style={styles.navBtn}>
            <ChevronRight size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="GRAND TOTAL" value={formatNaira(grandTotal)} accentColor={Colors.green} />
        </View>
        <View style={[styles.statsRow, { marginTop: 8, marginBottom: 20 }]}>
          <StatCard label="TOTAL DELIVERED" value={String(totalDelivered)} accentColor={Colors.blue} />
          <View style={{ width: 8 }} />
          <StatCard label="AVG DELIVERY RATE" value={`${avgRate}%`} accentColor={getRateColor(avgRate)} />
        </View>

        {teamBreakdown.map(({ team, items, total }) => (
          <View key={team.id} style={styles.teamSection}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={[styles.teamTotal, { color: total > 0 ? Colors.green : Colors.muted }]}>{formatNaira(total)}</Text>
            </View>

            {items.map(item => (
              <View key={item.user.id} style={styles.staffRow}>
                <View style={[styles.avatar, { backgroundColor: getRoleBadgeColor(item.user.role) }]}>
                  <Text style={styles.avatarText}>{getInitials(item.user.name)}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{item.user.name}</Text>
                  <View style={styles.detailsRow}>
                    <View style={styles.detail}>
                      <Text style={styles.detailLabel}>Days</Text>
                      <Text style={styles.detailValue}>{item.days}</Text>
                    </View>
                    <View style={styles.detail}>
                      <Text style={styles.detailLabel}>Del/Asgn</Text>
                      <Text style={styles.detailValue}>{item.delivered}/{item.assigned}</Text>
                    </View>
                    <View style={styles.detail}>
                      <Text style={styles.detailLabel}>Rate</Text>
                      <Text style={[styles.detailValue, { color: getRateColor(item.rate) }]}>{item.rate}%</Text>
                    </View>
                    <View style={styles.detail}>
                      <Text style={styles.detailLabel}>Tier</Text>
                      <Text style={[styles.detailValue, { color: getTierColor(item.tier) }]}>{item.tier.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.commRow}>
                    <Text style={styles.commItem}>Base: {formatNaira(item.base)}</Text>
                    <Text style={styles.commItem}>Upsell: {formatNaira(item.upsell)}</Text>
                    <Text style={styles.commItem}>Repeat: {formatNaira(item.repeat)}</Text>
                    <Text style={styles.commItem}>Referral: {formatNaira(item.referral)}</Text>
                  </View>
                </View>
                <Text style={[styles.staffTotal, { color: item.total > 0 ? Colors.green : Colors.red }]}>
                  {formatNaira(item.total)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  navBtn: { backgroundColor: Colors.card, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: Colors.border },
  monthText: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, minWidth: 140, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' },
  teamSection: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  teamName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  teamTotal: { fontSize: 16, fontWeight: '800' as const },
  staffRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  avatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 11 },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 13, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  detailsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' as const, marginBottom: 4 },
  detail: { backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  detailLabel: { fontSize: 8, color: Colors.muted, textTransform: 'uppercase' as const },
  detailValue: { fontSize: 11, fontWeight: '600' as const, color: Colors.text },
  commRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' as const },
  commItem: { fontSize: 10, color: Colors.soft },
  staffTotal: { fontSize: 14, fontWeight: '800' as const, marginTop: 2 },
});
