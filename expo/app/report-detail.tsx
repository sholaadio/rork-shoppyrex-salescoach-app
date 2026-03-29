import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors, getScoreColor } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { useReports } from '@/hooks/useData';
import { formatTimestamp } from '@/utils/date';
import { Clock, BarChart3, Youtube, BookOpen, Headphones, ExternalLink } from 'lucide-react-native';

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

  const openUrl = useCallback((url: string) => {
    if (url) {
      Linking.openURL(url).catch(err => console.log('Failed to open URL:', err));
    }
  }, []);

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
  const resources = analysis?.resources || analysis?.learningResources;

  const isResourceArray = Array.isArray(resources);
  const resourceObj = !isResourceArray && resources ? resources : null;
  const youtubeResources = isResourceArray
    ? resources.filter((r: any) => r.type?.toLowerCase() === 'youtube' || r.type?.toLowerCase() === 'video')
    : Array.isArray(resourceObj?.youtube) ? resourceObj.youtube : [];
  const bookResources = isResourceArray
    ? resources.filter((r: any) => r.type?.toLowerCase() === 'book' || r.type?.toLowerCase() === 'books')
    : Array.isArray(resourceObj?.books) ? resourceObj.books : [];
  const podcastResources = isResourceArray
    ? resources.filter((r: any) => r.type?.toLowerCase() === 'podcast' || r.type?.toLowerCase() === 'podcasts')
    : Array.isArray(resourceObj?.podcasts) ? resourceObj.podcasts : [];

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
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(score) }]}>
            <Text style={[styles.scoreNum, { color: getScoreColor(score) }]}>{score}</Text>
            <Text style={styles.scoreOf}>/100</Text>
          </View>

          {(closeRate != null || duration != null) && (
            <View style={styles.statPillsRow}>
              {closeRate != null && (
                <View style={styles.statPill}>
                  <BarChart3 size={13} color={Colors.blue} />
                  <Text style={styles.statPillLabel}>Close Rate</Text>
                  <Text style={styles.statPillValue}>{closeRate}%</Text>
                </View>
              )}
              {duration != null && (
                <View style={styles.statPill}>
                  <Clock size={13} color={Colors.purple} />
                  <Text style={styles.statPillLabel}>Duration</Text>
                  <Text style={styles.statPillValue}>{duration}</Text>
                </View>
              )}
            </View>
          )}
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

        {orderedSkills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skill Breakdown</Text>
            {orderedSkills.map((skill) => (
              <View key={skill.name} style={styles.skillRow}>
                <Text style={styles.skillLabel}>{skill.name}</Text>
                <View style={styles.skillBar}>
                  <View style={[styles.skillFill, { width: `${Math.min(skill.value, 100)}%`, backgroundColor: getScoreColor(skill.value) }]} />
                </View>
                <Text style={[styles.skillVal, { color: getScoreColor(skill.value) }]}>{skill.value}</Text>
              </View>
            ))}
          </View>
        )}

        {ngLanguage && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.ngIcon}>🗣️</Text>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>NG Language</Text>
            </View>
            <Text style={styles.sectionBody}>{typeof ngLanguage === 'string' ? ngLanguage : JSON.stringify(ngLanguage)}</Text>
          </View>
        )}

        {criticalMoment && (
          <View style={[styles.section, styles.criticalCard]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.ngIcon}>⚡</Text>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: Colors.yellow }]}>Critical Moment</Text>
            </View>
            <Text style={styles.sectionBody}>{typeof criticalMoment === 'string' ? criticalMoment : JSON.stringify(criticalMoment)}</Text>
          </View>
        )}

        {memorizeScript && (
          <View style={[styles.section, styles.memorizeCard]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.ngIcon}>📝</Text>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: Colors.green }]}>Memorize This Script</Text>
            </View>
            <Text style={styles.memorizeText}>{memorizeScript}</Text>
          </View>
        )}

        {resources && (youtubeResources.length > 0 || bookResources.length > 0 || podcastResources.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI-Recommended Learning Resources</Text>

            {youtubeResources.length > 0 && (
              <View style={styles.resourceGroup}>
                <View style={styles.resourceGroupHeader}>
                  <Youtube size={16} color="#FF0000" />
                  <Text style={styles.resourceGroupTitle}>YouTube</Text>
                </View>
                {youtubeResources.map((res: any, i: number) => {
                  const title = res.title || res.name || '';
                  const ytUrl = res.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' sales training')}`;
                  return (
                    <TouchableOpacity key={`yt-${i}`} style={styles.resourceItem} onPress={() => openUrl(ytUrl)} activeOpacity={0.7}>
                      <Text style={styles.resourceItemTitle}>{title}</Text>
                      {(res.description || res.channel) && (
                        <Text style={styles.resourceItemDesc}>{res.description || res.channel}</Text>
                      )}
                      <View style={styles.resourceLink}>
                        <ExternalLink size={12} color={Colors.blue} />
                        <Text style={styles.resourceLinkText}>Search on YouTube →</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {bookResources.length > 0 && (
              <View style={styles.resourceGroup}>
                <View style={styles.resourceGroupHeader}>
                  <BookOpen size={16} color={Colors.orange} />
                  <Text style={styles.resourceGroupTitle}>Books</Text>
                </View>
                {bookResources.map((res: any, i: number) => {
                  const title = res.title || res.name || '';
                  const bookUrl = res.url || `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=stripbooks`;
                  return (
                    <TouchableOpacity key={`bk-${i}`} style={styles.resourceItem} onPress={() => openUrl(bookUrl)} activeOpacity={0.7}>
                      <Text style={styles.resourceItemTitle}>{title}</Text>
                      {res.author && <Text style={styles.resourceAuthor}>by {res.author}</Text>}
                      {res.description && <Text style={styles.resourceItemDesc}>{res.description}</Text>}
                      <View style={styles.resourceLink}>
                        <ExternalLink size={12} color={Colors.orange} />
                        <Text style={[styles.resourceLinkText, { color: Colors.orange }]}>Buy on Amazon →</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {podcastResources.length > 0 && (
              <View style={styles.resourceGroup}>
                <View style={styles.resourceGroupHeader}>
                  <Headphones size={16} color={Colors.green} />
                  <Text style={styles.resourceGroupTitle}>Podcasts</Text>
                </View>
                {podcastResources.map((res: any, i: number) => {
                  const title = res.title || res.name || '';
                  const show = res.show || res.showName || '';
                  const spotifyUrl = res.url || `https://open.spotify.com/search/${encodeURIComponent(show + ' ' + title)}`;
                  return (
                    <TouchableOpacity key={`pd-${i}`} style={styles.resourceItem} onPress={() => openUrl(spotifyUrl)} activeOpacity={0.7}>
                      <Text style={styles.resourceItemTitle}>{title}</Text>
                      {show ? <Text style={styles.resourceAuthor}>{show}</Text> : null}
                      {res.description && <Text style={styles.resourceItemDesc}>{res.description}</Text>}
                      <View style={styles.resourceLink}>
                        <ExternalLink size={12} color={Colors.green} />
                        <Text style={[styles.resourceLinkText, { color: Colors.green }]}>Listen on Spotify →</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
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
  statPillsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statPillLabel: { fontSize: 11, color: Colors.muted, fontWeight: '500' as const },
  statPillValue: { fontSize: 13, color: Colors.text, fontWeight: '700' as const },
  metaCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  section: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ngIcon: { fontSize: 18 },
  sectionBody: { fontSize: 13, color: Colors.soft, lineHeight: 20 },
  verdictText: { fontSize: 14, color: Colors.soft, lineHeight: 20 },
  listItem: { fontSize: 13, color: Colors.soft, marginBottom: 4, lineHeight: 18 },
  skillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  skillLabel: { fontSize: 12, color: Colors.soft, width: 110 },
  skillBar: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' as const },
  skillFill: { height: '100%' as const, borderRadius: 4 },
  skillVal: { fontSize: 12, fontWeight: '700' as const, minWidth: 24, textAlign: 'right' as const },
  scriptText: { fontSize: 13, color: Colors.soft, lineHeight: 20, fontStyle: 'italic' as const },
  criticalCard: { borderLeftWidth: 3, borderLeftColor: Colors.yellow },
  memorizeCard: { borderLeftWidth: 3, borderLeftColor: Colors.green },
  memorizeText: { fontSize: 13, color: Colors.soft, lineHeight: 22, fontStyle: 'italic' as const },
  resourceGroup: { marginBottom: 16 },
  resourceGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resourceGroupTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  resourceItem: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resourceItemTitle: { fontSize: 13, fontWeight: '600' as const, color: Colors.text, marginBottom: 2 },
  resourceAuthor: { fontSize: 11, color: Colors.muted, marginBottom: 4 },
  resourceItemDesc: { fontSize: 12, color: Colors.soft, lineHeight: 17, marginBottom: 6 },
  resourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  resourceLinkText: { fontSize: 12, fontWeight: '600' as const, color: Colors.blue },
});
