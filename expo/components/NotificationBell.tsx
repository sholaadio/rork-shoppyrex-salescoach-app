import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, AppState,
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { fetchNotifications, getUnreadNotificationCount, markNotificationRead } from '@/services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdat: number;
  data?: any;
}

function timeAgo(ts: number): string {
  if (!ts || isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshCount = useCallback(async () => {
    if (!user?.id) return;
    const count = await getUnreadNotificationCount(user.id);
    setUnreadCount(count);
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchNotifications(user.id);
    setNotifications(data);
  }, [user?.id]);

  useEffect(() => {
    void refreshCount();
    const interval = setInterval(() => { void refreshCount(); }, 30000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshCount();
    });
    return () => { clearInterval(interval); sub.remove(); };
  }, [refreshCount]);

  const openModal = async () => {
    setShowModal(true);
    await loadNotifications();
  };

  const handleTap = async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowModal(false);
    if (notif.type === 'log_submitted') {
      router.push('/teamlead/approvals');
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notifItem, { backgroundColor: item.read ? 'transparent' : colors.green + '10', borderBottomColor: colors.border }]}
      onPress={() => void handleTap(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.notifMessage, { color: colors.soft }]} numberOfLines={2}>{item.message}</Text>
        <Text style={[styles.notifTime, { color: colors.muted }]}>{timeAgo(item.createdat)}</Text>
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.green }]} />}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity onPress={() => void openModal()} style={styles.bellContainer} activeOpacity={0.7}>
        <Bell size={22} color={colors.text} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 28 }}>🔔</Text>
                <Text style={[styles.emptyText, { color: colors.muted }]}>No notifications yet</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' as const },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' as const },
  notifItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderBottomWidth: 1,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  notifMessage: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14 },
});
