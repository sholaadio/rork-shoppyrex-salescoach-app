import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, getRateColor, getTierColor } from '@/constants/colors';
import { useUserLogs, useTeamType } from '@/hooks/useData';
import { getToday } from '@/utils/date';
import { calculateCommission, formatNaira } from '@/utils/commission';
import { submitLog } from '@/services/api';

export default function DailyLogScreen() {
  const { user } = useAuth();
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
      parseInt(assigned) || 0,
      parseInt(delivered) || 0,
      parseInt(upsells) || 0,
      parseInt(repeats) || 0,
      parseInt(referrals) || 0,
      teamType,
    );
  }, [assigned, delivered, upsells, repeats, referrals, teamType]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const a = parseInt(assigned) || 0;
      const d = parseInt(delivered) || 0;
      if (a === 0 && d === 0) throw new Error('Please enter your daily numbers');
      return submitLog({
        closerId: user?.id ?? '',
        closerName: user?.name ?? '',
        teamId: user?.teamId ?? '',
        teamType,
        date: getToday(),
        assigned: a,
        confirmed: parseInt(confirmed) || 0,
        delivered: d,
        upsells: parseInt(upsells) || 0,
        repeats: parseInt(repeats) || 0,
        referrals: parseInt(referrals) || 0,
        notes,
        commission,
        status: 'pending',
        submittedAt: Date.now(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Daily log submitted for approval');
      setAssigned(''); setConfirmed(''); setDelivered('');
      setUpsells(''); setRepeats(''); setReferrals(''); setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
    onError: (err) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Submit failed');
    },
  });

  const pastLogs = useMemo(() => {
    return [...userLogs].sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 10);
  }, [userLogs]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Daily Log</Text>

          <View style={styles.formCard}>
            <Text style={styles.formLabel}>📋 Daily Order Log</Text>

            <View style={styles.fieldsRow}>
              <NumField label="ORDERS ASSIGNED" value={assigned} onChange={setAssigned} />
              <NumField label="ORDERS CONFIRMED" value={confirmed} onChange={setConfirmed} />
              <NumField label="ORDERS DELIVERED" value={delivered} onChange={setDelivered} />
            </View>

            <View style={styles.fieldsRow}>
              <NumField label="UPSELLS (₦600 IF ≥50%)" value={upsells} onChange={setUpsells} />
              <NumField label="REPEAT CUSTOMERS (₦300)" value={repeats} onChange={setRepeats} />
              <NumField label="REFERRALS (₦300)" value={referrals} onChange={setReferrals} />
            </View>

            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any notes..."
              placeholderTextColor={Colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.commPreview}>
              <Text style={styles.commTitle}>Estimated Commission</Text>
              <View style={styles.commRow}>
                <Text style={styles.commLabel}>Rate: {commission.rate}%</Text>
                <View style={[styles.tierBadge, { backgroundColor: getTierColor(commission.tier) + '30' }]}>
                  <Text style={[styles.tierText, { color: getTierColor(commission.tier) }]}>
                    {commission.tier.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.commRow}>
                <Text style={styles.commLabel}>Base: {formatNaira(commission.base)}</Text>
                <Text style={styles.commLabel}>Upsell: {formatNaira(commission.upsellBonus)}</Text>
              </View>
              <View style={styles.commRow}>
                <Text style={styles.commLabel}>Repeat: {formatNaira(commission.repeatBonus)}</Text>
                <Text style={styles.commLabel}>Referral: {formatNaira(commission.referralBonus)}</Text>
              </View>
              <Text style={styles.commTotal}>Total: {formatNaira(commission.total)}</Text>
            </View>

            <TouchableOpacity
              onPress={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>📊 Submit Daily Log</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {pastLogs.length > 0 && (
            <View style={styles.pastSection}>
              <Text style={styles.pastTitle}>Past Logs</Text>
              {pastLogs.map(log => (
                <View key={log.id} style={styles.pastCard}>
                  <View style={styles.pastRow}>
                    <Text style={styles.pastDate}>{log.date}</Text>
                    <Text style={styles.pastNumbers}>{log.delivered}/{log.assigned}</Text>
                    <View style={[styles.rateBadge, { backgroundColor: getRateColor(log.commission.rate) + '20' }]}>
                      <Text style={[styles.rateText, { color: getRateColor(log.commission.rate) }]}>
                        {log.commission.rate}%
                      </Text>
                    </View>
                    <Text style={styles.pastComm}>{formatNaira(log.commission.total)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(log.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(log.status) }]}>
                        {log.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={nfStyles.container}>
      <Text style={nfStyles.label}>{label}</Text>
      <TextInput
        style={nfStyles.input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={Colors.muted}
      />
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved': return Colors.green;
    case 'rejected': return Colors.red;
    default: return Colors.yellow;
  }
}

const nfStyles = StyleSheet.create({
  container: { flex: 1, minWidth: 90 },
  label: { fontSize: 9, fontWeight: '700' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.3, marginBottom: 4 },
  input: { backgroundColor: Colors.background, borderRadius: 8, padding: 10, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border, textAlign: 'center' as const },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginBottom: 16 },
  formCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  formLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 16 },
  fieldsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
  notesInput: { backgroundColor: Colors.background, borderRadius: 8, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border, minHeight: 60, textAlignVertical: 'top' as const, marginBottom: 16 },
  commPreview: { backgroundColor: Colors.background, borderRadius: 10, padding: 14, marginBottom: 16 },
  commTitle: { fontSize: 13, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  commRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commLabel: { fontSize: 12, color: Colors.soft },
  commTotal: { fontSize: 18, fontWeight: '800' as const, color: Colors.green, marginTop: 8, textAlign: 'center' as const },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tierText: { fontSize: 11, fontWeight: '700' as const },
  submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  pastSection: { marginTop: 20 },
  pastTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  pastCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pastDate: { fontSize: 12, color: Colors.soft, minWidth: 80 },
  pastNumbers: { fontSize: 12, color: Colors.text, fontWeight: '600' as const },
  rateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rateText: { fontSize: 11, fontWeight: '700' as const },
  pastComm: { fontSize: 12, color: Colors.orange, fontWeight: '600' as const },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' as const, textTransform: 'capitalize' as const },
});
