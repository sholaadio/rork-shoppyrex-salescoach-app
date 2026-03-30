import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Edit3,
  Save,
  X,
  Clock,
  AlertTriangle,
  TrendingUp,
  Gift,
  Repeat,
  Users,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { supabase } from '@/services/supabase';

interface CommissionConfig {
  gold_rate: number;
  silver_rate: number;
  bronze_rate: number;
  upsell_bonus: number;
  repeat_bonus: number;
  referral_bonus: number;
  social_flat_rate: number;
  effectivefrom: number;
  editedbyname: string;
  notes: string;
}

export default function CommissionRulesScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState<Partial<CommissionConfig>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const canEdit = user?.role === 'ceo' || user?.role === 'gm' || user?.role === 'head_sales';

  const {
    data: currentConfig,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['commission-config-current'],
    queryFn: async () => {
      console.log('[CommRules] Fetching current commission config');
      const { data, error } = await supabase
        .from('sc_commission_config')
        .select('*')
        .order('effectivefrom', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('[CommRules] Error fetching config:', error.message);
        throw error;
      }
      console.log('[CommRules] Current config:', data);
      return data as CommissionConfig | null;
    },
  });

  const {
    data: historyData,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ['commission-config-history'],
    queryFn: async () => {
      console.log('[CommRules] Fetching config history');
      const { data, error } = await supabase
        .from('sc_commission_config')
        .select('*')
        .order('effectivefrom', { ascending: false });

      if (error) {
        console.log('[CommRules] Error fetching history:', error.message);
        throw error;
      }
      console.log('[CommRules] History count:', data?.length);
      return (data ?? []) as CommissionConfig[];
    },
    enabled: showHistory,
  });

  const history = useMemo(() => {
    if (!historyData || historyData.length <= 1) return [];
    return historyData.slice(1);
  }, [historyData]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig: CommissionConfig) => {
      console.log('[CommRules] Saving new config:', newConfig);
      const { error } = await supabase.from('sc_commission_config').insert(newConfig);
      if (error) {
        console.log('[CommRules] Save error:', error.message);
        throw error;
      }
      console.log('[CommRules] Config saved successfully');
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['commission-config-current'] });
      void queryClient.invalidateQueries({ queryKey: ['commission-config-history'] });
      setIsEditing(false);
      setDraft({});
      Alert.alert('Saved', 'New commission rates have been saved.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Failed to save commission rates.');
    },
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const startEditing = useCallback(() => {
    if (!currentConfig) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDraft({
      gold_rate: currentConfig.gold_rate,
      silver_rate: currentConfig.silver_rate,
      bronze_rate: currentConfig.bronze_rate,
      upsell_bonus: currentConfig.upsell_bonus,
      repeat_bonus: currentConfig.repeat_bonus,
      referral_bonus: currentConfig.referral_bonus,
      social_flat_rate: currentConfig.social_flat_rate,
      notes: '',
    });
    setIsEditing(true);
  }, [currentConfig]);

  const cancelEditing = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
    setDraft({});
  }, []);

  const handleSave = useCallback(() => {
    if (saveMutation.isPending) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      'Confirm Changes',
      'New rates only affect future daily logs. Are you sure you want to save?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          style: 'default',
          onPress: () => {
            const payload: CommissionConfig = {
              gold_rate: Number(draft.gold_rate) || 0,
              silver_rate: Number(draft.silver_rate) || 0,
              bronze_rate: Number(draft.bronze_rate) || 0,
              upsell_bonus: Number(draft.upsell_bonus) || 0,
              repeat_bonus: Number(draft.repeat_bonus) || 0,
              referral_bonus: Number(draft.referral_bonus) || 0,
              social_flat_rate: Number(draft.social_flat_rate) || 0,
              effectivefrom: Date.now(),
              editedbyname: user?.name ?? 'Unknown',
              notes: draft.notes ?? '',
            };
            saveMutation.mutate(payload);
          },
        },
      ]
    );
  }, [draft, saveMutation, user]);

  const updateDraft = useCallback((key: keyof CommissionConfig, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  const formatDate = useCallback((ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const formatNaira = useCallback((val: number) => `₦${val.toLocaleString()}`, []);

  const rateCards = useMemo(() => {
    if (!currentConfig) return [];
    return [
      {
        label: 'Gold Tier (≥90%)',
        key: 'gold_rate' as const,
        value: currentConfig.gold_rate,
        icon: TrendingUp,
        color: colors.tierGold,
        desc: 'Per delivery at ≥90% rate',
      },
      {
        label: 'Silver Tier (≥65%)',
        key: 'silver_rate' as const,
        value: currentConfig.silver_rate,
        icon: TrendingUp,
        color: colors.tierSilver,
        desc: 'Per delivery at ≥65% rate',
      },
      {
        label: 'Bronze Tier (≥50%)',
        key: 'bronze_rate' as const,
        value: currentConfig.bronze_rate,
        icon: TrendingUp,
        color: colors.tierBronze,
        desc: 'Per delivery at ≥50% rate',
      },
    ];
  }, [currentConfig, colors]);

  const bonusCards = useMemo(() => {
    if (!currentConfig) return [];
    return [
      {
        label: 'Upsell Bonus',
        key: 'upsell_bonus' as const,
        value: currentConfig.upsell_bonus,
        icon: Gift,
        color: colors.orange,
        desc: 'Per upsell achieved',
      },
      {
        label: 'Repeat Bonus',
        key: 'repeat_bonus' as const,
        value: currentConfig.repeat_bonus,
        icon: Repeat,
        color: colors.blue,
        desc: 'Per repeat customer',
      },
      {
        label: 'Referral Bonus',
        key: 'referral_bonus' as const,
        value: currentConfig.referral_bonus,
        icon: Users,
        color: colors.purple,
        desc: 'Per referral closed',
      },
      {
        label: 'Social Media Flat Rate',
        key: 'social_flat_rate' as const,
        value: currentConfig.social_flat_rate,
        icon: Smartphone,
        color: colors.pink,
        desc: 'Per delivery (social team)',
      },
    ];
  }, [currentConfig, colors]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Commission Rules', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading rates...</Text>
        </View>
      </View>
    );
  }

  if (!currentConfig) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Commission Rules', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false }} />
        <View style={styles.centered}>
          <DollarSign size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Commission Config</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>No commission rates have been configured yet.</Text>
          {canEdit && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.green }]}
              onPress={() => {
                setDraft({
                  gold_rate: 200,
                  silver_rate: 150,
                  bronze_rate: 100,
                  upsell_bonus: 600,
                  repeat_bonus: 300,
                  referral_bonus: 300,
                  social_flat_rate: 200,
                  notes: 'Initial commission setup',
                });
                setIsEditing(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryBtnText}>Set Up Rates</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Commission Rules',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () =>
            canEdit && !isEditing ? (
              <TouchableOpacity onPress={startEditing} style={styles.headerBtn} activeOpacity={0.7}>
                <Edit3 size={18} color={colors.green} />
              </TouchableOpacity>
            ) : null,
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.green} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {isEditing && (
            <View style={[styles.warningBanner, { backgroundColor: colors.yellow + '15', borderColor: colors.yellow + '40' }]}>
              <AlertTriangle size={16} color={colors.yellow} />
              <Text style={[styles.warningText, { color: colors.yellow }]}>
                New rates only affect future daily logs.
              </Text>
            </View>
          )}

          <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.metaRow}>
              <Clock size={14} color={colors.muted} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Effective from</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>{formatDate(currentConfig.effectivefrom)}</Text>
            </View>
            {currentConfig.editedbyname ? (
              <View style={styles.metaRow}>
                <Edit3 size={14} color={colors.muted} />
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Last edited by</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{currentConfig.editedbyname}</Text>
              </View>
            ) : null}
            {currentConfig.notes ? (
              <View style={[styles.notesBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.notesText, { color: colors.soft }]}>"{currentConfig.notes}"</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Tiers</Text>
          {rateCards.map(card => (
            <View key={card.key} style={[styles.rateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rateCardHeader}>
                <View style={[styles.rateIcon, { backgroundColor: card.color + '18' }]}>
                  <card.icon size={18} color={card.color} />
                </View>
                <View style={styles.rateInfo}>
                  <Text style={[styles.rateLabel, { color: colors.text }]}>{card.label}</Text>
                  <Text style={[styles.rateDesc, { color: colors.muted }]}>{card.desc}</Text>
                </View>
                {isEditing ? (
                  <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.inputPrefix, { color: colors.muted }]}>₦</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={String(draft[card.key] ?? '')}
                      onChangeText={v => updateDraft(card.key, v)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                ) : (
                  <Text style={[styles.rateValue, { color: card.color }]}>{formatNaira(card.value)}</Text>
                )}
              </View>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Bonuses & Special Rates</Text>
          {bonusCards.map(card => (
            <View key={card.key} style={[styles.rateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rateCardHeader}>
                <View style={[styles.rateIcon, { backgroundColor: card.color + '18' }]}>
                  <card.icon size={18} color={card.color} />
                </View>
                <View style={styles.rateInfo}>
                  <Text style={[styles.rateLabel, { color: colors.text }]}>{card.label}</Text>
                  <Text style={[styles.rateDesc, { color: colors.muted }]}>{card.desc}</Text>
                </View>
                {isEditing ? (
                  <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.inputPrefix, { color: colors.muted }]}>₦</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={String(draft[card.key] ?? '')}
                      onChangeText={v => updateDraft(card.key, v)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                ) : (
                  <Text style={[styles.rateValue, { color: card.color }]}>{formatNaira(card.value)}</Text>
                )}
              </View>
            </View>
          ))}

          {isEditing && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Change Notes (optional)</Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={draft.notes as string ?? ''}
                onChangeText={v => updateDraft('notes', v)}
                placeholder="e.g. Increased gold tier rate for Q2"
                placeholderTextColor={colors.muted}
                multiline
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={cancelEditing}
                  activeOpacity={0.7}
                >
                  <X size={16} color={colors.muted} />
                  <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.green, opacity: saveMutation.isPending ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={saveMutation.isPending}
                  activeOpacity={0.7}
                >
                  {saveMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Save size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>Save New Rates</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.historyToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowHistory(prev => !prev);
            }}
            activeOpacity={0.7}
          >
            <Clock size={16} color={colors.muted} />
            <Text style={[styles.historyToggleText, { color: colors.text }]}>Rate Change History</Text>
            {showHistory ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
          </TouchableOpacity>

          {showHistory && (
            <View style={styles.historySection}>
              {historyLoading ? (
                <ActivityIndicator size="small" color={colors.green} style={{ marginVertical: 16 }} />
              ) : history.length === 0 ? (
                <Text style={[styles.historyEmpty, { color: colors.muted }]}>No previous changes recorded.</Text>
              ) : (
                history.map((item, idx) => (
                  <View key={idx} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.historyHeader}>
                      <Text style={[styles.historyDate, { color: colors.text }]}>{formatDate(item.effectivefrom)}</Text>
                      <Text style={[styles.historyEditor, { color: colors.muted }]}>{item.editedbyname || '—'}</Text>
                    </View>
                    <View style={styles.historyRates}>
                      <View style={styles.historyRate}>
                        <Text style={[styles.historyRateLabel, { color: colors.tierGold }]}>Gold</Text>
                        <Text style={[styles.historyRateVal, { color: colors.text }]}>₦{item.gold_rate}</Text>
                      </View>
                      <View style={styles.historyRate}>
                        <Text style={[styles.historyRateLabel, { color: colors.tierSilver }]}>Silver</Text>
                        <Text style={[styles.historyRateVal, { color: colors.text }]}>₦{item.silver_rate}</Text>
                      </View>
                      <View style={styles.historyRate}>
                        <Text style={[styles.historyRateLabel, { color: colors.tierBronze }]}>Bronze</Text>
                        <Text style={[styles.historyRateVal, { color: colors.text }]}>₦{item.bronze_rate}</Text>
                      </View>
                      <View style={styles.historyRate}>
                        <Text style={[styles.historyRateLabel, { color: colors.orange }]}>Upsell</Text>
                        <Text style={[styles.historyRateVal, { color: colors.text }]}>₦{item.upsell_bonus}</Text>
                      </View>
                      <View style={styles.historyRate}>
                        <Text style={[styles.historyRateLabel, { color: colors.blue }]}>Repeat</Text>
                        <Text style={[styles.historyRateVal, { color: colors.text }]}>₦{item.repeat_bonus}</Text>
                      </View>
                      <View style={styles.historyRate}>
                        <Text style={[styles.historyRateLabel, { color: colors.purple }]}>Referral</Text>
                        <Text style={[styles.historyRateVal, { color: colors.text }]}>₦{item.referral_bonus}</Text>
                      </View>
                      <View style={styles.historyRate}>
                        <Text style={[styles.historyRateLabel, { color: colors.pink }]}>Social</Text>
                        <Text style={[styles.historyRateVal, { color: colors.text }]}>₦{item.social_flat_rate}</Text>
                      </View>
                    </View>
                    {item.notes ? (
                      <Text style={[styles.historyNotes, { color: colors.soft }]}>"{item.notes}"</Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { fontSize: 14, marginTop: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, marginTop: 16 },
  emptyDesc: { fontSize: 13, marginTop: 6, textAlign: 'center' as const },
  primaryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  primaryBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
  headerBtn: { padding: 8 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningText: { fontSize: 13, fontWeight: '600' as const, flex: 1 },
  metaCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 20, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { fontSize: 12 },
  metaValue: { fontSize: 12, fontWeight: '600' as const, marginLeft: 'auto' },
  notesBox: { borderRadius: 8, padding: 10, marginTop: 4 },
  notesText: { fontSize: 12, fontStyle: 'italic' as const },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 10 },
  rateCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  rateCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rateIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rateInfo: { flex: 1 },
  rateLabel: { fontSize: 14, fontWeight: '600' as const },
  rateDesc: { fontSize: 11, marginTop: 1 },
  rateValue: { fontSize: 18, fontWeight: '800' as const },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    width: 100,
  },
  inputPrefix: { fontSize: 14, fontWeight: '600' as const },
  input: { flex: 1, fontSize: 16, fontWeight: '700' as const, paddingVertical: 6, paddingHorizontal: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600' as const, marginBottom: 6 },
  notesInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top' as const,
  },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' as const },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 24,
  },
  historyToggleText: { flex: 1, fontSize: 14, fontWeight: '600' as const },
  historySection: { marginTop: 8 },
  historyEmpty: { fontSize: 13, textAlign: 'center' as const, paddingVertical: 16 },
  historyCard: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { fontSize: 13, fontWeight: '600' as const },
  historyEditor: { fontSize: 11 },
  historyRates: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  historyRate: { alignItems: 'center', minWidth: 60 },
  historyRateLabel: { fontSize: 9, fontWeight: '700' as const, textTransform: 'uppercase' as const },
  historyRateVal: { fontSize: 12, fontWeight: '600' as const },
  historyNotes: { fontSize: 11, fontStyle: 'italic' as const, marginTop: 8 },
});
