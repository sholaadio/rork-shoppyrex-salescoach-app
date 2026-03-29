import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, User, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  const { loginMutation, user, portal } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (user && portal) {
      router.replace(`/${portal}` as '/closer' | '/teamlead' | '/management');
    }
  }, [user, portal, router]);

  const handleLogin = () => {
    setError('');
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID');
      return;
    }
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loginMutation.mutate(
      { employeeId: employeeId.trim(), pin },
      {
        onError: (err) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err instanceof Error ? err.message : 'Login failed');
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#0A0D16', '#07080F', '#050610']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.title}>SalesCoach</Text>
            <Text style={styles.subtitle}>Shoppyrex</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Sign in to your account</Text>

            <View style={styles.inputContainer}>
              <User size={18} color={Colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Employee ID (e.g. MGT001, TL001, SC001)"
                placeholderTextColor={Colors.muted}
                value={employeeId}
                onChangeText={setEmployeeId}
                autoCapitalize="none"
                autoCorrect={false}
                testID="employee-id-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="4-digit PIN"
                placeholderTextColor={Colors.muted}
                value={pin}
                onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                testID="pin-input"
              />
              <View style={styles.pinDots}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
                ))}
              </View>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loginMutation.isPending}
              activeOpacity={0.8}
              testID="login-button"
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A', '#15803D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.loginButton, loginMutation.isPending && styles.loginButtonDisabled]}
              >
                {loginMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <ChevronRight size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Use your Employee ID (MGT001, TL001, SC001) and 4-digit PIN
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 28,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900' as const,
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    marginTop: 4,
  },
  formSection: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.soft,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    marginLeft: 10,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotFilled: {
    backgroundColor: Colors.green,
  },
  errorContainer: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.red,
    fontSize: 13,
    textAlign: 'center' as const,
  },
  loginButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  hint: {
    color: Colors.muted,
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: 16,
  },
});
