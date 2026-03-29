import React, { useCallback } from 'react';
import { Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { useColors } from '@/contexts/ThemeContext';
import { Period } from '@/types';
import * as Haptics from 'expo-haptics';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

interface PeriodFilterProps {
  selected: Period;
  onSelect: (period: Period) => void;
}

export default React.memo(function PeriodFilter({ selected, onSelect }: PeriodFilterProps) {
  const colors = useColors();
  const handlePress = useCallback((key: Period) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(key);
  }, [onSelect]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {PERIODS.map(p => (
        <TouchableOpacity
          key={p.key}
          onPress={() => handlePress(p.key)}
          style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, selected === p.key && { backgroundColor: colors.green, borderColor: colors.green }]}
          testID={`period-${p.key}`}
        >
          <Text style={[styles.pillText, { color: colors.muted }, selected === p.key && styles.pillTextActive]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.muted,
  },
  pillTextActive: {
    color: '#fff',
  },
});
