import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { Colors, getScoreColor } from '@/constants/colors';
import { Period } from '@/types';
import { useUserReports, useReports } from '@/hooks/useData';
import { formatTimestamp } from '@/utils/date';
import PeriodFilter from '@/components/PeriodFilter';

export default function HistoryScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const reports = useUserReports(user?.id ?? '', period);
  const { refetch, isRefetching } = useReports();

  const sorted = useMemo(() => [...reports].sort((a, b) => b.date - a.date), [reports]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.green} />}
        >
          <Text style={[styles.title, { color: colors.text }]}>My Call History</Text>
          <PeriodFilter selected={period} onSelect={setPeriod} />

          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No calls in this period</Text>
            </View>
          ) : (
            sorted.map(call => (
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
                  <Text style={styles.callProduct} numberOfLines={1}>
                    {call.product} · {call.callType === 'phone' ? '📞' : '💬'}
                  </Text>
                  <Text style={styles.callDesc} numberOfLines={1}>
                    {call.analysis?.verdict || 'No analysis'}
                  </Text>
                </View>
                <View style={styles.rightSection}>
                  <Text style={[styles.outcomeLabel, { color: getOutcomeColor(call.callOutcome) }]}>
                    {call.callOutcome}
                  </Text>
                  <Text style={styles.dateLabel}>{formatTimestamp(call.date)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function getOutcomeColor(outcome: string): string {
  switch (outcome?.toLowerCase()) {
    case 'confirmed': return Colors.green;
    case 'pending': return Colors.yellow;
    case 'rejected': return Colors.red;
    default: return Colors.muted;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginBottom: 16 },
  empty: { backgroundColor: Colors.card, borderRadius: 12, padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.muted, fontSize: 14 },
  callCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  scoreCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 16, fontWeight: '800' as const },
  callInfo: { flex: 1 },
  callProduct: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  callDesc: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  rightSection: { alignItems: 'flex-end' },
  outcomeLabel: { fontSize: 12, fontWeight: '600' as const },
  dateLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },
});
