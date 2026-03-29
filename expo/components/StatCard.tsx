import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';

interface StatCardProps {
  label: string;
  value: string;
  accentColor: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default React.memo(function StatCard({ label, value, accentColor, subtitle, icon }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { borderTopColor: accentColor, backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
});
