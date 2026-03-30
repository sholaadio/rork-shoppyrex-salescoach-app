import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Animated, Easing, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Upload, ChevronDown, Bot, Sparkles } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { getScoreColor } from '@/constants/colors';
import { useTeamType } from '@/hooks/useData';
import { transcribeAudio, analyzeCall, submitReport } from '@/services/api';

const CALL_TYPES = ['Phone Call', 'WhatsApp'];
const OUTCOMES = ['Confirmed', 'Cancelled', 'Follow Up', 'Callback', 'Unknown'];

interface ProgressStage {
  label: string;
  subtitle: string;
  minPercent: number;
  maxPercent: number;
}

const STAGES: ProgressStage[] = [
  { label: 'Uploading audio...', subtitle: 'Preparing your recording for analysis', minPercent: 0, maxPercent: 20 },
  { label: 'Transcribing your call...', subtitle: 'AI is converting speech to text', minPercent: 20, maxPercent: 50 },
  { label: 'AI is analyzing your performance...', subtitle: 'Identifying strengths and areas to improve', minPercent: 50, maxPercent: 80 },
  { label: 'Generating your coaching report...', subtitle: 'Almost there! Crafting personalized feedback', minPercent: 80, maxPercent: 100 },
];

export default function UploadCallScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const teamType = useTeamType(user?.teamId);
  const queryClient = useQueryClient();

  const [callType, setCallType] = useState('Phone Call');
  const [outcome, setOutcome] = useState('Unknown');
  const [product, setProduct] = useState('');
  const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showOutcomeDropdown, setShowOutcomeDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);


  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isProcessing) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(iconRotate, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    );

    pulse.start();
    rotate.start();

    return () => { pulse.stop(); rotate.stop(); };
  }, [isProcessing, pulseAnim, iconRotate]);

  const advanceFakeProgress = useCallback((stageIdx: number) => {
    if (stageIdx >= STAGES.length) return;
    const stage = STAGES[stageIdx];
    const target = stage.maxPercent - 5;
    const duration = stageIdx === 0 ? 2000 : 8000;

    Animated.timing(progressAnim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const setStage = useCallback((idx: number) => {
    setCurrentStageIdx(idx);
    if (idx < STAGES.length) {
      Animated.timing(progressAnim, {
        toValue: STAGES[idx].minPercent,
        duration: 300,
        useNativeDriver: false,
      }).start(() => advanceFakeProgress(idx));
    }
  }, [progressAnim, advanceFakeProgress]);

  const finishProgress = useCallback(() => {
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error('Please select an audio file');
      if (!product.trim()) throw new Error('Please enter the product pitched');

      setIsProcessing(true);
      setCurrentStageIdx(0);
      progressAnim.setValue(0);

      setStage(0);

      const formData = new FormData();
      const fileObj = {
        uri: audioFile.uri,
        name: audioFile.name || 'audio.m4a',
        type: audioFile.mimeType || 'audio/m4a',
      };
      formData.append('audio', fileObj as any);

      setStage(1);
      const { transcript } = await transcribeAudio(formData);

      setStage(2);
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

      setStage(3);

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

      finishProgress();
      await new Promise(r => setTimeout(r, 600));

      return { ...parsed, score };
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setAnalysis(data);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['reports'] });


    },
    onError: (err) => {
      setIsProcessing(false);
      progressAnim.setValue(0);
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

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  if (isProcessing) {
    const stage = STAGES[currentStageIdx] ?? STAGES[0];
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.processingContainer}>
            <Animated.View style={[styles.iconCircle, { backgroundColor: colors.green + '15', transform: [{ scale: pulseAnim }] }]}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                {currentStageIdx < 2 ? (
                  <Mic size={48} color={colors.green} />
                ) : (
                  <Bot size={48} color={colors.green} />
                )}
              </Animated.View>
            </Animated.View>

            <Sparkles size={20} color={colors.orange} style={{ marginTop: 16 }} />

            <Text style={[styles.processingTitle, { color: colors.text }]}>{stage.label}</Text>
            <Text style={[styles.processingSubtitle, { color: colors.muted }]}>{stage.subtitle}</Text>

            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
                <LinearGradient
                  colors={['#22C55E', '#16A34A', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>

            <View style={styles.stageDotsRow}>
              {STAGES.map((s, i) => (
                <View key={i} style={[styles.stageDot, { backgroundColor: i <= currentStageIdx ? colors.green : colors.border }]} />
              ))}
            </View>

            <Text style={[styles.tipText, { color: colors.muted }]}>
              This usually takes 30–90 seconds{'\n'}Please don't close the app
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>Upload a Call</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>AI will transcribe, analyze and coach you</Text>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.muted }]}>CALL TYPE</Text>
                <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{callType === 'Phone Call' ? '📞' : '💬'} {callType}</Text>
                  <ChevronDown size={16} color={colors.muted} />
                </TouchableOpacity>
                {showTypeDropdown && (
                  <View style={[styles.dropdownList, { backgroundColor: colors.cardHover }]}>
                    {CALL_TYPES.map(t => (
                      <TouchableOpacity key={t} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => { setCallType(t); setShowTypeDropdown(false); }}>
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.muted }]}>PRODUCT PITCHED</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Weight Loss Bundle"
                  placeholderTextColor={colors.muted}
                  value={product}
                  onChangeText={setProduct}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>CALL OUTCOME</Text>
            <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowOutcomeDropdown(!showOutcomeDropdown)}>
              <Text style={[styles.dropdownText, { color: colors.text }]}>{outcome}</Text>
              <ChevronDown size={16} color={colors.muted} />
            </TouchableOpacity>
            {showOutcomeDropdown && (
              <View style={[styles.dropdownList, { backgroundColor: colors.cardHover }]}>
                {OUTCOMES.map(o => (
                  <TouchableOpacity key={o} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => { setOutcome(o); setShowOutcomeDropdown(false); }}>
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, { color: colors.muted, marginTop: 16 }]}>CALL RECORDING</Text>
            <TouchableOpacity style={[styles.uploadZone, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={pickAudio} activeOpacity={0.7}>
              {audioFile ? (
                <>
                  <Mic size={28} color={colors.green} />
                  <Text style={[styles.fileName, { color: colors.green }]}>{audioFile.name}</Text>
                  <Text style={[styles.fileSize, { color: colors.muted }]}>
                    {audioFile.size ? `${(audioFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                  </Text>
                </>
              ) : (
                <>
                  <Upload size={28} color={colors.muted} />
                  <Text style={[styles.uploadText, { color: colors.text }]}>Tap to upload your call recording</Text>
                  <Text style={[styles.uploadHint, { color: colors.muted }]}>Supports MP3, M4A, WAV, AAC, OGG, 3GPP & more</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (submitting || analyzeMutation.isPending) return;
                setSubmitting(true);
                analyzeMutation.mutate(undefined, { onSettled: () => setSubmitting(false) });
              }}
              disabled={submitting || analyzeMutation.isPending}
              activeOpacity={0.8}
              style={{ marginTop: 16, opacity: submitting || analyzeMutation.isPending ? 0.6 : 1 }}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.analyzeButton}
              >
                <Text style={styles.analyzeButtonText}>🎙️ → 🤖 Transcribe & Analyze Call</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {analysis && (
            <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.scoreSection}>
                <View style={[styles.bigScoreCircle, { borderColor: getScoreColor(analysis.score || analysis.overallScore || 0, colors) }]}>
                  <Text style={[styles.bigScore, { color: getScoreColor(analysis.score || analysis.overallScore || 0, colors) }]}>
                    {analysis.score || analysis.overallScore || 0}
                  </Text>
                  <Text style={[styles.bigScoreLabel, { color: colors.muted }]}>/100</Text>
                </View>
                <Text style={[styles.verdict, { color: colors.soft }]}>{analysis.verdict || ''}</Text>
              </View>

              {analysis.strengths?.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={[styles.listTitle, { color: colors.green }]}>Strengths</Text>
                  {analysis.strengths.map((s: string, i: number) => (
                    <Text key={i} style={[styles.listItem, { color: colors.soft }]}>✅ {s}</Text>
                  ))}
                </View>
              )}

              {analysis.weaknesses?.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={[styles.listTitle, { color: colors.red }]}>Weaknesses</Text>
                  {analysis.weaknesses.map((w: string, i: number) => (
                    <Text key={i} style={[styles.listItem, { color: colors.soft }]}>⚠️ {w}</Text>
                  ))}
                </View>
              )}

              {analysis.improvements?.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={[styles.listTitle, { color: colors.blue }]}>Improvements</Text>
                  {analysis.improvements.map((imp: string, i: number) => (
                    <Text key={i} style={[styles.listItem, { color: colors.soft }]}>💡 {imp}</Text>
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
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 20 },
  formCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12,
  },
  dropdownText: { fontSize: 14 },
  dropdownList: { borderRadius: 8, marginBottom: 12, overflow: 'hidden' as const },
  dropdownItem: { padding: 12, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 14 },
  input: {
    borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, marginBottom: 12,
  },
  uploadZone: {
    borderRadius: 12, padding: 30, alignItems: 'center',
    borderWidth: 1.5, borderStyle: 'dashed' as const, gap: 6,
  },
  uploadText: { fontSize: 14, fontWeight: '600' as const },
  uploadHint: { fontSize: 11 },
  fileName: { fontSize: 14, fontWeight: '600' as const },
  fileSize: { fontSize: 12 },
  analyzeButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  analyzeButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  analysisCard: { borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1 },
  scoreSection: { alignItems: 'center', marginBottom: 20 },
  bigScoreCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  bigScore: { fontSize: 32, fontWeight: '900' as const },
  bigScoreLabel: { fontSize: 12 },
  verdict: { fontSize: 14, textAlign: 'center' as const },
  listSection: { marginBottom: 16 },
  listTitle: { fontSize: 14, fontWeight: '700' as const, marginBottom: 6 },
  listItem: { fontSize: 13, marginBottom: 3, lineHeight: 18 },
  processingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center',
  },
  processingTitle: {
    fontSize: 18, fontWeight: '700' as const, marginTop: 16, textAlign: 'center' as const,
  },
  processingSubtitle: {
    fontSize: 14, marginTop: 6, textAlign: 'center' as const, lineHeight: 20,
  },
  progressTrack: {
    width: '85%', height: 8, borderRadius: 4, marginTop: 28, overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%', borderRadius: 4, overflow: 'hidden' as const,
  },
  stageDotsRow: {
    flexDirection: 'row', gap: 8, marginTop: 16,
  },
  stageDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  tipText: {
    fontSize: 13, textAlign: 'center' as const, marginTop: 32, lineHeight: 20,
  },

});
