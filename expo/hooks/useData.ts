import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { fetchUsers, fetchTeams, fetchLogs, fetchReports, fetchGoals, fetchNoAnswers } from '@/services/api';
import { supabase } from '@/services/supabase';
import { User, Team, DailyLog, CallReport, Goal, Period } from '@/types';
import { isDateInPeriod, isTimestampInPeriod, getCurrentMonth } from '@/utils/date';

function useRealtimeSubscription(table: string, queryKey: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log(`[Realtime] Subscribing to ${table}...`);
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          console.log(`[Realtime] ${table} change:`, payload.eventType);
          void queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status);
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from ${table}`);
      void supabase.removeChannel(channel);
    };
  }, [table, queryKey, queryClient]);
}

export function useUsers() {
  useRealtimeSubscription('sc_users', 'users');
  return useQuery({ queryKey: ['users'], queryFn: fetchUsers, staleTime: 30000 });
}

export function useTeams() {
  useRealtimeSubscription('sc_teams', 'teams');
  return useQuery({ queryKey: ['teams'], queryFn: fetchTeams, staleTime: 60000 });
}

export function useLogs() {
  useRealtimeSubscription('sc_logs', 'logs');
  return useQuery({ queryKey: ['logs'], queryFn: fetchLogs, staleTime: 15000 });
}

export function useReports() {
  useRealtimeSubscription('sc_reports', 'reports');
  return useQuery({ queryKey: ['reports'], queryFn: fetchReports, staleTime: 15000 });
}

export function useGoals() {
  useRealtimeSubscription('sc_goals', 'goals');
  return useQuery({ queryKey: ['goals'], queryFn: fetchGoals, staleTime: 30000 });
}

export function useNoAnswers() {
  useRealtimeSubscription('sc_noanswers', 'noanswers');
  return useQuery({ queryKey: ['noanswers'], queryFn: fetchNoAnswers, staleTime: 30000 });
}

export function useUsersArray(): User[] {
  const { data } = useUsers();
  return useMemo(() => data ? Object.values(data) : [], [data]);
}

export function useTeamsArray(): Team[] {
  const { data } = useTeams();
  return useMemo(() => data ? Object.values(data) : [], [data]);
}

export function useTeamMembers(teamId: string): User[] {
  const users = useUsersArray();
  return useMemo(() => users.filter(u => u.teamId === teamId), [users, teamId]);
}

export function useUserLogs(userId: string, period: Period): DailyLog[] {
  const { data: logs } = useLogs();
  return useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => l.closerId === userId && isDateInPeriod(l.date, period));
  }, [logs, userId, period]);
}

export function useUserReports(userId: string, period: Period): CallReport[] {
  const { data: reports } = useReports();
  return useMemo(() => {
    if (!reports) return [];
    return reports.filter(r => r.closerId === userId && isTimestampInPeriod(r.date, period));
  }, [reports, userId, period]);
}

export function useTeamLogs(teamId: string, period: Period): DailyLog[] {
  const { data: logs } = useLogs();
  return useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => l.teamId === teamId && isDateInPeriod(l.date, period));
  }, [logs, teamId, period]);
}

export function useTeamReports(teamId: string, period: Period): CallReport[] {
  const { data: reports } = useReports();
  return useMemo(() => {
    if (!reports) return [];
    return reports.filter(r => r.teamId === teamId && isTimestampInPeriod(r.date, period));
  }, [reports, teamId, period]);
}

export function useUserGoals(userId: string, teamId?: string): Goal[] {
  const { data: goals } = useGoals();
  const month = getCurrentMonth();
  return useMemo(() => {
    if (!goals) return [];
    return goals.filter(g => {
      if (g.month !== month) return false;
      if (g.userId === userId) return true;
      if (teamId && g.userId === `team:${teamId}`) return true;
      if (g.userId === 'company') return true;
      return false;
    });
  }, [goals, userId, teamId, month]);
}

export function useApprovedLogs(userId: string, period: Period): DailyLog[] {
  const logs = useUserLogs(userId, period);
  return useMemo(() => logs.filter(l => l.status === 'approved'), [logs]);
}

export function useAllApprovedLogs(period: Period): DailyLog[] {
  const { data: logs } = useLogs();
  return useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => l.status === 'approved' && isDateInPeriod(l.date, period));
  }, [logs, period]);
}

export function useTeamName(teamId?: string): string {
  const { data: teams } = useTeams();
  if (!teamId || !teams) return '';
  return teams[teamId]?.name || '';
}

export function useTeamType(teamId?: string): string {
  const { data: teams } = useTeams();
  if (!teamId || !teams) return 'sales';
  return teams[teamId]?.type || 'sales';
}
