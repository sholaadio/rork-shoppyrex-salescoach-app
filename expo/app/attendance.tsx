import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors, getRateColor } from '@/constants/colors';
import { getInitials, getRoleBadgeColor, getRoleLabel } from '@/types';
import { useUsersArray, useLogs } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';

export default function AttendanceScreen() {
  const { user } = useAuth();
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
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Attendance', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>📅 Attendance</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} style={styles.navBtn}>
              <ChevronLeft size={18} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => setMonthOffset(o => o + 1)} style={styles.navBtn}>
              <ChevronRight size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {attendanceData.map(item => (
          <View key={item.user.id} style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: getRoleBadgeColor(item.user.role) }]}>
              <Text style={styles.avatarText}>{getInitials(item.user.name)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.user.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.user.role) + '30' }]}>
                <Text style={[styles.roleText, { color: getRoleBadgeColor(item.user.role) }]}>{getRoleLabel(item.user.role)}</Text>
              </View>
            </View>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Present</Text>
                <Text style={[styles.statValue, { color: Colors.green }]}>{item.present}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Absent</Text>
                <Text style={[styles.statValue, { color: item.absent > 0 ? Colors.red : Colors.muted }]}>{item.absent}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Rate</Text>
                <Text style={[styles.statValue, { color: getRateColor(item.rate) }]}>{item.rate}%</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800' as const, color: Colors.text },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { backgroundColor: Colors.card, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: Colors.border },
  monthText: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, minWidth: 80, textAlign: 'center' as const },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 11 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  roleBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 9, fontWeight: '700' as const },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { alignItems: 'center', minWidth: 36 },
  statLabel: { fontSize: 8, color: Colors.muted, textTransform: 'uppercase' as const },
  statValue: { fontSize: 14, fontWeight: '700' as const },
});
