import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';

export default function IndexScreen() {
  const { user, isLoading, portal } = useAuth();
  const colors = useColors();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !portal) {
      router.replace('/login');
    } else {
      router.replace(`/${portal}` as '/closer' | '/teamlead' | '/management');
    }
  }, [isLoading, user, portal, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07080F',
  },
});
