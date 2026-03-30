import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, Mic, ChevronDown } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { getScoreColor } from '@/constants/colors';
import { useTeamType } from '@/hooks/useData';
import { transcribeAudio, analyzeCall, submitReport } from '@/services/api';

const CALL_TYPES = ['Phone Call', 'WhatsApp'];
const OUTCOMES = ['Confirmed', 'Pending', 'Rejected', 'Not Interested', 'Unknown'];

export default function TeamLeadCallsScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const teamType = useTeamType(user?.teamId);
  const queryClient = useQueryClient();

  const [callType, setCallType] = useState('Phone Call');
  const [outcome, setOutcome] = useState('Unknown');
  const [product, setProduct] = useState('');
  const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showTypeDD, setShowTypeDD] = useState(false);
  const [showOutDD, setShowOutDD] = useState(false);


  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error('Please select an audio file');
      if (!product.trim()) throw new Error('Please enter the product pitched');
      const formData = new FormData();
      formData.append('audio', { uri: audioFile.uri, name: audioFile.name || 'audio.m4a', type: audioFile.mimeType || 'audio/m4a' } as any);
      const { transcript } = await transcribeAudio(formData);
      const { analysis: result } = await analyzeCall({
        transcript, closerName: user?.name ?? '',
        callType: callType === 'Phone Call' ? 'phone' : 'whatsapp',
        callOutcome: outcome.toLowerCase(), product: product.trim(), teamType,
      });
      let parsed: any;
      try { parsed = typeof result === 'string' ? JSON.parse(result) : result; } catch { parsed = { overallScore: 0, verdict: result }; }
      const score = parsed.overallScore ?? parsed.score ?? 0;
      await submitReport({
        closerId: user?.id ?? '', closerName: user?.name ?? '', teamId: user?.teamId ?? '', teamType,
        callType: callType === 'Phone Call' ? 'phone' : 'whatsapp',
        callOutcome: outcome.toLowerCase(), product: product.trim(), transcript, analysis: parsed, score, date: Date.now(),
      });
      return { ...parsed, score };
    },
    onSuccess: (data) => {
      setAnalysis(data);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['reports'] });


    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Analysis failed'),
  });

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) { setAudioFile(result.assets[0]); }
    } catch (e) { console.log('Picker error:', e); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>My Own Calls</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Upload and analyze your calls</Text>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.muted }]}>CALL TYPE</Text>
                <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowTypeDD(!showTypeDD)}>
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{callType}</Text>
                  <ChevronDown size={16} color={colors.muted} />
                </TouchableOpacity>
                {showTypeDD && (
                  <View style={[styles.dropdownList, { backgroundColor: colors.cardHover }]}>
                    {CALL_TYPES.map(t => (
                      <TouchableOpacity key={t} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => { setCallType(t); setShowTypeDD(false); }}>
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.muted }]}>PRODUCT PITCHED</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="e.g. Weight Loss Bundle" placeholderTextColor={colors.muted} value={product} onChangeText={setProduct} />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>CALL OUTCOME</Text>
            <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowOutDD(!showOutDD)}>
              <Text style={[styles.dropdownText, { color: colors.text }]}>{outcome}</Text>
              <ChevronDown size={16} color={colors.muted} />
            </TouchableOpacity>
            {showOutDD && (
              <View style={[styles.dropdownList, { backgroundColor: colors.cardHover }]}>
                {OUTCOMES.map(o => (
                  <TouchableOpacity key={o} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => { setOutcome(o); setShowOutDD(false); }}>
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, { color: colors.muted, marginTop: 8 }]}>CALL RECORDING</Text>
            <TouchableOpacity style={[styles.uploadZone, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={pickAudio} activeOpacity={0.7}>
              {audioFile ? (
                <><Mic size={24} color={colors.green} /><Text style={[styles.fileName, { color: colors.green }]}>{audioFile.name}</Text></>
              ) : (
                <><Upload size={24} color={colors.muted} /><Text style={[styles.uploadText, { color: colors.muted }]}>Tap to upload</Text></>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending} activeOpacity={0.8} style={{ marginTop: 14 }}>
              <LinearGradient colors={['#22C55E', '#16A34A', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.analyzeBtn}>
                {analyzeMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeBtnText}>🎙️ → 🤖 Transcribe & Analyze</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {analysis && (
            <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.bigScore, { borderColor: getScoreColor(analysis.score || 0, colors) }]}>
                <Text style={[styles.bigScoreText, { color: getScoreColor(analysis.score || 0, colors) }]}>{analysis.score || 0}</Text>
              </View>
              <Text style={[styles.verdict, { color: colors.soft }]}>{analysis.verdict || ''}</Text>


            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  formCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  dropdownText: { fontSize: 14 },
  dropdownList: { borderRadius: 8, marginBottom: 12 },
  dropdownItem: { padding: 12, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 14 },
  input: { borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, marginBottom: 12 },
  uploadZone: { borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed' as const, gap: 6 },
  uploadText: { fontSize: 13 },
  fileName: { fontSize: 13, fontWeight: '600' as const },
  analyzeBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  analyzeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  analysisCard: { borderRadius: 16, padding: 20, marginTop: 16, alignItems: 'center', borderWidth: 1 },
  bigScore: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  bigScoreText: { fontSize: 28, fontWeight: '900' as const },
  verdict: { fontSize: 14, textAlign: 'center' as const },

});
