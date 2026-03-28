export const Colors = {
  background: '#07080F',
  card: '#0F1117',
  cardHover: '#161924',
  border: '#1E2130',
  text: '#F1F5FF',
  muted: '#6A7A90',
  soft: '#C8D3E8',
  green: '#22C55E',
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

export function getScoreColor(score: number): string {
  if (score >= 80) return Colors.green;
  if (score >= 60) return Colors.yellow;
  return Colors.red;
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case 'gold': return Colors.tierGold;
    case 'silver': return Colors.tierSilver;
    case 'bronze': return Colors.tierBronze;
    default: return Colors.tierNone;
  }
}

export function getRateColor(rate: number): string {
  if (rate >= 90) return Colors.green;
  if (rate >= 65) return Colors.yellow;
  if (rate >= 50) return Colors.orange;
  return Colors.red;
}
