import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { submitNoAnswer } from '@/services/api';

const REASONS = ['Switched Off', 'Not Reachable', 'Line Busy', 'No Pickup', 'Wrong Number'];
const ATTEMPTS = ['1', '2', '3', '4', '5+'];

export default function NoAnswerScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();

  const [orderId, setOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [reason, setReason] = useState('');
  const [attempts, setAttempts] = useState('1');
  const [callbackDate, setCallbackDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [showAttemptsDropdown, setShowAttemptsDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orderId.trim() && !customerName.trim()) throw new Error('Please enter Order ID or Customer Name');
      if (!reason) throw new Error('Please select a reason');
      return submitNoAnswer({
        closerId: user?.id ?? '',
        closerName: user?.name ?? '',
        teamId: user?.teamId ?? '',
        orderId: orderId.trim(),
        customerName: customerName.trim(),
        reason,
        attempts: attempts === '5+' ? 5 : parseInt(attempts) || 1,
        callbackDate: callbackDate.trim() || undefined,
        notes: notes.trim(),
        date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'No Answer Log saved ✓');
      setOrderId('');
      setCustomerName('');
      setReason('');
      setAttempts('1');
      setCallbackDate('');
      setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['noanswers'] });
    },
    onError: (err) => {
      console.log('[NoAnswer] Save error:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit no-answer');
    },
  });

  const handleSubmit = () => {
    if (submitting || saveMutation.isPending) return;
    setSubmitting(true);
    saveMutation.mutate(undefined, {
      onSettled: () => setSubmitting(false),
    });
  };

  const isDisabled = submitting || saveMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'No Answer', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>📵 Log No-Answer</Text>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>ORDER ID</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. ORD-4821"
            placeholderTextColor={colors.muted}
            value={orderId}
            onChangeText={setOrderId}
          />

          <Text style={[styles.label, { color: colors.muted }]}>CUSTOMER NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. John Doe"
            placeholderTextColor={colors.muted}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text style={[styles.label, { color: colors.muted }]}>REASON</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => { setShowReasonDropdown(!showReasonDropdown); setShowAttemptsDropdown(false); }}
          >
            <Text style={[styles.dropdownText, { color: reason ? colors.text : colors.muted }]}>
              {reason || 'Select reason...'}
            </Text>
            <ChevronDown size={16} color={colors.muted} />
          </TouchableOpacity>
          {showReasonDropdown && (
            <View style={[styles.dropdownList, { backgroundColor: colors.cardHover, borderColor: colors.border }]}>
              {REASONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setReason(r); setShowReasonDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: colors.muted }]}>ATTEMPTS</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => { setShowAttemptsDropdown(!showAttemptsDropdown); setShowReasonDropdown(false); }}
          >
            <Text style={[styles.dropdownText, { color: colors.text }]}>
              {attempts === '5+' ? '5+ attempts' : `${attempts} attempt${attempts === '1' ? '' : 's'}`}
            </Text>
            <ChevronDown size={16} color={colors.muted} />
          </TouchableOpacity>
          {showAttemptsDropdown && (
            <View style={[styles.dropdownList, { backgroundColor: colors.cardHover, borderColor: colors.border }]}>
              {ATTEMPTS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setAttempts(a); setShowAttemptsDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                    {a === '5+' ? '5+ attempts' : `${a} attempt${a === '1' ? '' : 's'}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: colors.muted }]}>SCHEDULE CALLBACK (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. 2025-04-15 14:00"
            placeholderTextColor={colors.muted}
            value={callbackDate}
            onChangeText={setCallbackDate}
          />

          <Text style={[styles.label, { color: colors.muted }]}>NOTES</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top' }]}
            placeholder="Additional notes..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.orange, opacity: isDisabled ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isDisabled}
            activeOpacity={0.8}
          >
            {isDisabled ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log No-Answer</Text>}
          </TouchableOpacity>
        </View>

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
  label: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  input: { borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, marginBottom: 12 },
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12,
  },
  dropdownText: { fontSize: 14 },
  dropdownList: { borderRadius: 8, marginBottom: 12, overflow: 'hidden' as const, borderWidth: 1 },
  dropdownItem: { padding: 12, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 14 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
});
