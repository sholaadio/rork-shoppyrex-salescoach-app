import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Trophy, Sparkles, LogOut, BarChart3, UserCog, ShieldCheck, FileText, KeyRound, Sun, Moon, Banknote } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, useColors } from '@/contexts/ThemeContext';
import { getRoleLabel, getInitials } from '@/types';
import ChangePinModal from '@/components/ChangePinModal';

export default function ManagementMoreScreen() {
  const { user, logoutMutation } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const colors = useColors();
  const router = useRouter();
  const [pinModalVisible, setPinModalVisible] = useState(false);

  const menuItems = [
    { label: 'AI Analyses', icon: BarChart3, route: '/analyses', color: colors.green },
    { label: 'Leaderboard', icon: Trophy, route: '/leaderboard', color: colors.yellow },
    { label: 'Attendance', icon: Calendar, route: '/attendance', color: colors.blue },
    { label: 'Pay Report', icon: FileText, route: '/pay-report', color: colors.orange },
    { label: 'Manage Staff', icon: UserCog, route: '/manage-staff', color: colors.pink },
    { label: 'Roles & Permissions', icon: ShieldCheck, route: '/roles', color: colors.red },
    { label: 'AI Summary', icon: Sparkles, route: '/ai-summary', color: colors.purple },
    { label: 'Commission Rules', icon: Banknote, route: '/commission-rules', color: colors.green },
  ];

  const handleLogout = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logoutMutation.mutate(undefined, { onSuccess: () => router.replace('/login') });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.profileSection}>
            <View style={[styles.avatar, { backgroundColor: colors.green }]}>
              <Text style={styles.avatarText}>{getInitials(user?.name ?? '')}</Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
            <Text style={[styles.role, { color: colors.muted }]}>{getRoleLabel(user?.role ?? 'ceo')}</Text>
          </View>
          <View style={styles.menuList}>
            {menuItems.map(item => (
              <TouchableOpacity key={item.label} style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as any); }} activeOpacity={0.7}>
                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPinModalVisible(true); }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.orange + '20' }]}>
                <KeyRound size={20} color={colors.orange} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Change PIN</Text>
            </TouchableOpacity>

            <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.purple + '20' : colors.yellow + '20' }]}>
                {isDark ? <Moon size={20} color={colors.purple} /> : <Sun size={20} color={colors.yellow} />}
              </View>
              <Text style={[styles.menuLabel, { color: colors.text, flex: 1 }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
              <Switch
                value={isDark}
                onValueChange={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
                trackColor={{ false: '#D1D9E6', true: colors.green + '60' }}
                thumbColor={isDark ? colors.green : '#fff'}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={18} color={colors.red} />
            <Text style={[styles.logoutText, { color: colors.red }]}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      <ChangePinModal visible={pinModalVisible} onClose={() => setPinModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  profileSection: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '800' as const, fontSize: 22 },
  name: { fontSize: 20, fontWeight: '700' as const },
  role: { fontSize: 13, marginTop: 2 },
  menuList: { gap: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16, borderWidth: 1, gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600' as const },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,107,107,0.1)', borderRadius: 12, padding: 16, marginTop: 30, gap: 8 },
  logoutText: { fontSize: 15, fontWeight: '600' as const },
});
