import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { useUserReports, useTeamReports, useAllReports, useTeamMembers } from '@/hooks/useData';
import { isManagementRole } from '@/types';
import { Period } from '@/types';
import PeriodFilter from '@/components/PeriodFilter';

export default function AISummaryScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const userReports = useUserReports(user?.id ?? '', period);
  const teamReports = useTeamReports(user?.teamId ?? '', period);
  const allReports = useAllReports(period);
  const teamMembers = useTeamMembers(user?.teamId ?? '');

  const reports = useMemo(() => {
    if (!user) return [];
    if (isManagementRole(user.role)) return allReports;
    if (user.role === 'teamlead') {
      const memberIds = teamMembers.map(m => m.id);
      return teamReports.filter(r => memberIds.includes(r.closerId) || r.closerId === user.id);
    }
    return userReports;
  }, [user, allReports, teamReports, teamMembers, userReports]);
  const [summary, setSummary] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (reports.length === 0) throw new Error('No call reports found for this period');

      const summaryParts: string[] = [];
      summaryParts.push(`Performance Summary for ${user?.name}`);
      summaryParts.push(`Total calls: ${reports.length}`);
      const avgScore = Math.round(reports.reduce((s, r) => s + (r.score || 0), 0) / reports.length);
      summaryParts.push(`Average AI Score: ${avgScore}/100`);

      const grade = avgScore >= 90 ? 'A+' : avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : 'D';
      summaryParts.push(`\nOverall Grade: ${grade}`);

      if (avgScore >= 80) {
        summaryParts.push('\nExcellent performance! Maintain consistency and mentor others.');
      } else if (avgScore >= 60) {
        summaryParts.push('\nGood foundation. Focus on improving call structure and closing techniques.');
      } else {
        summaryParts.push('\nNeeds improvement. Review top weaknesses and practice daily.');
      }

      const allStrengths = reports.flatMap(r => r.analysis?.strengths ?? []);
      const allWeaknesses = reports.flatMap(r => r.analysis?.weaknesses ?? []);

      if (allStrengths.length > 0) {
        summaryParts.push('\n\nTop Strengths:');
        const unique = [...new Set(allStrengths)].slice(0, 5);
        unique.forEach(s => summaryParts.push(`✅ ${s}`));
      }

      if (allWeaknesses.length > 0) {
        summaryParts.push('\n\nAreas to Improve:');
        const unique = [...new Set(allWeaknesses)].slice(0, 5);
        unique.forEach(w => summaryParts.push(`⚠️ ${w}`));
      }

      return summaryParts.join('\n');
    },
    onSuccess: (data) => setSummary(data),
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'AI Summary', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>✨ AI Summary Report</Text>
        <Text style={styles.subtitle}>AI-powered analysis of your call performance</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Select period:</Text>
          <PeriodFilter selected={period} onSelect={setPeriod} />
          <Text style={styles.reportCount}>{reports.length} call reports found</Text>

          <TouchableOpacity
            style={[styles.generateBtn, reports.length === 0 && { opacity: 0.5 }]}
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || reports.length === 0}
            activeOpacity={0.8}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Sparkles size={18} color="#fff" />
                <Text style={styles.generateText}>Generate AI Summary Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 16 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  cardLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 10 },
  reportCount: { fontSize: 12, color: Colors.muted, marginBottom: 16 },
  generateBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.orange,
    borderRadius: 12, paddingVertical: 16, gap: 8,
  },
  generateText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  summaryCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  summaryText: { fontSize: 14, color: Colors.soft, lineHeight: 22 },
});
