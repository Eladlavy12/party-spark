import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Submission = Database['public']['Tables']['submissions']['Row'];

export function useSubmissions(roomId: string | null, slideId: string | null) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const fetchSubmissions = useCallback(async () => {
    if (!roomId || !slideId) return;
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('room_id', roomId)
      .eq('slide_id', slideId)
      .order('submitted_at', { ascending: true });
    if (data) setSubmissions(data);
  }, [roomId, slideId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`submissions-${roomId}-${slideId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'submissions',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchSubmissions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, slideId, fetchSubmissions]);

  return submissions;
}
