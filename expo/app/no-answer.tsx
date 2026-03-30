import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { submitNoAnswer } from '@/services/api';

export default function NoAnswerScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();

  const [count, setCount] = useState('');
  const [notes, setNotes] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const num = parseInt(count) || 0;
      if (num <= 0) throw new Error('Enter number of no-answers');
      return submitNoAnswer({
        closerId: user?.id ?? '',
        closerName: user?.name ?? '',
        teamId: user?.teamId ?? '',
        count: num,
        date: new Date().toISOString().split('T')[0],
        notes: notes.trim(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'No Answer Log saved ✓');
      setCount(''); setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['noanswers'] });
    },
    onError: (err) => {
      console.log('[NoAnswer] Save error:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit no-answer');
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'No Answer', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>📵 Log No-Answer</Text>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>NUMBER OF NO-ANSWERS</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. 5"
            placeholderTextColor={colors.muted}
            value={count}
            onChangeText={t => setCount(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
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

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.orange }]} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.8}>
            {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log No-Answer</Text>}
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
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
});
