import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search, Filter } from 'lucide-react-native';
import { getScoreColor, ThemeColors } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { getRoleBadgeColor } from '@/types';
import { useReports, useUsersArray, useTeamsArray } from '@/hooks/useData';
import { formatTimestamp } from '@/utils/date';

export default function AnalysesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: allReports, refetch, isRefetching } = useReports();
  const allUsers = useUsersArray();
  const allTeams = useTeamsArray();

  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');

  const sorted = useMemo(() => {
    if (!allReports) return [];
    let filtered = [...allReports];

    if (selectedTeam !== 'all') {
      filtered = filtered.filter(r => r.teamId === selectedTeam);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.closerName.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.callOutcome.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => b.date - a.date);
  }, [allReports, selectedTeam, search]);

  const avgScore = useMemo(() => {
    if (sorted.length === 0) return 0;
    return Math.round(sorted.reduce((s, r) => s + (r.score || 0), 0) / sorted.length);
  }, [sorted]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'AI Analyses', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.green} />}
      >
        <Text style={[styles.title, { color: colors.text }]}>🤖 AI Call Analyses</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {sorted.length} reports · Avg Score: {avgScore > 0 ? avgScore : '—'}
        </Text>

        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, product, outcome..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, { backgroundColor: colors.card, borderColor: colors.border }, selectedTeam === 'all' && { backgroundColor: colors.green, borderColor: colors.green }]}
            onPress={() => setSelectedTeam('all')}
          >
            <Text style={[styles.filterText, { color: colors.muted }, selectedTeam === 'all' && { color: '#fff' }]}>All Teams</Text>
          </TouchableOpacity>
          {allTeams.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.filterPill, { backgroundColor: colors.card, borderColor: colors.border }, selectedTeam === t.id && { backgroundColor: colors.green, borderColor: colors.green }]}
              onPress={() => setSelectedTeam(t.id)}
            >
              <Text style={[styles.filterText, { color: colors.muted }, selectedTeam === t.id && { color: '#fff' }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {sorted.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <Filter size={32} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No reports found</Text>
          </View>
        ) : (
          sorted.map(report => {
            const user = allUsers.find(u => u.id === report.closerId);
            return (
              <TouchableOpacity
                key={report.id}
                style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/report-detail', params: { id: report.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.reportHeader}>
                  <View style={[styles.scoreCircle, { borderColor: getScoreColor(report.score, colors) }]}>
                    <Text style={[styles.scoreText, { color: getScoreColor(report.score, colors) }]}>{report.score}</Text>
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={[styles.reportProduct, { color: colors.text }]} numberOfLines={1}>{report.product}</Text>
                    <View style={styles.reportMeta}>
                      <View style={[styles.closerBadge, { backgroundColor: getRoleBadgeColor(user?.role ?? 'closer') + '20' }]}>
                        <Text style={[styles.closerText, { color: getRoleBadgeColor(user?.role ?? 'closer') }]}>{report.closerName}</Text>
                      </View>
                      <Text style={[styles.reportDate, { color: colors.muted }]}>{formatTimestamp(report.date)}</Text>
                    </View>
                  </View>
                  <View style={styles.reportRight}>
                    <Text style={styles.callTypeIcon}>{report.callType === 'phone' ? '📞' : '💬'}</Text>
                    <View style={[styles.outcomeBadge, { backgroundColor: getOutcomeColor(report.callOutcome, colors) + '20' }]}>
                      <Text style={[styles.outcomeText, { color: getOutcomeColor(report.callOutcome, colors) }]}>{report.callOutcome}</Text>
                    </View>
                  </View>
                </View>
                {report.analysis?.verdict && (
                  <Text style={[styles.verdict, { color: colors.soft }]} numberOfLines={2}>{report.analysis.verdict}</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function getOutcomeColor(outcome: string, c: ThemeColors): string {
  switch (outcome?.toLowerCase()) {
    case 'confirmed': return c.green;
    case 'pending': return c.yellow;
    case 'rejected': return c.red;
    case 'not interested': return c.red;
    default: return c.muted;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const },
  subtitle: { fontSize: 13, marginBottom: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  filterRow: { marginBottom: 16 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '600' as const },
  empty: { borderRadius: 12, padding: 40, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },
  reportCard: {
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 16, fontWeight: '800' as const },
  reportInfo: { flex: 1 },
  reportProduct: { fontSize: 14, fontWeight: '700' as const },
  reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  closerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  closerText: { fontSize: 10, fontWeight: '600' as const },
  reportDate: { fontSize: 10 },
  reportRight: { alignItems: 'flex-end', gap: 4 },
  callTypeIcon: { fontSize: 16 },
  outcomeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  outcomeText: { fontSize: 10, fontWeight: '600' as const, textTransform: 'capitalize' as const },
  verdict: { fontSize: 12, marginTop: 8, lineHeight: 16 },
});
