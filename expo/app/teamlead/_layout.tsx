import { Tabs } from 'expo-router';
import { Users, CheckCircle, Target, Mic, MoreHorizontal } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';

export default function TeamLeadLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'My Team', headerShown: false, tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals', headerShown: false, tabBarIcon: ({ color, size }) => <CheckCircle size={size} color={color} /> }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals', headerShown: false, tabBarIcon: ({ color, size }) => <Target size={size} color={color} /> }} />
      <Tabs.Screen name="calls" options={{ title: 'My Calls', headerShown: false, tabBarIcon: ({ color, size }) => <Mic size={size} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', headerShown: false, tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} /> }} />
    </Tabs>
  );
}
