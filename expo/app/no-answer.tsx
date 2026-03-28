import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { useNoAnswers } from '@/hooks/useData';
import { submitNoAnswer } from '@/services/api';
import { formatTimestamp } from '@/utils/date';

const REASONS = ['Switched Off', 'Not Reachable', 'Busy', 'No Answer', 'Wrong Number', 'Other'];

export default function NoAnswerScreen() {
  const { user } = useAuth();
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
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'No Answer', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📵 Log No-Answer</Text>

        <View style={styles.formCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>ORDER ID</Text>
              <TextInput style={styles.input} placeholder="e.g. ORD-4821" placeholderTextColor={Colors.muted} value={orderId} onChangeText={setOrderId} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>CUSTOMER NAME</Text>
              <TextInput style={styles.input} placeholder="Customer name" placeholderTextColor={Colors.muted} value={customerName} onChangeText={setCustomerName} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>REASON</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowReasonDD(!showReasonDD)}>
                <Text style={styles.ddText}>{reason}</Text>
                <ChevronDown size={16} color={Colors.muted} />
              </TouchableOpacity>
              {showReasonDD && (
                <View style={styles.ddList}>
                  {REASONS.map(r => (
                    <TouchableOpacity key={r} style={styles.ddItem} onPress={() => { setReason(r); setShowReasonDD(false); }}>
                      <Text style={styles.ddItemText}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>ATTEMPTS</Text>
              <TextInput style={styles.input} value={attempts} onChangeText={t => setAttempts(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
            </View>
          </View>

          <Text style={styles.label}>NOTES</Text>
          <TextInput style={[styles.input, { minHeight: 50, textAlignVertical: 'top' }]} placeholder="Additional notes..." placeholderTextColor={Colors.muted} value={notes} onChangeText={setNotes} multiline />

          <TouchableOpacity style={styles.submitBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.8}>
            {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log No-Answer</Text>}
          </TouchableOpacity>
        </View>

        {myNoAnswers.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Recent No-Answer Logs</Text>
            {myNoAnswers.map(na => (
              <View key={na.id} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyOrder}>{na.orderId || na.customerName}</Text>
                  <Text style={styles.historyDate}>{formatTimestamp(na.date)}</Text>
                </View>
                <Text style={styles.historyReason}>{na.reason} · {na.attempts} attempt(s)</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginBottom: 16 },
  formCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 10, fontWeight: '700' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  ddText: { color: Colors.text, fontSize: 14 },
  ddList: { backgroundColor: Colors.cardHover, borderRadius: 8, marginBottom: 12 },
  ddItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ddItemText: { color: Colors.text, fontSize: 14 },
  submitBtn: { backgroundColor: Colors.orange, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  historySection: { marginTop: 20 },
  historyTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  historyCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyOrder: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  historyDate: { fontSize: 11, color: Colors.muted },
  historyReason: { fontSize: 12, color: Colors.soft },
});
