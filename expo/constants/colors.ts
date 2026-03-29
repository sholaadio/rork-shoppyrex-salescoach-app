export interface ThemeColors {
  background: string;
  card: string;
  cardHover: string;
  border: string;
  text: string;
  muted: string;
  soft: string;
  green: string;
  orange: string;
  red: string;
  yellow: string;
  blue: string;
  purple: string;
  pink: string;
  tierGold: string;
  tierSilver: string;
  tierBronze: string;
  tierNone: string;
}

export const DarkColors: ThemeColors = {
  background: '#07080F',
  card: '#0F1117',
  cardHover: '#161924',
  border: '#1E2130',
  text: '#F1F5FF',
  muted: '#6A7A90',
  soft: '#C8D3E8',
  green: '#00E5A0',
  orange: '#F97316',
  red: '#FF6B6B',
  yellow: '#FFB627',
  blue: '#60A5FA',
  purple: '#A78BFA',
  pink: '#F472B6',
  tierGold: '#FFB627',
  tierSilver: '#9CA3AF',
  tierBronze: '#CD7C2F',
  tierNone: '#5A6A80',
};

export const LightColors: ThemeColors = {
  background: '#F0F4FF',
  card: '#FFFFFF',
  cardHover: '#E8ECFF',
  border: '#D1D9E6',
  text: '#0A0E1A',
  muted: '#64748B',
  soft: '#334155',
  green: '#059669',
  orange: '#EA580C',
  red: '#DC2626',
  yellow: '#D97706',
  blue: '#2563EB',
  purple: '#7C3AED',
  pink: '#DB2777',
  tierGold: '#D97706',
  tierSilver: '#6B7280',
  tierBronze: '#B45309',
  tierNone: '#94A3B8',
};

export const Colors: ThemeColors = { ...DarkColors };

export function getScoreColor(score: number, c: ThemeColors = DarkColors): string {
  if (score >= 80) return c.green;
  if (score >= 60) return c.yellow;
  return c.red;
}

export function getTierColor(tier: string, c: ThemeColors = DarkColors): string {
  switch (tier) {
    case 'gold': return c.tierGold;
    case 'silver': return c.tierSilver;
    case 'bronze': return c.tierBronze;
    default: return c.tierNone;
  }
}

export function getRateColor(rate: number, c: ThemeColors = DarkColors): string {
  if (rate >= 90) return c.green;
  if (rate >= 65) return c.yellow;
  if (rate >= 50) return c.orange;
  return c.red;
}
