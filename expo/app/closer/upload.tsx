import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Upload, ChevronDown } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, getScoreColor } from '@/constants/colors';
import { useTeamType } from '@/hooks/useData';
import { transcribeAudio, analyzeCall, submitReport } from '@/services/api';

const CALL_TYPES = ['Phone Call', 'WhatsApp'];
const OUTCOMES = ['Confirmed', 'Cancelled', 'Follow Up', 'Callback', 'Unknown'];

export default function UploadCallScreen() {
  const { user } = useAuth();
  const teamType = useTeamType(user?.teamId);
  const queryClient = useQueryClient();

  const [callType, setCallType] = useState('Phone Call');
  const [outcome, setOutcome] = useState('Unknown');
  const [product, setProduct] = useState('');
  const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showOutcomeDropdown, setShowOutcomeDropdown] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error('Please select an audio file');
      if (!product.trim()) throw new Error('Please enter the product pitched');

      const formData = new FormData();
      const fileObj = {
        uri: audioFile.uri,
        name: audioFile.name || 'audio.m4a',
        type: audioFile.mimeType || 'audio/m4a',
      };
      formData.append('audio', fileObj as any);

      const { transcript } = await transcribeAudio(formData);

      const { analysis: result } = await analyzeCall({
        transcript,
        closerName: user?.name ?? '',
        callType: callType === 'Phone Call' ? 'phone' : 'whatsapp',
        callOutcome: outcome.toLowerCase(),
        product: product.trim(),
        teamType,
      });

      let parsed: any;
      try {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      } catch {
        parsed = { overallScore: 0, verdict: result };
      }

      const score = parsed.overallScore ?? parsed.score ?? 0;

      const outcomeMap: Record<string, string> = {
        'confirmed': 'confirmed',
        'cancelled': 'cancelled',
        'follow up': 'followup',
        'callback': 'callback',
        'unknown': 'unknown',
      };

      await submitReport({
        closerId: user?.id ?? '',
        closerName: user?.name ?? '',
        teamId: user?.teamId ?? '',
        teamType: teamType || 'sales',
        callType: callType === 'Phone Call' ? 'phone' : 'whatsapp',
        callOutcome: outcomeMap[outcome.toLowerCase()] ?? 'unknown',
        product: product.trim(),
        transcript,
        analysis: parsed,
        audioFileName: audioFile?.name || 'recording.m4a',
      } as any);

      return { ...parsed, score };
    },
    onSuccess: (data) => {
      setAnalysis(data);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err instanceof Error ? err.message : 'Analysis failed');
    },
  });

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setAudioFile(result.assets[0]);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.log('Picker error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Upload a Call</Text>
          <Text style={styles.subtitle}>AI will transcribe, analyze and coach you</Text>

          <View style={styles.formCard}>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>CALL TYPE</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
                  <Text style={styles.dropdownText}>{callType === 'Phone Call' ? '📞' : '💬'} {callType}</Text>
                  <ChevronDown size={16} color={Colors.muted} />
                </TouchableOpacity>
                {showTypeDropdown && (
                  <View style={styles.dropdownList}>
                    {CALL_TYPES.map(t => (
                      <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setCallType(t); setShowTypeDropdown(false); }}>
                        <Text style={styles.dropdownItemText}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>PRODUCT PITCHED</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Weight Loss Bundle"
                  placeholderTextColor={Colors.muted}
                  value={product}
                  onChangeText={setProduct}
                />
              </View>
            </View>

            <Text style={styles.label}>CALL OUTCOME</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowOutcomeDropdown(!showOutcomeDropdown)}>
              <Text style={styles.dropdownText}>{outcome}</Text>
              <ChevronDown size={16} color={Colors.muted} />
            </TouchableOpacity>
            {showOutcomeDropdown && (
              <View style={styles.dropdownList}>
                {OUTCOMES.map(o => (
                  <TouchableOpacity key={o} style={styles.dropdownItem} onPress={() => { setOutcome(o); setShowOutcomeDropdown(false); }}>
                    <Text style={styles.dropdownItemText}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>CALL RECORDING</Text>
            <TouchableOpacity style={styles.uploadZone} onPress={pickAudio} activeOpacity={0.7}>
              {audioFile ? (
                <>
                  <Mic size={28} color={Colors.green} />
                  <Text style={styles.fileName}>{audioFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {audioFile.size ? `${(audioFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                  </Text>
                </>
              ) : (
                <>
                  <Upload size={28} color={Colors.muted} />
                  <Text style={styles.uploadText}>Tap to upload your call recording</Text>
                  <Text style={styles.uploadHint}>Supports MP3, M4A, WAV, AAC, OGG, 3GPP & more</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              activeOpacity={0.8}
              style={{ marginTop: 16 }}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.analyzeButton}
              >
                {analyzeMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.analyzeButtonText}>🎙️ → 🤖 Transcribe & Analyze Call</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {analysis && (
            <View style={styles.analysisCard}>
              <View style={styles.scoreSection}>
                <View style={[styles.bigScoreCircle, { borderColor: getScoreColor(analysis.score || analysis.overallScore || 0) }]}>
                  <Text style={[styles.bigScore, { color: getScoreColor(analysis.score || analysis.overallScore || 0) }]}>
                    {analysis.score || analysis.overallScore || 0}
                  </Text>
                  <Text style={styles.bigScoreLabel}>/100</Text>
                </View>
                <Text style={styles.verdict}>{analysis.verdict || ''}</Text>
              </View>

              {analysis.strengths?.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={[styles.listTitle, { color: Colors.green }]}>Strengths</Text>
                  {analysis.strengths.map((s: string, i: number) => (
                    <Text key={i} style={styles.listItem}>✅ {s}</Text>
                  ))}
                </View>
              )}

              {analysis.weaknesses?.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={[styles.listTitle, { color: Colors.red }]}>Weaknesses</Text>
                  {analysis.weaknesses.map((w: string, i: number) => (
                    <Text key={i} style={styles.listItem}>⚠️ {w}</Text>
                  ))}
                </View>
              )}

              {analysis.improvements?.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={[styles.listTitle, { color: Colors.blue }]}>Improvements</Text>
                  {analysis.improvements.map((imp: string, i: number) => (
                    <Text key={i} style={styles.listItem}>💡 {imp}</Text>
                  ))}
                </View>
              )}


            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.muted, marginBottom: 20 },
  formCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontSize: 10, fontWeight: '700' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  dropdownText: { color: Colors.text, fontSize: 14 },
  dropdownList: { backgroundColor: Colors.cardHover, borderRadius: 8, marginBottom: 12, overflow: 'hidden' as const },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemText: { color: Colors.text, fontSize: 14 },
  input: {
    backgroundColor: Colors.background, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  uploadZone: {
    backgroundColor: Colors.background, borderRadius: 12, padding: 30, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' as const, gap: 6,
  },
  uploadText: { color: Colors.text, fontSize: 14, fontWeight: '600' as const },
  uploadHint: { color: Colors.muted, fontSize: 11 },
  fileName: { color: Colors.green, fontSize: 14, fontWeight: '600' as const },
  fileSize: { color: Colors.muted, fontSize: 12 },
  analyzeButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  analyzeButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  analysisCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  scoreSection: { alignItems: 'center', marginBottom: 20 },
  bigScoreCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  bigScore: { fontSize: 32, fontWeight: '900' as const },
  bigScoreLabel: { fontSize: 12, color: Colors.muted },
  verdict: { fontSize: 14, color: Colors.soft, textAlign: 'center' as const },
  listSection: { marginBottom: 16 },
  listTitle: { fontSize: 14, fontWeight: '700' as const, marginBottom: 6 },
  listItem: { fontSize: 13, color: Colors.soft, marginBottom: 3, lineHeight: 18 },
  scriptText: { fontSize: 13, color: Colors.soft, lineHeight: 20, fontStyle: 'italic' as const },
});
