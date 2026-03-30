import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { getScoreColor } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { useReports } from '@/hooks/useData';
import { formatTimestamp } from '@/utils/date';
import { Clock, BarChart3 } from 'lucide-react-native';

const SKILL_ORDER = [
  'Opening & Rapport',
  'Needs Discovery',
  'Product Pitch',
  'Objection Handling',
  'Urgency Creation',
  'Close Attempt',
];

function normalizeSkillKey(key: string): string {
  const lower = key.toLowerCase().replace(/[_-]/g, ' ').trim();
  for (const skill of SKILL_ORDER) {
    if (skill.toLowerCase() === lower) return skill;
    if (lower.includes(skill.toLowerCase().split(' ')[0].toLowerCase())) return skill;
  }
  return key;
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { data: reports } = useReports();

  const report = useMemo(() => {
    if (!reports) return null;
    return reports.find(r => r.id === id);
  }, [reports, id]);



  if (!report) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Call Analysis', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Report not found</Text>
        </View>
      </View>
    );
  }

  const analysis: any = report.analysis;
  const score = report.score || analysis?.overallScore || 0;
  const closeRate = analysis?.closeRate;
  const duration = analysis?.duration;
  const ngLanguage = analysis?.languageNote || analysis?.ngLanguage || analysis?.language;
  const criticalMoment = analysis?.transcriptInsight || analysis?.criticalMoment;
  const memorizeScript = analysis?.memorizeScript || analysis?.scriptSuggestion;
  const skillBreakdown = analysis?.skillBreakdown;
  const metricsArray = analysis?.metrics;
  const orderedSkills = useMemo(() => {
    if (Array.isArray(metricsArray) && metricsArray.length > 0) {
      const ordered: Array<{ name: string; value: number }> = [];
      const used = new Set<number>();
      for (const canonical of SKILL_ORDER) {
        const idx = metricsArray.findIndex((m: any) => normalizeSkillKey(m.label || m.name || '') === canonical);
        if (idx !== -1) {
          ordered.push({ name: canonical, value: Number(metricsArray[idx].score ?? metricsArray[idx].value ?? 0) });
          used.add(idx);
        }
      }
      metricsArray.forEach((m: any, i: number) => {
        if (!used.has(i)) {
          ordered.push({ name: m.label || m.name || `Skill ${i + 1}`, value: Number(m.score ?? m.value ?? 0) });
        }
      });
      return ordered;
    }
    if (!skillBreakdown) return [];
    const entries = Object.entries(skillBreakdown);
    const ordered: Array<{ name: string; value: number }> = [];
    const used = new Set<string>();

    for (const canonical of SKILL_ORDER) {
      const match = entries.find(([k]) => normalizeSkillKey(k) === canonical);
      if (match) {
        ordered.push({ name: canonical, value: Number(match[1]) });
        used.add(match[0]);
      }
    }
    for (const [k, v] of entries) {
      if (!used.has(k)) {
        ordered.push({ name: k, value: Number(v) });
      }
    }
    return ordered;
  }, [skillBreakdown, metricsArray]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Call Analysis', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreSection}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(score, colors) }]}>
            <Text style={[styles.scoreNum, { color: getScoreColor(score, colors) }]}>{score}</Text>
            <Text style={[styles.scoreOf, { color: colors.muted }]}>/100</Text>
          </View>

          {(closeRate != null || duration != null) && (
            <View style={styles.statPillsRow}>
              {closeRate != null && (
                <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <BarChart3 size={13} color={colors.blue} />
                  <Text style={[styles.statPillLabel, { color: colors.muted }]}>Close Rate</Text>
                  <Text style={[styles.statPillValue, { color: colors.text }]}>{closeRate}%</Text>
                </View>
              )}
              {duration != null && (
                <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Clock size={13} color={colors.purple} />
                  <Text style={[styles.statPillLabel, { color: colors.muted }]}>Duration</Text>
                  <Text style={[styles.statPillValue, { color: colors.text }]}>{duration}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MetaRow label="Product" value={report.product} colors={colors} />
          <MetaRow label="Call Type" value={report.callType === 'phone' ? '📞 Phone Call' : '💬 WhatsApp'} colors={colors} />
          <MetaRow label="Outcome" value={report.callOutcome} colors={colors} />
          <MetaRow label="Date" value={formatTimestamp(report.date)} colors={colors} />
          <MetaRow label="Closer" value={report.closerName} colors={colors} />
        </View>

        {analysis?.verdict && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Verdict</Text>
            <Text style={[styles.verdictText, { color: colors.soft }]}>{analysis.verdict}</Text>
          </View>
        )}

        {(analysis?.strengths?.length ?? 0) > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.green }]}>Strengths</Text>
            {analysis!.strengths!.map((s: string, i: number) => (
              <Text key={i} style={[styles.listItem, { color: colors.soft }]}>✅ {s}</Text>
            ))}
          </View>
        )}

        {(analysis?.weaknesses?.length ?? 0) > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.red }]}>Weaknesses</Text>
            {analysis!.weaknesses!.map((w: string, i: number) => (
              <Text key={i} style={[styles.listItem, { color: colors.soft }]}>⚠️ {w}</Text>
            ))}
          </View>
        )}

        {(analysis?.improvements?.length ?? 0) > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.blue }]}>Improvements</Text>
            {analysis!.improvements!.map((imp: string, i: number) => (
              <Text key={i} style={[styles.listItem, { color: colors.soft }]}>💡 {imp}</Text>
            ))}
          </View>
        )}

        {orderedSkills.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Skill Breakdown</Text>
            {orderedSkills.map((skill) => (
              <View key={skill.name} style={styles.skillRow}>
                <Text style={[styles.skillLabel, { color: colors.soft }]}>{skill.name}</Text>
                <View style={[styles.skillBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.skillFill, { width: `${Math.min(skill.value, 100)}%`, backgroundColor: getScoreColor(skill.value, colors) }]} />
                </View>
                <Text style={[styles.skillVal, { color: getScoreColor(skill.value, colors) }]}>{skill.value}</Text>
              </View>
            ))}
          </View>
        )}

        {ngLanguage && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.ngIcon}>🗣️</Text>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: colors.text }]}>NG Language</Text>
            </View>
            <Text style={[styles.sectionBody, { color: colors.soft }]}>{typeof ngLanguage === 'string' ? ngLanguage : JSON.stringify(ngLanguage)}</Text>
          </View>
        )}

        {criticalMoment && (
          <View style={[styles.section, styles.criticalCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: colors.yellow }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.ngIcon}>⚡</Text>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: colors.yellow }]}>Critical Moment</Text>
            </View>
            <Text style={[styles.sectionBody, { color: colors.soft }]}>{typeof criticalMoment === 'string' ? criticalMoment : JSON.stringify(criticalMoment)}</Text>
          </View>
        )}

        {memorizeScript && (
          <View style={[styles.section, styles.memorizeCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: colors.green }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.ngIcon}>📝</Text>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: colors.green }]}>Memorize This Script</Text>
            </View>
            <Text style={[styles.memorizeText, { color: colors.soft }]}>{memorizeScript}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function MetaRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[mrStyles.row, { borderBottomColor: colors.border }]}>
      <Text style={[mrStyles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[mrStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const mrStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '600' as const, textTransform: 'capitalize' as const },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14 },
  scoreSection: { alignItems: 'center', marginBottom: 20 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  scoreNum: { fontSize: 36, fontWeight: '900' as const },
  scoreOf: { fontSize: 14 },
  statPillsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  statPillLabel: { fontSize: 11, fontWeight: '500' as const },
  statPillValue: { fontSize: 13, fontWeight: '700' as const },
  metaCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  section: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ngIcon: { fontSize: 18 },
  sectionBody: { fontSize: 13, lineHeight: 20 },
  verdictText: { fontSize: 14, lineHeight: 20 },
  listItem: { fontSize: 13, marginBottom: 4, lineHeight: 18 },
  skillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  skillLabel: { fontSize: 12, width: 110 },
  skillBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' as const },
  skillFill: { height: '100%' as const, borderRadius: 4 },
  skillVal: { fontSize: 12, fontWeight: '700' as const, minWidth: 24, textAlign: 'right' as const },
  criticalCard: { borderLeftWidth: 3 },
  memorizeCard: { borderLeftWidth: 3 },
  memorizeText: { fontSize: 13, lineHeight: 22, fontStyle: 'italic' as const },

});
