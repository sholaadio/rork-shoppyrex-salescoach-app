import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, getRateColor } from '@/constants/colors';
import { useLogs } from '@/hooks/useData';
import { updateLog } from '@/services/api';
import { formatNaira } from '@/utils/commission';

export default function ApprovalsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: allLogs, refetch, isRefetching } = useLogs();

  const pendingLogs = useMemo(() => {
    if (!allLogs) return [];
    return allLogs.filter(l => l.status === 'pending' && l.teamId === user?.teamId);
  }, [allLogs, user?.teamId]);

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      return updateLog(id, { status });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update log');
    },
  });

  const handleAction = (id: string, status: 'approved' | 'rejected') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    approveMutation.mutate({ id, status });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.green} />}
        >
          <Text style={styles.title}>Pending Approvals</Text>

          {pendingLogs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No pending approvals!</Text>
            </View>
          ) : (
            pendingLogs.map(log => {
              const rate = log.assigned > 0 ? Math.round((log.delivered / log.assigned) * 100) : 0;
              return (
                <View key={log.id} style={styles.approvalCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.closerName}>{log.closerName}</Text>
                    <Text style={styles.dateText}>{log.date}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>Assigned</Text>
                      <Text style={styles.statValue}>{log.assigned}</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>Delivered</Text>
                      <Text style={styles.statValue}>{log.delivered}</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>Rate</Text>
                      <Text style={[styles.statValue, { color: getRateColor(rate) }]}>{rate}%</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>Commission</Text>
                      <Text style={[styles.statValue, { color: Colors.orange }]}>{formatNaira(log.commission?.total ?? 0)}</Text>
                    </View>
                  </View>
                  {log.upsells > 0 || log.repeats > 0 || log.referrals > 0 ? (
                    <Text style={styles.extras}>
                      {log.upsells > 0 ? `${log.upsells} upsells` : ''}
                      {log.repeats > 0 ? ` · ${log.repeats} repeats` : ''}
                      {log.referrals > 0 ? ` · ${log.referrals} referrals` : ''}
                    </Text>
                  ) : null}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleAction(log.id, 'approved')}
                      activeOpacity={0.7}
                    >
                      <Check size={18} color="#fff" />
                      <Text style={styles.actionText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleAction(log.id, 'rejected')}
                      activeOpacity={0.7}
                    >
                      <X size={18} color="#fff" />
                      <Text style={styles.actionText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

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
  empty: { backgroundColor: Colors.card, borderRadius: 12, padding: 40, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 28 },
  emptyText: { color: Colors.muted, fontSize: 14 },
  approvalCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  closerName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  dateText: { fontSize: 12, color: Colors.muted },
  statsRow: { flexDirection: 'row', marginBottom: 8 },
  stat: { flex: 1 },
  statLabel: { fontSize: 10, color: Colors.muted, textTransform: 'uppercase' as const, fontWeight: '600' as const, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  extras: { fontSize: 12, color: Colors.soft, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 10, paddingVertical: 12, gap: 6 },
  approveBtn: { backgroundColor: Colors.green },
  rejectBtn: { backgroundColor: Colors.red },
  actionText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
});
