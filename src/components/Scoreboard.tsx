import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Player = Database['public']['Tables']['players']['Row'];

interface ScoreboardProps {
  roomId: string;
  players: Player[];
  sortBy?: 'score' | 'fastest-buzzer';
  type?: 'list' | 'grid' | 'podium';
  limit?: number;
}

export function Scoreboard({
  roomId,
  players,
  sortBy = 'score',
  type = 'list',
  limit,
}: ScoreboardProps) {
  const [fastestScores, setFastestScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sortBy === 'fastest-buzzer' && roomId) {
      setLoading(true);
      const fetchBuzzes = async () => {
        const { data, error } = await supabase
          .from('buzzes')
          .select('*')
          .eq('room_id', roomId);
        
        if (!error && data) {
          // Group by slide index and find the fastest (earliest) for each slide
          const firstBuzzesBySlide: Record<number, string> = {};
          
          // Sort overall by buzzed at so the earliest for each slide is encountered first
          const sortedData = [...data].sort((a, b) => new Date(a.buzzed_at).getTime() - new Date(b.buzzed_at).getTime());
          
          for (const buzz of sortedData) {
            if (!firstBuzzesBySlide[buzz.slide_index]) {
              firstBuzzesBySlide[buzz.slide_index] = buzz.player_id;
            }
          }

          // Count 1st place buzzes per player
          const counts: Record<string, number> = {};
          Object.values(firstBuzzesBySlide).forEach((playerId) => {
            counts[playerId] = (counts[playerId] || 0) + 1;
          });
          
          setFastestScores(counts);
        }
        setLoading(false);
      };
      fetchBuzzes();
    }
  }, [roomId, sortBy]);

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Calculating scoreboard...</div>;
  }

  // Determine sort value for each player
  const sortedPlayers = [...players].sort((a, b) => {
    if (sortBy === 'fastest-buzzer') {
      const aScore = fastestScores[a.id] || 0;
      const bScore = fastestScores[b.id] || 0;
      return bScore - aScore;
    } else {
      const aScore = a.score || 0;
      const bScore = b.score || 0;
      return bScore - aScore; // Descending
    }
  });

  const displayPlayers = limit ? sortedPlayers.slice(0, limit) : sortedPlayers;

  if (displayPlayers.length === 0) {
    return <p className="text-muted-foreground">No players to show.</p>;
  }

  const getScoreText = (p: Player) => {
    if (sortBy === 'fastest-buzzer') {
      const t = fastestScores[p.id] || 0;
      return `${t} First Buzz${t === 1 ? '' : 'es'}`;
    }
    return `${p.score || 0} pts`;
  };

  const getIcon = () => {
    return sortBy === 'fastest-buzzer' ? <Zap className="w-5 h-5" /> : <Trophy className="w-5 h-5" />;
  };

  if (type === 'podium') {
    const top3 = displayPlayers.slice(0, 3);
    const rest = displayPlayers.slice(3);
    
    // Ordered for display: 2nd, 1st, 3rd
    const podiumOrder = [
      top3[1] || null, // 2nd
      top3[0] || null, // 1st
      top3[2] || null, // 3rd
    ];

    const heights = ['h-32', 'h-48', 'h-24']; // Heights for 2nd, 1st, 3rd in pixels/classes
    const ranks = ['2nd', '1st', '3rd'];
    const medals = ['text-slate-300', 'text-yellow-400', 'text-amber-600'];

    return (
      <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-12">
        {/* Podium */}
        <div className="flex items-end justify-center gap-4 h-64 mt-12">
          {podiumOrder.map((p, i) => {
            if (!p) return <div key={i} className="w-32" />; // Empty slot placeholder
            
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2, type: 'spring' }}
                className="flex flex-col items-center justify-end w-32 md:w-48"
              >
                <div className="flex flex-col items-center mb-4 space-y-2">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
                    style={{ backgroundColor: p.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                  >
                    {p.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-lg md:text-xl truncate w-full text-center px-2">{p.nickname}</span>
                  <span className="text-muted-foreground flex items-center justify-center gap-1 text-sm font-medium">
                    {getScoreText(p)}
                  </span>
                </div>
                
                <div className={`w-full ${heights[i]} bg-gradient-to-t from-primary/30 to-primary/10 rounded-t-xl border border-primary/20 flex flex-col items-center justify-start pt-4 shadow-xl`}>
                  <span className={`text-4xl font-extrabold ${medals[i]}`}>{i === 1 ? '1' : i === 0 ? '2' : '3'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* The rest as a list */}
        {rest.length > 0 && (
          <div className="w-full max-w-2xl mx-auto space-y-3">
            <h4 className="text-left text-muted-foreground font-semibold text-sm uppercase tracking-wider mb-2">Runners up</h4>
            {rest.map((p, index) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + (index * 0.1) }}
                className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-center gap-4"
              >
                <span className="text-muted-foreground font-bold w-6 text-center">{index + 4}</span>
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: p.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                >
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-foreground flex-1 text-lg">{p.nickname}</span>
                <span className="text-primary font-bold flex items-center gap-1.5 opacity-80">
                  {getScoreText(p)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-5xl mx-auto">
        {displayPlayers.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: 'spring' }}
            className={`relative flex flex-col items-center p-6 rounded-3xl border-2 shadow-lg ${i < 3 ? 'bg-primary/5 border-primary/20' : 'bg-card/40 border-border/40 backdrop-blur-sm'}`}
          >
            {i < 3 && (
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center font-bold shadow" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#b45309' }}>
                {i + 1}
              </div>
            )}
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow"
              style={{ backgroundColor: p.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
            >
              {p.nickname.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-xl mb-1 truncate w-full text-center">{p.nickname}</span>
            <div className="flex items-center justify-center gap-2 text-primary font-bold">
              {getIcon()} {getScoreText(p)}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // list view
  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 mt-4">
      {displayPlayers.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-4 p-4 rounded-2xl border ${i === 0 ? 'bg-primary/10 border-primary/30 shadow-md' : 'bg-card/50 border-border/50'}`}
        >
          <div className="w-8 shrink-0 flex items-center justify-center">
            {i < 3 ? (
              <Medal className={`w-6 h-6 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : 'text-amber-600'}`} />
            ) : (
              <span className="text-muted-foreground font-bold">{i + 1}</span>
            )}
          </div>
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm"
            style={{ backgroundColor: p.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
          >
            {p.nickname.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-xl flex-1 truncate">{p.nickname}</span>
          <div className="flex items-center gap-2 font-bold text-lg tabular-nums">
            <span className="text-right w-24">{getScoreText(p)}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
