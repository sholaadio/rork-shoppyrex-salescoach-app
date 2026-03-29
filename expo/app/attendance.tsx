import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getRateColor } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { getInitials, getRoleBadgeColor, getRoleLabel } from '@/types';
import { useUsersArray, useLogs } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const allUsers = useUsersArray();
  const { data: allLogs } = useLogs();

  const [monthOffset, setMonthOffset] = useState(0);

  const currentMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthOffset]);

  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [currentMonth]);

  const workdays = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    let count = 0;
    const now = new Date();
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      if (date > now) break;
      const day = date.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  }, [currentMonth]);

  const relevantUsers = useMemo(() => {
    if (user?.role === 'closer') {
      return allUsers.filter(u => u.id === user.id);
    }
    if (user?.role === 'teamlead') {
      return allUsers.filter(u => u.teamId === user.teamId);
    }
    return allUsers.filter(u => u.role === 'closer' || u.role === 'teamlead');
  }, [allUsers, user]);

  const attendanceData = useMemo(() => {
    if (!allLogs) return [];
    return relevantUsers.map(u => {
      const approvedLogs = allLogs.filter(l => l.closerId === u.id && l.status === 'approved' && l.date.startsWith(currentMonth));
      const presentDays = new Set(approvedLogs.map(l => l.date)).size;
      const absent = Math.max(workdays - presentDays, 0);
      const rate = workdays > 0 ? Math.round((presentDays / workdays) * 100) : 0;
      return { user: u, present: presentDays, absent, workdays, rate };
    }).sort((a, b) => a.user.name.localeCompare(b.user.name));
  }, [relevantUsers, allLogs, currentMonth, workdays]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Attendance', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>📅 Attendance</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ChevronLeft size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: colors.text }]}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => setMonthOffset(o => o + 1)} style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ChevronRight size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {attendanceData.map(item => (
          <View key={item.user.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: getRoleBadgeColor(item.user.role) }]}>
              <Text style={styles.avatarText}>{getInitials(item.user.name)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>{item.user.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.user.role) + '30' }]}>
                <Text style={[styles.roleText, { color: getRoleBadgeColor(item.user.role) }]}>{getRoleLabel(item.user.role)}</Text>
              </View>
            </View>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Present</Text>
                <Text style={[styles.statValue, { color: colors.green }]}>{item.present}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Absent</Text>
                <Text style={[styles.statValue, { color: item.absent > 0 ? colors.red : colors.muted }]}>{item.absent}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Rate</Text>
                <Text style={[styles.statValue, { color: getRateColor(item.rate, colors) }]}>{item.rate}%</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800' as const },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { borderRadius: 8, padding: 8, borderWidth: 1 },
  monthText: { fontSize: 14, fontWeight: '600' as const, minWidth: 80, textAlign: 'center' as const },
  row: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, gap: 10,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 11 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600' as const },
  roleBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 9, fontWeight: '700' as const },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { alignItems: 'center', minWidth: 36 },
  statLabel: { fontSize: 8, textTransform: 'uppercase' as const },
  statValue: { fontSize: 14, fontWeight: '700' as const },
});
