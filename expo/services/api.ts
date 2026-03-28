import { User, Team, DailyLog, CallReport, NoAnswerLog, Goal } from '@/types';
import { supabase } from '@/services/supabase';

const API_BASE = 'https://salescoach-server.onrender.com';

export async function fetchUsers(): Promise<Record<string, User>> {
  console.log('[API] Fetching users from Supabase...');
  const { data, error } = await supabase.from('sc_users').select('*');
  if (error) {
    console.log('[API] Supabase users error:', error.message);
    throw new Error('Failed to fetch users');
  }
  const users: Record<string, User> = {};
  (data ?? []).forEach((row: any) => {
    const u: User = {
      id: row.id,
      employeeId: row.id,
      name: row.name,
      pin: row.pin,
      role: row.role,
      teamId: row.teamId ?? undefined,
    };
    users[u.id] = u;
  });
  console.log('[API] Users fetched:', Object.keys(users).length);
  return users;
}

export async function fetchTeams(): Promise<Record<string, Team>> {
  console.log('[API] Fetching teams from Supabase...');
  const { data, error } = await supabase.from('sc_teams').select('*');
  if (error) {
    console.log('[API] Supabase teams error:', error.message);
    throw new Error('Failed to fetch teams');
  }
  const teams: Record<string, Team> = {};
  (data ?? []).forEach((row: any) => {
    teams[row.id] = { id: row.id, name: row.name, type: row.type };
  });
  console.log('[API] Teams fetched:', Object.keys(teams).length);
  return teams;
}

export async function fetchLogs(): Promise<DailyLog[]> {
  console.log('[API] Fetching logs from Supabase...');
  const { data, error } = await supabase.from('sc_logs').select('*').order('submittedAt', { ascending: false });
  if (error) {
    console.log('[API] Supabase logs error:', error.message);
    throw new Error('Failed to fetch logs');
  }
  console.log('[API] Logs fetched:', data?.length ?? 0);
  return (data ?? []).map(mapLog);
}

export async function fetchReports(): Promise<CallReport[]> {
  console.log('[API] Fetching reports from Supabase...');
  const { data, error } = await supabase.from('sc_reports').select('*').order('date', { ascending: false });
  if (error) {
    console.log('[API] Supabase reports error:', error.message);
    throw new Error('Failed to fetch reports');
  }
  console.log('[API] Reports fetched:', data?.length ?? 0);
  return (data ?? []).map(mapReport);
}

export async function fetchGoals(): Promise<Goal[]> {
  console.log('[API] Fetching goals from Supabase...');
  const { data, error } = await supabase.from('sc_goals').select('*').order('createdAt', { ascending: false });
  if (error) {
    console.log('[API] Supabase goals error:', error.message);
    throw new Error('Failed to fetch goals');
  }
  console.log('[API] Goals fetched:', data?.length ?? 0);
  return (data ?? []).map(mapGoal);
}

export async function fetchNoAnswers(): Promise<NoAnswerLog[]> {
  console.log('[API] Fetching no-answers from Supabase...');
  const { data, error } = await supabase.from('sc_noanswers').select('*').order('date', { ascending: false });
  if (error) {
    console.log('[API] Supabase noanswers error:', error.message);
    throw new Error('Failed to fetch no-answers');
  }
  console.log('[API] No-answers fetched:', data?.length ?? 0);
  return (data ?? []).map(mapNoAnswer);
}

export async function submitLog(log: Partial<DailyLog>): Promise<DailyLog> {
  console.log('[API] Submitting log to Supabase...');
  const id = log.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = { ...log, id };
  const { data, error } = await supabase.from('sc_logs').insert(row).select().single();
  if (error) {
    console.log('[API] Supabase submit log error:', error.message);
    throw new Error('Failed to submit log');
  }
  return mapLog(data);
}

export async function updateLog(id: string, updates: Partial<DailyLog>): Promise<DailyLog> {
  console.log('[API] Updating log:', id);
  const { data, error } = await supabase.from('sc_logs').update(updates).eq('id', id).select().single();
  if (error) {
    console.log('[API] Supabase update log error:', error.message);
    throw new Error('Failed to update log');
  }
  return mapLog(data);
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('sc_logs').delete().eq('id', id);
  if (error) throw new Error('Failed to delete log');
}

export async function submitReport(report: Partial<CallReport>): Promise<CallReport> {
  console.log('[API] Submitting report to Supabase...');
  const id = report.id || `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = { ...report, id };
  const { data, error } = await supabase.from('sc_reports').insert(row).select().single();
  if (error) {
    console.log('[API] Supabase submit report error:', error.message);
    throw new Error('Failed to submit report');
  }
  return mapReport(data);
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('sc_reports').delete().eq('id', id);
  if (error) throw new Error('Failed to delete report');
}

export async function submitNoAnswer(log: Partial<NoAnswerLog>): Promise<NoAnswerLog> {
  console.log('[API] Submitting no-answer to Supabase...');
  const id = log.id || `na_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = { ...log, id };
  const { data, error } = await supabase.from('sc_noanswers').insert(row).select().single();
  if (error) {
    console.log('[API] Supabase submit no-answer error:', error.message);
    throw new Error('Failed to submit no-answer');
  }
  return mapNoAnswer(data);
}

export async function deleteNoAnswer(id: string): Promise<void> {
  const { error } = await supabase.from('sc_noanswers').delete().eq('id', id);
  if (error) throw new Error('Failed to delete no-answer');
}

export async function submitGoal(goal: Partial<Goal>): Promise<Goal> {
  console.log('[API] Submitting goal to Supabase...');
  const id = goal.id || `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = { ...goal, id };
  const { data, error } = await supabase.from('sc_goals').insert(row).select().single();
  if (error) {
    console.log('[API] Supabase submit goal error:', error.message);
    throw new Error('Failed to submit goal');
  }
  return mapGoal(data);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('sc_goals').delete().eq('id', id);
  if (error) throw new Error('Failed to delete goal');
}

export async function transcribeAudio(formData: FormData): Promise<{ transcript: string }> {
  console.log('[API] Transcribing audio...');
  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to transcribe audio');
  return res.json();
}

export async function analyzeCall(data: {
  transcript: string;
  closerName: string;
  callType: string;
  callOutcome: string;
  product: string;
  teamType: string;
}): Promise<{ analysis: string }> {
  console.log('[API] Analyzing call...');
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to analyze call');
  return res.json();
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  console.log('[API] Updating user:', id);
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.pin !== undefined) updateData.pin = data.pin;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.teamId !== undefined) updateData.teamId = data.teamId;

  const { data: result, error } = await supabase.from('sc_users').update(updateData).eq('id', id).select().single();
  if (error) {
    console.log('[API] Supabase update user error:', error.message);
    throw new Error('Failed to update user');
  }
  return {
    id: result.id,
    employeeId: result.id,
    name: result.name,
    pin: result.pin,
    role: result.role,
    teamId: result.teamId ?? undefined,
  };
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('sc_users').delete().eq('id', id);
  if (error) throw new Error('Failed to delete user');
}

export async function bulkSaveUsers(users: Partial<User>[]): Promise<void> {
  console.log('[API] Bulk saving users to Supabase...');
  const rows = users.map(u => ({
    id: u.id,
    name: u.name,
    pin: u.pin,
    role: u.role,
    teamId: u.teamId || null,
  }));
  const { error } = await supabase.from('sc_users').upsert(rows);
  if (error) {
    console.log('[API] Supabase bulk save users error:', error.message);
    throw new Error('Failed to bulk save users');
  }
}

function mapLog(row: any): DailyLog {
  return {
    id: row.id,
    closerId: row.closerId,
    closerName: row.closerName,
    teamId: row.teamId,
    teamType: row.teamType,
    date: row.date,
    assigned: row.assigned ?? 0,
    confirmed: row.confirmed ?? 0,
    delivered: row.delivered ?? 0,
    upsells: row.upsells ?? 0,
    repeats: row.repeats ?? 0,
    referrals: row.referrals ?? 0,
    notes: row.notes ?? '',
    commission: row.commission ?? { rate: 0, tier: 'none', base: 0, upsellBonus: 0, repeatBonus: 0, referralBonus: 0, total: 0 },
    status: row.status ?? 'pending',
    submittedAt: row.submittedAt ?? 0,
  };
}

function mapReport(row: any): CallReport {
  const analysis = typeof row.analysis === 'string' ? JSON.parse(row.analysis) : row.analysis;
  const score = row.score || analysis?.overallScore || 0;
  return {
    id: row.id,
    closerId: row.closerId,
    closerName: row.closerName,
    teamId: row.teamId,
    callType: row.callType,
    callOutcome: row.callOutcome,
    product: row.product,
    transcript: row.transcript,
    analysis,
    score,
    date: row.date ?? 0,
    teamType: row.teamType,
  };
}

function mapNoAnswer(row: any): NoAnswerLog {
  return {
    id: row.id,
    closerId: row.closerId,
    closerName: row.closerName,
    teamId: row.teamId,
    orderId: row.orderId ?? '',
    customerName: row.customerName ?? '',
    reason: row.reason ?? '',
    attempts: row.attempts ?? 1,
    notes: row.notes ?? '',
    date: row.date ?? 0,
  };
}

function mapGoal(row: any): Goal {
  return {
    id: row.id,
    month: row.month,
    type: row.type,
    target: row.target ?? 0,
    label: row.label ?? '',
    setBy: row.setBy ?? '',
    createdAt: row.createdAt ?? 0,
    userId: row.userId ?? '',
  };
}
