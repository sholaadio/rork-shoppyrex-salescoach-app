import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors, getScoreColor } from '@/constants/colors';
import { useReports } from '@/hooks/useData';
import { formatTimestamp } from '@/utils/date';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: reports } = useReports();

  const report = useMemo(() => {
    if (!reports) return null;
    return reports.find(r => r.id === id);
  }, [reports, id]);

  if (!report) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Call Analysis', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Report not found</Text>
        </View>
      </View>
    );
  }

  const analysis = report.analysis;
  const score = report.score || analysis?.overallScore || 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Call Analysis', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreSection}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(score) }]}>
            <Text style={[styles.scoreNum, { color: getScoreColor(score) }]}>{score}</Text>
            <Text style={styles.scoreOf}>/100</Text>
          </View>
        </View>

        <View style={styles.metaCard}>
          <MetaRow label="Product" value={report.product} />
          <MetaRow label="Call Type" value={report.callType === 'phone' ? '📞 Phone Call' : '💬 WhatsApp'} />
          <MetaRow label="Outcome" value={report.callOutcome} />
          <MetaRow label="Date" value={formatTimestamp(report.date)} />
          <MetaRow label="Closer" value={report.closerName} />
        </View>

        {analysis?.verdict && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verdict</Text>
            <Text style={styles.verdictText}>{analysis.verdict}</Text>
          </View>
        )}

        {(analysis?.strengths?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.green }]}>Strengths</Text>
            {analysis!.strengths!.map((s: string, i: number) => (
              <Text key={i} style={styles.listItem}>✅ {s}</Text>
            ))}
          </View>
        )}

        {(analysis?.weaknesses?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.red }]}>Weaknesses</Text>
            {analysis!.weaknesses!.map((w: string, i: number) => (
              <Text key={i} style={styles.listItem}>⚠️ {w}</Text>
            ))}
          </View>
        )}

        {(analysis?.improvements?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.blue }]}>Improvements</Text>
            {analysis!.improvements!.map((imp: string, i: number) => (
              <Text key={i} style={styles.listItem}>💡 {imp}</Text>
            ))}
          </View>
        )}

        {analysis?.skillBreakdown && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skill Breakdown</Text>
            {Object.entries(analysis.skillBreakdown).map(([skill, val]) => (
              <View key={skill} style={styles.skillRow}>
                <Text style={styles.skillLabel}>{skill}</Text>
                <View style={styles.skillBar}>
                  <View style={[styles.skillFill, { width: `${Math.min(Number(val), 100)}%`, backgroundColor: getScoreColor(Number(val)) }]} />
                </View>
                <Text style={[styles.skillVal, { color: getScoreColor(Number(val)) }]}>{String(val)}</Text>
              </View>
            ))}
          </View>
        )}

        {analysis?.scriptSuggestion && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.purple }]}>Script Suggestion</Text>
            <Text style={styles.scriptText}>{analysis.scriptSuggestion}</Text>
          </View>
        )}

        {(analysis?.learningResources?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learning Resources</Text>
            {analysis!.learningResources!.map((res: any, i: number) => (
              <View key={i} style={styles.resourceCard}>
                <Text style={styles.resourceType}>{res.type}</Text>
                <Text style={styles.resourceTitle}>{res.title}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={mrStyles.row}>
      <Text style={mrStyles.label}>{label}</Text>
      <Text style={mrStyles.value}>{value}</Text>
    </View>
  );
}

const mrStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: 13, color: Colors.muted },
  value: { fontSize: 13, fontWeight: '600' as const, color: Colors.text, textTransform: 'capitalize' as const },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.muted, fontSize: 14 },
  scoreSection: { alignItems: 'center', marginBottom: 20 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  scoreNum: { fontSize: 36, fontWeight: '900' as const },
  scoreOf: { fontSize: 14, color: Colors.muted },
  metaCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  section: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  verdictText: { fontSize: 14, color: Colors.soft, lineHeight: 20 },
  listItem: { fontSize: 13, color: Colors.soft, marginBottom: 4, lineHeight: 18 },
  skillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  skillLabel: { fontSize: 12, color: Colors.soft, width: 90 },
  skillBar: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' as const },
  skillFill: { height: '100%', borderRadius: 4 },
  skillVal: { fontSize: 12, fontWeight: '700' as const, minWidth: 24, textAlign: 'right' as const },
  scriptText: { fontSize: 13, color: Colors.soft, lineHeight: 20, fontStyle: 'italic' as const },
  resourceCard: { backgroundColor: Colors.background, borderRadius: 8, padding: 10, marginBottom: 6 },
  resourceType: { fontSize: 10, color: Colors.muted, textTransform: 'uppercase' as const, fontWeight: '600' as const },
  resourceTitle: { fontSize: 13, color: Colors.text, marginTop: 2 },
});
