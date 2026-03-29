import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { getScoreColor, ThemeColors } from '@/constants/colors';
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
            <View style={[styles.empty, { backgroundColor: colors.card }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>No calls in this period</Text>
            </View>
          ) : (
            sorted.map(call => (
              <TouchableOpacity
                key={call.id}
                style={[styles.callCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/report-detail', params: { id: call.id } })}
                activeOpacity={0.7}
              >
                <View style={[styles.scoreCircle, { borderColor: getScoreColor(call.score, colors) }]}>
                  <Text style={[styles.scoreText, { color: getScoreColor(call.score, colors) }]}>{call.score}</Text>
                </View>
                <View style={styles.callInfo}>
                  <Text style={[styles.callProduct, { color: colors.text }]} numberOfLines={1}>
                    {call.product} · {call.callType === 'phone' ? '📞' : '💬'}
                  </Text>
                  <Text style={[styles.callDesc, { color: colors.muted }]} numberOfLines={1}>
                    {call.analysis?.verdict || 'No analysis'}
                  </Text>
                </View>
                <View style={styles.rightSection}>
                  <Text style={[styles.outcomeLabel, { color: getOutcomeColor(call.callOutcome, colors) }]}>
                    {call.callOutcome}
                  </Text>
                  <Text style={[styles.dateLabel, { color: colors.muted }]}>{formatTimestamp(call.date)}</Text>
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

function getOutcomeColor(outcome: string, c: ThemeColors): string {
  switch (outcome?.toLowerCase()) {
    case 'confirmed': return c.green;
    case 'pending': return c.yellow;
    case 'rejected': return c.red;
    default: return c.muted;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, marginBottom: 16 },
  empty: { borderRadius: 12, padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  callCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, gap: 12,
  },
  scoreCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 16, fontWeight: '800' as const },
  callInfo: { flex: 1 },
  callProduct: { fontSize: 14, fontWeight: '600' as const },
  callDesc: { fontSize: 12, marginTop: 2 },
  rightSection: { alignItems: 'flex-end' },
  outcomeLabel: { fontSize: 12, fontWeight: '600' as const },
  dateLabel: { fontSize: 11, marginTop: 2 },
});
