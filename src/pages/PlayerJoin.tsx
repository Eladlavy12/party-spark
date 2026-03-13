import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRoom, usePlayers } from '@/hooks/use-realtime';
import { motion } from 'framer-motion';
import { Gamepad2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getRandomColor } from '@/lib/game-utils';

const PlayerJoin = () => {
  const { code } = useParams<{ code: string }>();
  const { room, loading } = useRoom(code ?? null);
  const players = usePlayers(room?.id ?? null);
  const [nickname, setNickname] = useState('');
  const [joined, setJoined] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!room || !nickname.trim()) return;
    setJoining(true);
    const { error } = await supabase.from('players').insert({
      room_id: room.id,
      nickname: nickname.trim(),
      avatar_color: getRandomColor(),
    });
    if (!error) {
      setJoined(true);
      setPlayerName(nickname.trim());
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Gamepad2 className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <Gamepad2 className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Room Not Found</h2>
        <p className="text-muted-foreground text-center">The room code "{code}" doesn't exist or has expired.</p>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          <CheckCircle2 className="w-16 h-16 text-accent mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-2">You're in!</h2>
          <p className="text-muted-foreground mb-1">Playing as <span className="text-foreground font-bold">{playerName}</span></p>
          <p className="text-muted-foreground text-sm">Waiting for the host to start the game...</p>
          <div className="mt-8 gradient-card border border-border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-2">{players.length} player{players.length !== 1 ? 's' : ''} in lobby</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map(p => (
                <span key={p.id} className="bg-muted text-foreground px-3 py-1 rounded-full text-sm font-medium">
                  {p.nickname}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-accent/10 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        <Gamepad2 className="w-10 h-10 text-primary mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-foreground mb-1">Join Game</h1>
        <p className="text-muted-foreground text-sm mb-8">Room <span className="text-foreground font-bold tracking-widest">{code}</span></p>

        <div className="gradient-card border border-border rounded-2xl p-6">
          <label className="block text-sm text-muted-foreground mb-2 text-left">Your Nickname</label>
          <Input
            placeholder="Enter your name"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={20}
            className="bg-muted border-border rounded-xl h-12 text-lg mb-4"
          />
          <Button
            variant="hero"
            size="lg"
            className="w-full rounded-xl text-base"
            onClick={handleJoin}
            disabled={!nickname.trim() || joining}
          >
            {joining ? 'Joining...' : 'Join Game'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PlayerJoin;
