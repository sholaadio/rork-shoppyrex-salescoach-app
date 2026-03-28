import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search, Filter } from 'lucide-react-native';
import { Colors, getScoreColor } from '@/constants/colors';
import { getRoleBadgeColor } from '@/types';
import { useReports, useUsersArray, useTeamsArray } from '@/hooks/useData';
import { formatTimestamp } from '@/utils/date';

export default function AnalysesScreen() {
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
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'AI Analyses', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.green} />}
      >
        <Text style={styles.title}>🤖 AI Call Analyses</Text>
        <Text style={styles.subtitle}>
          {sorted.length} reports · Avg Score: {avgScore > 0 ? avgScore : '—'}
        </Text>

        <View style={styles.searchRow}>
          <Search size={16} color={Colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, product, outcome..."
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, selectedTeam === 'all' && styles.filterActive]}
            onPress={() => setSelectedTeam('all')}
          >
            <Text style={[styles.filterText, selectedTeam === 'all' && { color: '#fff' }]}>All Teams</Text>
          </TouchableOpacity>
          {allTeams.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.filterPill, selectedTeam === t.id && styles.filterActive]}
              onPress={() => setSelectedTeam(t.id)}
            >
              <Text style={[styles.filterText, selectedTeam === t.id && { color: '#fff' }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Filter size={32} color={Colors.muted} />
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        ) : (
          sorted.map(report => {
            const user = allUsers.find(u => u.id === report.closerId);
            return (
              <TouchableOpacity
                key={report.id}
                style={styles.reportCard}
                onPress={() => router.push({ pathname: '/report-detail', params: { id: report.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.reportHeader}>
                  <View style={[styles.scoreCircle, { borderColor: getScoreColor(report.score) }]}>
                    <Text style={[styles.scoreText, { color: getScoreColor(report.score) }]}>{report.score}</Text>
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportProduct} numberOfLines={1}>{report.product}</Text>
                    <View style={styles.reportMeta}>
                      <View style={[styles.closerBadge, { backgroundColor: getRoleBadgeColor(user?.role ?? 'closer') + '20' }]}>
                        <Text style={[styles.closerText, { color: getRoleBadgeColor(user?.role ?? 'closer') }]}>{report.closerName}</Text>
                      </View>
                      <Text style={styles.reportDate}>{formatTimestamp(report.date)}</Text>
                    </View>
                  </View>
                  <View style={styles.reportRight}>
                    <Text style={styles.callTypeIcon}>{report.callType === 'phone' ? '📞' : '💬'}</Text>
                    <View style={[styles.outcomeBadge, { backgroundColor: getOutcomeColor(report.callOutcome) + '20' }]}>
                      <Text style={[styles.outcomeText, { color: getOutcomeColor(report.callOutcome) }]}>{report.callOutcome}</Text>
                    </View>
                  </View>
                </View>
                {report.analysis?.verdict && (
                  <Text style={styles.verdict} numberOfLines={2}>{report.analysis.verdict}</Text>
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

function getOutcomeColor(outcome: string): string {
  switch (outcome?.toLowerCase()) {
    case 'confirmed': return Colors.green;
    case 'pending': return Colors.yellow;
    case 'rejected': return Colors.red;
    case 'not interested': return Colors.red;
    default: return Colors.muted;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: Colors.text, fontSize: 14 },
  filterRow: { marginBottom: 16 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  filterText: { fontSize: 12, fontWeight: '600' as const, color: Colors.muted },
  empty: { backgroundColor: Colors.card, borderRadius: 12, padding: 40, alignItems: 'center', gap: 8 },
  emptyText: { color: Colors.muted, fontSize: 14 },
  reportCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 16, fontWeight: '800' as const },
  reportInfo: { flex: 1 },
  reportProduct: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  closerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  closerText: { fontSize: 10, fontWeight: '600' as const },
  reportDate: { fontSize: 10, color: Colors.muted },
  reportRight: { alignItems: 'flex-end', gap: 4 },
  callTypeIcon: { fontSize: 16 },
  outcomeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  outcomeText: { fontSize: 10, fontWeight: '600' as const, textTransform: 'capitalize' as const },
  verdict: { fontSize: 12, color: Colors.soft, marginTop: 8, lineHeight: 16 },
});
