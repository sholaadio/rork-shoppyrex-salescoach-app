import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { useNoAnswers } from '@/hooks/useData';
import { submitNoAnswer } from '@/services/api';
import { formatTimestamp } from '@/utils/date';

const REASONS = ['Switched Off', 'Not Reachable', 'Busy', 'No Answer', 'Wrong Number', 'Other'];

export default function NoAnswerScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: noAnswers } = useNoAnswers();

  const [orderId, setOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [reason, setReason] = useState('Switched Off');
  const [attempts, setAttempts] = useState('1');
  const [notes, setNotes] = useState('');
  const [showReasonDD, setShowReasonDD] = useState(false);

  const myNoAnswers = useMemo(() => {
    if (!noAnswers) return [];
    return noAnswers.filter(n => n.closerId === user?.id).sort((a, b) => b.date - a.date).slice(0, 20);
  }, [noAnswers, user?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orderId.trim() && !customerName.trim()) throw new Error('Enter order ID or customer name');
      return submitNoAnswer({
        closerId: user?.id ?? '',
        closerName: user?.name ?? '',
        teamId: user?.teamId ?? '',
        orderId: orderId.trim(),
        customerName: customerName.trim(),
        reason,
        attempts: parseInt(attempts) || 1,
        notes: notes.trim(),
        date: Date.now(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'No-answer logged');
      setOrderId(''); setCustomerName(''); setNotes(''); setAttempts('1');
      void queryClient.invalidateQueries({ queryKey: ['noanswers'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'No Answer', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>📵 Log No-Answer</Text>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.muted }]}>ORDER ID</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="e.g. ORD-4821" placeholderTextColor={colors.muted} value={orderId} onChangeText={setOrderId} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.muted }]}>CUSTOMER NAME</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="Customer name" placeholderTextColor={colors.muted} value={customerName} onChangeText={setCustomerName} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.muted }]}>REASON</Text>
              <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowReasonDD(!showReasonDD)}>
                <Text style={[styles.ddText, { color: colors.text }]}>{reason}</Text>
                <ChevronDown size={16} color={colors.muted} />
              </TouchableOpacity>
              {showReasonDD && (
                <View style={[styles.ddList, { backgroundColor: colors.cardHover }]}>
                  {REASONS.map(r => (
                    <TouchableOpacity key={r} style={[styles.ddItem, { borderBottomColor: colors.border }]} onPress={() => { setReason(r); setShowReasonDD(false); }}>
                      <Text style={[styles.ddItemText, { color: colors.text }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.muted }]}>ATTEMPTS</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={attempts} onChangeText={t => setAttempts(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.muted }]}>NOTES</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, minHeight: 50, textAlignVertical: 'top' }]} placeholder="Additional notes..." placeholderTextColor={colors.muted} value={notes} onChangeText={setNotes} multiline />

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.orange }]} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.8}>
            {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log No-Answer</Text>}
          </TouchableOpacity>
        </View>

        {myNoAnswers.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Recent No-Answer Logs</Text>
            {myNoAnswers.map(na => (
              <View key={na.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.historyRow}>
                  <Text style={[styles.historyOrder, { color: colors.text }]}>{na.orderId || na.customerName}</Text>
                  <Text style={[styles.historyDate, { color: colors.muted }]}>{formatTimestamp(na.date)}</Text>
                </View>
                <Text style={[styles.historyReason, { color: colors.soft }]}>{na.reason} · {na.attempts} attempt(s)</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, marginBottom: 16 },
  formCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  input: { borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, marginBottom: 12 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  ddText: { fontSize: 14 },
  ddList: { borderRadius: 8, marginBottom: 12 },
  ddItem: { padding: 12, borderBottomWidth: 1 },
  ddItemText: { fontSize: 14 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  historySection: { marginTop: 20 },
  historyTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 10 },
  historyCard: { borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyOrder: { fontSize: 13, fontWeight: '600' as const },
  historyDate: { fontSize: 11 },
  historyReason: { fontSize: 12 },
});
