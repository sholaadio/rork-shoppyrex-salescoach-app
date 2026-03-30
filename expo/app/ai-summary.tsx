import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { Sparkles, Youtube, BookOpen, Headphones, ExternalLink } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { useUserReports, useTeamReports, useAllReports, useTeamMembers } from '@/hooks/useData';
import { isManagementRole } from '@/types';
import { Period } from '@/types';
import PeriodFilter from '@/components/PeriodFilter';

export default function AISummaryScreen() {
  const { user } = useAuth();
  const colors = useColors();
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
  const [resources, setResources] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

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

      const allResources = reports
        .map(r => r.analysis?.resources)
        .filter(Boolean);

      let aggregated: any = null;
      if (allResources.length > 0) {
        const latest = allResources[allResources.length - 1];
        if (latest && typeof latest === 'object') {
          aggregated = latest;
        }
      }

      return { text: summaryParts.join('\n'), resources: aggregated };
    },
    onSuccess: (data) => {
      setSummary(data.text);
      setResources(data.resources);
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'AI Summary', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>✨ AI Summary Report</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>AI-powered analysis of your call performance</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.text }]}>Select period:</Text>
          <PeriodFilter selected={period} onSelect={setPeriod} />
          <Text style={[styles.reportCount, { color: colors.muted }]}>{reports.length} call reports found</Text>

          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.orange }, (reports.length === 0 || submitting || generateMutation.isPending) && { opacity: 0.5 }]}
            onPress={() => {
              if (submitting || generateMutation.isPending) return;
              setSubmitting(true);
              generateMutation.mutate(undefined, { onSettled: () => setSubmitting(false) });
            }}
            disabled={submitting || generateMutation.isPending || reports.length === 0}
            activeOpacity={0.8}
          >
            {(submitting || generateMutation.isPending) ? (
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
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryText, { color: colors.soft }]}>{summary}</Text>
          </View>
        )}

        {summary && resources && <ResourcesSection resources={resources} colors={colors} />}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function ResourcesSection({ resources, colors }: { resources: any; colors: any }) {
  const openUrl = (url: string) => {
    if (url) Linking.openURL(url).catch(err => console.log('Failed to open URL:', err));
  };

  const books: any[] = (Array.isArray(resources.books) ? resources.books : []).slice(0, 2);
  const youtube: any[] = (Array.isArray(resources.youtube) ? resources.youtube : []).slice(0, 2);
  const podcasts: any[] = (Array.isArray(resources.podcasts) ? resources.podcasts : []).slice(0, 2);

  if (books.length === 0 && youtube.length === 0 && podcasts.length === 0) return null;

  return (
    <View style={[styles.resourcesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.resourcesTitle, { color: colors.text }]}>{"\uD83D\uDCDA"} Recommended Resources</Text>

      {youtube.length > 0 && (
        <View style={resStyles.group}>
          <View style={resStyles.groupHeader}>
            <Youtube size={16} color="#FF0000" />
            <Text style={[resStyles.groupTitle, { color: colors.text }]}>YouTube</Text>
          </View>
          {youtube.map((r: any, i: number) => {
            const title = r.title || r.name || '';
            const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;
            return (
              <TouchableOpacity key={`yt-${i}`} style={[resStyles.item, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => openUrl(ytUrl)} activeOpacity={0.7}>
                <Text style={[resStyles.itemTitle, { color: colors.text }]}>{title}</Text>
                <View style={resStyles.link}>
                  <ExternalLink size={12} color={colors.blue} />
                  <Text style={[resStyles.linkText, { color: colors.blue }]}>Search on YouTube \u2192</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {books.length > 0 && (
        <View style={resStyles.group}>
          <View style={resStyles.groupHeader}>
            <BookOpen size={16} color={colors.orange} />
            <Text style={[resStyles.groupTitle, { color: colors.text }]}>Books</Text>
          </View>
          {books.map((r: any, i: number) => {
            const title = r.title || r.name || '';
            const bookUrl = `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=stripbooks`;
            return (
              <TouchableOpacity key={`bk-${i}`} style={[resStyles.item, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => openUrl(bookUrl)} activeOpacity={0.7}>
                <Text style={[resStyles.itemTitle, { color: colors.text }]}>{title}</Text>
                <View style={resStyles.link}>
                  <ExternalLink size={12} color={colors.orange} />
                  <Text style={[resStyles.linkText, { color: colors.orange }]}>Buy on Amazon \u2192</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {podcasts.length > 0 && (
        <View style={resStyles.group}>
          <View style={resStyles.groupHeader}>
            <Headphones size={16} color={colors.green} />
            <Text style={[resStyles.groupTitle, { color: colors.text }]}>Podcasts</Text>
          </View>
          {podcasts.map((r: any, i: number) => {
            const title = r.title || r.name || '';
            const show = r.show || r.showName || r.name || '';
            const spotifyUrl = r.link || `https://open.spotify.com/search/${encodeURIComponent(show + ' ' + title)}`;
            return (
              <TouchableOpacity key={`pd-${i}`} style={[resStyles.item, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => openUrl(spotifyUrl)} activeOpacity={0.7}>
                <Text style={[resStyles.itemTitle, { color: colors.text }]}>{title}</Text>
                {show ? <Text style={[resStyles.author, { color: colors.muted }]}>{show}</Text> : null}
                <View style={resStyles.link}>
                  <ExternalLink size={12} color={colors.green} />
                  <Text style={[resStyles.linkText, { color: colors.green }]}>Listen on Spotify \u2192</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const resStyles = StyleSheet.create({
  group: { marginBottom: 14 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  groupTitle: { fontSize: 14, fontWeight: '700' as const },
  item: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  itemTitle: { fontSize: 13, fontWeight: '600' as const, marginBottom: 2 },
  author: { fontSize: 11, marginBottom: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  linkText: { fontSize: 12, fontWeight: '600' as const },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  card: { borderRadius: 16, padding: 18, borderWidth: 1 },
  cardLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 10 },
  reportCount: { fontSize: 12, marginBottom: 16 },
  generateBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, paddingVertical: 16, gap: 8,
  },
  generateText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  summaryCard: { borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1 },
  summaryText: { fontSize: 14, lineHeight: 22 },
  resourcesCard: { borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1 },
  resourcesTitle: { fontSize: 16, fontWeight: '800' as const, marginBottom: 14 },
});
