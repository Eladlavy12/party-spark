import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom, usePlayers } from '@/hooks/use-realtime';
import { useBuzzes } from '@/hooks/use-buzzer';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Play, Gamepad2, Bell, Trash2, Package, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ContentPack = Database['public']['Tables']['content_packs']['Row'];

const HostLobby = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, loading } = useRoom(code ?? null);
  const players = usePlayers(room?.id ?? null);
  const { buzzes, clearBuzzes } = useBuzzes(room?.id ?? null, room?.current_slide_index ?? 0);
  const joinUrl = `${window.location.origin}/play/${code}`;

  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [packsOpen, setPacksOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const loadPacks = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const hostUserId = session?.user?.id ?? room?.host_id;
      if (!hostUserId) return;

      const { data } = await supabase
        .from('content_packs')
        .select('*')
        .eq('creator_id', hostUserId)
        .eq('is_published', true)
        .order('updated_at', { ascending: false });

      if (data) setPacks(data);
    };

    void loadPacks();
  }, [room?.host_id]);

  // If room already has a pack selected, use it
  useEffect(() => {
    if (room?.current_pack_id) setSelectedPackId(room.current_pack_id);
  }, [room?.current_pack_id]);

  // If room transitions to "playing", navigate to game view
  useEffect(() => {
    if (room?.status === 'playing') {
      navigate(`/host/${code}/game`);
    }
  }, [room?.status, code, navigate]);

  const selectedPack = packs.find((p) => p.id === selectedPackId);

  const handleStartGame = async () => {
    if (!room || !selectedPackId) return;
    setStarting(true);
    await supabase.from('rooms').update({
      current_pack_id: selectedPackId,
      current_slide_index: 0,
      status: 'playing' as const,
    }).eq('id', room.id);
    // Navigation handled by the useEffect above
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Gamepad2 className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground text-xl">Room not found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/8 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary/8 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold">
            <span className="bg-clip-text text-transparent gradient-hero">Vibe</span>
            <span className="text-foreground">Play</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-5 h-5" />
          <span className="font-medium">{players.length} player{players.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 p-6">
        {/* Room code + QR */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <p className="text-muted-foreground text-lg mb-3">Join at <span className="text-foreground font-medium">{window.location.host}</span></p>
          <div className="gradient-card border border-border rounded-3xl p-8 inline-block">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-widest">Room Code</p>
            <h2 className="text-7xl font-bold tracking-[0.3em] text-foreground glow-text-primary mb-6">{code}</h2>
            <div className="bg-foreground rounded-2xl p-3 inline-block">
              <QRCodeSVG value={joinUrl} size={140} bgColor="hsl(0, 0%, 95%)" fgColor="hsl(240, 15%, 9%)" />
            </div>
          </div>
        </motion.div>

        {/* Players grid */}
        <div className="w-full max-w-3xl">
          <h3 className="text-center text-muted-foreground text-lg mb-6">
            {players.length === 0 ? 'Waiting for players to join...' : 'Players in lobby'}
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <AnimatePresence>
              {players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
                  className="gradient-card border border-border rounded-2xl px-6 py-4 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: player.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                  >
                    {player.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-foreground font-semibold text-lg">{player.nickname}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Buzzer panel */}
        {buzzes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="gradient-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-destructive" /> Buzzes
                </h3>
                <Button variant="ghost" size="sm" onClick={clearBuzzes} className="text-muted-foreground text-xs">
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>
              <div className="space-y-2">
                {buzzes.map((buzz, i) => {
                  const player = players.find((p) => p.id === buzz.player_id);
                  return (
                    <motion.div
                      key={buzz.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-2"
                    >
                      <span className={`text-sm font-bold ${i === 0 ? 'text-accent' : 'text-muted-foreground'}`}>#{i + 1}</span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: player?.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                      >
                        {player?.nickname.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="text-foreground font-medium text-sm">{player?.nickname ?? 'Unknown'}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(buzz.buzzed_at).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' } as Intl.DateTimeFormatOptions)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Pack selection + Start */}
        {(
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
            {/* Pack selector */}
            <div className="relative">
              <button
                onClick={() => setPacksOpen(!packsOpen)}
                className="gradient-card border border-border rounded-xl px-5 py-3 flex items-center gap-3 min-w-[280px] hover:bg-muted/50 transition-colors"
              >
                <Package className="w-5 h-5 text-primary shrink-0" />
                <span className="flex-1 text-left">
                  {selectedPack ? (
                    <span className="text-foreground font-medium">{selectedPack.title}</span>
                  ) : (
                    <span className="text-muted-foreground">Select a content pack…</span>
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${packsOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {packsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 right-0 z-30 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
                  >
                    {packs.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No packs available. Create one in the Studio.
                      </div>
                    ) : (
                      packs.map((pack) => (
                        <button
                          key={pack.id}
                          onClick={() => { setSelectedPackId(pack.id); setPacksOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium text-sm truncate">{pack.title}</p>
                            {pack.description && (
                              <p className="text-muted-foreground text-xs truncate">{pack.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{pack.game_type}</span>
                          {selectedPackId === pack.id && <Check className="w-4 h-4 text-accent shrink-0" />}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="hero"
              size="lg"
              className="rounded-xl text-lg px-12 py-6"
              onClick={handleStartGame}
              disabled={!selectedPackId || starting}
            >
              <Play className="w-5 h-5 mr-2" />
              {starting ? 'Starting…' : 'Start Game'}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HostLobby;
