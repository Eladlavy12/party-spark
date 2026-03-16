import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom, usePlayers } from '@/hooks/use-realtime';
import { useBuzzes } from '@/hooks/use-buzzer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Users, ChevronRight, ChevronLeft, Bell, Trash2,
  Trophy, Clock, Info, MessageSquare, CheckSquare, Star, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { SlideContent } from '@/lib/slide-templates';

type Slide = Database['public']['Tables']['slides']['Row'];

const HostGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room } = useRoom(code ?? null);
  const players = usePlayers(room?.id ?? null);
  const slideIndex = room?.current_slide_index ?? 0;
  const { buzzes, clearBuzzes } = useBuzzes(room?.id ?? null, slideIndex);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);

  // Load slides for the selected pack
  useEffect(() => {
    if (!room?.current_pack_id) return;
    setLoadingSlides(true);
    supabase
      .from('slides')
      .select('*')
      .eq('pack_id', room.current_pack_id)
      .order('order_index')
      .then(({ data }) => {
        if (data) setSlides(data);
        setLoadingSlides(false);
      });
  }, [room?.current_pack_id]);

  const currentSlide = slides[slideIndex] ?? null;
  const content = currentSlide ? (currentSlide.content as unknown as SlideContent) : null;
  const isLast = slideIndex >= slides.length - 1;

  const goToSlide = async (index: number) => {
    if (!room) return;
    await supabase.from('rooms').update({ current_slide_index: index }).eq('id', room.id);
  };

  const endGame = async () => {
    if (!room) return;
    await supabase.from('rooms').update({ status: 'ended' as const }).eq('id', room.id);
    navigate(`/host/${code}`);
  };

  if (!room || loadingSlides) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Gamepad2 className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground text-xl">This pack has no slides.</p>
        <Button variant="outline" onClick={endGame}>Back to Lobby</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-6 h-6 text-primary" />
          <span className="font-bold text-foreground">
            Slide {slideIndex + 1} <span className="text-muted-foreground font-normal">/ {slides.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            <span>{players.length}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={endGame} className="text-muted-foreground">
            End Game
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main slide display */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
          <AnimatePresence mode="wait">
            {content && (
              <motion.div
                key={currentSlide!.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-3xl text-center"
              >
                {/* Template icon */}
                <div className="mb-4">
                  {content.template === 'information' && <Info className="w-10 h-10 text-primary mx-auto" />}
                  {content.template === 'open-text' && <MessageSquare className="w-10 h-10 text-primary mx-auto" />}
                  {content.template === 'multiple-choice' && <CheckSquare className="w-10 h-10 text-primary mx-auto" />}
                  {content.template === 'rating' && <Star className="w-10 h-10 text-primary mx-auto" />}
                  {content.template === 'drawing' && <Pencil className="w-10 h-10 text-primary mx-auto" />}
                </div>

                {/* Title */}
                <h2 className="text-4xl font-bold text-foreground mb-4">{content.title || 'Untitled Slide'}</h2>

                {/* Body */}
                {content.body && (
                  <p className="text-xl text-muted-foreground mb-6 max-w-xl mx-auto">{content.body}</p>
                )}

                {/* Media */}
                {content.mediaUrl && (
                  <div className="mb-6 rounded-2xl overflow-hidden inline-block border border-border">
                    <img src={content.mediaUrl} alt="" className="max-h-80 object-contain" />
                  </div>
                )}

                {/* Multiple choice options (host view) */}
                {content.template === 'multiple-choice' && content.options && (
                  <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mt-4">
                    {content.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`rounded-xl px-5 py-4 text-left flex items-center gap-3 border ${
                          content.correctOptionIndex === i
                            ? 'bg-accent/20 border-accent text-foreground'
                            : 'bg-muted/50 border-border text-muted-foreground'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="font-medium">{opt || `Option ${String.fromCharCode(65 + i)}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Slide meta */}
                <div className="mt-8 flex items-center justify-center gap-6 text-muted-foreground text-sm">
                  {currentSlide!.time_limit && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {currentSlide!.time_limit}s
                    </span>
                  )}
                  {currentSlide!.points_possible && currentSlide!.points_possible > 0 && (
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" /> {currentSlide!.points_possible} pts
                    </span>
                  )}
                  {content.buzzerEnabled && (
                    <span className="flex items-center gap-1 text-destructive">
                      <Bell className="w-4 h-4" /> {content.buzzerMode === 'all' ? 'All buzz' : '1st buzz'}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              disabled={slideIndex === 0}
              onClick={() => goToSlide(slideIndex - 1)}
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Previous
            </Button>
            {isLast ? (
              <Button variant="hero" size="lg" className="rounded-xl" onClick={endGame}>
                <Trophy className="w-5 h-5 mr-1" /> End Game
              </Button>
            ) : (
              <Button variant="hero" size="lg" className="rounded-xl" onClick={() => goToSlide(slideIndex + 1)}>
                Next <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            )}
          </div>
        </main>

        {/* Sidebar: Buzzes + Players */}
        <aside className="w-72 border-l border-border bg-card/30 flex flex-col shrink-0 overflow-y-auto">
          {/* Buzzes */}
          {content?.buzzerEnabled && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground font-semibold text-sm flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-destructive" /> Buzzes
                </h3>
                {buzzes.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearBuzzes} className="text-muted-foreground text-xs h-6 px-2">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {buzzes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No buzzes yet…</p>
              ) : (
                <div className="space-y-1.5">
                  {buzzes.map((buzz, i) => {
                    const player = players.find((p) => p.id === buzz.player_id);
                    return (
                      <div key={buzz.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                        <span className={`text-xs font-bold ${i === 0 ? 'text-accent' : 'text-muted-foreground'}`}>#{i + 1}</span>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: player?.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                        >
                          {player?.nickname.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="text-foreground text-xs font-medium truncate">{player?.nickname ?? 'Unknown'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Players */}
          <div className="p-4">
            <h3 className="text-foreground font-semibold text-sm flex items-center gap-1.5 mb-3">
              <Users className="w-3.5 h-3.5 text-muted-foreground" /> Players ({players.length})
            </h3>
            <div className="space-y-1.5">
              {players.map((player) => (
                <div key={player.id} className="flex items-center gap-2 px-2 py-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ backgroundColor: player.avatar_color ?? '#FF6B6B', color: '#1a1a2e' }}
                  >
                    {player.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-foreground text-sm font-medium truncate flex-1">{player.nickname}</span>
                  <span className="text-xs text-muted-foreground">{player.score ?? 0} pts</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HostGame;
