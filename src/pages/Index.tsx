import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gamepad2, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { generateRoomCode } from '@/lib/game-utils';

const Index = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async () => {
    setCreating(true);
    // Sign in anonymously as host
    const { data: authData } = await supabase.auth.signInAnonymously();
    if (!authData.user) {
      setCreating(false);
      return;
    }

    let code = generateRoomCode();
    // Ensure unique code
    const { data: existing } = await supabase.from('rooms').select('id').eq('code', code).maybeSingle();
    if (existing) code = generateRoomCode();

    const { data: room, error } = await supabase.from('rooms').insert({
      code,
      host_id: authData.user.id,
      status: 'lobby' as const,
    }).select().single();

    if (room && !error) {
      navigate(`/host/${room.code}`);
    }
    setCreating(false);
  };

  const handleJoinRoom = () => {
    if (joinCode.trim().length === 4) {
      navigate(`/play/${joinCode.toUpperCase()}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden relative">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/10 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl animate-pulse-glow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-3">
            <Gamepad2 className="w-12 h-12 text-primary glow-text-primary" />
            <h1 className="text-6xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent gradient-hero">Vibe</span>
              <span className="text-foreground">Play</span>
            </h1>
          </div>
          <p className="mt-3 text-muted-foreground text-lg">The ultimate party game platform</p>
        </motion.div>

        {/* Action cards */}
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
          {/* Host a game */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="gradient-card border border-border rounded-2xl p-8 w-80"
          >
            <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/20">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Host a Game</h2>
            <p className="text-muted-foreground text-sm mb-6">Create a room and share the code with your friends</p>
            <Button
              variant="hero"
              size="lg"
              className="w-full rounded-xl text-base"
              onClick={handleCreateRoom}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Room'}
            </Button>
          </motion.div>

          {/* Join a game */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="gradient-card border border-border rounded-2xl p-8 w-80"
          >
            <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/20">
              <Users className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Join a Game</h2>
            <p className="text-muted-foreground text-sm mb-6">Enter the room code shown on the host's screen</p>
            <div className="flex gap-2">
              <Input
                placeholder="ABCD"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="text-center text-xl font-bold tracking-[0.3em] uppercase bg-muted border-border rounded-xl h-12"
              />
              <Button
                variant="neon"
                size="lg"
                className="rounded-xl px-6"
                onClick={handleJoinRoom}
                disabled={joinCode.length !== 4}
              >
                Go
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
