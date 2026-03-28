import { User, Team, DailyLog, CallReport, NoAnswerLog, Goal } from '@/types';

const API_BASE = 'https://salescoach-server.onrender.com';

export async function fetchUsers(): Promise<Record<string, User>> {
  console.log('[API] Fetching users...');
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  console.log('[API] Users fetched:', Object.keys(data).length);
  return data;
}

export async function fetchTeams(): Promise<Record<string, Team>> {
  console.log('[API] Fetching teams...');
  const res = await fetch(`${API_BASE}/teams`);
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

export async function fetchLogs(): Promise<DailyLog[]> {
  console.log('[API] Fetching logs...');
  const res = await fetch(`${API_BASE}/logs`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function fetchReports(): Promise<CallReport[]> {
  console.log('[API] Fetching reports...');
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function fetchGoals(): Promise<Goal[]> {
  console.log('[API] Fetching goals...');
  const res = await fetch(`${API_BASE}/goals`);
  if (!res.ok) throw new Error('Failed to fetch goals');
  return res.json();
}

export async function fetchNoAnswers(): Promise<NoAnswerLog[]> {
  console.log('[API] Fetching no-answers...');
  const res = await fetch(`${API_BASE}/noanswers`);
  if (!res.ok) throw new Error('Failed to fetch no-answers');
  return res.json();
}

export async function submitLog(log: Partial<DailyLog>): Promise<DailyLog> {
  console.log('[API] Submitting log...');
  const res = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  });
  if (!res.ok) throw new Error('Failed to submit log');
  return res.json();
}

export async function updateLog(id: string, data: Partial<DailyLog>): Promise<DailyLog> {
  console.log('[API] Updating log:', id);
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update log');
  return res.json();
}

export async function deleteLog(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/logs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete log');
}

export async function submitReport(report: Partial<CallReport>): Promise<CallReport> {
  console.log('[API] Submitting report...');
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return res.json();
}

export async function deleteReport(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete report');
}

export async function submitNoAnswer(log: Partial<NoAnswerLog>): Promise<NoAnswerLog> {
  const res = await fetch(`${API_BASE}/noanswers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  });
  if (!res.ok) throw new Error('Failed to submit no-answer');
  return res.json();
}

export async function deleteNoAnswer(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/noanswers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete no-answer');
}

export async function submitGoal(goal: Partial<Goal>): Promise<Goal> {
  const res = await fetch(`${API_BASE}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
  if (!res.ok) throw new Error('Failed to submit goal');
  return res.json();
}

export async function deleteGoal(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/goals/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete goal');
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
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user');
}

export async function bulkSaveUsers(users: Partial<User>[]): Promise<void> {
  const res = await fetch(`${API_BASE}/users/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users),
  });
  if (!res.ok) throw new Error('Failed to bulk save users');
}
