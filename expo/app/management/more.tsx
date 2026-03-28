import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Trophy, Sparkles, LogOut, BarChart3, UserCog, ShieldCheck, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { getRoleLabel, getInitials } from '@/types';

export default function ManagementMoreScreen() {
  const { user, logoutMutation } = useAuth();
  const router = useRouter();

  const menuItems = [
    { label: 'AI Analyses', icon: BarChart3, route: '/analyses', color: Colors.green },
    { label: 'Leaderboard', icon: Trophy, route: '/leaderboard', color: Colors.yellow },
    { label: 'Attendance', icon: Calendar, route: '/attendance', color: Colors.blue },
    { label: 'Pay Report', icon: FileText, route: '/pay-report', color: Colors.orange },
    { label: 'Manage Staff', icon: UserCog, route: '/manage-staff', color: Colors.pink },
    { label: 'Roles & Permissions', icon: ShieldCheck, route: '/roles', color: Colors.red },
    { label: 'AI Summary', icon: Sparkles, route: '/ai-summary', color: Colors.purple },
  ];

  const handleLogout = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logoutMutation.mutate(undefined, { onSuccess: () => router.replace('/login') });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name ?? '')}</Text>
            </View>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.role}>{getRoleLabel(user?.role ?? 'ceo')}</Text>
          </View>
          <View style={styles.menuList}>
            {menuItems.map(item => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as any); }} activeOpacity={0.7}>
                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={18} color={Colors.red} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  profileSection: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.green, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '800' as const, fontSize: 22 },
  name: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  role: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  menuList: { gap: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,107,107,0.1)', borderRadius: 12, padding: 16, marginTop: 30, gap: 8 },
  logoutText: { color: Colors.red, fontSize: 15, fontWeight: '600' as const },
});
