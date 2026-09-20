import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { queryClientInstance } from '@/lib/query-client';

export function visibleLiveSessions(rows) {
  return Array.isArray(rows) ? rows.filter(row => row?.id && row.status === 'live') : [];
}

export function useLiveSessions() {
  const query = useQuery({
    queryKey: ['active-live-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('LiveSession')
        .select('id,title,host_name,thumbnail_url,status').eq('status', 'live').order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return visibleLiveSessions(data);
    },
    staleTime: 10000, refetchInterval: 30000, refetchOnWindowFocus: true, retry: 1,
  });
  useEffect(() => {
    const channel = supabase.channel('active-live-sessions-' + crypto.randomUUID())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'LiveSession' }, () => {
        void queryClientInstance.invalidateQueries({ queryKey: ['active-live-sessions'] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);
  return { ...query, sessions: query.isError ? [] : visibleLiveSessions(query.data) };
}
