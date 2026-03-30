import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Animated, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, useColors } from '@/contexts/ThemeContext';
import { getRoleLabel, getInitials, UserRole } from '@/types';

type LoginStep = 'employee_id' | 'pin' | 'welcome_back';

export default function LoginScreen() {
  const {
    loginMutation, pinLoginMutation, lookupMutation,
    user, portal, savedProfile, logoutMutation,
  } = useAuth();
  const { isDark } = useTheme();
  const colors = useColors();
  const router = useRouter();

  const [step, setStep] = useState<LoginStep>(savedProfile ? 'welcome_back' : 'employee_id');
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [lookedUpName, setLookedUpName] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    animateIn();
  }, [step, animateIn]);

  useEffect(() => {
    if (user && portal) {
      router.replace(`/${portal}` as '/closer' | '/teamlead' | '/management');
    }
  }, [user, portal, router]);

  const handlePinPress = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      setTimeout(() => {
        if (step === 'welcome_back' && savedProfile) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          pinLoginMutation.mutate(
            { pin: newPin },
            {
              onError: (err) => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setError(err instanceof Error ? err.message : 'Login failed');
                setPin('');
              },
            }
          );
        } else {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          loginMutation.mutate(
            { employeeId: employeeId.trim(), pin: newPin },
            {
              onError: (err) => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setError(err instanceof Error ? err.message : 'Login failed');
                setPin('');
              },
            }
          );
        }
      }, 100);
    }
  }, [pin, step, savedProfile, pinLoginMutation, loginMutation, employeeId]);

  const handlePinDelete = useCallback(() => {
    if (pin.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, [pin]);

  const handleContinueToPin = useCallback(() => {
    setError('');
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    lookupMutation.mutate(
      { employeeId: employeeId.trim() },
      {
        onSuccess: (foundUser) => {
          setLookedUpName(foundUser.name);
          setPin('');
          setStep('pin');
        },
        onError: (err) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err instanceof Error ? err.message : 'Employee not found');
        },
      }
    );
  }, [employeeId, lookupMutation]);

  const handleSignOut = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setStep('employee_id');
        setEmployeeId('');
        setPin('');
        setError('');
      },
    });
  }, [logoutMutation]);

  const isProcessing = loginMutation.isPending || pinLoginMutation.isPending || lookupMutation.isPending;

  const renderPinDots = () => (
    <View style={styles.pinDotsRow}>
      {[0, 1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.pinDot,
            {
              backgroundColor: pin.length > i ? '#F97316' : (isDark ? '#1E2130' : '#D1D9E6'),
              borderColor: pin.length > i ? '#F97316' : (isDark ? '#2A2F45' : '#B8C4D6'),
            },
          ]}
        />
      ))}
    </View>
  );

  const renderPinPad = () => (
    <View style={styles.pinPadContainer}>
      {renderPinDots()}
      {error ? (
        <View style={styles.errorBubble}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <View style={styles.pinPad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, idx) => {
          if (key === '') {
            return <View key={idx} style={styles.pinKeyEmpty} />;
          }
          if (key === 'del') {
            return (
              <TouchableOpacity
                key={idx}
                style={styles.pinKey}
                onPress={handlePinDelete}
                activeOpacity={0.6}
              >
                <Delete size={24} color={colors.muted} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.pinKey, { backgroundColor: isDark ? '#13151F' : '#FFFFFF' }]}
              onPress={() => handlePinPress(key)}
              activeOpacity={0.6}
              disabled={isProcessing}
            >
              <Text style={[styles.pinKeyText, { color: colors.text }]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {isProcessing ? (
        <ActivityIndicator color="#F97316" style={styles.pinLoader} />
      ) : null}
    </View>
  );

  const renderAvatarCircle = (name: string, size: number) => {
    const initials = getInitials(name);
    return (
      <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
      </View>
    );
  };

  if (step === 'welcome_back' && savedProfile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.welcomeContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.welcomeHeader}>
            <Image
              source={require('@/assets/images/shoppyrex-logo.png')}
              style={styles.miniLogo}
              resizeMode="contain"
            />
            <Text style={[styles.welcomeLabel, { color: colors.muted }]}>Welcome back</Text>
            {renderAvatarCircle(savedProfile.name, 80)}
            <Text style={[styles.welcomeName, { color: colors.text }]}>{savedProfile.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: isDark ? '#1A1D2E' : '#E8ECFF' }]}>
              <Text style={[styles.roleText, { color: '#F97316' }]}>
                {getRoleLabel(savedProfile.role as UserRole)}
              </Text>
            </View>
          </View>

          <Text style={[styles.pinPrompt, { color: colors.soft }]}>Enter your PIN</Text>
          {renderPinPad()}

          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn} activeOpacity={0.7}>
            <LogOut size={16} color={colors.muted} />
            <Text style={[styles.signOutText, { color: colors.muted }]}>
              Not your account? Sign out
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (step === 'pin') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.welcomeContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.welcomeHeader}>
            <Image
              source={require('@/assets/images/shoppyrex-logo.png')}
              style={styles.miniLogo}
              resizeMode="contain"
            />
            {renderAvatarCircle(lookedUpName || employeeId, 72)}
            <Text style={[styles.welcomeName, { color: colors.text, fontSize: 22 }]}>
              {lookedUpName || employeeId}
            </Text>
          </View>

          <Text style={[styles.pinPrompt, { color: colors.soft }]}>Enter your 4-digit PIN</Text>
          {renderPinPad()}

          <TouchableOpacity
            onPress={() => { setStep('employee_id'); setPin(''); setError(''); }}
            style={styles.signOutBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.signOutText, { color: colors.muted }]}>
              ← Back to Employee ID
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[
            styles.idContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.idHeader}>
            <Image
              source={require('@/assets/images/shoppyrex-logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={[styles.idTitle, { color: colors.text }]}>SalesCoach</Text>
            <Text style={[styles.idSubtitle, { color: colors.muted }]}>
              Sign in to continue
            </Text>
          </View>

          <View style={[styles.idCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.idCardLabel, { color: colors.soft }]}>Employee ID</Text>
            <View style={[styles.idInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.idInput, { color: colors.text }]}
                placeholder="Enter your Employee ID"
                placeholderTextColor={colors.muted}
                value={employeeId}
                onChangeText={(t) => { setEmployeeId(t); setError(''); }}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleContinueToPin}
                testID="employee-id-input"
              />
            </View>

            {error ? (
              <View style={styles.errorBubble}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleContinueToPin}
              disabled={isProcessing || !employeeId.trim()}
              activeOpacity={0.8}
              style={[
                styles.continueBtn,
                (!employeeId.trim() || isProcessing) && styles.continueBtnDisabled,
              ]}
              testID="continue-button"
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueBtnText}>Continue</Text>
                  <ChevronRight size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  miniLogo: {
    width: 56,
    height: 56,
    marginBottom: 20,
  },
  welcomeLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  avatarCircle: {
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800' as const,
  },
  welcomeName: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  pinPrompt: {
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  pinPadContainer: {
    alignItems: 'center',
  },
  pinPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 270,
    gap: 12,
  },
  pinKey: {
    width: 72,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinKeyEmpty: {
    width: 72,
    height: 56,
  },
  pinKeyText: {
    fontSize: 26,
    fontWeight: '600' as const,
  },
  pinLoader: {
    marginTop: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  idContent: {
    paddingHorizontal: 28,
  },
  idHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  headerLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  idTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  idSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  idCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  idCardLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  idInputWrap: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  idInput: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  errorBubble: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  continueBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 6,
    backgroundColor: '#F97316',
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
