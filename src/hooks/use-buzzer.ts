import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Buzz {
  id: string;
  room_id: string;
  player_id: string;
  slide_index: number;
  buzzed_at: string;
}

export function useBuzzes(roomId: string | null, slideIndex: number | null) {
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);

  const fetchBuzzes = useCallback(async () => {
    if (!roomId || slideIndex === null) return;
    const { data } = await supabase
      .from('buzzes')
      .select('*')
      .eq('room_id', roomId)
      .eq('slide_index', slideIndex)
      .order('buzzed_at', { ascending: true });
    if (data) setBuzzes(data as Buzz[]);
  }, [roomId, slideIndex]);

  useEffect(() => {
    fetchBuzzes();
  }, [fetchBuzzes]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`buzzes-${roomId}-${slideIndex}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'buzzes',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchBuzzes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, slideIndex, fetchBuzzes]);

  const sendBuzz = useCallback(async (playerId: string) => {
    if (!roomId || slideIndex === null) return;
    await supabase.from('buzzes').insert({
      room_id: roomId,
      player_id: playerId,
      slide_index: slideIndex,
    });
  }, [roomId, slideIndex]);

  const clearBuzzes = useCallback(async () => {
    if (!roomId || slideIndex === null) return;
    await supabase.from('buzzes').delete()
      .eq('room_id', roomId)
      .eq('slide_index', slideIndex);
  }, [roomId, slideIndex]);

  return { buzzes, sendBuzz, clearBuzzes };
}
