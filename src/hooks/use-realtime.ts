import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Room = Database['public']['Tables']['rooms']['Row'];
type Player = Database['public']['Tables']['players']['Row'];

export function useRoom(roomCode: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    setLoading(true);
    supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .maybeSingle()
      .then(({ data }) => {
        setRoom(data);
        setLoading(false);
      });
  }, [roomCode]);

  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRoom(payload.new as Room);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  return { room, loading };
}

export function usePlayers(roomId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);

  const fetchPlayers = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (data) setPlayers(data);
  }, [roomId]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`players-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchPlayers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchPlayers]);

  return players;
}
