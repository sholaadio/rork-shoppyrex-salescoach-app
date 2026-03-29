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
  const { data, error } = await supabase.from('sc_goals').select('*');
  if (error) {
    console.log('[API] Supabase goals error:', error.message);
    throw new Error('Failed to fetch goals');
  }
  console.log('[API] Goals raw rows from Supabase:', JSON.stringify(data));
  console.log('[API] Goals fetched count:', data?.length ?? 0);
  const mapped: Goal[] = [];
  for (let idx = 0; idx < (data ?? []).length; idx++) {
    const row = data![idx];
    try {
      console.log(`[API] Goal row ${idx}:`, JSON.stringify(row));
      const result = mapGoal(row);
      console.log(`[API] Goal mapped ${idx}:`, JSON.stringify(result));
      if (result.id) {
        mapped.push(result);
      } else {
        console.log(`[API] Skipping goal ${idx} - no id`);
      }
    } catch (e) {
      console.log(`[API] Error mapping goal row ${idx}:`, e);
    }
  }
  console.log('[API] Goals final mapped:', mapped.length, JSON.stringify(mapped.map(g => ({ id: g.id, month: g.month, userId: g.userId, type: g.type, label: g.label, target: g.target }))));
  return mapped;
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
  console.log('[API] Submitting report to backend server...');
  const body = {
    closerId: report.closerId ?? '',
    closerName: report.closerName ?? '',
    teamId: report.teamId ?? '',
    teamType: report.teamType ?? '',
    callType: report.callType ?? '',
    callOutcome: report.callOutcome ?? '',
    product: report.product ?? '',
    transcript: report.transcript ?? '',
    analysis: report.analysis ?? {},
    score: report.score ?? 0,
    date: report.date ?? Date.now(),
  };
  console.log('[API] Report body keys:', Object.keys(body));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log('[API] Submit report response status:', res.status);
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.log('[API] Submit report error response:', errorText);
      throw new Error(`Failed to submit report (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    console.log('[API] Submit report success, id:', data?.id);
    return mapReport(data);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Report submission timed out. Please try again.');
    }
    console.log('[API] Submit report fetch error:', err?.message, err);
    throw err;
  }
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
  const id = goal.id || `${Math.random().toString(36).slice(2, 9)}`;
  const goalData: Record<string, any> = {
    id,
    type: goal.type ?? 'delivered',
    label: goal.label ?? '',
    target: goal.target ?? 0,
    userId: goal.userId ?? '',
    setBy: goal.setBy ?? '',
    month: goal.month ?? '',
    createdAt: goal.createdAt ?? Date.now(),
  };
  const row = { id, data: goalData };
  console.log('[API] Inserting goal row:', JSON.stringify(row));
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
  console.log('[API] Transcribing audio to', `${API_BASE}/transcribe`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log('[API] Transcribe response status:', res.status);
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.log('[API] Transcribe error response:', errorText);
      throw new Error(`Transcription failed (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    console.log('[API] Transcribe success, transcript length:', data?.transcript?.length ?? 0);
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      console.log('[API] Transcribe request timed out after 120s');
      throw new Error('Transcription timed out. The audio file may be too large. Please try a shorter recording.');
    }
    console.log('[API] Transcribe fetch error:', err?.message, err);
    throw err;
  }
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log('[API] Analyze response status:', res.status);
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.log('[API] Analyze error response:', errorText);
      throw new Error(`Analysis failed (${res.status}): ${errorText}`);
    }
    const result = await res.json();
    console.log('[API] Analyze success');
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      console.log('[API] Analyze request timed out after 120s');
      throw new Error('Analysis timed out. Please try again.');
    }
    console.log('[API] Analyze fetch error:', err?.message, err);
    throw err;
  }
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
  console.log('[API] mapGoal input:', JSON.stringify(row));
  
  let d: any = null;
  try {
    d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  } catch (e) {
    console.log('[API] mapGoal JSON parse error:', e);
  }
  
  if (!d || (typeof d === 'object' && Object.keys(d).length === 0)) {
    console.log('[API] Goal row has no/empty data field:', row.id);
    return {
      id: row.id ?? '',
      month: row.month ?? '',
      type: row.type ?? 'delivered',
      target: row.target ?? 0,
      label: row.label ?? '',
      setBy: row.setBy ?? '',
      createdAt: row.createdAt ?? 0,
      userId: row.userId ?? '',
    };
  }
  
  let userId = d.userId ?? '';
  if (!userId) {
    if (d.type === 'company') {
      userId = 'company';
    } else if (d.type === 'team') {
      userId = `team:${d.teamId ?? ''}`;
    } else if (d.type === 'individual') {
      userId = d.memberId ?? '';
    }
  }
  
  const mapped: Goal = {
    id: row.id ?? d.id ?? '',
    month: d.month ?? '',
    type: d.type ?? d.metric ?? 'delivered',
    target: typeof d.target === 'number' ? d.target : parseInt(d.target) || 0,
    label: d.label ?? '',
    setBy: d.setBy ?? '',
    createdAt: d.createdAt ?? (row.created_at ? new Date(row.created_at).getTime() : 0),
    userId,
  };
  
  console.log('[API] mapGoal result:', JSON.stringify(mapped));
  return mapped;
}
