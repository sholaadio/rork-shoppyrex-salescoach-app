export type UserRole = 'closer' | 'teamlead' | 'ceo' | 'gm' | 'head_sales' | 'head_creative' | 'hr';

export type TeamType = 'sales' | 'followup' | 'socialmedia';

export type PortalType = 'closer' | 'teamlead' | 'management';

export type Period = 'today' | 'week' | 'month' | 'year' | 'all';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  pin: string;
  role: UserRole;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  type: TeamType;
}

export interface CommissionDetails {
  rate: number;
  tier: string;
  base: number;
  upsellBonus: number;
  repeatBonus: number;
  referralBonus: number;
  total: number;
}

export interface DailyLog {
  id: string;
  closerId: string;
  closerName: string;
  teamId: string;
  teamType: string;
  date: string;
  assigned: number;
  confirmed: number;
  delivered: number;
  upsells: number;
  repeats: number;
  referrals: number;
  notes: string;
  commission: CommissionDetails;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
}

export interface CallAnalysis {
  overallScore: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  scriptSuggestion?: string;
  skillBreakdown?: Record<string, number>;
  learningResources?: Array<{ type: string; title: string; url?: string }>;
}

export interface CallReport {
  id: string;
  closerId: string;
  closerName: string;
  teamId: string;
  callType: string;
  callOutcome: string;
  product: string;
  transcript?: string;
  analysis?: CallAnalysis;
  score: number;
  date: number;
  teamType?: string;
}

export interface NoAnswerLog {
  id: string;
  closerId: string;
  closerName: string;
  teamId: string;
  orderId: string;
  customerName: string;
  reason: string;
  attempts: number;
  notes: string;
  date: number;
}

export interface Goal {
  id: string;
  month: string;
  type: 'delivered' | 'conversion' | 'calls' | 'upsells' | 'earnings';
  target: number;
  label: string;
  setBy: string;
  createdAt: number;
  userId: string;
}

export function getPortalForRole(role: UserRole): PortalType {
  if (role === 'closer') return 'closer';
  if (role === 'teamlead') return 'teamlead';
  return 'management';
}

export function isManagementRole(role: UserRole): boolean {
  return ['ceo', 'gm', 'head_sales', 'head_creative', 'hr'].includes(role);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    closer: 'Sales Closer',
    teamlead: 'Team Lead',
    ceo: 'CEO',
    gm: 'General Manager',
    head_sales: 'Head of Sales',
    head_creative: 'Head of Creative',
    hr: 'HR Manager',
  };
  return labels[role] || role;
}

export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    closer: '#F97316',
    teamlead: '#F472B6',
    ceo: '#22C55E',
    gm: '#A78BFA',
    head_sales: '#FF6B6B',
    head_creative: '#60A5FA',
    hr: '#FFB627',
  };
  return colors[role] || '#6A7A90';
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
