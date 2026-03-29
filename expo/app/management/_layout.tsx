import { Tabs } from 'expo-router';
import { BarChart3, Target, Users, Banknote, MoreHorizontal } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';

export default function ManagementLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Overview', headerShown: false, tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} /> }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals', headerShown: false, tabBarIcon: ({ color, size }) => <Target size={size} color={color} /> }} />
      <Tabs.Screen name="teams" options={{ title: 'Teams', headerShown: false, tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tabs.Screen name="commission" options={{ title: 'Commission', headerShown: false, tabBarIcon: ({ color, size }) => <Banknote size={size} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', headerShown: false, tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} /> }} />
    </Tabs>
  );
}
