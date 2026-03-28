import { CommissionDetails } from '@/types';

export function calculateCommission(
  assigned: number,
  delivered: number,
  upsells: number,
  repeats: number,
  referrals: number,
  teamType: string,
): CommissionDetails {
  if (teamType === 'socialmedia') {
    const base = delivered * 200;
    const upsellBonus = upsells * 600;
    const repeatBonus = repeats * 300;
    const referralBonus = referrals * 300;
    return {
      rate: assigned > 0 ? Math.round((delivered / assigned) * 100) : 0,
      tier: 'flat',
      base,
      upsellBonus,
      repeatBonus,
      referralBonus,
      total: base + upsellBonus + repeatBonus + referralBonus,
    };
  }

  const rate = assigned > 0 ? Math.round((delivered / assigned) * 100) : 0;
  const tier = rate >= 90 ? 'gold' : rate >= 65 ? 'silver' : rate >= 50 ? 'bronze' : 'none';
  const basePerOrder = rate >= 90 ? 200 : rate >= 65 ? 150 : rate >= 50 ? 100 : 0;
  const base = delivered * basePerOrder;

  let upsellBonus: number;
  if (teamType === 'followup') {
    upsellBonus = upsells * 600;
  } else {
    upsellBonus = rate < 50 ? 0 : upsells * 600;
  }

  const repeatBonus = repeats * 300;
  const referralBonus = referrals * 300;
  const total = base + upsellBonus + repeatBonus + referralBonus;

  return { rate, tier, base, upsellBonus, repeatBonus, referralBonus, total };
}

export function formatNaira(amount: number): string {
  return `\u20A6${amount.toLocaleString()}`;
}
