import { useParams } from 'react-router-dom';
import { useRoom, usePlayers } from '@/hooks/use-realtime';
import { useBuzzes } from '@/hooks/use-buzzer';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Play, Gamepad2, Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HostLobby = () => {
  const { code } = useParams<{ code: string }>();
  const { room, loading } = useRoom(code ?? null);
  const players = usePlayers(room?.id ?? null);

  const { buzzes, clearBuzzes } = useBuzzes(room?.id ?? null, room?.current_slide_index ?? 0);
  const joinUrl = `${window.location.origin}/play/${code}`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10 p-6">
        {/* Room code + QR */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
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

        {/* Start button */}
        {players.length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button variant="hero" size="lg" className="rounded-xl text-lg px-12 py-6">
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HostLobby;
