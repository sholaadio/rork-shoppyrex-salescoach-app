import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getRateColor, getTierColor, ThemeColors } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { useUserLogs, useTeamType } from '@/hooks/useData';
import { getToday } from '@/utils/date';
import { calculateCommission, formatNaira } from '@/utils/commission';
import { submitLog } from '@/services/api';

export default function TeamLeadLogScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const teamType = useTeamType(user?.teamId);
  const queryClient = useQueryClient();
  const userLogs = useUserLogs(user?.id ?? '', 'all');

  const [assigned, setAssigned] = useState('');
  const [confirmed, setConfirmed] = useState('');
  const [delivered, setDelivered] = useState('');
  const [upsells, setUpsells] = useState('');
  const [repeats, setRepeats] = useState('');
  const [referrals, setReferrals] = useState('');
  const [notes, setNotes] = useState('');

  const commission = useMemo(() => {
    return calculateCommission(
      parseInt(assigned) || 0, parseInt(delivered) || 0,
      parseInt(upsells) || 0, parseInt(repeats) || 0,
      parseInt(referrals) || 0, teamType,
    );
  }, [assigned, delivered, upsells, repeats, referrals, teamType]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const a = parseInt(assigned) || 0;
      const d = parseInt(delivered) || 0;
      if (a === 0 && d === 0) throw new Error('Please enter your daily numbers');
      return submitLog({
        closerId: user?.id ?? '', closerName: user?.name ?? '',
        teamId: user?.teamId ?? '', teamType, date: getToday(),
        assigned: a, confirmed: parseInt(confirmed) || 0, delivered: d,
        upsells: parseInt(upsells) || 0, repeats: parseInt(repeats) || 0,
        referrals: parseInt(referrals) || 0, notes, commission,
        status: 'approved', submittedAt: Date.now(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Daily log submitted and auto-approved');
      setAssigned(''); setConfirmed(''); setDelivered('');
      setUpsells(''); setRepeats(''); setReferrals(''); setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Submit failed'),
  });

  const pastLogs = useMemo(() => [...userLogs].sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 10), [userLogs]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'My Daily Log', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>📋 My Daily Log</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Auto-approved for Team Leads</Text>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldsRow}>
            <NumField label="ORDERS ASSIGNED" value={assigned} onChange={setAssigned} colors={colors} />
            <NumField label="ORDERS CONFIRMED" value={confirmed} onChange={setConfirmed} colors={colors} />
            <NumField label="ORDERS DELIVERED" value={delivered} onChange={setDelivered} colors={colors} />
          </View>
          <View style={styles.fieldsRow}>
            <NumField label="UPSELLS (₦600)" value={upsells} onChange={setUpsells} colors={colors} />
            <NumField label="REPEAT (₦300)" value={repeats} onChange={setRepeats} colors={colors} />
            <NumField label="REFERRALS (₦300)" value={referrals} onChange={setReferrals} colors={colors} />
          </View>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>NOTES</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Any notes..." placeholderTextColor={colors.muted}
            value={notes} onChangeText={setNotes} multiline
          />
          <View style={[styles.commPreview, { backgroundColor: colors.background }]}>
            <Text style={[styles.commTitle, { color: colors.text }]}>Estimated Commission</Text>
            <View style={styles.commRow}>
              <Text style={[styles.commLabel, { color: colors.soft }]}>Rate: {commission.rate}%</Text>
              <View style={[styles.tierBadge, { backgroundColor: getTierColor(commission.tier, colors) + '30' }]}>
                <Text style={[styles.tierText, { color: getTierColor(commission.tier, colors) }]}>{commission.tier.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.commRow}>
              <Text style={[styles.commLabel, { color: colors.soft }]}>Base: {formatNaira(commission.base)}</Text>
              <Text style={[styles.commLabel, { color: colors.soft }]}>Upsell: {formatNaira(commission.upsellBonus)}</Text>
            </View>
            <View style={styles.commRow}>
              <Text style={[styles.commLabel, { color: colors.soft }]}>Repeat: {formatNaira(commission.repeatBonus)}</Text>
              <Text style={[styles.commLabel, { color: colors.soft }]}>Referral: {formatNaira(commission.referralBonus)}</Text>
            </View>
            <Text style={[styles.commTotal, { color: colors.green }]}>Total: {formatNaira(commission.total)}</Text>
          </View>
          <TouchableOpacity onPress={() => submitMutation.mutate()} disabled={submitMutation.isPending} activeOpacity={0.8}>
            <LinearGradient colors={['#22C55E', '#16A34A', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
              {submitMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>📊 Submit Daily Log (Auto-Approved)</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {pastLogs.length > 0 && (
          <View style={styles.pastSection}>
            <Text style={[styles.pastTitle, { color: colors.text }]}>Past Logs</Text>
            {pastLogs.map(log => (
              <View key={log.id} style={[styles.pastCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.pastRow}>
                  <Text style={[styles.pastDate, { color: colors.soft }]}>{log.date}</Text>
                  <Text style={[styles.pastNumbers, { color: colors.text }]}>{log.delivered}/{log.assigned}</Text>
                  <View style={[styles.rateBadge, { backgroundColor: getRateColor(log.commission.rate, colors) + '20' }]}>
                    <Text style={[styles.rateText, { color: getRateColor(log.commission.rate, colors) }]}>{log.commission.rate}%</Text>
                  </View>
                  <Text style={[styles.pastComm, { color: colors.orange }]}>{formatNaira(log.commission.total)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(log.status, colors) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(log.status, colors) }]}>{log.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function NumField({ label, value, onChange, colors }: { label: string; value: string; onChange: (v: string) => void; colors: ThemeColors }) {
  return (
    <View style={nfStyles.container}>
      <Text style={[nfStyles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        style={[nfStyles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
        value={value} onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function getStatusColor(status: string, c: ThemeColors): string {
  switch (status) { case 'approved': return c.green; case 'rejected': return c.red; default: return c.yellow; }
}

const nfStyles = StyleSheet.create({
  container: { flex: 1, minWidth: 90 },
  label: { fontSize: 9, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.3, marginBottom: 4 },
  input: { borderRadius: 8, padding: 10, fontSize: 16, borderWidth: 1, textAlign: 'center' as const },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  formCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  fieldsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
  notesInput: { borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1, minHeight: 60, textAlignVertical: 'top' as const, marginBottom: 16 },
  commPreview: { borderRadius: 10, padding: 14, marginBottom: 16 },
  commTitle: { fontSize: 13, fontWeight: '700' as const, marginBottom: 8 },
  commRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commLabel: { fontSize: 12 },
  commTotal: { fontSize: 18, fontWeight: '800' as const, marginTop: 8, textAlign: 'center' as const },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tierText: { fontSize: 11, fontWeight: '700' as const },
  submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  pastSection: { marginTop: 20 },
  pastTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 10 },
  pastCard: { borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1 },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },
  pastDate: { fontSize: 12, minWidth: 80 },
  pastNumbers: { fontSize: 12, fontWeight: '600' as const },
  rateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rateText: { fontSize: 11, fontWeight: '700' as const },
  pastComm: { fontSize: 12, fontWeight: '600' as const },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' as const, textTransform: 'capitalize' as const },
});
