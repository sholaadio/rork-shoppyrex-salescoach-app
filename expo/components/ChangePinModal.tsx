import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { X, Lock, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';

const API_BASE = 'https://salescoach-server.onrender.com';

interface ChangePinModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePinModal({ visible, onClose }: ChangePinModalProps) {
  const { user } = useAuth();
  const colors = useColors();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const changePinMutation = useMutation({
    mutationFn: async () => {
      if (!currentPin || currentPin.length !== 4) throw new Error('Enter your current 4-digit PIN');
      if (currentPin !== user?.pin) throw new Error('Current PIN is incorrect');
      if (!newPin || newPin.length !== 4) throw new Error('New PIN must be exactly 4 digits');
      if (!/^\d{4}$/.test(newPin)) throw new Error('PIN must contain only digits');
      if (newPin !== confirmPin) throw new Error('New PIN and confirmation do not match');

      console.log('[PIN] Updating PIN for user:', user?.id);
      const res = await fetch(`${API_BASE}/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        console.log('[PIN] Update failed:', res.status, text);

        const resFallback = await fetch(`${API_BASE}/users/${user?.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ pin: newPin }),
        });
        if (!resFallback.ok) {
          const fallbackText = await resFallback.text().catch(() => 'Unknown error');
          console.log('[PIN] Fallback POST also failed:', resFallback.status, fallbackText);
          throw new Error(`Failed to update PIN (${res.status})`);
        }
      }

      console.log('[PIN] PIN updated successfully');
      return true;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setError('');
      setTimeout(() => {
        handleClose();
      }, 1500);
    },
    onError: (err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : 'Failed to update PIN');
    },
  });

  const handleClose = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Change PIN</Text>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
              <X size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <View style={[styles.successCircle, { backgroundColor: colors.green + '20' }]}>
                <Check size={32} color={colors.green} />
              </View>
              <Text style={[styles.successText, { color: colors.green }]}>PIN Updated!</Text>
            </View>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.muted }]}>CURRENT PIN</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Lock size={16} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter current PIN"
                    placeholderTextColor={colors.muted}
                    value={currentPin}
                    onChangeText={t => setCurrentPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <PinDots count={currentPin.length} color={colors.green} borderColor={colors.border} />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.muted }]}>NEW PIN (4 DIGITS)</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Lock size={16} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter new PIN"
                    placeholderTextColor={colors.muted}
                    value={newPin}
                    onChangeText={t => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <PinDots count={newPin.length} color={colors.orange} borderColor={colors.border} />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.muted }]}>CONFIRM NEW PIN</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Lock size={16} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Confirm new PIN"
                    placeholderTextColor={colors.muted}
                    value={confirmPin}
                    onChangeText={t => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <PinDots count={confirmPin.length} color={colors.orange} borderColor={colors.border} />
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.green }]}
                onPress={() => changePinMutation.mutate()}
                disabled={changePinMutation.isPending}
                activeOpacity={0.8}
              >
                {changePinMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Update PIN</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PinDots({ count, color, borderColor }: { count: number; color: string; borderColor: string }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[styles.dot, { borderColor }, count > i && { backgroundColor: color, borderColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  errorBox: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 16,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
});
