import { Period } from '@/types';

export function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getStartOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getStartOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function getStartOfYear(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1);
}

export function isDateInPeriod(dateStr: string, period: Period): boolean {
  if (period === 'all') return true;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      return dateStr === getToday();
    case 'week':
      return date >= getStartOfWeek();
    case 'month':
      return date >= getStartOfMonth();
    case 'year':
      return date >= getStartOfYear();
    default:
      return true;
  }
}

export function isTimestampInPeriod(timestamp: number, period: Period): boolean {
  if (period === 'all') return true;
  const date = new Date(timestamp);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return isDateInPeriod(dateStr, period);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
