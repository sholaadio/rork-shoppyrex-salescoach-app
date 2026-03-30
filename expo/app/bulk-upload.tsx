import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, Animated, Easing,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import {
  Mic, Plus, Trash2, ChevronDown, Rocket, RotateCcw,
  CheckCircle, XCircle, Loader, Square,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { useTeamType } from '@/hooks/useData';
import { transcribeAudio, analyzeCall, submitReport } from '@/services/api';

const CALL_TYPES = ['Phone Call', 'WhatsApp'];
const OUTCOMES = ['Confirmed', 'Cancelled', 'Follow Up', 'Callback', 'Unknown'];

type SlotStatus = 'idle' | 'processing' | 'success' | 'error';

interface CallSlot {
  id: string;
  callType: string;
  product: string;
  outcome: string;
  audioFile: DocumentPicker.DocumentPickerAsset | null;
  status: SlotStatus;
  errorMessage: string;
  score: number | null;
}

function createSlot(): CallSlot {
  return {
    id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    callType: 'Phone Call',
    product: '',
    outcome: 'Unknown',
    audioFile: null,
    status: 'idle',
    errorMessage: '',
    score: null,
  };
}

export default function BulkUploadScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const teamType = useTeamType(user?.teamId);
  const queryClient = useQueryClient();

  const [slots, setSlots] = useState<CallSlot[]>([createSlot(), createSlot()]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showDone, setShowDone] = useState(false);
  const [openTypeDropdown, setOpenTypeDropdown] = useState<string | null>(null);
  const [openOutcomeDropdown, setOpenOutcomeDropdown] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseRef.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const updateSlot = useCallback((slotId: string, updates: Partial<CallSlot>) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...updates } : s));
  }, []);

  const addSlot = useCallback(() => {
    if (slots.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 calls per batch.');
      return;
    }
    setSlots(prev => [...prev, createSlot()]);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [slots.length]);

  const removeSlot = useCallback((slotId: string) => {
    if (slots.length <= 1) return;
    setSlots(prev => prev.filter(s => s.id !== slotId));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [slots.length]);

  const pickAudioForSlot = useCallback(async (slotId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        updateSlot(slotId, { audioFile: result.assets[0] });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.log('[BulkUpload] Picker error:', e);
    }
  }, [updateSlot]);

  const processOneCall = useCallback(async (slot: CallSlot): Promise<{ success: boolean; score?: number; error?: string }> => {
    try {
      if (!slot.audioFile) throw new Error('No audio file selected');
      if (!slot.product.trim()) throw new Error('Product is required');

      console.log('[BulkUpload] Processing slot:', slot.id);

      const formData = new FormData();
      const fileObj = {
        uri: slot.audioFile.uri,
        name: slot.audioFile.name || 'audio.m4a',
        type: slot.audioFile.mimeType || 'audio/m4a',
      };
      formData.append('audio', fileObj as any);

      const { transcript } = await transcribeAudio(formData);

      const { analysis: result } = await analyzeCall({
        transcript,
        closerName: user?.name ?? '',
        callType: slot.callType === 'Phone Call' ? 'phone' : 'whatsapp',
        callOutcome: slot.outcome.toLowerCase(),
        product: slot.product.trim(),
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
        callType: slot.callType === 'Phone Call' ? 'phone' : 'whatsapp',
        callOutcome: outcomeMap[slot.outcome.toLowerCase()] ?? 'unknown',
        product: slot.product.trim(),
        transcript,
        analysis: parsed,
        audioFileName: slot.audioFile?.name || 'recording.m4a',
      } as any);

      return { success: true, score };
    } catch (err: any) {
      console.log('[BulkUpload] Error processing slot:', slot.id, err?.message);
      return { success: false, error: err?.message || 'Unknown error' };
    }
  }, [user, teamType]);

  const runBulk = useCallback(async (retrySlotIds?: string[]) => {
    const toProcess = retrySlotIds
      ? slots.filter(s => retrySlotIds.includes(s.id))
      : slots.filter(s => s.audioFile && s.product.trim());

    if (toProcess.length === 0) {
      Alert.alert('Nothing to upload', 'Add audio files and product names to at least one slot.');
      return;
    }

    setIsRunning(true);
    setShowDone(false);
    startPulse();

    if (!retrySlotIds) {
      setSlots(prev => prev.map(s => {
        if (toProcess.find(p => p.id === s.id)) {
          return { ...s, status: 'idle' as const, errorMessage: '', score: null };
        }
        return s;
      }));
    }

    for (let i = 0; i < toProcess.length; i++) {
      const slot = toProcess[i];
      setCurrentIndex(i);
      updateSlot(slot.id, { status: 'processing', errorMessage: '' });

      const result = await processOneCall(slot);

      if (result.success) {
        updateSlot(slot.id, { status: 'success', score: result.score ?? null });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        updateSlot(slot.id, { status: 'error', errorMessage: result.error ?? 'Failed' });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    stopPulse();
    setIsRunning(false);
    setCurrentIndex(-1);
    setShowDone(true);
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
  }, [slots, startPulse, stopPulse, updateSlot, processOneCall, queryClient]);

  const retryFailed = useCallback(() => {
    const failedIds = slots.filter(s => s.status === 'error').map(s => s.id);
    if (failedIds.length === 0) return;
    void runBulk(failedIds);
  }, [slots, runBulk]);

  const validCount = slots.filter(s => s.audioFile && s.product.trim()).length;
  const successCount = slots.filter(s => s.status === 'success').length;
  const failedCount = slots.filter(s => s.status === 'error').length;
  const avgScore = successCount > 0
    ? Math.round(slots.filter(s => s.status === 'success' && s.score !== null).reduce((a, s) => a + (s.score ?? 0), 0) / successCount)
    : 0;

  const getStatusIcon = (status: SlotStatus) => {
    switch (status) {
      case 'idle': return <Square size={18} color={colors.muted} />;
      case 'processing': return <Loader size={18} color={colors.orange} />;
      case 'success': return <CheckCircle size={18} color={colors.green} />;
      case 'error': return <XCircle size={18} color={colors.red} />;
    }
  };

  const getStatusColor = (status: SlotStatus) => {
    switch (status) {
      case 'idle': return colors.border;
      case 'processing': return colors.orange;
      case 'success': return colors.green;
      case 'error': return colors.red;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Bulk Upload', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {isRunning && (
          <Animated.View style={[styles.progressBanner, { backgroundColor: colors.orange + '18', borderColor: colors.orange + '40', transform: [{ scale: pulseAnim }] }]}>
            <Loader size={20} color={colors.orange} />
            <Text style={[styles.progressText, { color: colors.orange }]}>
              Analyzing {currentIndex + 1} of {slots.filter(s => s.status !== 'idle').length}...
            </Text>
          </Animated.View>
        )}

        {showDone && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Batch Complete</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: colors.green }]}>{successCount}</Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Success</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: colors.red }]}>{failedCount}</Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Failed</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: colors.blue }]}>{avgScore}</Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Avg Score</Text>
              </View>
            </View>
            {failedCount > 0 && (
              <TouchableOpacity style={[styles.retryAllBtn, { backgroundColor: colors.red + '15' }]} onPress={retryFailed}>
                <RotateCcw size={16} color={colors.red} />
                <Text style={[styles.retryAllText, { color: colors.red }]}>Retry {failedCount} Failed</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {slots.map((slot, idx) => (
          <View key={slot.id} style={[styles.slotCard, { backgroundColor: colors.card, borderColor: getStatusColor(slot.status) }]}>
            <View style={styles.slotHeader}>
              <View style={styles.slotHeaderLeft}>
                {getStatusIcon(slot.status)}
                <Text style={[styles.slotTitle, { color: colors.text }]}>Call {idx + 1}</Text>
                {slot.status === 'success' && slot.score !== null && (
                  <View style={[styles.scorePill, { backgroundColor: colors.green + '20' }]}>
                    <Text style={[styles.scorePillText, { color: colors.green }]}>{slot.score}/100</Text>
                  </View>
                )}
              </View>
              <View style={styles.slotHeaderRight}>
                {slot.status === 'error' && (
                  <TouchableOpacity
                    onPress={() => void runBulk([slot.id])}
                    style={[styles.retryBtn, { backgroundColor: colors.red + '15' }]}
                    disabled={isRunning}
                  >
                    <RotateCcw size={14} color={colors.red} />
                  </TouchableOpacity>
                )}
                {slots.length > 1 && !isRunning && (
                  <TouchableOpacity onPress={() => removeSlot(slot.id)} style={styles.removeBtn}>
                    <Trash2 size={16} color={colors.red} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {slot.status === 'error' && slot.errorMessage ? (
              <View style={[styles.errorBar, { backgroundColor: colors.red + '12' }]}>
                <Text style={[styles.errorText, { color: colors.red }]}>{slot.errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.slotRow}>
              <View style={styles.slotField}>
                <Text style={[styles.slotLabel, { color: colors.muted }]}>TYPE</Text>
                <TouchableOpacity
                  style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setOpenTypeDropdown(openTypeDropdown === slot.id ? null : slot.id)}
                  disabled={isRunning}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{slot.callType === 'Phone Call' ? '📞' : '💬'} {slot.callType}</Text>
                  <ChevronDown size={14} color={colors.muted} />
                </TouchableOpacity>
                {openTypeDropdown === slot.id && (
                  <View style={[styles.dropdownList, { backgroundColor: colors.cardHover }]}>
                    {CALL_TYPES.map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                        onPress={() => { updateSlot(slot.id, { callType: t }); setOpenTypeDropdown(null); }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.slotField}>
                <Text style={[styles.slotLabel, { color: colors.muted }]}>OUTCOME</Text>
                <TouchableOpacity
                  style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setOpenOutcomeDropdown(openOutcomeDropdown === slot.id ? null : slot.id)}
                  disabled={isRunning}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{slot.outcome}</Text>
                  <ChevronDown size={14} color={colors.muted} />
                </TouchableOpacity>
                {openOutcomeDropdown === slot.id && (
                  <View style={[styles.dropdownList, { backgroundColor: colors.cardHover }]}>
                    {OUTCOMES.map(o => (
                      <TouchableOpacity
                        key={o}
                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                        onPress={() => { updateSlot(slot.id, { outcome: o }); setOpenOutcomeDropdown(null); }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{o}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <Text style={[styles.slotLabel, { color: colors.muted }]}>PRODUCT PITCHED</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Weight Loss Bundle"
              placeholderTextColor={colors.muted}
              value={slot.product}
              onChangeText={(t) => updateSlot(slot.id, { product: t })}
              editable={!isRunning}
            />

            <TouchableOpacity
              style={[styles.audioZone, { backgroundColor: colors.background, borderColor: slot.audioFile ? colors.green + '60' : colors.border }]}
              onPress={() => pickAudioForSlot(slot.id)}
              activeOpacity={0.7}
              disabled={isRunning}
            >
              {slot.audioFile ? (
                <View style={styles.audioSelected}>
                  <Mic size={20} color={colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.audioName, { color: colors.green }]} numberOfLines={1}>{slot.audioFile.name}</Text>
                    <Text style={[styles.audioSize, { color: colors.muted }]}>
                      {slot.audioFile.size ? `${(slot.audioFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.audioEmpty}>
                  <Mic size={20} color={colors.muted} />
                  <Text style={[styles.audioEmptyText, { color: colors.muted }]}>Tap to select audio</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ))}

        {!isRunning && slots.length < 10 && (
          <TouchableOpacity style={[styles.addSlotBtn, { borderColor: colors.border }]} onPress={addSlot} activeOpacity={0.7}>
            <Plus size={18} color={colors.green} />
            <Text style={[styles.addSlotText, { color: colors.green }]}>Add Call Slot ({slots.length}/10)</Text>
          </TouchableOpacity>
        )}

        {!isRunning && !showDone && (
          <TouchableOpacity
            onPress={() => void runBulk()}
            activeOpacity={0.8}
            disabled={validCount === 0}
            style={{ marginTop: 8, opacity: validCount === 0 ? 0.4 : 1 }}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.launchBtn}
            >
              <Rocket size={20} color="#fff" />
              <Text style={styles.launchBtnText}>Upload & Analyze All ({validCount} calls)</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  progressBanner: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10,
    borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12,
  },
  progressText: { fontSize: 15, fontWeight: '700' as const },
  summaryCard: {
    borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 16,
  },
  summaryTitle: { fontSize: 18, fontWeight: '800' as const, textAlign: 'center' as const, marginBottom: 16 },
  summaryRow: { flexDirection: 'row' as const, justifyContent: 'space-around' as const },
  summaryItem: { alignItems: 'center' as const },
  summaryNum: { fontSize: 28, fontWeight: '900' as const },
  summaryLabel: { fontSize: 11, marginTop: 2, fontWeight: '600' as const, textTransform: 'uppercase' as const },
  retryAllBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 8, borderRadius: 10, padding: 12, marginTop: 16,
  },
  retryAllText: { fontSize: 14, fontWeight: '700' as const },
  slotCard: {
    borderRadius: 14, padding: 16, borderWidth: 1.5, marginBottom: 12,
  },
  slotHeader: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 12,
  },
  slotHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  slotHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  slotTitle: { fontSize: 15, fontWeight: '700' as const },
  scorePill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  scorePillText: { fontSize: 12, fontWeight: '700' as const },
  retryBtn: { borderRadius: 8, padding: 6 },
  removeBtn: { padding: 4 },
  errorBar: { borderRadius: 8, padding: 8, marginBottom: 10 },
  errorText: { fontSize: 12 },
  slotRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 4 },
  slotField: { flex: 1 },
  slotLabel: { fontSize: 9, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 5 },
  dropdown: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
    borderRadius: 8, padding: 10, borderWidth: 1, marginBottom: 8,
  },
  dropdownText: { fontSize: 13 },
  dropdownList: { borderRadius: 8, marginBottom: 8, overflow: 'hidden' as const },
  dropdownItem: { padding: 10, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 13 },
  input: {
    borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, marginBottom: 8,
  },
  audioZone: {
    borderRadius: 10, padding: 12, borderWidth: 1, borderStyle: 'dashed' as const,
  },
  audioSelected: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  audioName: { fontSize: 13, fontWeight: '600' as const },
  audioSize: { fontSize: 11 },
  audioEmpty: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  audioEmptyText: { fontSize: 13 },
  addSlotBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 8, borderRadius: 12, padding: 14, borderWidth: 1.5, borderStyle: 'dashed' as const, marginBottom: 12,
  },
  addSlotText: { fontSize: 14, fontWeight: '600' as const },
  launchBtn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: 'row' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10,
  },
  launchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
});
